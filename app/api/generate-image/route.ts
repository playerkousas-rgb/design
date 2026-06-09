import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/server-image';

export const runtime = 'edge';

/**
 * 圖片生成 API（Edge Runtime，30s 超時）
 * 支援多個 Provider：Pollinations / Replicate / Stability AI
 * 前端不再直接訪問外部圖片 API，全部經由後端代理
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, seed, width, height } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const result = await generateImage({ prompt, seed, width, height });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Generate image error:', e.message);
    return NextResponse.json(
      { error: e.message || 'Image generation failed' },
      { status: 500 }
    );
  }
}
