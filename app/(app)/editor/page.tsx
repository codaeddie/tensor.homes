/**
 * Editor page for creating new projects.
 *
 * Features:
 * - Full tldraw editor
 * - Save button to create project with thumbnail
 * - Auto-redirect to /editor/[id] after creation
 */

"use client";

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
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold outline-none"
          placeholder="Project title"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
          type="button"
        >
          {saving ? "Saving..." : "Save Project"}
        </button>
      </div>

      <div className="flex-1">
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>
    </div>
  );
}
