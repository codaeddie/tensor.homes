/**
 * Type definitions for tensor.homes application.
 *
 * Defines core interfaces for:
 * - Project metadata and full project data with tldraw snapshots
 * - Input types for creating and updating projects
 * - Comment data with associated user information
 */

import type { TLStoreSnapshot } from "tldraw";

/**
 * Project metadata without the full tldraw snapshot.
 * Used for list views and lightweight operations.
 */
export interface ProjectMetadata {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Complete project data including the tldraw snapshot.
 * Used when loading a project into the editor or viewer.
 */
export interface ProjectWithSnapshot extends ProjectMetadata {
  snapshot: TLStoreSnapshot;
}

/**
 * Input data for creating a new project.
 * Requires a title and initial tldraw snapshot.
 */
export interface CreateProjectInput {
  title: string;
  snapshot: TLStoreSnapshot;
}

/**
 * Input data for updating an existing project.
 * All fields are optional to support partial updates.
 */
export interface UpdateProjectInput {
  title?: string;
  snapshot?: TLStoreSnapshot;
  published?: boolean;
}

/**
 * Comment data with associated user information.
 * Used for displaying comments on published projects.
 */
export interface CommentWithUser {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}
