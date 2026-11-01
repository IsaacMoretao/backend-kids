import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';
import { UploadApiResponse } from 'cloudinary';
import path from 'path';

export async function uploadToCloudinary(
  file: Express.Multer.File,
  folder: string
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const isPdf = file.mimetype === 'application/pdf';

    const isDocument =
      isPdf ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('word') ||
      file.mimetype === 'text/csv';

    const resourceType = isDocument
      ? isPdf ? 'image' : 'raw'
      : 'image';

    const originalName = path.basename(file.originalname);
    const fileName = path.parse(originalName).name;
    const extension = path.extname(originalName);

    const publicId = `${Date.now()}-${fileName}${
      resourceType === 'raw' ? extension : ''
    }`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: publicId,
      },
      (error, result) => {
        if (error) return reject(error);

        if (!result) {
          return reject(
            new Error('Falha ao enviar arquivo para o Cloudinary.')
          );
        }

        resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(stream);
  });
}