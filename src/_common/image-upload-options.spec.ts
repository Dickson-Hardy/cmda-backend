import { BadRequestException } from '@nestjs/common';
import { IMAGE_UPLOAD_OPTIONS, MAX_IMAGE_UPLOAD_BYTES } from './image-upload-options';

describe('image upload boundary', () => {
  it('caps buffered uploads at five megabytes', () => {
    expect(IMAGE_UPLOAD_OPTIONS.limits.fileSize).toBe(MAX_IMAGE_UPLOAD_BYTES);
  });

  it('accepts supported images and rejects executable content before buffering', () => {
    const accept = jest.fn();
    IMAGE_UPLOAD_OPTIONS.fileFilter({}, { mimetype: 'image/png' } as Express.Multer.File, accept);
    expect(accept).toHaveBeenCalledWith(null, true);

    const reject = jest.fn();
    IMAGE_UPLOAD_OPTIONS.fileFilter(
      {},
      { mimetype: 'application/javascript' } as Express.Multer.File,
      reject,
    );
    expect(reject.mock.calls[0][0]).toBeInstanceOf(BadRequestException);
    expect(reject.mock.calls[0][1]).toBe(false);
  });
});
