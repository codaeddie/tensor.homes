/**
 * API route for creating comments on published projects.
 *
 * POST /api/comments - Add a comment to a published project
 */

export const runtime = "nodejs"; // Required for Prisma Client

import { auth, currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CommentWithUser } from "@/lib/types";

/**
 * POST /api/comments
 * Creates a new comment on a published project.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      projectId: string;
      content: string;
    };
    const { projectId, content } = body;

    if (!projectId || !content?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, content" },
        { status: 400 },
      );
    }

    // Verify project exists and is published
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.published) {
      return NextResponse.json(
        { error: "Cannot comment on unpublished project" },
        { status: 403 },
      );
    }

    // Get user details from Clerk
    const clerkUser = await currentUser();
    const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || "";
    const userName = clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
      : null;

    // Ensure user exists in database
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: userEmail,
        name: userName,
      },
      create: {
        id: userId,
        email: userEmail,
        name: userName,
      },
    });

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        projectId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const response: CommentWithUser = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: comment.user,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 },
    );
  }
}
