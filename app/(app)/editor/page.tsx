/**
 * Editor page for creating new projects.
 *
 * Features:
 * - Full tldraw editor
 * - Save button to create project with thumbnail
 * - Auto-redirect to /editor/[id] after creation
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { type Editor, getSnapshot, Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export default function EditorPage() {
  const router = useRouter();
  const editorRef = useRef<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("Untitled Project");

  async function handleSave() {
    if (!editorRef.current) return;

    try {
      setSaving(true);
      const editor = editorRef.current;

      // Get snapshot (only store document, not session state)
      const { document: snapshot } = getSnapshot(editor.store);

      // Generate thumbnail using editor.toImage() (not deprecated exportToBlob)
      const shapeIds = editor.getCurrentPageShapeIds();
      const { blob } = await editor.toImage([...shapeIds], {
        format: "png",
        background: true,
      });

      // Convert blob to data URL
      const reader = new FileReader();
      const thumbnailDataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Create project
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          snapshot,
          thumbnailDataUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to create project");

      const project = await res.json();
      router.push(`/editor/${project.id}`);
    } catch (err) {
      alert("Failed to save project");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative h-screen">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="absolute left-4 top-4 z-50 flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-gray-700 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
      >
        ← Back
      </Link>

      {/* Floating toolbar */}
      <div className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-white/80 px-4 py-2.5 shadow-lg backdrop-blur-sm">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-[200px] border-none bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
          placeholder="Untitled Project"
        />
        <div className="h-5 w-px bg-gray-200" />
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:bg-gray-800 hover:shadow-md disabled:bg-gray-300 disabled:text-gray-500"
          type="button"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Editor */}
      <div className="h-full">
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>
    </div>
  );
}
