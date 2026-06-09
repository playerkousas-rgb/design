/**
 * Pollinations AI Provider
 * - 文字：POST https://text.pollinations.ai/openai（OpenAI-compatible）
 * - 圖片：前端直接 GET image.pollinations.ai（避免 Vercel 10s timeout）
 * - 完全免費，無需 API Key，香港可用
 */

import { AIProvider, TextGenerationOptions, TextResult } from './ai-providers';

const TEXT_API_URL = 'https://text.pollinations.ai/openai';
export const IMAGE_API_BASE = 'https://image.pollinations.ai/prompt';

/** Pollinations 匿名 tier rate limit: 1 req / 15s。實際間隔設 20s，提供重試緩衝。 */
export const POLLINATIONS_ANON_INTERVAL_MS = 20000;

/** 最大重試次數（指數退避） */
export const MAX_RETRIES = 5;

/** 指數退避計算：第 0 次 base 20s，每次翻倍 + 隨機 jitter */
export function getRetryDelay(attemptIndex: number): number {
  const base = POLLINATIONS_ANON_INTERVAL_MS * (attemptIndex + 1);
  const jitter = Math.floor(Math.random() * 5000);
  return base + jitter;
}

export class PollinationsProvider implements AIProvider {
  name = 'Pollinations';
  requiresApiKey = false;

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextResult> {
    const messages = options?.systemPrompt
      ? [
          { role: 'system' as const, content: options.systemPrompt },
          { role: 'user' as const, content: prompt },
        ]
      : [{ role: 'user' as const, content: prompt }];

    const res = await fetch(TEXT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || 'gemini',
        messages,
        temperature: options?.temperature ?? 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Pollinations text API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { text };
  }

  /** 圖片 URL 不實際 fetch，留給前端/後端各自處理 */
  buildImageUrl(prompt: string, options?: { width?: number; height?: number; seed?: number; nologo?: boolean; enhance?: boolean }): string {
    const safePrompt = prompt.replace(/[\x00-\x1F]/g, ' ');
    const encodedPrompt = encodeURIComponent(safePrompt);
    const params = new URLSearchParams();
    params.set('width', String(options?.width || 1024));
    params.set('height', String(options?.height || 1024));
    params.set('model', 'flux');
    params.set('nologo', String(options?.nologo !== false));
    params.set('enhance', String(options?.enhance !== false));
    if (options?.seed != null) params.set('seed', String(options.seed));
    return `${IMAGE_API_BASE}/${encodedPrompt}?${params.toString()}`;
  }
}
