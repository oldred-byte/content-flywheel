import { Handle, Position, useNodesData } from '@xyflow/react';
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { Copy, Trash2, Settings2, X, Bold, Italic, Underline, Strikethrough, Heading1, List, Quote, Code, Link as LinkIcon, Image as ImageIcon, Download } from 'lucide-react';
import { marked } from 'marked';
import { createPortal } from 'react-dom';

const DEFAULT_THEMES = [
  { 
    id: 'default', 
    name: '默认主题', 
    css: `/* ========== 自定义样式 ========== */

/* 全局属性 */
#wemd {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: #1a1a1a;
  line-height: 1.9;
  font-size: 16px;
  letter-spacing: 0.3px;
}

/* 段落 - 增加段间距，提升呼吸感 */
#wemd p {
  margin: 20px 0;
  font-size: 16px;
  color: #1a1a1a;
  line-height: 1.9;
  letter-spacing: 0.5px;
}

/* 一级标题 - 左侧粗线，有分量感 */
#wemd h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 65px 0 35px;
  padding-left: 20px;
  border-left: 6px solid #c95f55;
}

/* 二级标题 */
#wemd h2 {
  font-size: 24px;
  font-weight: 700;
  color: #c95f55;
  margin: 50px 0 30px;
}

/* 加粗 */
#wemd strong {
  font-weight: bold;
  color: #1a1a1a;
}

/* 引用 */
#wemd blockquote {
  border-left: 4px solid #c95f55;
  padding: 10px 15px;
  color: #666;
  background-color: #f8f9fa;
  margin: 20px 0;
}

/* 列表 */
#wemd ul, #wemd ol {
  margin: 20px 0;
  padding-left: 30px;
}
#wemd li {
  margin-bottom: 10px;
}

/* 链接 */
#wemd a {
  color: #c95f55;
  text-decoration: none;
  border-bottom: 1px solid #c95f55;
}`
  },
  {
    id: 'academic',
    name: '学术论文',
    css: `#wemd {
  font-family: "Times New Roman", SimSun, serif;
  color: #333;
  line-height: 2;
  font-size: 15px;
}
#wemd h1, #wemd h2, #wemd h3 {
  text-align: center;
  font-weight: bold;
  margin: 2em 0 1em;
}
#wemd p {
  text-indent: 2em;
  margin: 1em 0;
}`
  }
];

