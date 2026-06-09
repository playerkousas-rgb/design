/**
 * 後端圖片生成層（Edge Runtime 兼容）
 * 支援 Pollinations / Replicate / Stability AI / Together AI / Hugging Face
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
  const base64 = arrayBufferToBase64(arrayBuffer);
  return `data:${mimeType};base64,${base64}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
      case 'together':
        return await generateImageTogether(options);
      case 'huggingface':
      case 'hf':
        return await generateImageHuggingFace(options);
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

// ─── Together AI ─────────────────────────────────────
async function generateImageTogether(options: ImageGenerationOptions): Promise<ImageResult> {
  const { prompt, width = 1024, height = 1024 } = options;
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) throw new Error('TOGETHER_API_KEY not set in Vercel Environment Variables');

  const model = process.env.TOGETHER_MODEL || 'black-forest-labs/FLUX.1-schnell';

  const res = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      width,
      height,
      n: 1,
      response_format: 'url',
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Together API ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('Together API returned no image URL');
  }

  return await downloadAndConvert(imageUrl);
}

// ─── Hugging Face Inference API ────────────────────────
async function generateImageHuggingFace(options: ImageGenerationOptions): Promise<ImageResult> {
  const { prompt, seed } = options;
  const apiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error('HF_API_KEY (or HUGGINGFACE_API_KEY) not set in Vercel Environment Variables');

  const model = process.env.HF_MODEL || 'black-forest-labs/FLUX.1-schnell';
  const url = `https://api-inference.huggingface.co/models/${model}`;

  const body: any = { inputs: prompt };
  if (seed != null) body.parameters = { seed };

  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 503) {
      const text = await res.text().catch(() => '');
      let waitSeconds = 10;
      try {
        const json = JSON.parse(text);
        if (json.estimated_time) waitSeconds = Math.min(json.estimated_time, 30);
      } catch {}
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HuggingFace API ${res.status}: ${txt}`);
    }

    // Hugging Face returns binary image on success; occasionally JSON on weird errors
    const buffer = await res.arrayBuffer();
    const textPreview = new TextDecoder().decode(buffer.slice(0, 200)).trim();

    if (textPreview.startsWith('{')) {
      try {
        const json = JSON.parse(new TextDecoder().decode(buffer));
        if (json.error) {
          throw new Error(`HuggingFace API error: ${json.error}`);
        }
      } catch {}
      // If it's JSON but not a recognized error, just treat as blob (fallback)
    }

    const blob = new Blob([buffer]);
    const dataUrl = await blobToDataUrl(blob, 'image/png');
    return { url: dataUrl };
  }

  throw new Error('HuggingFace API timeout after retries');
}
