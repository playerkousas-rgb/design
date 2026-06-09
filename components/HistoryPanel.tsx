'use client';

import React, { useState, useEffect } from 'react';
import { X, Heart, Trash2, Clock, Star, RotateCcw, Download } from 'lucide-react';
import { getHistory, toggleFavorite, deleteHistoryItem, HistoryItem, clearAllHistory } from '@/lib/history';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (item: HistoryItem) => void;
}

export default function HistoryPanel({ isOpen, onClose, onRestore }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) refresh();
  }, [isOpen]);

  const refresh = () => {
    setItems(getHistory());
  };

  const handleToggleFav = (id: string) => {
    toggleFavorite(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteHistoryItem(id);
    refresh();
  };

  const handleClear = () => {
    if (confirm('確定要清空所有歷史記錄嗎？收藏的項目也會被刪除。')) {
      clearAllHistory();
      refresh();
    }
  };

  const displayed = filter === 'favorites' ? items.filter(i => i.isFavorite) : items;

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Clock size={16} className="text-cyan-400" />
            歷史記錄
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors ${filter === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            全部 ({items.length})
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center gap-1 ${filter === 'favorites' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            <Star size={10} /> 收藏 ({items.filter(i => i.isFavorite).length})
          </button>
          <div className="flex-1" />
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-950/50 text-red-400 hover:bg-red-900/70 transition-colors flex items-center gap-1"
          >
            <Trash2 size={10} /> 清空
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {displayed.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 text-xs font-bold">
                {filter === 'favorites' ? '尚無收藏項目' : '尚無歷史記錄'}
              </p>
              <p className="text-slate-600 text-[10px] mt-1">生成設計圖後會自動保存</p>
            </div>
          )}
          {displayed.map(item => (
            <div key={item.id} className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden group">
              <div className="flex gap-3 p-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                  <img src={item.thumbnailDataUrl} className="w-full h-full object-cover" alt="縮略圖" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${item.type === 'design' ? 'bg-cyan-900/50 text-cyan-400' : 'bg-indigo-900/50 text-indigo-400'}`}>
                      {item.type === 'design' ? '設計圖' : '成品模擬'}
                    </span>
                    <span className="text-[8px] text-slate-500 uppercase">{item.category}</span>
                    <span className="text-[8px] text-slate-600 ml-auto">{new Date(item.timestamp).toLocaleDateString('zh-HK')}</span>
                  </div>
                  <p className="text-[9px] text-slate-300 font-medium truncate">{item.formDataSnapshot.eventName || '未命名活動'}</p>
                  <p className="text-[8px] text-slate-500 truncate mt-0.5">{item.prompt.slice(0, 60)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-3 pb-3">
                <button
                  onClick={() => onRestore(item)}
                  className="flex-1 py-2 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 rounded-lg text-[9px] font-black uppercase transition-colors flex items-center justify-center gap-1"
                >
                  <RotateCcw size={10} /> 載入參數
                </button>
                <a
                  href={item.imageDataUrl}
                  download={`tong-design-${item.id}.jpg`}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <Download size={14} />
                </a>
                <button
                  onClick={() => handleToggleFav(item.id)}
                  className={`px-3 py-2 rounded-lg transition-colors ${item.isFavorite ? 'bg-rose-900/30 text-rose-400' : 'bg-slate-800 text-slate-400 hover:text-rose-400'}`}
                >
                  <Heart size={14} className={item.isFavorite ? 'fill-current' : ''} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
