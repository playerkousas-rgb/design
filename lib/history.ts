/**
 * 圖片歷史記錄與收藏管理
 * 使用 localStorage + Canvas 壓縮縮略圖
 */

export interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'design' | 'mockup';
  category: string;
  prompt: string;
  explanation?: string;
  /** 壓縮後的完整圖（最大 1024px 寬，JPEG 0.8） */
  imageDataUrl: string;
  /** 256×256 縮略圖（JPEG 0.6） */
  thumbnailDataUrl: string;
  isFavorite: boolean;
  /** 生成時的參數快照 */
  formDataSnapshot: {
    eventName: string;
    style: string;
    idea: string;
    textZh: string;
    textEn: string;
    craft: string;
    shape: string;
    type: string;
  };
  colorsSnapshot: string[];
  colorCountSnapshot: number;
  enhanceForPrint: boolean;
}

const HISTORY_KEY = 'tong-design-history-v1';
const MAX_HISTORY = 20;
const MAX_FAVORITES_DISPLAY = 50;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 用 Canvas 壓縮圖片 */
export function compressImage(
  dataUrl: string,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistoryList(items: HistoryItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export async function addHistoryItem(
  item: Omit<HistoryItem, 'id' | 'timestamp' | 'thumbnailDataUrl' | 'imageDataUrl' | 'isFavorite'>,
  fullImageDataUrl: string
): Promise<HistoryItem> {
  const history = getHistory();

  // 產生縮略圖與壓縮圖
  const [thumbnailDataUrl, imageDataUrl] = await Promise.all([
    compressImage(fullImageDataUrl, 256, 0.6),
    compressImage(fullImageDataUrl, 1024, 0.8),
  ]);

  const newItem: HistoryItem = {
    ...item,
    isFavorite: false,
    id: generateId(),
    timestamp: Date.now(),
    thumbnailDataUrl,
    imageDataUrl,
  };

  // 加到最前面，超過上限移除最舊的非收藏
  const newHistory = [newItem, ...history];
  while (newHistory.length > MAX_HISTORY) {
    const lastNonFavIdx = newHistory.map((i, idx) => ({ i, idx })).reverse().find(({ i }) => !i.isFavorite);
    if (lastNonFavIdx) {
      newHistory.splice(lastNonFavIdx.idx, 1);
    } else {
      newHistory.pop();
    }
  }

  saveHistoryList(newHistory);
  return newItem;
}

export function toggleFavorite(id: string): boolean {
  const history = getHistory();
  const item = history.find(h => h.id === id);
  if (!item) return false;
  item.isFavorite = !item.isFavorite;
  saveHistoryList(history);
  return item.isFavorite;
}

export function deleteHistoryItem(id: string) {
  const history = getHistory().filter(h => h.id !== id);
  saveHistoryList(history);
}

export function getFavorites(): HistoryItem[] {
  return getHistory().filter(h => h.isFavorite);
}

export function clearAllHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}

/** 從歷史項目還原需要的狀態 */
export function restoreFromHistory(item: HistoryItem) {
  return {
    category: item.category,
    colors: item.colorsSnapshot,
    colorCount: item.colorCountSnapshot,
    enhanceForPrint: item.enhanceForPrint,
    formData: {
      path1: {
        eventName: item.formDataSnapshot.eventName,
        style: item.formDataSnapshot.style,
        idea: item.formDataSnapshot.idea,
        textZh: item.formDataSnapshot.textZh,
        textEn: item.formDataSnapshot.textEn,
        audience: '',
        emotion: '',
      },
      path4: {
        craft: item.formDataSnapshot.craft,
        shape: item.formDataSnapshot.shape,
        type: item.formDataSnapshot.type,
        customCraft: '',
        customShape: '',
        customType: '',
      },
      path3: { files: [null, null, null], fileBase64s: [null, null, null], inputs: ['', '', ''] },
      path5: { preciseInstruction: '' },
    } as any,
  };
}
