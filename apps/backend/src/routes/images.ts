import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  uploadUrlRequestSchema,
  uploadUrlResponseSchema,
  confirmUploadSchema,
  confirmUploadResponseSchema,
} from '../schemas/imageSchemas.js';
import { s3Client, BUCKET_NAME, IMAGE_PATHS } from '../lib/s3Client.js';

const app = new OpenAPIHono();

// Generate pre-signed URL for upload
const generateUploadUrlRoute = createRoute({
  method: 'post',
  path: '/upload-url',
  request: {
    body: {
      content: {
        'application/json': {
          schema: uploadUrlRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: uploadUrlResponseSchema,
        },
      },
      description: 'Pre-signed URL generated successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            code: z.string(),
          }),
        },
      },
      description: 'Invalid request',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            code: z.string(),
          }),
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            code: z.string(),
          }),
        },
      },
      description: 'Internal server error',
    },
  },
  security: [{ Bearer: [] }],
  tags: ['Images'],
});

app.openapi(generateUploadUrlRoute, async (c): Promise<any> => {
  // Check auth
  const user = c.get('user');
  if (!user) {
    return c.json(
      {
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
      401
    );
  }

  const body = c.req.valid('json');
  const { fileName, fileType, fileSize, uploadType, resourceId } = body;

  // Validate file size
  if (fileSize > 5 * 1024 * 1024) {
    return c.json(
      {
        error: 'File size too large. Maximum size is 5MB.',
        code: 'FILE_TOO_LARGE',
      },
      400
    );
  }

  // Generate unique key with timestamp to avoid collisions
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

  let prefix = '';
  switch (uploadType) {
    case 'restaurant':
      prefix = IMAGE_PATHS.restaurant(resourceId);
      break;
    case 'menu':
      prefix = IMAGE_PATHS.menu(resourceId);
      break;
    case 'menu-item':
      prefix = IMAGE_PATHS.menuItem(resourceId);
      break;
  }

  const key = `${prefix}${timestamp}-${sanitizedFileName}`;

  // Create pre-signed URL (valid for 15 minutes)
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
    ContentLength: fileSize,
  });

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 15 * 60, // 15 minutes
    });

    return c.json({
      uploadUrl,
      key,
      expiresIn: 15 * 60,
    });
  } catch (error) {
    console.error('Failed to generate pre-signed URL:', error);
    return c.json(
      {
        error: 'Failed to generate upload URL',
        code: 'UPLOAD_URL_GENERATION_FAILED',
      },
      500
    );
  }
});

// Confirm upload completion
const confirmUploadRoute = createRoute({
  method: 'post',
  path: '/confirm',
  request: {
    body: {
      content: {
        'application/json': {
          schema: confirmUploadSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: confirmUploadResponseSchema,
        },
      },
      description: 'Upload confirmed successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            code: z.string(),
          }),
        },
      },
      description: 'Invalid request',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            code: z.string(),
          }),
        },
      },
      description: 'Unauthorized',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            code: z.string(),
          }),
        },
      },
      description: 'File not found',
    },
    500: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            code: z.string(),
          }),
        },
      },
      description: 'Internal server error',
    },
  },
  security: [{ Bearer: [] }],
  tags: ['Images'],
});

app.openapi(confirmUploadRoute, async (c): Promise<any> => {
  // Check auth
  const user = c.get('user');
  if (!user) {
    return c.json(
      {
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
      401
    );
  }

  const { key } = c.req.valid('json');

  // Verify the file exists in S3
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);

    // Generate public URL (we'll use CloudFront later)
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return c.json({
      url,
      key,
    });
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return c.json(
        {
          error: 'File not found in S3',
          code: 'FILE_NOT_FOUND',
        },
        404
      );
    }

    console.error('Failed to verify upload:', error);
    return c.json(
      {
        error: 'Failed to confirm upload',
        code: 'UPLOAD_CONFIRMATION_FAILED',
      },
      500
    );
  }
});

export default app;
