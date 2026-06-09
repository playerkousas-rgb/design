'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Info, Palette, ImageIcon, Box, Sliders,
  Wand2, Lock, Unlock, Loader2,
  UploadCloud, X, Download, Sparkles, Image as ImageIcon2,
  Users, Trash2, Zap, Eraser, Shuffle, Heart,
  Maximize2, FileCode, Copy, AlertTriangle,
  Layers, History
} from 'lucide-react';
import { t, CATEGORY_CONFIG } from '@/lib/constants';
import { addHistoryItem, restoreFromHistory, HistoryItem } from '@/lib/history';
// 圖片生成已統一由後端 /api/generate-image 處理
import BatchGallery from './BatchGallery';
import HistoryPanel from './HistoryPanel';

/** 後端生成圖片 API */
async function generateImage(prompt: string, seed?: number): Promise<string> {
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, seed }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Image API ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data.url;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('path1');
  const [selectedCategory, setSelectedCategory] = useState('badge');
  const [isCategoryLocked, setIsCategoryLocked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'clean'|'craft'>('clean');
  const [customError, setCustomError] = useState<string|null>(null);
  const [providerName] = useState('Pollinations');

  const [formData, setFormData] = useState({
    path1: { eventName: '', style: '', idea: '', textZh: '', textEn: '', audience: '', emotion: '' },
    path3: { files: [null, null, null] as (File|null)[], fileBase64s: [null, null, null] as (string|null)[], inputs: ['', '', ''] },
    path4: { craft: '機繡/電腦刺繡', shape: '圓形', type: '', customCraft: '', customShape: '', customType: '' },
    path5: { preciseInstruction: '' }
  });

  const [colors, setColors] = useState(Array(16).fill('#4F46E5'));
  const [colorCount, setColorCount] = useState(8);
  const [useAIExpansion, setUseAIExpansion] = useState(true);
  const [allowAIDraw, setAllowAIDraw] = useState(true);
  const [designImage, setDesignImage] = useState<string|null>(null);
  const [mockupImage, setMockupImage] = useState<string|null>(null);
  const [designPrompt, setDesignPrompt] = useState('');
  const [mockupPrompt, setMockupPrompt] = useState('');
  const [designExplanation, setDesignExplanation] = useState('');
  const [enhanceForPrint, setEnhanceForPrint] = useState(false);
  const [imageInfo, setImageInfo] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string|null>(null);

  // Batch & History
  const [showBatch, setShowBatch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [batchPrompt, setBatchPrompt] = useState('');
  const processingRef = useRef(false);

  useEffect(() => {
    if (!isCategoryLocked) {
      setFormData(prev => ({
        ...prev,
        path4: {
          ...prev.path4,
          craft: CATEGORY_CONFIG[selectedCategory]?.crafts[0] || '',
          shape: CATEGORY_CONFIG[selectedCategory]?.shapes[0] || '',
          type: CATEGORY_CONFIG[selectedCategory]?.types[0] || '',
          customCraft: '',
          customShape: '',
          customType: ''
        }
      }));
    }
  }, [selectedCategory, isCategoryLocked]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        const newBase64s = [...formData.path3.fileBase64s];
        newBase64s[index] = base64;
        const newFiles = [...formData.path3.files];
        newFiles[index] = file;
        setFormData({ ...formData, path3: { ...formData.path3, files: newFiles, fileBase64s: newBase64s, inputs: formData.path3.inputs } });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (index: number) => {
    const newBase64s = [...formData.path3.fileBase64s];
    newBase64s[index] = null;
    const newFiles = [...formData.path3.files];
    newFiles[index] = null;
    setFormData({ ...formData, path3: { ...formData.path3, files: newFiles, fileBase64s: newBase64s, inputs: formData.path3.inputs } });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadAsPNG = (dataUrl: string|null, name: string) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${name}_${Date.now()}.png`;
    link.click();
  };

  const downloadAsHTMLReport = () => {
    if (!designImage) return;
    const hexColors = colors.slice(0, colorCount);
    const colorSection = hexColors.map(c => `<div style="display:flex; align-items:center; margin-bottom:8px;"><div style="width:40px; height:40px; background:${c}; border-radius:4px; margin-right:12px;"></div><div><b style="font-size:12px;">HEX: ${c}</b></div></div>`).join('');
    const htmlContent = `<!DOCTYPE html><html><head><title>規格書</title><style>body{font-family:sans-serif;padding:40px;color:#333;}.container{max-width:800px;margin:auto;}.img-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0;}img{width:100%;border-radius:8px;border:1px solid #ddd;}</style></head><body><div class="container"><h1>設計生產規格書 - ${formData.path1.eventName || '未命名'}</h1><div class="img-grid"><div><p>設計圖</p><img src="${designImage}"/></div><div><p>成品模擬圖</p><img src="${mockupImage || designImage}"/></div></div><div class="section"><h3>配色方案</h3><div style="display:grid; grid-template-columns: repeat(4,1fr); gap:10px;">${colorSection}</div></div><div class="section"><h3>精確指令</h3><p>${formData.path5.preciseInstruction || '無'}</p></div></div></body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Specification_${Date.now()}.html`;
    link.click();
  };

  const handleClearAll = () => {
    setDesignImage(null);
    setMockupImage(null);
    setDesignPrompt('');
    setMockupPrompt('');
    setDesignExplanation('');
    setViewMode('clean');
    setCustomError(null);
    setImageInfo(null);
  };

  const autoSaveHistory = async (type: 'design'|'mockup', imageDataUrl: string, prompt: string, explanation?: string) => {
    try {
      await addHistoryItem({
        type,
        category: selectedCategory,
        prompt,
        explanation,
        formDataSnapshot: {
          eventName: formData.path1.eventName,
          style: formData.path1.style,
          idea: formData.path1.idea,
          textZh: formData.path1.textZh,
          textEn: formData.path1.textEn,
          craft: formData.path4.craft,
          shape: formData.path4.shape,
          type: formData.path4.type,
        },
        colorsSnapshot: colors,
        colorCountSnapshot: colorCount,
        enhanceForPrint,
      }, imageDataUrl);
    } catch (e) {
      console.warn('History save failed:', e);
    }
  };

  const handleEnhanceImage = async (dataUrl: string, type: 'design'|'mockup') => {
    try {
      const base64 = dataUrl.split(',')[1];
      const mime = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: mime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const enhancedUrl = `data:${data.mimeType || 'image/png'};base64,${data.image}`;
      if (type === 'design') setDesignImage(enhancedUrl);
      else setMockupImage(enhancedUrl);
      if (data.processedInfo) setImageInfo({ type, ...data.processedInfo });
    } catch (e) {
      console.warn('Enhance failed, keeping original:', e);
    }
  };

  // 架構：後端組合 systemPrompt + userPrompt → 前端 GET text.pollinations.ai 潤色 (繞過 POST /openai queue) → image.pollinations.ai 出圖 → /api/enhance 印刷級放大

  const handleGenerateDesign = async (isTweak = false) => {
    if (selectedCategory === 'necker3d') {
      handleGenerateMockup(isTweak);
      return;
    }
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setCustomError(null);
    setImageInfo(null);
    try {
      const promptRes = await fetch('/api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTweak, formData, selectedCategory, colors, colorCount }),
      });
      const promptData = await promptRes.json();
      if (!promptRes.ok) throw new Error(promptData.error || t.errors.generic);

      if (!allowAIDraw) {
        return;
      }

      setStatusMessage(promptData.provider === 'fallback-raw' ? '⚠️ LLM 潤色失敗，使用原始 prompt...' : 'LLM 設計師已完成圖紙，正在生成圖片...');
      setDesignPrompt(promptData.finalPrompt || '');
      setDesignExplanation(promptData.explanation || '');
      setStatusMessage('正在生成圖片...');

      const dataUrl = await generateImage(promptData.finalPrompt || '', promptData.seed);
      setDesignImage(dataUrl);
      setStatusMessage(null);
      await autoSaveHistory('design', dataUrl, promptData.finalPrompt || '', promptData.explanation || '');

      if (enhanceForPrint) {
        await handleEnhanceImage(dataUrl, 'design');
      }
    } catch (e: any) {
      setCustomError(e.message || t.errors.generic);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  const handleGenerateMockup = async (isTweak = false) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setCustomError(null);
    setImageInfo(null);
    try {
      const promptRes = await fetch('/api/mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTweak, formData, selectedCategory }),
      });
      const promptData = await promptRes.json();
      if (!promptRes.ok) throw new Error(promptData.error || t.errors.generic);

      if (!allowAIDraw) {
        return;
      }

      const mPrompt = promptData.prompt;
      setMockupPrompt(mPrompt);
      setStatusMessage('正在生成成品模擬圖...');

      const dataUrl = await generateImage(mPrompt, promptData.seed);
      setMockupImage(dataUrl);
      setViewMode('craft');
      setStatusMessage(null);
      await autoSaveHistory('mockup', dataUrl, mPrompt);

      if (enhanceForPrint) {
        await handleEnhanceImage(dataUrl, 'mockup');
      }
    } catch (e: any) {
      setCustomError(e.message || t.errors.generic);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  // 批次生成：前端直連 Pollinations 4 張，選中後再送後端放大
  const handleBatchGenerate = () => {
    if (!designPrompt) {
      handleGenerateDesign(false);
      return;
    }
    setBatchPrompt(designPrompt);
    setShowBatch(true);
  };

  const handleBatchSelect = async (rawDataUrl: string): Promise<string> => {
    if (!enhanceForPrint) {
      setDesignImage(rawDataUrl);
      setViewMode('clean');
      await autoSaveHistory('design', rawDataUrl, designPrompt, designExplanation);
      return rawDataUrl;
    }
    await handleEnhanceImage(rawDataUrl, 'design');
    setViewMode('clean');
    await autoSaveHistory('design', designImage || rawDataUrl, designPrompt, designExplanation);
    return designImage || rawDataUrl;
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    const restored = restoreFromHistory(item);
    setSelectedCategory(restored.category);
    setColors(restored.colors);
    setColorCount(restored.colorCount);
    setEnhanceForPrint(restored.enhanceForPrint);
    setFormData(prev => ({
      ...prev,
      path1: { ...prev.path1, ...restored.formData.path1 },
      path4: { ...prev.path4, ...restored.formData.path4 },
    }));
    setShowHistory(false);
    setActiveTab('path1');
  };

  const canGenMockup = !!designImage || !allowAIDraw || selectedCategory === 'necker3d';

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans flex flex-col relative overflow-x-hidden">
      {/* Batch Gallery Overlay */}
      {showBatch && (
        <BatchGallery
          prompt={batchPrompt}
          onSelect={handleBatchSelect}
          onClose={() => setShowBatch(false)}
        />
      )}

      {/* History Panel */}
      <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} onRestore={handleRestoreHistory} />

      <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 p-1.5 rounded-lg shadow-lg"><Shield size={20} /></div>
          <h1 className="text-lg font-black italic uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">{t.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-slate-600 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <History size={12} /> 歷史
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            <Unlock size={12}/> {providerName}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 w-full">
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-700 overflow-hidden flex-1 flex flex-col">
            <div className="flex bg-slate-950 p-2 gap-1 border-b border-slate-800">
              {(['path1', 'path2', 'path3', 'path4', 'path5'] as const).map((id) => (
                <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${activeTab === id ? 'bg-slate-800 text-cyan-300 shadow-md' : 'text-slate-400'}`}>
                  {id === 'path1' && <Info size={14}/>}
                  {id === 'path2' && <Palette size={14}/>}
                  {id === 'path3' && <ImageIcon size={14}/>}
                  {id === 'path4' && <Box size={14}/>}
                  {id === 'path5' && <Sliders size={14}/>}
                  {t.tabs[id as keyof typeof t.tabs]}
                </button>
              ))}
            </div>

            <div className="p-6 h-[480px] overflow-y-auto bg-slate-900 custom-scrollbar">
              {activeTab === 'path1' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-2"><Wand2 size={14} className={useAIExpansion ? 'text-cyan-400' : 'text-slate-500'} /><span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{t.fields.aiExpand}</span></div>
                      <button onClick={() => setUseAIExpansion(!useAIExpansion)} className={`w-10 h-5 rounded-full relative transition-colors ${useAIExpansion ? 'bg-cyan-600' : 'bg-slate-600'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useAIExpansion ? 'right-1' : 'left-1'}`} /></button>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-2">{allowAIDraw ? <ImageIcon2 size={14} className="text-cyan-400" /> : <ImageIcon2 size={14} className="text-slate-500" />}<span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{t.fields.aiDraw}</span></div>
                      <button onClick={() => setAllowAIDraw(!allowAIDraw)} className={`w-10 h-5 rounded-full relative transition-colors ${allowAIDraw ? 'bg-cyan-600' : 'bg-slate-600'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${allowAIDraw ? 'right-1' : 'left-1'}`} /></button>
                    </div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.eventName}</label><input className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-white" value={formData.path1.eventName} onChange={(e) => setFormData({...formData, path1: {...formData.path1, eventName: e.target.value}})} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.textZh}</label><input className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs" value={formData.path1.textZh} onChange={(e) => setFormData({...formData, path1: {...formData.path1, textZh: e.target.value}})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.textEn}</label><input className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs" value={formData.path1.textEn} onChange={(e) => setFormData({...formData, path1: {...formData.path1, textEn: e.target.value}})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1"><Users size={10}/> {t.fields.audience}</label><input className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs" value={formData.path1.audience} onChange={(e) => setFormData({...formData, path1: {...formData.path1, audience: e.target.value}})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1"><Heart size={10}/> {t.fields.emotion}</label><input className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs" value={formData.path1.emotion} onChange={(e) => setFormData({...formData, path1: {...formData.path1, emotion: e.target.value}})} /></div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.style}</label><input className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs" placeholder={t.fields.stylePlaceholder} value={formData.path1.style} onChange={(e) => setFormData({...formData, path1: {...formData.path1, style: e.target.value}})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.concept}</label><textarea className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs h-32 resize-none" placeholder={t.fields.conceptPlaceholder} value={formData.path1.idea} onChange={(e) => setFormData({...formData, path1: {...formData.path1, idea: e.target.value}})} /></div>
                </div>
              )}
              {activeTab === 'path2' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between"><div className="flex flex-col"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.colorControl} ({colorCount})</label><input type="range" min={1} max={16} value={colorCount} onChange={(e) => setColorCount(parseInt(e.target.value))} className="w-32 accent-cyan-400 mt-1" /></div><button onClick={() => setColors(colors.map(() => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')))} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-[10px] font-black transition-all active:scale-95"><Shuffle size={12}/> {t.fields.randomColor}</button></div>
                  <div className="grid grid-cols-4 gap-3">{colors.map((color, i) => (<div key={i} className={`relative aspect-square rounded-lg border-2 transition-all overflow-hidden ${i < colorCount ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'border-slate-800 opacity-20'}`}><input type="color" value={color} onChange={(e) => { const newC = [...colors]; newC[i] = e.target.value; setColors(newC); }} className="absolute inset-0 w-full h-full cursor-pointer opacity-0" /><div className="w-full h-full" style={{ backgroundColor: color }} /></div>))}</div>
                </div>
              )}
              {activeTab === 'path3' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">{[0, 1, 2].map(i => (
                    <div key={i} className="bg-slate-800/30 p-3 rounded-2xl border border-slate-700/50 space-y-3">
                      <div className="relative aspect-[4/1] group">
                        <div onClick={() => !formData.path3.fileBase64s[i] && document.getElementById(`fileInput-${i}`)?.click()} className="w-full h-full border-2 border-dashed border-slate-700 rounded-xl p-3 text-center hover:border-cyan-500 transition-colors cursor-pointer flex flex-col items-center gap-1 justify-center overflow-hidden">
                          {formData.path3.fileBase64s[i] ? (<img src={`data:image/png;base64,${formData.path3.fileBase64s[i]}`} className="absolute inset-0 w-full h-full object-cover rounded-xl" alt="Ref" />) : (<><UploadCloud size={18} className="text-slate-500" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">附件 {i+1}</span></>)}
                          <input type="file" id={`fileInput-${i}`} className="hidden" onChange={(e) => handleFileUpload(e, i)} accept="image/*" />
                        </div>
                        {formData.path3.fileBase64s[i] && (<button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 z-10"><X size={10} /></button>)}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">精確指令 {i+1}</label>
                        <input className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-[10px]" placeholder={t.fields.refPlaceholder} value={formData.path3.inputs[i]} onChange={(e) => {
                          const newInputs = [...formData.path3.inputs];
                          newInputs[i] = e.target.value;
                          setFormData({...formData, path3: {...formData.path3, inputs: newInputs}});
                        }} />
                      </div>
                    </div>
                  ))}</div>
                </div>
              )}
              {activeTab === 'path4' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-700 flex-1">
                      {Object.keys(t.categories).map(id => (
                        <button key={id} disabled={isCategoryLocked} onClick={() => setSelectedCategory(id)} className={`py-2 rounded-lg text-[8px] font-black transition-all ${selectedCategory === id ? 'bg-slate-800 text-cyan-300 shadow-sm' : 'text-slate-400 opacity-60'}`}>{t.categories[id as keyof typeof t.categories]}</button>
                      ))}
                    </div>
                    <button onClick={() => setIsCategoryLocked(!isCategoryLocked)} className={`p-2.5 rounded-xl border transition-all ${isCategoryLocked ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}><Lock size={14}/></button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.craftMenu}</label><select className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs font-bold" value={formData.path4.craft} onChange={(e) => setFormData({...formData, path4: {...formData.path4, craft: e.target.value}})}>{CATEGORY_CONFIG[selectedCategory]?.crafts.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    {formData.path4.craft === '自訂' && (
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.craftMenu} (自訂)</label><input className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs" placeholder={t.fields.customCraftPlaceholder} value={formData.path4.customCraft} onChange={(e) => setFormData({...formData, path4: {...formData.path4, customCraft: e.target.value}})} /></div>
                    )}
                    {CATEGORY_CONFIG[selectedCategory]?.shapes?.length > 0 && (
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{selectedCategory === 'necker' || selectedCategory === 'souvenir' ? t.fields.logoShapeMenu : t.fields.shapeMenu}</label><select className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs font-bold" value={formData.path4.shape} onChange={(e) => setFormData({...formData, path4: {...formData.path4, shape: e.target.value}})}>{CATEGORY_CONFIG[selectedCategory]?.shapes.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    )}
                    {formData.path4.shape === '自訂' && (
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.shapeMenu} (自訂)</label><input className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs" placeholder={t.fields.customShapePlaceholder} value={formData.path4.customShape} onChange={(e) => setFormData({...formData, path4: {...formData.path4, customShape: e.target.value}})} /></div>
                    )}
                    {selectedCategory !== 'badge' && selectedCategory !== 'necker3d' && selectedCategory !== 'souvenir' && (
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.souvenirType}</label><select className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs font-bold" value={formData.path4.type} onChange={(e) => setFormData({...formData, path4: {...formData.path4, type: e.target.value}})}>{CATEGORY_CONFIG[selectedCategory]?.types?.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                    )}
                    {selectedCategory === 'necker3d' && (
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.souvenirType}</label><select className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs font-bold" value={formData.path4.type} onChange={(e) => setFormData({...formData, path4: {...formData.path4, type: e.target.value}})}>{CATEGORY_CONFIG[selectedCategory]?.types?.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                    )}
                    {(formData.path4.type === '自訂' || selectedCategory === 'souvenir') && (
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.souvenirType} (輸入內容)</label><input className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs" placeholder={t.fields.customTypePlaceholder} value={formData.path4.customType} onChange={(e) => setFormData({...formData, path4: {...formData.path4, customType: e.target.value}})} /></div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'path5' && (
                <div className="space-y-4">
                   <div className="p-4 bg-cyan-950/20 rounded-2xl border border-cyan-900/30">
                     <p className="text-[10px] text-slate-400 leading-relaxed italic">{t.fields.preciseTip}</p>
                   </div>
                   <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-2"><Sliders size={14} className="text-cyan-400" /><label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.fields.preciseLabel}</label></div>
                    <textarea className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs h-32 resize-none" placeholder={t.fields.precisePlaceholder} value={formData.path5.preciseInstruction} onChange={(e) => setFormData({...formData, path5: {...formData.path5, preciseInstruction: e.target.value}})} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => handleGenerateDesign(false)} disabled={isProcessing} className="bg-cyan-600 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center p-3 transition-all active:scale-95 h-full">
              {isProcessing ? <Loader2 className="animate-spin" size={16} /> : (selectedCategory === 'necker3d' ? t.buttons.genMockup : t.buttons.genDesign)}
            </button>
            <button onClick={handleBatchGenerate} disabled={isProcessing} className="bg-violet-700 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-1 p-3 transition-all active:scale-95 h-full">
              <Layers size={14} /> 🎲 4 變體
            </button>
            <button onClick={() => handleGenerateMockup(false)} disabled={isProcessing || !canGenMockup} className="bg-indigo-600 disabled:opacity-30 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center p-3 transition-all active:scale-95 h-full">
              {isProcessing ? <Loader2 className="animate-spin" size={16} /> : t.buttons.genMockup}
            </button>
            <button onClick={() => handleGenerateDesign(true)} disabled={isProcessing || !designImage} className="bg-blue-600 disabled:opacity-30 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-1 p-3 transition-all active:scale-95 h-full">
              <Sparkles size={14}/> {t.buttons.tweakDesign}
            </button>
            <button onClick={() => handleGenerateMockup(true)} disabled={isProcessing || !mockupImage} className="bg-slate-800 disabled:opacity-30 text-white rounded-2xl font-black text-[10px] uppercase border border-slate-600 flex items-center justify-center gap-1 p-3 transition-all active:scale-95 h-full">
              <Maximize2 size={14}/> {t.buttons.tweakMockup}
            </button>
            <div /> {/* placeholder for grid alignment */}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-900 rounded-[2.5rem] border-[6px] border-slate-800 overflow-hidden h-[560px] flex flex-col relative shadow-2xl">
            <div className="p-6 bg-slate-950/90 backdrop-blur-sm flex flex-col gap-4 border-b border-slate-800">
              {customError && (
                <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertTriangle size={18} className="text-red-400 shrink-0" />
                  <p className="text-[11px] font-black text-red-200 uppercase tracking-tight">{customError}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex bg-slate-900 p-1 rounded-full border border-slate-700">
                  <button onClick={() => setViewMode('clean')} className={`px-4 py-2 rounded-full text-[10px] font-black transition-all ${viewMode === 'clean' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>{t.buttons.viewDesign}</button>
                  <button onClick={() => setViewMode('craft')} className={`px-4 py-2 rounded-full text-[10px] font-black transition-all ${viewMode === 'craft' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{t.buttons.viewMockup}</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">印刷級 4x 放大</span>
                  <button onClick={() => setEnhanceForPrint(!enhanceForPrint)} className={`w-10 h-5 rounded-full relative transition-colors ${enhanceForPrint ? 'bg-cyan-600' : 'bg-slate-600'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${enhanceForPrint ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleGenerateDesign(false)} disabled={isProcessing} className="p-2.5 bg-cyan-900/30 text-cyan-400 rounded-xl hover:bg-cyan-900/40 border border-cyan-900/50 transition-all active:scale-95"><Zap size={18} /></button>
                <button onClick={() => handleGenerateMockup(false)} disabled={isProcessing} className="p-2.5 bg-indigo-900/30 text-indigo-400 rounded-xl hover:bg-indigo-900/40 border border-indigo-900/50 transition-all active:scale-95"><Zap size={18} /></button>
                <button onClick={handleClearAll} className="p-2.5 bg-red-950/30 text-red-400 rounded-xl hover:bg-red-900/40 border border-red-900/50 transition-all active:scale-95"><Eraser size={18} /></button>
                <button onClick={() => { const img = viewMode === 'clean' ? designImage : mockupImage; if(img) { const w = window.open(); if(w) w.document.write(`<img src="${img}" style="width:100%">`); } }} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 border border-slate-600 transition-all active:scale-95"><Maximize2 size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => downloadAsPNG(viewMode === 'clean' ? designImage : mockupImage, viewMode)} className="py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black border border-slate-600 flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors active:scale-95"><Download size={12}/> PNG</button>
                {viewMode === 'craft' && (<button onClick={downloadAsHTMLReport} className="py-2.5 bg-indigo-900/50 text-indigo-400 rounded-xl text-[10px] font-black border border-indigo-700/50 flex items-center justify-center gap-2 hover:bg-indigo-900/70 transition-colors active:scale-95"><FileCode size={12}/> 規格書</button>)}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0A0F1D] overflow-hidden relative">
              {isProcessing ? (
                <div className="animate-pulse flex flex-col items-center text-center max-w-md">
                  <Loader2 size={60} className="text-cyan-400 animate-spin mb-4" />
                  <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-2">{t.buttons.processing}</p>
                  {statusMessage && (
                    <p className="text-amber-300 text-[10px] font-black uppercase tracking-widest bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-800/50">
                      ⏳ {statusMessage}
                    </p>
                  )}
                </div>
              ) : (
                <>{viewMode === 'clean' && designImage && <img src={designImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Design" />}
                {viewMode === 'craft' && mockupImage && <img src={mockupImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Mockup" />}
                {((viewMode === 'clean' && !designImage) || (viewMode === 'craft' && !mockupImage)) && (<div className="text-center"><ImageIcon size={64} className="text-slate-700 mx-auto mb-4" /><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t.buttons.waiting}</p></div>)}</>
              )}
              {imageInfo && (
                <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-sm border border-cyan-900/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-[9px] text-cyan-300 font-black uppercase tracking-widest">
                    <Sparkles size={12} />
                    印刷級放大完成
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-[8px] text-slate-400">
                    <div>原始: {Math.round(imageInfo.enhancedSize.width/4)}×{Math.round(imageInfo.enhancedSize.height/4)}</div>
                    <div>放大後: {imageInfo.enhancedSize?.width}×{imageInfo.enhancedSize?.height} px</div>
                    <div>DPI: {imageInfo.dpi} (印刷級)</div>
                    <div>可印尺寸: {imageInfo.printableSize?.widthCm}×{imageInfo.printableSize?.heightCm} cm</div>
                    <div className="col-span-2 text-slate-500">適合高品質徽章、巾圈、紀念品印刷</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-4 flex flex-col gap-3 border border-slate-700 h-[220px]">
             <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden">
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 overflow-y-auto relative group custom-scrollbar"><button onClick={() => copyToClipboard(designPrompt)} className="absolute top-2 right-2 p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={12}/></button><span className="text-[9px] font-black text-cyan-400 uppercase block mb-1">{t.prompts.design}</span><p className="text-[9px] text-slate-400 font-mono whitespace-pre-line leading-relaxed mb-2">{designPrompt}</p>{designExplanation && (<div className="mt-2 p-2 bg-slate-900 rounded-lg border-l-2 border-cyan-500"><p className="text-[8px] text-cyan-300 italic">💡 AI 設計師診斷：{designExplanation}</p></div>)}</div>
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 overflow-y-auto relative group custom-scrollbar"><button onClick={() => copyToClipboard(mockupPrompt)} className="absolute top-2 right-2 p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={12}/></button><span className="text-[9px] font-black text-indigo-300 uppercase block mb-1">{t.prompts.mockup}</span><p className="text-[9px] text-slate-400 font-mono whitespace-pre-line leading-relaxed">{mockupPrompt}</p></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
