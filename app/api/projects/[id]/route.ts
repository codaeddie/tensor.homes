/**
 * API routes for individual project operations.
 *
 * GET /api/projects/[id] - Get a single project with full snapshot
 * PATCH /api/projects/[id] - Update project (title, snapshot, or published status)
 * DELETE /api/projects/[id] - Delete project and associated thumbnail
 */

export const runtime = "nodejs"; // Required for Prisma Client

import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { deleteThumbnail, uploadThumbnail } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import type { ProjectWithSnapshot, UpdateProjectInput } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]
 * Retrieves a single project including its full tldraw snapshot.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Allow access if:
    // 1. User owns the project, OR
    // 2. Project is published (for public viewing)
    if (project.userId !== userId && !project.published) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const response: ProjectWithSnapshot = {
      id: project.id,
      title: project.title,
      snapshot: project.snapshot as ProjectWithSnapshot["snapshot"],
      thumbnailUrl: project.thumbnailUrl,
      published: project.published,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/projects/[id]
 * Updates a project's title, snapshot, or published status.
 * Can also update thumbnail if thumbnailDataUrl is provided.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await req.json()) as UpdateProjectInput & {
      thumbnailDataUrl?: string;
    };
    const { title, snapshot, published, thumbnailDataUrl } = body;

    // Verify ownership
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (existingProject.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update project
    const updateData: {
      title?: string;
      snapshot?: object;
      published?: boolean;
      thumbnailUrl?: string;
    } = {};
    if (title !== undefined) updateData.title = title;
    if (snapshot !== undefined) updateData.snapshot = snapshot as object;
    if (published !== undefined) updateData.published = published;

    // Handle thumbnail update
    if (thumbnailDataUrl) {
      try {
        // Delete old thumbnail if exists
        if (existingProject.thumbnailUrl) {
          await deleteThumbnail(existingProject.thumbnailUrl);
        }
        // Upload new thumbnail
        const thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, id);
        updateData.thumbnailUrl = thumbnailUrl;
      } catch (error) {
        console.error("Failed to update thumbnail:", error);
        // Continue without thumbnail update
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    const response: ProjectWithSnapshot = {
      id: project.id,
      title: project.title,
      snapshot: project.snapshot as ProjectWithSnapshot["snapshot"],
      thumbnailUrl: project.thumbnailUrl,
      published: project.published,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Deletes a project and its associated thumbnail from Vercel Blob.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete thumbnail from Vercel Blob
    if (project.thumbnailUrl) {
      await deleteThumbnail(project.thumbnailUrl);
    }

    // Delete project (cascade deletes comments)
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}
