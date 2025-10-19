/**
 * View page - "Show Stage"
 *
 * Features:
 * - Read-only tldraw canvas
 * - Comment sidebar for published projects
 * - Public access (no authentication required for viewing)
 */

"use client";

import { useAuth } from "@clerk/nextjs";
import { use, useEffect, useState } from "react";
import { Tldraw } from "tldraw";
import type { CommentWithUser, ProjectWithSnapshot } from "@/lib/types";
import "tldraw/tldraw.css";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function ViewIdPage({ params }: PageProps) {
  const { id } = use(params);
  const { isSignedIn } = useAuth();

  const [project, setProject] = useState<ProjectWithSnapshot | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    fetchProject();
    fetchComments();
  }, [fetchComments, fetchProject]);

  async function fetchProject() {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        setErrorStatus(res.status);
        return;
      }
      const data = await res.json();
      setProject(data);
    } catch (err) {
      console.error("Failed to load project:", err);
      setErrorStatus(500);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    try {
      const res = await fetch(`/api/comments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !isSignedIn) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          content: newComment.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to submit comment");

      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch (err) {
      alert("Failed to submit comment");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (errorStatus === 404) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <p className="text-red-500 text-lg font-semibold">Project not found</p>
        <p className="text-gray-600">
          This project doesn't exist or has been deleted.
        </p>
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <p className="text-orange-500 text-lg font-semibold">
          Project not published
        </p>
        <p className="text-gray-600">
          This project is private and hasn't been published yet.
        </p>
      </div>
    );
  }

  if (errorStatus || !project) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <p className="text-red-500 text-lg font-semibold">
          Failed to load project
        </p>
        <p className="text-gray-600">
          An error occurred while loading this project.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main canvas - Read-only tldraw */}
      <div className="flex-1">
        <div className="border-b bg-white px-4 py-3">
          <h1 className="text-lg font-semibold">{project.title}</h1>
          <p className="text-sm text-gray-500">Read-only view</p>
        </div>
        <div className="h-[calc(100%-60px)]">
          <Tldraw
            snapshot={project.snapshot}
            onMount={(editor) => {
              // Make editor read-only
              editor.updateInstanceState({ isReadonly: true });
            }}
          />
        </div>
      </div>

      {/* Comment sidebar */}
      <div className="flex w-80 flex-col border-l bg-gray-50">
        <div className="border-b bg-white px-4 py-3">
          <h2 className="font-semibold">Comments</h2>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4">
          {comments.length === 0 ? (
            <p className="text-center text-sm text-gray-500">
              No comments yet. Be the first!
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg bg-white p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <p className="text-sm font-medium">
                      {comment.user.name || comment.user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment form */}
        {isSignedIn ? (
          <form
            onSubmit={handleSubmitComment}
            className="border-t bg-white p-4"
          >
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="mb-2 w-full resize-none rounded-lg border p-2 text-sm"
              rows={3}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </form>
        ) : (
          <div className="border-t bg-white p-4 text-center">
            <p className="text-sm text-gray-500">
              <a href="/signin" className="text-blue-600 hover:underline">
                Sign in
              </a>{" "}
              to comment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
