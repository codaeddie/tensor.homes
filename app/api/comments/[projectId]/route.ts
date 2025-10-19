/**
 * API route for fetching comments for a specific project.
 *
 * GET /api/comments/[projectId] - Get all comments for a published project
 */

export const runtime = "nodejs"; // Required for Prisma Client

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CommentWithUser } from "@/lib/types";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

/**
 * GET /api/comments/[projectId]
 * Retrieves all comments for a published project, ordered by creation date.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    // Verify project exists and is published
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.published) {
      return NextResponse.json(
        { error: "Project is not published" },
        { status: 403 },
      );
    }

    // Fetch comments with user data
    const comments = await prisma.comment.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const response: CommentWithUser[] = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: comment.user,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 },
    );
  }
}
