import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3, validateFile } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      );
    }

    // Валидация файла
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Загружаем файл в S3
    const fileUrl = await uploadToS3(file, 'verification-docs');

    console.log('File uploaded successfully to S3:', fileUrl);

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка при загрузке файла',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
