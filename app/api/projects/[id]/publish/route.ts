/**
 * API route for toggling project publish status.
 *
 * POST /api/projects/[id]/publish - Toggle the published status of a project
 */

export const runtime = "nodejs"; // Required for Prisma Client

import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/projects/[id]/publish
 * Toggles the published status of a project.
 */
export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

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

    // Toggle published status
    const project = await prisma.project.update({
      where: { id },
      data: {
        published: !existingProject.published,
      },
    });

    return NextResponse.json({
      id: project.id,
      published: project.published,
    });
  } catch (error) {
    console.error("Error toggling publish status:", error);
    return NextResponse.json(
      { error: "Failed to toggle publish status" },
      { status: 500 },
    );
  }
}
