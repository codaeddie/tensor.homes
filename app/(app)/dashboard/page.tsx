/**
 * Dashboard page - "Backstage"
 *
 * Displays user's projects in a grid layout with thumbnails.
 * Features:
 * - Search/filter projects by title
 * - Quick actions: edit, delete, publish/unpublish
 * - "New Project" button to create new projects
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ProjectMetadata } from "@/lib/types";

export default function DashboardPage() {
  const _router = useRouter();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectMetadata[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
      setFilteredProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (search.trim()) {
      setFilteredProjects(
        projects.filter((p) =>
          p.title.toLowerCase().includes(search.toLowerCase()),
        ),
      );
    } else {
      setFilteredProjects(projects);
    }
  }, [search, projects]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (_err) {
      alert("Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTogglePublish(id: string) {
    try {
      setPublishingId(id);
      const res = await fetch(`/api/projects/${id}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle publish status");
      const data = await res.json();
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, published: data.published } : p,
        ),
      );
    } catch (_err) {
      alert("Failed to toggle publish status");
    } finally {
      setPublishingId(null);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-8">
        <p className="text-gray-500">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-8">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Backstage</h1>
        <Link
          href="/editor"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          New Project
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border px-4 py-2"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-gray-500">
            {search ? "No projects found" : "No projects yet. Create one!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md"
            >
              <Link href={`/editor/${project.id}`}>
                <div className="aspect-video bg-gray-100 relative">
                  {project.thumbnailUrl ? (
                    <Image
                      src={project.thumbnailUrl}
                      alt={project.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      No thumbnail
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <h3 className="mb-2 truncate font-semibold">{project.title}</h3>
                <p className="mb-3 text-xs text-gray-500">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/editor/${project.id}`}
                    className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleTogglePublish(project.id)}
                    disabled={publishingId === project.id}
                    className={`rounded px-3 py-1 text-sm disabled:opacity-50 ${
                      project.published
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    }`}
                    type="button"
                  >
                    {publishingId === project.id
                      ? "..."
                      : project.published
                        ? "Published"
                        : "Unpublished"}
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    disabled={deletingId === project.id}
                    className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50"
                    type="button"
                  >
                    {deletingId === project.id ? "Deleting..." : "Delete"}
                  </button>
                  {project.published && (
                    <Link
                      href={`/view/${project.id}`}
                      className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                      target="_blank"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
