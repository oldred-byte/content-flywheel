import { Handle, Position, useNodesData } from '@xyflow/react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store';
import { toPng } from 'html-to-image';
import { Download, Trash2, Image as ImageIcon, UserCircle, Settings2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

const DEFAULT_CSS_TEMPLATES = [
  {
    id: 'minimal',
    name: '极简风格',
    css: `.render-content {
  color: #333333;
  line-height: 1.6;
  font-size: 14px;
  letter-spacing: 0.02em;
}
.render-content h2 {
  color: #111111;
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1.2rem;
  margin-bottom: 0.5rem;
  font-family: var(--font-serif);
  border-left: 3px solid #8B9D83;
  padding-left: 10px;
  line-height: 1.2;
}
.render-content p {
  margin-bottom: 0.75rem;
  text-align: justify;
}
.render-content strong {
  color: #2C4A3B;
  font-weight: 600;
}
.render-content .list-item {
  display: flex;
  gap: 6px;
  margin-bottom: 0.4rem;
}
.render-content .list-bullet {
  color: #8B9D83;
  font-weight: 500;
}
.render-content .spacer {
  height: 0.75rem;
}`
  },
  {
    id: 'xhs',
    name: '小红书风',
    css: `.render-content {
  color: #333;
  line-height: 1.6;
  font-size: 16px;
}
.render-content h2 {
  color: #E84C3D;
  font-size: 1.4rem;
  font-weight: 900;
  margin-top: 1.2rem;
  margin-bottom: 0.8rem;
}
.render-content p {
  margin-bottom: 0.8rem;
}
.render-content strong {
  background: rgba(232, 76, 61, 0.1);
  color: #E84C3D;
  padding: 0 4px;
  border-radius: 4px;
}
.render-content .list-item {
  display: flex;
  gap: 8px;
  margin-bottom: 0.5rem;
}
.render-content .list-bullet {
  color: #E84C3D;
  font-weight: bold;
}
.render-content .spacer {
  height: 1rem;
}`
  }
];

export default function TextToImageNode({ id, data, selected }: { id: string; data: any; selected?: boolean }) {
  // 从节点data初始化状态，实现持久化
  const [avatar, setAvatar] = useState<string | null>(data.avatar || null);
  const [name, setName] = useState(data.name || 'WeMD 文档');
  const [accountId, setAccountId] = useState(data.accountId || '@wemd_docs');
  const [showBadge, setShowBadge] = useState(data.showBadge !== undefined ? data.showBadge : true);

  const [content, setContent] = useState(data.text || '');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4'>(data.aspectRatio || '3:4');
  const [footerQuote, setFooterQuote] = useState(data.footerQuote || '欢迎来到 WeMD 文档中心。');

  const [selectedCssTemplate, setSelectedCssTemplate] = useState(data.cssTemplateId || 'minimal');
  const [isCssModalOpen, setIsCssModalOpen] = useState(false);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const footerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cssTextareaRef = useRef<HTMLTextAreaElement>(null);
  const edges = useStore((state) => state.edges);
  const updateNodeData = useStore((state) => state.updateNodeData);

  // Auto-adjust textarea height
  const adjustHeight = useCallback((el: HTMLTextAreaElement | null, minHeight: number = 64, maxHeight: number = 400) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
    }
  }, []);
  
  // Get incoming edges to find upstream nodes
  const incomingEdges = edges.filter((edge) => edge.target === id);
  const upstreamNodeIds = incomingEdges.map((edge) => edge.source);
  
  // Subscribe to upstream node data changes
  const upstreamNodesData = useNodesData(upstreamNodeIds);

  const currentTemplate = DEFAULT_CSS_TEMPLATES.find(t => t.id === selectedCssTemplate) || DEFAULT_CSS_TEMPLATES[0];
  const activeCss = data.customCss?.[selectedCssTemplate] !== undefined ? data.customCss[selectedCssTemplate] : currentTemplate.css;

  // 保存配置到节点data，实现持久化
  useEffect(() => {
    updateNodeData(id, {
      avatar,
      name,
      accountId,
      showBadge,
      aspectRatio,
      footerQuote,
    });
  }, [avatar, name, accountId, showBadge, aspectRatio, footerQuote]);

  // Read upstream text
  useEffect(() => {
    if (upstreamNodesData && upstreamNodesData.length > 0) {
      let upstreamText = '';
      for (const nodeData of upstreamNodesData) {
        if (nodeData && nodeData.data && (nodeData.data as any).text) {
          upstreamText += (nodeData.data as any).text + '\n\n';
        }
      }
      setContent(upstreamText.trim());
    }
  }, [upstreamNodesData]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const paginateText = (text: string, aspect: string) => {
    if (!text.trim()) return [''];
    const lines = text.split('\n');
    const pages: string[] = [];
    let currentPage: string[] = [];
    let currentWeight = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isFirstPage = pages.length === 0;
      
      // Base max weight per page. 
      // 3:4 height is 533px. 1:1 height is 400px.
      let maxWeight = aspect === '1:1' ? 8.5 : 15;
      
      if (isFirstPage) {
        maxWeight -= 2.5; // Header takes space
      }

      let lineWeight = 0;
      if (line.startsWith('## ')) {
        lineWeight = 2.5; // Headings take more space
      } else if (line.trim() === '') {
        lineWeight = 0.5; // Empty lines (spacers) take less space
      } else {
        // Normal line: 1 unit + extra for wrapping (assume ~22 chars per line)
        // A wrapped line only adds line-height, not margin-bottom, so it's ~0.8 weight
        lineWeight = 1 + Math.floor(line.length / 22) * 0.8;
      }

      if (currentWeight + lineWeight > maxWeight && currentPage.length > 0) {
        pages.push(currentPage.join('\n'));
        currentPage = [line];
        currentWeight = lineWeight;
      } else {
        currentPage.push(line);
        currentWeight += lineWeight;
      }
    }
    
    if (currentPage.length > 0) {
      pages.push(currentPage.join('\n'));
    }
    
    return pages.length > 0 ? pages : [''];
  };

  const pages = paginateText(content, aspectRatio);

  // 将 base64 数据转换为 Blob
  const base64ToBlob = (base64: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/png' });
  };

  const handleDownload = async () => {
    if (pages.length === 0) return;

    try {
      // 首先生成所有图片数据
      const images: { name: string; dataUrl: string }[] = [];
      for (let i = 0; i < pages.length; i++) {
        const el = pageRefs.current[i];
        if (el) {
          const dataUrl = await toPng(el, { cacheBust: true, quality: 0.95, pixelRatio: 2 });
          images.push({
            name: pages.length === 1 ? `content-${Date.now()}.png` : `page-${i + 1}.png`,
            dataUrl
          });
        }
      }

      if (images.length === 0) {
        alert('图片生成失败');
        return;
      }

      // 使用 File System Access API 让用户选择保存位置
      // @ts-ignore - TypeScript 可能不认识 showDirectoryPicker
      if (window.showDirectoryPicker) {
        try {
          // @ts-ignore
          const dirHandle = await window.showDirectoryPicker();

          // 保存所有图片到选择的文件夹
          for (const img of images) {
            const base64 = img.dataUrl.split(',')[1];
            const blob = base64ToBlob(base64);
            const fileHandle = await dirHandle.getFileHandle(img.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          }

          alert(`已成功保存 ${images.length} 张图片到选择的文件夹`);
        } catch (err: any) {
          // 用户取消选择文件夹
          if (err.name === 'AbortError') {
            return;
          }
          throw err;
        }
      } else {
        // 浏览器不支持 File System Access API，回退到逐个下载
        if (images.length === 1) {
          const link = document.createElement('a');
          link.download = images[0].name;
          link.href = images[0].dataUrl;
          link.click();
        } else {
          // 多图片时逐个下载
          for (let i = 0; i < images.length; i++) {
            setTimeout(() => {
              const link = document.createElement('a');
              link.download = images[i].name;
              link.href = images[i].dataUrl;
              link.click();
            }, i * 200); // 错开下载时间，避免被浏览器拦截
          }
          alert('浏览器不支持选择文件夹，已逐个下载图片到默认下载位置');
        }
      }
    } catch (err) {
      console.error('Failed to generate image', err);
      alert('图片生成失败');
    }
  };

  const clearAll = () => {
    setContent('');
    setFooterQuote('');
  };

  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('## ')) {
        return <h2 key={index}>{formatText(line.substring(3))}</h2>;
      }
      if (line.match(/^[0-9]+\.\s/) || line.startsWith('- ')) {
        const isNumber = line.match(/^[0-9]+\.\s/);
        const content = isNumber ? line.replace(/^[0-9]+\.\s/, '') : line.substring(2);
        return (
          <div key={index} className="list-item">
            <span className="list-bullet">{isNumber ? line.match(/^[0-9]+\./)?.[0] : '•'}</span>
            <span>{formatText(content)}</span>
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={index} className="spacer"></div>;
      }
      return <p key={index}>{formatText(line)}</p>;
    });
  };

  return (
    <div className={`bg-[#FAF9F6] border-2 rounded-xl shadow-lg w-max max-w-[1200px] flex overflow-hidden font-sans transition-all duration-200 ${selected ? 'border-[#8B9D83] shadow-xl ring-2 ring-[#8B9D83]/20' : 'border-[#E5E5E0]'}`}>
      {/* Left Config Panel */}
      <div className="w-80 bg-[#F2F2EC] border-r border-[#E5E5E0] flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-[#E5E5E0] flex justify-between items-center bg-[#EBEBE5]">
          <span className="text-sm font-medium text-[#4A4A4A] flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            文章转图片
          </span>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {/* Account Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider">账号配置</h3>
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-[#E5E5E0] border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-8 h-8 text-[#A0A09C]" />
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-[10px]">更换</span>
                </div>
              </label>
              <div className="flex-1 space-y-2">
                <input
                  className="nodrag w-full bg-white border border-[#D5D5D0] rounded px-2 py-1 text-sm text-[#333] outline-none focus:border-[#8B9D83]"
                  value={name} onChange={(e) => setName(e.target.value)} placeholder="显示名称"
                />
                <input
                  className="nodrag w-full bg-white border border-[#D5D5D0] rounded px-2 py-1 text-xs text-[#666] outline-none focus:border-[#8B9D83]"
                  value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="账号ID"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#666]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showBadge} onChange={(e) => setShowBadge(e.target.checked)} className="accent-[#8B9D83]" />
                显示认证标识
              </label>
            </div>
          </div>

          <div className="h-px bg-[#E5E5E0] w-full"></div>

          {/* CSS Template Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider">样式模板</h3>
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 bg-white border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83]"
                value={selectedCssTemplate}
                onChange={(e) => {
                  setSelectedCssTemplate(e.target.value);
                  updateNodeData(id, { cssTemplateId: e.target.value });
                }}
              >
                {DEFAULT_CSS_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={() => setIsCssModalOpen(true)}
                className="p-2 bg-white border border-[#D5D5D0] rounded-lg text-[#666] hover:text-[#333] hover:bg-[#F9F9F6] transition-colors"
                title="编辑样式"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-px bg-[#E5E5E0] w-full"></div>

          {/* Content Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider">正文内容</h3>
              <div className="flex bg-[#E5E5E0] rounded-md p-0.5">
                <button 
                  onClick={() => setAspectRatio('1:1')}
                  className={`px-2 py-1 text-[10px] rounded-sm transition-colors ${aspectRatio === '1:1' ? 'bg-white shadow-sm text-[#333]' : 'text-[#666]'}`}
                >
                  1:1
                </button>
                <button 
                  onClick={() => setAspectRatio('3:4')}
                  className={`px-2 py-1 text-[10px] rounded-sm transition-colors ${aspectRatio === '3:4' ? 'bg-white shadow-sm text-[#333]' : 'text-[#666]'}`}
                >
                  3:4
                </button>
              </div>
            </div>
            <textarea
              ref={contentTextareaRef}
              className="nodrag w-full bg-white border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83] resize-none overflow-y-scroll custom-scrollbar"
              style={{ minHeight: '160px', maxHeight: '300px' }}
              placeholder="支持 Markdown 语法 (## 小标题, 1. 列表, **高亮**)"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                adjustHeight(contentTextareaRef.current, 160, 300);
              }}
            />
          </div>

          {/* Footer Quote */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider">结尾金句</h3>
            <textarea
              ref={footerTextareaRef}
              className="nodrag w-full bg-white border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83] resize-none overflow-y-scroll custom-scrollbar"
              style={{ minHeight: '64px', maxHeight: '150px' }}
              placeholder="输入底部名言或金句..."
              value={footerQuote}
              onChange={(e) => {
                setFooterQuote(e.target.value);
                adjustHeight(footerTextareaRef.current, 64, 150);
              }}
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-[#E5E5E0] flex gap-3 bg-[#EBEBE5]">
          <button 
            onClick={clearAll}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#666] bg-white border border-[#D5D5D0] hover:bg-[#F9F9F6] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            清空
          </button>
          <button 
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-[#4B8A6E] hover:bg-[#3A7058] transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            {pages.length > 1 ? '下载全部' : '下载图片'}
          </button>
        </div>
      </div>

      {/* Right Preview Panel */}
      <div className="flex-1 bg-[#E5E5E0] p-6 flex flex-wrap content-start items-start gap-6 relative min-w-[400px]">
        <style>{`.node-${id} ${activeCss}`}</style>
        
        {pages.map((pageText, index) => {
          const scale = 0.7;
          const baseWidth = 400;
          const baseHeight = aspectRatio === '1:1' ? 400 : 533;
          const scaledWidth = baseWidth * scale;
          const scaledHeight = baseHeight * scale;

          return (
            <div 
              key={index}
              className="flex-shrink-0 relative"
              style={{ width: scaledWidth, height: scaledHeight }}
            >
              <div 
                className="origin-top-left absolute top-0 left-0"
                style={{ transform: `scale(${scale})` }}
              >
                <div 
                  ref={(el) => { pageRefs.current[index] = el; }}
                  className={`node-${id} bg-[#FAF9F6] shadow-xl relative overflow-hidden flex flex-col`}
                  style={{
                    width: baseWidth,
                    height: baseHeight,
                  }}
                >
                  {/* Header - Only on first page */}
                  {index === 0 && (
                    <div className="px-8 pt-8 pb-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#E5E5E0] overflow-hidden flex-shrink-0">
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#D5D5D0]"></div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-lg text-[#1A1A1A]">{name}</span>
                          {showBadge && (
                            <div className="w-4 h-4 bg-[#E84C3D] rounded-full flex items-center justify-center text-white text-[10px] font-bold">V</div>
                          )}
                        </div>
                        <span className="text-sm text-[#888]">{accountId}</span>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className={`px-8 flex-1 overflow-hidden flex flex-col ${index !== 0 ? 'pt-8' : 'pt-4'} pb-12`}>
                    <div className="flex-1 render-content overflow-hidden">
                      {pageText ? renderContent(pageText) : (
                        <div className="h-full flex items-center justify-center text-[#A0A09C] italic text-sm">
                          等待输入内容...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer - Only on last page */}
                  {index === pages.length - 1 && footerQuote && (
                    <div className="px-8 pb-8 pt-6 mt-auto">
                      <div className="border-t border-[#E5E5E0] pt-4">
                        <p className="text-sm font-serif italic text-[#666] text-center">"{footerQuote}"</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Page Number */}
                  {pages.length > 1 && (
                    <div className="absolute bottom-4 right-6 text-xs font-medium text-[#A0A09C]">
                      {index + 1} / {pages.length}
                    </div>
                  )}
                  
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#E8F3EE] to-transparent opacity-50 pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#F2F2EC] to-transparent opacity-50 pointer-events-none"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Handle type="target" position={Position.Left} />

      {/* CSS Editor Modal */}
      {isCssModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#FAF9F6] border border-[#E5E5E0] rounded-xl shadow-xl w-[600px] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#E5E5E0] flex justify-between items-center bg-[#F2F2EC]">
              <h3 className="text-sm font-medium text-[#1A1A1A]">编辑 CSS 样式 ({currentTemplate.name})</h3>
              <button onClick={() => setIsCssModalOpen(false)} className="text-[#666] hover:text-[#333]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-[#666] mb-1.5">CSS 代码</label>
                <textarea
                  ref={cssTextareaRef}
                  className="nodrag w-full bg-[#1E1E1E] border border-[#D5D5D0] rounded-lg p-3 text-sm text-[#D4D4D4] font-mono outline-none focus:border-[#8B9D83] resize-none overflow-y-scroll custom-scrollbar"
                  style={{ minHeight: '320px', maxHeight: '500px' }}
                  value={activeCss}
                  onChange={(e) => {
                    const newCustomCss = { ...(data.customCss || {}), [selectedCssTemplate]: e.target.value };
                    updateNodeData(id, { customCss: newCustomCss });
                    adjustHeight(cssTextareaRef.current, 320, 500);
                  }}
                  placeholder="输入 CSS 代码..."
                  spellCheck={false}
                />
                <p className="text-xs text-[#888] mt-2">
                  使用 <code className="bg-[#E5E5E0] px-1 rounded">.render-content</code> 作为根选择器。支持修改行高、颜色、高亮等样式。
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-[#E5E5E0] flex justify-between items-center bg-[#EBEBE5]">
              <button
                onClick={() => {
                  const newCustomCss = { ...(data.customCss || {}) };
                  delete newCustomCss[selectedCssTemplate];
                  updateNodeData(id, { customCss: newCustomCss });
                }}
                className="text-xs text-[#666] hover:text-[#333] underline"
              >
                恢复默认
              </button>
              <button
                onClick={() => setIsCssModalOpen(false)}
                className="px-4 py-2 bg-[#4B8A6E] text-white text-sm font-medium rounded-lg hover:bg-[#3A7058] transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
