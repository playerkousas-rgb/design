/**
 * 圖片後製處理：放大 + DPI 注入
 * 
 * 使用 sharp 進行高品質 Lanczos3 放大，並注入 300 DPI metadata。
 * 
 * 印刷級需求：
 *   - 徽章 (3"):  900 × 900 px @ 300 DPI
 *   - 巾圈 (4"):  1200 × 1200 px @ 300 DPI  
 *   - T恤 (10"): 3000 × 3000 px @ 300 DPI
 * 
 * 放大策略：
 *   1. AI 生成 1024×1024（Pollinations 上限）
 *   2. sharp 放大 4x → 4096×4096（Lanczos3 重採樣，品質優於雙線性）
 *   3. 注入 300 DPI PNG metadata（pHYs chunk）
 *   4. 可印 13.6" @ 300 DPI，遠超一般需求
 */

import sharp from 'sharp';

export interface ProcessOptions {
  /** 放大倍率 (1-8)，預設 4 */
  scale?: number;
  /** DPI 值，預設 300 */
  dpi?: number;
  /** 輸出格式 */
  format?: 'png' | 'jpeg';
  /** JPEG 品質 (1-100)，預設 95 */
  quality?: number;
}

const DEFAULT_OPTIONS: Required<ProcessOptions> = {
  scale: 4,
  dpi: 300,
  format: 'png',
  quality: 95,
};

/**
 * 處理 base64 圖片：放大 + DPI 注入
 * @param base64Input 不含 data URI 前綴的 base64
 * @param mimeType 原始 mime type
 * @param options 處理選項
 * @returns 處理後的 base64（含適當的 data URI）
 */
export async function processImageForPrint(
  base64Input: string,
  mimeType: string,
  options: ProcessOptions = {}
): Promise<{ base64: string; mimeType: string; width: number; height: number; dpi: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // 解碼 base64
  const inputBuffer = Buffer.from(base64Input, 'base64');
  
  // 先讀取原始尺寸資訊
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 1024;
  const originalHeight = metadata.height || 1024;
  
  const targetWidth = Math.round(originalWidth * opts.scale);
  const targetHeight = Math.round(originalHeight * opts.scale);
  
  // DPI → 每米像素數（PNG pHYs chunk 用）
  // 1 inch = 0.0254 meter, 300 DPI = 300 / 0.0254 ≈ 11811 pixels/meter
  const pixelsPerMeter = Math.round(opts.dpi / 0.0254);
  
  let pipeline = sharp(inputBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.lanczos3, // 高品質 Lanczos3 重採樣
      fit: 'fill',
    });
  
  // 注入 DPI metadata
  if (opts.format === 'png') {
    // PNG 使用 pHYs chunk (pixelsPerMeterX, pixelsPerMeterY, unit=1)
    pipeline = pipeline.withMetadata({
      density: opts.dpi,
    });
  } else {
    // JPEG 密度
    pipeline = pipeline.withMetadata({
      density: opts.dpi,
    });
  }
  
  // 輸出
  let outputBuffer: Buffer;
  if (opts.format === 'png') {
    outputBuffer = await pipeline.png({
      compressionLevel: 6,
      adaptiveFiltering: true,
    }).toBuffer();
  } else {
    outputBuffer = await pipeline.jpeg({
      quality: opts.quality,
      progressive: true,
      mozjpeg: true,
    }).toBuffer();
  }
  
  const outputBase64 = outputBuffer.toString('base64');
  const outputMime = opts.format === 'png' ? 'image/png' : 'image/jpeg';
  
  return {
    base64: outputBase64,
    mimeType: outputMime,
    width: targetWidth,
    height: targetHeight,
    dpi: opts.dpi,
  };
}

/**
 * 計算可印刷的最大尺寸
 */
export function getPrintableSize(width: number, height: number, dpi: number): {
  widthInch: number;
  heightInch: number;
  widthCm: number;
  heightCm: number;
} {
  return {
    widthInch: +(width / dpi).toFixed(1),
    heightInch: +(height / dpi).toFixed(1),
    widthCm: +(width / dpi * 2.54).toFixed(1),
    heightCm: +(height / dpi * 2.54).toFixed(1),
  };
}
