import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Конфигурация S3 клиента для Timeweb
const s3Client = new S3Client({
  region: process.env.REGION || 'ru-1',
  endpoint: process.env.S3_URL || 'https://s3.twcstorage.ru',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Необходимо для совместимости с некоторыми S3-провайдерами
});

/**
 * Загружает файл в S3 хранилище Timeweb
 * @param file - Файл для загрузки
 * @param folder - Папка в бакете (например, 'verification-docs')
 * @returns URL загруженного файла
 */
export async function uploadToS3(
  file: File,
  folder: string = 'verification-docs'
): Promise<string> {
  try {
    const bucketName = process.env.BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error('BUCKET_NAME не указан в переменных окружения');
    }

    // Создаем уникальное имя файла
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    
    // Полный путь к файлу в бакете
    const key = `${folder}/${fileName}`;

    // Конвертируем файл в Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Определяем Content-Type
    const contentType = file.type || 'application/octet-stream';

    // Загружаем файл в S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // ACL: 'public-read', // Делаем файл публично доступным (если нужно)
    });

    await s3Client.send(command);

    // Формируем публичный URL файла
    const s3Url = process.env.S3_URL || 'https://s3.twcstorage.ru';
    const fileUrl = `${s3Url}/${bucketName}/${key}`;

    console.log('File uploaded to S3:', fileUrl);

    return fileUrl;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Ошибка при загрузке файла в S3: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Проверяет валидность файла перед загрузкой
 * @param file - Файл для проверки
 * @param maxSizeMB - Максимальный размер в МБ (по умолчанию 5)
 * @param allowedTypes - Разрешенные MIME типы
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 5,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
): { valid: boolean; error?: string } {
  // Проверка размера файла
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Размер файла не должен превышать ${maxSizeMB} МБ`,
    };
  }

  // Проверка типа файла
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Разрешены только файлы JPG, PNG и PDF',
    };
  }

  return { valid: true };
}
