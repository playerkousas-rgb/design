/**
 * AI Provider 抽象層
 * 未來可輕鬆擴充 HuggingFace / OpenAI / Gemini 等
 */

export interface TextGenerationOptions {
  systemPrompt?: string;
  temperature?: number;
  model?: string;
}

export interface ImageGenerationOptions {
  width?: number;
  height?: number;
  seed?: number;
  negativePrompt?: string;
  // 圖生圖用
  referenceImageBase64?: string;
}

export interface TextResult {
  text: string;
}

export interface ImageResult {
  base64: string;      // 不含 data URI 前綴的純 base64
  mimeType: string;
}

export interface AIProvider {
  name: string;
  /** 純文字生成（用來產設計 prompt + 中文解釋） */
  generateText(prompt: string, options?: TextGenerationOptions): Promise<TextResult>;
  /** 文生圖（可選，有些 Provider 由前端直接處理） */
  generateImage?(prompt: string, options?: ImageGenerationOptions): Promise<ImageResult>;
  /** 是否需要在 UI 顯示 API Key 輸入框 */
  requiresApiKey: boolean;
}

/** 根據環境或設定回傳對應 Provider（目前只實作 Pollinations） */
export function getProvider(): AIProvider {
  // 未來可讀取 process.env.AI_PROVIDER 或 user preference
  const { PollinationsProvider } = require('./pollinations');
  return new PollinationsProvider();
}
