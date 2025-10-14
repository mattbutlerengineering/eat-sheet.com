import { S3Client } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'us-east-1';

export const s3Client = new S3Client({
  region,
  // Credentials will be automatically loaded from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. IAM role (when running in Lambda)
  // 3. AWS credentials file (~/.aws/credentials)
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'eat-sheet-images-dev';

// Maximum file size: 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Image upload paths
export const IMAGE_PATHS = {
  restaurant: (restaurantId: string) => `restaurants/${restaurantId}/`,
  menu: (menuId: string) => `menus/${menuId}/`,
  menuItem: (itemId: string) => `items/${itemId}/`,
};