export default function WechatRendererNode({ id, data, selected }: { id: string; data: any; selected?: boolean }) {
  const [content, setContent] = useState(data.text || '');
  const [activeThemeId, setActiveThemeId] = useState(data.themeId || 'default');
  const [customCss, setCustomCss] = useState(data.customCss || DEFAULT_THEMES[0].css);
  const [isCopied, setIsCopied] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [tempCss, setTempCss] = useState(customCss);

  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const themeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const edges = useStore((state) => state.edges);
  const updateNodeData = useStore((state) => state.updateNodeData);
  const isSyncingRef = useRef(false);

  // Auto-adjust textarea height
  const adjustHeight = (el: HTMLTextAreaElement | null, minHeight: number = 100, maxHeight: number = 400) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
    }
  };
  
  const incomingEdges = edges.filter((edge) => edge.target === id);
  const upstreamNodeIds = incomingEdges.map((edge) => edge.source);
  const upstreamNodesData = useNodesData(upstreamNodeIds);

  useEffect(() => {
    if (upstreamNodesData && upstreamNodesData.length > 0) {
      let upstreamText = '';
      for (const nodeData of upstreamNodesData) {
        if (nodeData && nodeData.data && (nodeData.data as any).text) {
          upstreamText += (nodeData.data as any).text + '\n\n';
        }
      }
      if (upstreamText.trim() && !content) {
        setContent(upstreamText.trim());
      }
    }
  }, [upstreamNodesData]);

  // 双向滚动同步逻辑 - textarea 和 previewContainer 联动
  useEffect(() => {
    const textarea = textareaRef.current;
    const previewContainer = previewContainerRef.current;
    if (!textarea || !previewContainer) return;

    // 延迟一下确保 DOM 已经渲染完成
    const timer = setTimeout(() => {
      const syncTextareaToPreview = () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;

        const textareaScrollable = textarea.scrollHeight - textarea.clientHeight;
        const previewScrollable = previewContainer.scrollHeight - previewContainer.clientHeight;

        if (textareaScrollable > 0 && previewScrollable > 0) {
          const ratio = textarea.scrollTop / textareaScrollable;
          previewContainer.scrollTop = ratio * previewScrollable;
        }

        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      };

      const syncPreviewToTextarea = () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;

        const textareaScrollable = textarea.scrollHeight - textarea.clientHeight;
        const previewScrollable = previewContainer.scrollHeight - previewContainer.clientHeight;

        if (previewScrollable > 0 && textareaScrollable > 0) {
          const ratio = previewContainer.scrollTop / previewScrollable;
          textarea.scrollTop = ratio * textareaScrollable;
        }

        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      };

      textarea.addEventListener('scroll', syncTextareaToPreview, { passive: true });
      previewContainer.addEventListener('scroll', syncPreviewToTextarea, { passive: true });

      // 保存清理函数
      return () => {
        textarea.removeEventListener('scroll', syncTextareaToPreview);
        previewContainer.removeEventListener('scroll', syncPreviewToTextarea);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [content]); // 当内容变化时重新绑定

  const handleCopy = () => {
    if (!previewRef.current) return;
    
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(previewRef.current);
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    try {
      document.execCommand('copy');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      alert('复制失败，请手动选择复制');
    }
    
    selection?.removeAllRanges();
  };

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + before.length, end + before.length);
      }
    }, 0);
  };

  const renderedHtml = content ? marked.parse(content) : '<div style="color: #A0A09C; font-style: italic; text-align: center; padding: 20px;">等待输入内容...</div>';

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  return (
    <div className={`bg-white border-2 rounded-xl shadow-xl w-[1000px] h-[700px] flex overflow-hidden font-sans transition-all duration-200 ${selected ? 'border-[#8B9D83] shadow-2xl ring-2 ring-[#8B9D83]/20' : 'border-[#E5E5E0]'}`}>
      {/* Left Panel: Markdown Editor */}
      <div className="w-1/2 flex flex-col border-r border-[#E5E5E0] bg-white">
        <div className="px-4 py-3 border-b border-[#E5E5E0] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
          <span className="text-xs font-semibold text-[#666] tracking-wider">MARKDOWN 编辑器</span>
        </div>
        
        {/* Toolbar */}
        <div className="px-2 py-2 border-b border-[#E5E5E0] flex items-center gap-1 flex-wrap bg-[#FAFAFA]">
          <button onClick={() => insertText('**', '**')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="粗体"><Bold className="w-4 h-4" /></button>
          <button onClick={() => insertText('*', '*')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="斜体"><Italic className="w-4 h-4" /></button>
          <button onClick={() => insertText('<u>', '</u>')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="下划线"><Underline className="w-4 h-4" /></button>
          <button onClick={() => insertText('~~', '~~')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="删除线"><Strikethrough className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-[#D5D5D0] mx-1"></div>
          <button onClick={() => insertText('# ', '')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="标题"><Heading1 className="w-4 h-4" /></button>
          <button onClick={() => insertText('- ', '')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="无序列表"><List className="w-4 h-4" /></button>
          <button onClick={() => insertText('> ', '')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="引用"><Quote className="w-4 h-4" /></button>
          <button onClick={() => insertText('`', '`')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="代码"><Code className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-[#D5D5D0] mx-1"></div>
          <button onClick={() => insertText('[链接文字](', ')')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="链接"><LinkIcon className="w-4 h-4" /></button>
          <button onClick={() => insertText('![图片描述](', ')')} className="p-1.5 text-[#666] hover:bg-[#E5E5E0] rounded" title="图片"><ImageIcon className="w-4 h-4" /></button>
        </div>

        {/* Editor */}
        <div className="flex-1" style={{ padding: '16px' }}>
          <textarea
            ref={textareaRef}
            className="nodrag w-full h-full bg-transparent border-none outline-none resize-none text-[15px] text-[#333] leading-relaxed overflow-y-scroll custom-scrollbar"
            placeholder="在此输入 Markdown 文本..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              updateNodeData(id, { text: e.target.value });
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#E5E5E0] flex justify-between items-center bg-[#FAFAFA] text-[11px] text-[#888]">
          <div className="flex gap-4">
            <span>行数: {lineCount}</span>
            <span>字数: {charCount}</span>
          </div>
          <span>就绪</span>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="w-1/2 flex flex-col bg-white">
        <div className="px-4 py-3 border-b border-[#E5E5E0] flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#333]">实时预览</span>
            <span className="text-[11px] bg-[#E5E7EB] text-[#4B5563] px-2 py-0.5 rounded-full">手机比例</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsThemeModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-[#4B8A6E] bg-[#E8F3EE] hover:bg-[#DDF0E7] rounded transition-colors flex items-center gap-1"
            >
              <Settings2 className="w-3.5 h-3.5" />
              主题管理
            </button>
            <button 
              onClick={handleCopy}
              className={`px-3 py-1.5 text-xs font-medium text-white rounded transition-colors flex items-center gap-1 ${isCopied ? 'bg-[#3A7058]' : 'bg-[#10B981] hover:bg-[#059669]'}`}
            >
              <Copy className="w-3.5 h-3.5" />
              {isCopied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
        
        <div ref={previewContainerRef} className="flex-1" style={{ padding: '24px', overflowY: 'scroll', scrollbarWidth: 'auto' }}>
          <style>{customCss}</style>

          {/* The growing card - 手机预览比例 375px (iPhone 标准宽度) */}
          <div className="w-full max-w-[375px] mx-auto bg-white" style={{ minHeight: '100%' }}>
            <div
              id="wemd"
              ref={previewRef}
              dangerouslySetInnerHTML={{ __html: renderedHtml as string }}
              style={{ padding: '0 16px' }}
            />
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left} />
      
      {/* Theme Management Modal */}
      {isThemeModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#F5F6F7] rounded-xl shadow-2xl w-[1000px] h-[700px] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E5E0] flex justify-between items-center bg-white">
              <h3 className="text-base font-bold text-[#1A1A1A]">主题管理</h3>
              <button onClick={() => setIsThemeModalOpen(false)} className="text-[#666] hover:text-[#333] p-1 rounded-md hover:bg-[#F2F2EC]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* Theme List */}
              <div className="w-48 bg-white border-r border-[#E5E5E0] flex flex-col">
                <div className="p-4">
                  <button className="w-full py-2 bg-[#10B981] text-white text-sm font-medium rounded-lg hover:bg-[#059669] transition-colors mb-2">
                    + 新建自定义主题
                  </button>
                  <button className="w-full py-2 bg-white border border-[#D5D5D0] text-[#333] text-sm font-medium rounded-lg hover:bg-[#F9F9F6] transition-colors">
                    导入主题
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="px-4 py-2 text-xs font-semibold text-[#888]">内置主题</div>
                  <div className="px-2 space-y-1">
                    {DEFAULT_THEMES.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setActiveThemeId(theme.id);
                          setTempCss(theme.css);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${activeThemeId === theme.id ? 'bg-[#E8F3EE] text-[#10B981] font-medium' : 'text-[#4A4A4A] hover:bg-[#F2F2EC]'}`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="flex-1 flex flex-col border-r border-[#E5E5E0] bg-[#F5F6F7]">
                <div className="px-4 py-2 border-b border-[#E5E5E0] bg-white flex gap-2">
                  <button className="px-3 py-1 bg-[#10B981] text-white text-xs rounded flex items-center gap-1">
                    当前文章
                  </button>
                  <button className="px-3 py-1 bg-white border border-[#D5D5D0] text-[#666] text-xs rounded flex items-center gap-1">
                    示例内容
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex justify-center">
                  <style>{tempCss}</style>
                  <div className="bg-white shadow-sm w-full max-w-[400px] h-max min-h-[500px] p-6 rounded-lg">
                    <div id="wemd" dangerouslySetInnerHTML={{ __html: renderedHtml as string }} />
                  </div>
                </div>
              </div>
              
              {/* CSS Editor */}
              <div className="w-80 bg-white flex flex-col">
                <div className="p-4 border-b border-[#E5E5E0]">
                  <label className="block text-xs font-medium text-[#666] mb-1.5">主题名称</label>
                  <input
                    className="nodrag w-full bg-white border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#10B981]"
                    value={DEFAULT_THEMES.find(t => t.id === activeThemeId)?.name || '自定义主题'}
                    readOnly
                  />
                </div>
                <div className="flex-1 p-4 flex flex-col">
                  <label className="block text-xs font-medium text-[#666] mb-1.5">CSS 样式</label>
                  <textarea
                    ref={themeTextareaRef}
                    className="nodrag w-full bg-[#F8F9FA] border border-[#D5D5D0] rounded-lg p-3 text-[13px] font-mono text-[#333] outline-none focus:border-[#10B981] resize-none custom-scrollbar overflow-y-scroll"
                    style={{ minHeight: '300px', maxHeight: '500px' }}
                    value={tempCss}
                    onChange={(e) => {
                      setTempCss(e.target.value);
                      adjustHeight(themeTextareaRef.current, 300, 500);
                    }}
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-[#E5E5E0] bg-white flex justify-between items-center">
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white border border-[#D5D5D0] text-[#333] text-sm font-medium rounded-lg hover:bg-[#F9F9F6] transition-colors flex items-center gap-1">
                  <Copy className="w-4 h-4" /> 复制
                </button>
                <button className="px-4 py-2 bg-white border border-[#D5D5D0] text-[#333] text-sm font-medium rounded-lg hover:bg-[#F9F9F6] transition-colors flex items-center gap-1">
                  <Download className="w-4 h-4" /> 导出
                </button>
                <button className="px-4 py-2 bg-white border border-[#FFDADA] text-[#E84C3D] text-sm font-medium rounded-lg hover:bg-[#FFF0F0] transition-colors flex items-center gap-1">
                  <Trash2 className="w-4 h-4" /> 删除
                </button>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsThemeModalOpen(false)}
                  className="px-6 py-2 bg-white border border-[#D5D5D0] text-[#333] text-sm font-medium rounded-lg hover:bg-[#F9F9F6] transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    setCustomCss(tempCss);
                    updateNodeData(id, { customCss: tempCss, themeId: activeThemeId });
                    setIsThemeModalOpen(false);
                  }}
                  className="px-6 py-2 bg-[#10B981] text-white text-sm font-medium rounded-lg hover:bg-[#059669] transition-colors"
                >
                  应用主题
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
