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
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Projects</h1>
          <p className="mt-2 text-sm text-gray-500">Manage your creative work</p>
        </div>
        <Link
          href="/editor"
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-gray-800 hover:shadow-lg"
        >
          New Project
        </Link>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-gray-500">
            {search ? "No projects found" : "No projects yet. Create one!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-lg"
            >
              <Link href={`/editor/${project.id}`}>
                <div className="relative aspect-video overflow-hidden bg-gray-50">
                  {project.thumbnailUrl ? (
                    <Image
                      src={project.thumbnailUrl}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-300">
                      No preview
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-5">
                <h3 className="mb-1 truncate text-base font-medium text-gray-900">{project.title}</h3>
                <p className="mb-4 text-xs text-gray-400">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href={`/editor/${project.id}`}
                    className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleTogglePublish(project.id)}
                    disabled={publishingId === project.id}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                      project.published
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    type="button"
                  >
                    {publishingId === project.id
                      ? "..."
                      : project.published
                        ? "Live"
                        : "Draft"}
                  </button>
                  {project.published && (
                    <Link
                      href={`/view/${project.id}`}
                      className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                      target="_blank"
                    >
                      View
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(project.id)}
                    disabled={deletingId === project.id}
                    className="ml-auto rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                    type="button"
                  >
                    {deletingId === project.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
