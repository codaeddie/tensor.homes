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
import { use, useCallback, useEffect, useRef, useState } from "react";
import { type Editor, getSnapshot, type TLStoreSnapshot, Tldraw } from "tldraw";
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

  const fetchProject = useCallback(async () => {
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
  }, [id, router]);

  const handleSave = useCallback(
    async (generateThumbnail = false) => {
      if (!editorRef.current || !project) return;

      try {
        setSaving(true);
        const editor = editorRef.current;

        // Get snapshot (only store document, not session state)
        const { document: snapshot } = getSnapshot(editor.store);

        const body: {
          title: string;
          snapshot: TLStoreSnapshot;
          thumbnailDataUrl?: string;
        } = {
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
    },
    [id, project, title],
  );

  useEffect(() => {
    fetchProject();
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [fetchProject]);

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
  }, [hasUnsavedChanges, handleSave, project]);

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
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Floating toolbar */}
      <div className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-white/80 px-4 py-2.5 shadow-lg backdrop-blur-sm">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setHasUnsavedChanges(true);
          }}
          className="min-w-[200px] border-none bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
          placeholder="Untitled Project"
        />
        
        {/* Status indicator */}
        {(hasUnsavedChanges || saving) && (
          <>
            <div className="h-5 w-px bg-gray-200" />
            <span className="text-xs text-gray-500">
              {saving ? "Saving..." : "●"}
            </span>
          </>
        )}
        
        <div className="h-5 w-px bg-gray-200" />
        
        {/* Action buttons */}
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:bg-gray-800 hover:shadow-md disabled:bg-gray-300 disabled:text-gray-500"
          type="button"
        >
          Save
        </button>
        
        <button
          onClick={() => handleTogglePublish()}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:shadow-md ${
            project.published
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-gray-400 hover:bg-gray-500"
          }`}
          type="button"
        >
          {project.published ? "Published" : "Private"}
        </button>
        
        {project.published && (
          <a
            href={`/view/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-md"
          >
            View
          </a>
        )}
      </div>

      {/* Editor */}
      <div className="h-full">
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
