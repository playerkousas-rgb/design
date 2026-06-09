import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/server-ai';

/**
 * 設計 Prompt 組合 API
 * 只回傳 systemPrompt + userPrompt + seed，零外部呼叫
 * 前端直接 GET text.pollinations.ai 潤色
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      isTweak,
      formData,
      selectedCategory,
      colors,
      colorCount,
    } = body;

    const selectedColors = colors.slice(0, colorCount);
    const currentShape = formData.path4.shape === '自訂' ? formData.path4.customShape : formData.path4.shape;
    const currentType = formData.path4.type === '自訂' ? formData.path4.customType : formData.path4.type;
    const isWoggle = selectedCategory.includes('necker');
    const designSubject = selectedCategory === 'badge' ? 'graphic badge/patch' : isWoggle ? 'accessory ring' : 'custom souvenir';

    const refInstructions = formData.path3.inputs
      .filter((input: string) => input.trim() !== '')
      .map((input: string, idx: number) => `REFERENCE IMAGE ${idx + 1} GOAL: ${input}`)
      .join('\n');

    const systemPrompt = `You are a World-class professional designer.
TASK: Generate a professional 2D graphic design ${isTweak ? '(REFINEMENT OF PREVIOUS DESIGN)' : '(NEW CONCEPT)'} for a ${designSubject}.
EVENT: ${formData.path1.eventName}.
IDEAS: ${formData.path1.idea}.
TEXT: ${formData.path1.textZh} ${formData.path1.textEn}.
STYLE: ${formData.path1.style}.
COLORS: ${selectedColors.join(', ')}.
SHAPE: ${currentShape}.
TYPE: ${currentType}.
${isTweak ? `MODIFICATION REQUEST: ${formData.path5.preciseInstruction}` : ''}
${refInstructions}

PHYSICAL RULES FOR 2D WOGGLE:
- If 2-hole: The design is a flat rectangle with an oblong opening at the top and bottom.
- If 3-hole: Overall Appearance: It presents an inverted triangle shape with rounded corners, and the top edge is relatively flat or slightly curved. Hole: There is a round hole on each of the top left and right sides, and another round hole in the bottom center.
- If Loop: The design is a flat, elongated shape with buttons at both ends.

REFERENCE SYSTEM MODE: If a user provides an image and says "duplicate" or "reference strictly", match the subject, line weight, and composition exactly while adapting to the Scout context.
CRITICAL: Do NOT use generic placeholder text. Focus on professional 2D graphic design on a pure white background.

You must respond in valid JSON with exactly two fields: "prompt" (English, detailed image generation prompt) and "explanation" (Chinese, designer's reasoning).`;

    const userPrompt = isTweak
      ? `Please refine the previous design according to these new instructions: ${formData.path5.preciseInstruction || 'improve overall quality'}. Previous design concept: ${formData.path1.idea}. Style: ${formData.path1.style}.`
      : `Start new design process. Event: ${formData.path1.eventName}, Concept: ${formData.path1.idea}`;

    const seed = isTweak ? undefined : Math.floor(Math.random() * 1000000);

    // 嘗試後端呼叫 LLM 潤色（Vercel 美國 IP，不會被封）
    try {
      const llmResult = await callLLM(systemPrompt, userPrompt);
      return NextResponse.json({
        finalPrompt: llmResult.prompt,
        explanation: llmResult.explanation,
        seed,
        provider: process.env.LLM_MODEL || 'configured-llm',
      });
    } catch (llmErr: any) {
      console.warn('LLM call failed:', llmErr.message);
      // LLM 失敗時，構建簡短可用的圖片 prompt，避免 URL 過長
      const shortPrompt = `Professional 2D ${designSubject} design, ${currentShape} shape, pure white background, high detail. Theme: ${formData.path1.eventName || 'Scout event'} - ${formData.path1.idea}. Style: ${formData.path1.style || 'modern flat illustration'}. Colors: ${selectedColors.join(', ')}. ${currentType} production ready. Clean vector-like flat illustration, no generic placeholder text.`;
      return NextResponse.json({
        finalPrompt: shortPrompt,
        explanation: `⚠️ LLM 潤色失敗：${llmErr.message}。已使用簡化 prompt 直接出圖。`,
        seed,
        provider: 'fallback-raw',
        llmError: llmErr.message,
      }, { status: 200 });
    }

  } catch (e: any) {
    console.error('Design API error:', e);
    return NextResponse.json({ error: e.message || '組合失敗' }, { status: 500 });
  }
}
