/**
 * 後端圖片生成層（Edge Runtime 兼容）
 * 支援 Pollinations / Replicate / Stability AI
 * 讀取 Vercel Environment Variables：IMAGE_PROVIDER + 對應 API Key
 */

export interface ImageGenerationOptions {
  prompt: string;
  seed?: number;
  width?: number;
  height?: number;
}

export interface ImageResult {
  url: string; // data URL (base64)
}

async function blobToDataUrl(blob: Blob, mimeType: string = 'image/png'): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return `data:${mimeType};base64,${base64}`;
}

async function downloadAndConvert(imageUrl: string): Promise<ImageResult> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return { url: dataUrl };
}

export async function generateImage(options: ImageGenerationOptions): Promise<ImageResult> {
  const provider = process.env.IMAGE_PROVIDER || 'pollinations';

  try {
    switch (provider) {
      case 'replicate':
        return await generateImageReplicate(options);
      case 'stability':
        return await generateImageStability(options);
      default:
        return await generateImagePollinations(options);
    }
  } catch (e) {
    console.error(`Image generation failed (${provider}):`, e);
    throw e;
  }
}

async function generateImagePollinations(options: ImageGenerationOptions): Promise<ImageResult> {
  const { prompt, seed, width = 1024, height = 1024 } = options;
  const safe = prompt.replace(/[\x00-\x1F]/g, ' ');
  const encoded = encodeURIComponent(safe);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model: 'flux',
    nologo: 'true',
    enhance: 'true',
  });
  if (seed != null) params.set('seed', String(seed));

  const url = `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    throw new Error(`Pollinations image ${response.status}: ${txt}`);
  }

  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return { url: dataUrl };
}

async function generateImageReplicate(options: ImageGenerationOptions): Promise<ImageResult> {
  const { prompt, seed } = options;
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) throw new Error('REPLICATE_API_KEY not set in Vercel Environment Variables');

  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      version: 'black-forest-labs/flux-schnell',
      input: {
        prompt,
        seed: seed || Math.floor(Math.random() * 1000000),
        num_outputs: 1,
        aspect_ratio: '1:1',
        output_format: 'png',
        output_quality: 80,
      },
    }),
  });

  if (!createResponse.ok) {
    const txt = await createResponse.text().catch(() => '');
    throw new Error(`Replicate API ${createResponse.status}: ${txt}`);
  }

  const prediction = await createResponse.json();

  if (prediction.status === 'succeeded') {
    return await downloadAndConvert(prediction.output[0]);
  }
  if (prediction.status === 'failed') {
    throw new Error('Image generation failed');
  }

  // Poll for result
  let result = prediction;
  const startTime = Date.now();
  const maxWait = 25000;

  while (result.status !== 'succeeded' && result.status !== 'failed') {
    if (Date.now() - startTime > maxWait) {
      throw new Error('Image generation timeout');
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!pollResponse.ok) {
      throw new Error(`Poll failed: ${pollResponse.status}`);
    }
    result = await pollResponse.json();
  }

  if (result.status === 'failed') {
    throw new Error('Image generation failed');
  }

  return await downloadAndConvert(result.output[0]);
}

async function generateImageStability(options: ImageGenerationOptions): Promise<ImageResult> {
  const { prompt, seed } = options;
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) throw new Error('STABILITY_API_KEY not set in Vercel Environment Variables');

  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt }],
      cfg_scale: 7,
      clip_guidance_preset: 'FAST_BLUE',
      samples: 1,
      steps: 30,
      seed: seed || Math.floor(Math.random() * 1000000),
    }),
  });

  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    throw new Error(`Stability API ${response.status}: ${txt}`);
  }

  const data = await response.json();
  if (!data.artifacts || data.artifacts.length === 0) {
    throw new Error('No image generated');
  }

  const image = data.artifacts[0];
  return { url: `data:image/png;base64,${image.base64}` };
}
