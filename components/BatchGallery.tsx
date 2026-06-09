'use client';

import React, { useState, useCallback } from 'react';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { IMAGE_API_BASE, POLLINATIONS_ANON_INTERVAL_MS, MAX_RETRIES, getRetryDelay } from '@/lib/pollinations';

interface BatchItem {
  id: number;
  seed: number;
  status: 'loading' | 'done' | 'error';
  dataUrl: string | null;
  error?: string;
}

interface BatchGalleryProps {
  prompt: string;
  onSelect: (dataUrl: string) => Promise<string>;
  onClose: () => void;
}

export default function BatchGallery({ prompt, onSelect, onClose }: BatchGalleryProps) {
  const [items, setItems] = useState<BatchItem[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      seed: Math.floor(Math.random() * 10000000),
      status: 'loading',
      dataUrl: null,
    }))
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [enhancing, setEnhancing] = useState(false);

  const buildUrl = (seed: number) => {
    const safePrompt = prompt.replace(/[\x00-\x1F]/g, ' ');
    const encoded = encodeURIComponent(safePrompt);
    return `${IMAGE_API_BASE}/${encoded}?width=1024&height=1024&model=flux&nologo=true&enhance=true&seed=${seed}`;
  };

  const generateOne = useCallback(async (item: BatchItem, index: number) => {
    let lastError: any;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const url = buildUrl(item.seed);
        const res = await fetch(url);
        if (!res.ok) {
        if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES - 1) {
          const delay = getRetryDelay(attempt);
          console.warn(`Pollinations image batch ${res.status} (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${Math.round(delay/1000)}s...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
          throw new Error(`HTTP ${res.status}`);
        }

        const blob = await res.blob();
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        setItems(prev => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'done', dataUrl };
          return next;
        });
        return;
      } catch (e: any) { lastError = e; }
    }
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'error', error: lastError?.message || 'Failed' };
      return next;
    });
  }, [prompt]);

  React.useEffect(() => {
    // 串行生成，間隔 16 秒（Pollinations 匿名 tier 限制 15 秒/次）
    let cancelled = false;
    async function run() {
      for (let i = 0; i < 4; i++) {
        if (cancelled) return;
        await generateOne(items[i], i);
        if (i < 3) await new Promise(r => setTimeout(r, POLLINATIONS_ANON_INTERVAL_MS));
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  const allDone = items.every(i => i.status === 'done' || i.status === 'error');
  const doneCount = items.filter(i => i.status === 'done').length;

  const handleSelectAndEnhance = async (item: BatchItem) => {
    if (!item.dataUrl || item.status !== 'done') return;
    setSelectedId(item.id);
    setEnhancing(true);
    try {
      await onSelect(item.dataUrl);
    } catch (e) {
      // onSelect 內部已處理 fallback
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
      <div className="flex items-center justify-between w-full max-w-4xl mb-4">
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-cyan-400" />
          <h2 className="text-sm font-black uppercase text-white tracking-widest">生成 4 張變體</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => handleSelectAndEnhance(item)}
            disabled={item.status !== 'done' || enhancing}
            className={`relative aspect-square rounded-2xl border-2 overflow-hidden transition-all group
              ${item.status === 'done' && !enhancing ? 'border-slate-600 hover:border-cyan-400 cursor-pointer' : 'border-slate-800 cursor-default'}
              ${selectedId === item.id ? 'ring-2 ring-cyan-400 border-cyan-400' : ''}
            `}
          >
            {item.status === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                <Loader2 size={32} className="text-cyan-400 animate-spin mb-2" />
                <p className="text-[10px] text-slate-400 font-black uppercase">變體 {idx + 1} 生成中...</p>
                <p className="text-[8px] text-slate-600 mt-1">需時約 {idx * 16}~{idx * 16 + 15} 秒</p>
              </div>
            )}
            {item.status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                <p className="text-[10px] text-red-400 font-bold">生成失敗</p>
                <p className="text-[8px] text-slate-500 mt-1">{item.error}</p>
              </div>
            )}
            {item.status === 'done' && item.dataUrl && (
              <>
                <img src={item.dataUrl} className="w-full h-full object-cover" alt={`變體 ${idx + 1}`} />
                <div className="absolute top-2 left-2 bg-slate-900/80 px-2 py-1 rounded text-[9px] font-black text-white uppercase">
                  變體 {idx + 1}
                </div>
                {selectedId === item.id && enhancing && (
                  <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center">
                    <Loader2 size={28} className="text-cyan-400 animate-spin mb-2" />
                    <p className="text-[10px] text-cyan-300 font-black uppercase">印刷級放大中...</p>
                  </div>
                )}
                {selectedId !== item.id && !enhancing && (
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-cyan-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase">選擇此圖</div>
                  </div>
                )}
                {selectedId === item.id && !enhancing && (
                  <div className="absolute top-2 right-2 bg-cyan-500 p-1.5 rounded-full">
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[9px] text-slate-400">
        <span>{doneCount}/4 完成</span>
        {allDone && <span className="text-cyan-400 font-bold">— 點擊任意圖片選擇</span>}
      </div>
    </div>
  );
}
