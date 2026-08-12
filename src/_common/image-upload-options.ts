import { BadRequestException } from '@nestjs/common';

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const IMAGE_UPLOAD_OPTIONS = {
  limits: {
    fileSize: MAX_IMAGE_UPLOAD_BYTES,
    files: 5,
  },
  fileFilter: (
    _request: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestException('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
      return;
    }
    callback(null, true);
  },
};
