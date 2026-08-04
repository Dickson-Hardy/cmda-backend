import { Injectable, BadRequestException } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 as cloudinary } from 'cloudinary';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CloudinaryService {
  //

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'cmdauploads',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        },
      );
      stream.write(file.buffer);
      stream.end();
    });
  }

  async deleteFile(cloudId: string) {
    await cloudinary.uploader.destroy(cloudId, { resource_type: 'image' });
  }
}
