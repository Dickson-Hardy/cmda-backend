import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  //

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'cmdauploads',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
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
