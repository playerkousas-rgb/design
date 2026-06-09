import { NextRequest, NextResponse } from 'next/server';

/**
 * 成品模擬 Prompt 組合 API
 * 不再呼叫任何外部 AI，只回傳組合好的 prompt
 * 前端直接從瀏覽器呼叫 Pollinations（匿名，不受 queue 限制）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      isTweak,
      formData,
      selectedCategory,
    } = body;

    const finalCraft = formData.path4.craft === '自訂' ? formData.path4.customCraft : formData.path4.craft;
    const finalType = formData.path4.type === '自訂' ? formData.path4.customType : (formData.path4.type || "Standard object");
    const refInstructions = formData.path3.inputs
      .filter((input: string) => input.trim() !== '')
      .map((input: string, idx: number) => `REFERENCE ${idx + 1}: ${input}`)
      .join(', ');

    let mockupEnginePrompt = "";
    if (selectedCategory === 'necker3d') {
      mockupEnginePrompt = `[SCOUT_WOGGLE_MOCKUP_ENGINE]
Item: ${finalType} 3D scout woggle.
PHYSICAL RULES: The 3D woggle structure (either with a rear ring or central holes) must correctly accommodate a scarf.
CONTEXT: A scout neckerchief is VERTICALLY passing through the woggle's holes. The scarf must be shown entering from the top and exiting from the bottom, following a clean vertical path.
TEXTURE: High-quality ${finalCraft} texture, realistic material rendering.
Lighting: Studio macro photography, sharp focus on the object, neutral professional studio background.`;
    } else {
      mockupEnginePrompt = `World-class professional product showcase. Professional 3D studio product photography of a real ${selectedCategory} (${finalType}) made of ${finalCraft}. High-end lighting, macro focus on materials, studio background.`;
    }

    const mPrompt = `${mockupEnginePrompt} ${isTweak ? 'MODIFICATION BASED ON: ' + formData.path5.preciseInstruction : ''} ${refInstructions}`.trim();

    const seed = isTweak ? undefined : Math.floor(Math.random() * 1000000);

    return NextResponse.json({
      prompt: mPrompt,
      seed,
    });

  } catch (e: any) {
    console.error('Mockup API error:', e);
    return NextResponse.json({ error: e.message || '組合失敗' }, { status: 500 });
  }
}
