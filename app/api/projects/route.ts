/**
 * API routes for project operations.
 *
 * POST /api/projects - Create a new project with thumbnail
 * GET /api/projects - List all projects for the authenticated user
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { uploadThumbnail } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import type { CreateProjectInput, ProjectMetadata } from "@/lib/types";

/**
 * POST /api/projects
 * Creates a new project with thumbnail generation and upload.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CreateProjectInput & {
      thumbnailDataUrl?: string;
    };
    const { title, snapshot, thumbnailDataUrl } = body;

    if (!title || !snapshot) {
      return NextResponse.json(
        { error: "Missing required fields: title, snapshot" },
        { status: 400 },
      );
    }

    // Get user details from Clerk
    const clerkUser = await currentUser();
    const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || "";
    const userName = clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
      : null;

    // Ensure user exists in database (sync with Clerk)
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

    // Create project first to get ID
    const project = await prisma.project.create({
      data: {
        title,
        snapshot,
        userId,
      },
    });

    // Upload thumbnail if provided
    let thumbnailUrl: string | null = null;
    if (thumbnailDataUrl) {
      try {
        thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, project.id);
        await prisma.project.update({
          where: { id: project.id },
          data: { thumbnailUrl },
        });
      } catch (error) {
        console.error("Failed to upload thumbnail:", error);
        // Continue without thumbnail - non-blocking
      }
    }

    const response: ProjectMetadata = {
      id: project.id,
      title: project.title,
      thumbnailUrl,
      published: project.published,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/projects
 * Lists all projects for the authenticated user.
 * Supports optional search query parameter.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const projects = await prisma.project.findMany({
      where: {
        userId,
        ...(search && {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }),
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const response: ProjectMetadata[] = projects;

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}
