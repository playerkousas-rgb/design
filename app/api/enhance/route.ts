import { NextRequest, NextResponse } from 'next/server';
import { processImageForPrint, getPrintableSize } from '@/lib/image-process';

/**
 * 純圖片放大 API
 * 用於批次生成後，用戶選中某張草稿，進行 4x 放大 + 300 DPI 注入
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = 'image/png' } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 });
    }

    const processed = await processImageForPrint(imageBase64, mimeType, {
      scale: 4,
      dpi: 300,
      format: 'png',
    });

    const printSize = getPrintableSize(processed.width, processed.height, processed.dpi);

    return NextResponse.json({
      image: processed.base64,
      mimeType: processed.mimeType,
      processedInfo: {
        enhancedSize: { width: processed.width, height: processed.height },
        dpi: processed.dpi,
        printableSize: printSize,
      },
    });
  } catch (e: any) {
    console.error('Enhance API error:', e);
    return NextResponse.json({ error: e.message || '放大處理失敗' }, { status: 500 });
  }
}
