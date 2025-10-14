import { z } from '@hono/zod-openapi';

// Schema for requesting an upload URL
export const uploadUrlRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024), // 5MB max
  uploadType: z.enum(['restaurant', 'menu', 'menu-item']),
  resourceId: z.string().uuid(), // ID of the restaurant, menu, or item
});

export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;

// Schema for upload URL response
export const uploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number(),
});

export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;

// Schema for confirming upload
export const confirmUploadSchema = z.object({
  key: z.string().min(1),
});

export type ConfirmUpload = z.infer<typeof confirmUploadSchema>;

// Schema for confirmed upload response
export const confirmUploadResponseSchema = z.object({
  url: z.string().url(),
  key: z.string(),
});

export type ConfirmUploadResponse = z.infer<typeof confirmUploadResponseSchema>;
