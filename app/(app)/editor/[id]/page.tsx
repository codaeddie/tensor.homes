/**
 * Editor page for editing existing projects.
 *
 * Features:
 * - Loads existing project snapshot into tldraw
 * - Auto-save every 5 seconds
 * - Manual save button
 * - Title editing
 * - Publish toggle
 */

"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { type Editor, getSnapshot, Tldraw } from "tldraw";
import type { ProjectWithSnapshot } from "@/lib/types";
import "tldraw/tldraw.css";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditorIdPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const editorRef = useRef<Editor | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [project, setProject] = useState<ProjectWithSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchProject();
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [id]);

  useEffect(() => {
    if (project && editorRef.current && hasUnsavedChanges) {
      // Set up auto-save timer (5 seconds)
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave();
      }, 5000);
    }
  }, [hasUnsavedChanges]);

  async function fetchProject() {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          alert("Project not found");
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to fetch project");
      }
      const data = await res.json();
      setProject(data);
      setTitle(data.title);
    } catch (err) {
      alert("Failed to load project");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(generateThumbnail = false) {
    if (!editorRef.current || !project) return;

    try {
      setSaving(true);
      const editor = editorRef.current;

      // Get snapshot
      const snapshot = getSnapshot(editor.store);

      const body: any = {
        title,
        snapshot,
      };

      // Generate thumbnail if requested using editor.toImage() (not deprecated exportToBlob)
      if (generateThumbnail) {
        try {
          const shapeIds = editor.getCurrentPageShapeIds();
          const { blob } = await editor.toImage([...shapeIds], {
            format: "png",
            background: true,
          });

          const reader = new FileReader();
          const thumbnailDataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          body.thumbnailDataUrl = thumbnailDataUrl;
        } catch (err) {
          console.error("Failed to generate thumbnail:", err);
        }
      }

      // Update project
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save project");

      const updated = await res.json();
      setProject(updated);
      setHasUnsavedChanges(false);
    } catch (err) {
      alert("Failed to save project");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish() {
    try {
      const res = await fetch(`/api/projects/${id}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle publish status");
      const data = await res.json();
      setProject((prev) =>
        prev ? { ...prev, published: data.published } : null,
      );
    } catch (_err) {
      alert("Failed to toggle publish status");
    }
  }

  function handleEditorChange() {
    setHasUnsavedChanges(true);
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-red-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setHasUnsavedChanges(true);
          }}
          className="text-lg font-semibold outline-none"
          placeholder="Project title"
        />
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && !saving && (
            <span className="text-sm text-yellow-600">Unsaved changes</span>
          )}
          {saving && <span className="text-sm text-gray-500">Saving...</span>}
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:bg-gray-400"
            type="button"
          >
            Save + Thumbnail
          </button>
          <button
            onClick={() => handleTogglePublish()}
            className={`rounded-lg px-4 py-2 text-white ${
              project.published
                ? "bg-green-600 hover:bg-green-700"
                : "bg-yellow-600 hover:bg-yellow-700"
            }`}
            type="button"
          >
            {project.published ? "Published" : "Unpublished"}
          </button>
          {project.published && (
            <a
              href={`/view/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              View Public
            </a>
          )}
        </div>
      </div>

      <div className="flex-1">
        <Tldraw
          snapshot={project.snapshot}
          onMount={(editor) => {
            editorRef.current = editor;
            editor.store.listen(handleEditorChange, { scope: "document" });
          }}
        />
      </div>
    </div>
  );
}
