/**
 * Vercel Blob storage utilities for thumbnail management.
 *
 * Provides functions to:
 * - Upload thumbnails from base64 data URLs
 * - Delete thumbnails when projects are removed
 */

import { del, put } from "@vercel/blob";

/**
 * Uploads a thumbnail image to Vercel Blob storage.
 *
 * @param dataUrl - Base64 data URL from tldraw's editor.toImage()
 * @param projectId - Unique project identifier for the blob path
 * @returns Public URL of the uploaded thumbnail
 */
export async function uploadThumbnail(
  dataUrl: string,
  projectId: string,
): Promise<string> {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  // Upload to Vercel Blob with project-specific path
  const { url } = await put(`thumbnails/${projectId}.png`, blob, {
    access: "public",
    contentType: "image/png",
  });

  return url;
}

/**
 * Deletes a thumbnail from Vercel Blob storage.
 *
 * @param thumbnailUrl - Full URL of the thumbnail to delete
 */
export async function deleteThumbnail(thumbnailUrl: string): Promise<void> {
  try {
    await del(thumbnailUrl);
  } catch (error) {
    console.error("Failed to delete thumbnail:", error);
    // Don't throw - deletion failures shouldn't block project deletion
  }
}
