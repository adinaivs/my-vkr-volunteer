import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadToS3, validateFile } from '@/lib/s3';

// POST /api/upload/report-photos - Загрузить фотографии для отчета
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json(
        { error: 'Доступ запрещён. Только волонтеры могут загружать фотографии отчетов.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Файлы не найдены' },
        { status: 400 }
      );
    }

    // Проверяем количество файлов (максимум 10)
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Можно загрузить максимум 10 фотографий' },
        { status: 400 }
      );
    }

    const uploadedUrls: string[] = [];

    // Загружаем каждый файл в S3
    for (const file of files) {
      // Валидация файла (только изображения, максимум 5 МБ)
      const validation = validateFile(file, 5, ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);
      
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || 'Неверный формат файла' },
          { status: 400 }
        );
      }

      // Загружаем в S3 в папку report-photos
      const fileUrl = await uploadToS3(file, 'report-photos');
      uploadedUrls.push(fileUrl);
    }

    console.log(`Uploaded ${uploadedUrls.length} report photos to S3`);

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      message: `Загружено ${uploadedUrls.length} фотографий`,
    });
  } catch (error) {
    console.error('Upload report photos error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке фотографий' },
      { status: 500 }
    );
  }
}
