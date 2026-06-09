# 童設計 AI - Scout Design Generator

AI 驅動的童軍徽章、巾圈與紀念品設計工作室。支援 AI 視覺聯想、AI 繪圖、設計微調與成品模擬。

**預設 AI Provider：Pollinations AI** — 完全免費、無需 API Key、香港可用、開箱即用。

---

## 功能特色

- 🤖 **AI 設計生成**：輸入活動名稱、風格、概念，AI 自動生成設計圖
- 🎨 **配色控制**：1-16 色自由調配，支援隨機配色
- 🖼️ **參考上傳**：可上傳最多 3 張參考圖並給予精確指令
- 🔧 **工藝選單**：徽章、2D 巾圈、3D 巾圈、紀念品等多種類型
- ✏️ **設計微調**：對已生成設計進行精確修改
- 📦 **成品模擬**：一鍵生成 3D 產品攝影級成品圖
- 📄 **規格書匯出**：匯出 HTML 設計生產規格書

---

## 技術架構

| 層級 | 技術 | 說明 |
|------|------|------|
| 前端 | Next.js 15 + React 19 + Tailwind CSS v4 | 互動式設計面板 |
| 後端 | Next.js App Router API Routes | Serverless 代理層 |
| AI 文字 | Pollinations `text.pollinations.ai` | 設計指令生成（Gemini / GPT） |
| AI 圖片 | Pollinations `image.pollinations.ai` | Flux 模型文生圖 |
| 部署 | Vercel | 一鍵部署，全球 CDN |

**為什麼選 Pollinations？**
- ✅ **香港可用**：無地域封鎖
- ✅ **完全免費**：匿名即可使用，無需信用卡
- ✅ **無需申請**：用戶打開網站就能開始生圖
- ✅ **品質足夠**：Flux 模型適合設計概念草圖與產品模擬
- ✅ **架構彈性**：後端已預留 Provider 抽象層，未來可輕鬆切換 Gemini / HuggingFace / OpenAI

---

## 快速開始

### 本機開發

```bash
# 1. 複製專案
git clone <你的-repo-url>
cd scout-design-ai

# 2. 安裝依賴
npm install

# 3. 啟動（Pollinations 不需要 API Key！）
npm run dev

# 4. 開啟 http://localhost:3000
```

> 💡 **注意**：Pollinations 完全免費，`.env.local` 可以留空。未來若需使用 Gemini / HuggingFace / OpenAI，再填入對應 Key。

### 部署到 Vercel

```bash
# 1. 上傳到 GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的帳號/你的-repo.git
git push -u origin main

# 2. Vercel 一鍵部署
npx vercel
# 或登入 https://vercel.com → Import Git Repository
```

因為 Pollinations 不需要環境變數，部署流程極為簡單——連環境變數設定都可以跳過。

---

## Provider 架構（未來擴充指南）

目前後端使用 `lib/ai-providers.ts` 抽象層 + `lib/pollinations.ts` 實作。要新增其他 Provider：

1. **新增 Provider 檔案**（如 `lib/huggingface.ts`）
2. **實作 `AIProvider` 介面**：`generateText()` + `generateImage()`
3. **在 `getProvider()` 中根據設定回傳對應實例**
4. **前端新增設定面板**讓用戶選擇 Provider 並輸入對應 API Key

```typescript
// lib/ai-providers.ts
export interface AIProvider {
  name: string;
  requiresApiKey: boolean;
  generateText(prompt: string, options?: TextGenerationOptions): Promise<TextResult>;
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageResult>;
}
```

---

## 常見問題

### Q: 圖片生成很慢或失敗？
A: Pollinations 是免費社群資源，匿名 rate limit 約 **15 秒/次**。高峰期可能較慢，建議：
- 稍等片刻重試
- 在 `auth.pollinations.ai` 免費註冊，可提升到 **5 秒/次** 並移除水印
- 未來可考慮自備付費 API Key 切換到更高階 Provider

### Q: 圖片品質不夠精細？
A: Pollinations 的 Flux 模型適合 **設計概念草圖** 與 **產品模擬**。若需印刷級精細度，後續可：
- 切換到 Hugging Face（免費，需註冊）使用 SDXL / Flux Dev
- 切換到付費方案如 DALL-E 3、Imagen 4、Midjourney API

### Q: 可以讓朋友使用嗎？
A: 部署到 Vercel 後分享網址即可。因為 Pollinations 免費且從**後端統一呼叫**，rate limit 是按伺服器計算，多個朋友同時使用不會互相影響（但整體仍受 Pollinations 伺服器容量限制）。

### Q: 支援中文提示詞嗎？
A: Flux 模型對中文理解不錯，但建議在「設計概念」欄位用**繁體中文**描述創意，後端會自動轉為詳細的英文圖像 prompt。

---

## License

MIT
