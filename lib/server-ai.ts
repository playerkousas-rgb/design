/**
 * 後端 AI 呼叫層（OpenAI-compatible）
 * 支援 DeepSeek / OpenRouter / Groq / 任何 OpenAI API 格式的 Provider
 * 讀取 Vercel Environment Variables：LLM_BASE_URL + LLM_API_KEY + LLM_MODEL
 */

export interface LLMResult {
  prompt: string;
  explanation: string;
}

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<LLMResult> {
  const baseUrl = process.env.LLM_BASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-3.5-turbo';

  if (!baseUrl || !apiKey) {
    throw new Error('後端未配置 LLM API Key。請聯繫管理員在 Vercel Environment Variables 設定 LLM_BASE_URL、LLM_API_KEY、LLM_MODEL。');
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt + '\n\nCRITICAL: You must respond in valid JSON with exactly two fields: "prompt" (English, detailed image generation prompt) and "explanation" (Chinese, designer\'s reasoning).' },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2048,
        stream: false,
      }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`LLM API ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';

  // 多層 JSON fallback
  try {
    const parsed = JSON.parse(text);
    return {
      prompt: parsed.prompt || text,
      explanation: parsed.explanation || 'AI 設計師已生成設計概念。',
    };
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          prompt: parsed.prompt || text,
          explanation: parsed.explanation || 'AI 設計師已生成設計概念。',
        };
      } catch {}
    }
    const lines = text.split('\n');
    return { prompt: lines[0] || text, explanation: lines.slice(1).join('\n') || 'AI 設計師已生成設計概念。' };
  }
}
