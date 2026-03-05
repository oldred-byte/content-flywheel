import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useState, useRef, useEffect } from 'react';
import { useStore, PromptTemplate } from '../../store';
import { Loader2, Copy, Rocket, RefreshCw, Settings2, X, Plus, Trash2, RotateCcw, Library, Star } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function AIProcessorNode({ id, data, selected }: { id: string; data: any; selected?: boolean }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [nodeName, setNodeName] = useState(data.label || 'AI 处理引擎');
  const [selectedTemplate, setSelectedTemplate] = useState(data.templateId || '');

  const [localTemplateName, setLocalTemplateName] = useState('');
  const [localPromptText, setLocalPromptText] = useState('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { getNode } = useReactFlow();
  const updateNodeData = useStore((state) => state.updateNodeData);
  const apiProfiles = useStore((state) => state.apiProfiles);
  const activeProfileId = useStore((state) => state.activeProfileId);
  const edges = useStore((state) => state.edges);

  // Custom templates from store
  const customTemplates = useStore((state) => state.customTemplates);
  const getAIDefaultTemplates = useStore((state) => state.getAIDefaultTemplates);
  const toggleTemplateInAIDefaults = useStore((state) => state.toggleTemplateInAIDefaults);

  // Get AI default templates (filtered by isInAIDefaults)
  const aiDefaultTemplates = getAIDefaultTemplates();
  const addCustomTemplate = useStore((state) => state.addCustomTemplate);
  const updateCustomTemplate = useStore((state) => state.updateCustomTemplate);
  const deleteCustomTemplate = useStore((state) => state.deleteCustomTemplate);
  const reorderCustomTemplates = useStore((state) => state.reorderCustomTemplates);
  const resetDefaultTemplates = useStore((state) => state.resetDefaultTemplates);

  // Auto-adjust textarea height
  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 160), 400)}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current && !isGenerating) {
      textareaRef.current.value = data.text || '';
      adjustHeight(textareaRef.current);
    }
  }, [data.text, isGenerating]);

  // Check if connected to upstream (优先使用预记录的 upstreamIds，兼容旧数据则回退到遍历 edges)
  const upstreamIdsFromData: string[] = data.upstreamIds || [];
  const isConnected = upstreamIdsFromData.length > 0 || edges.some((edge) => edge.target === id);

  // Get current template from store
  const currentTemplate = customTemplates.find((t) => t.id === selectedTemplate);

  // Use custom prompt if available, otherwise use template prompt
  const promptText = data.customPrompt !== undefined
    ? data.customPrompt
    : currentTemplate?.prompt || '';

  // Initialize selected template if not set - use AI default templates
  useEffect(() => {
    if (!selectedTemplate && aiDefaultTemplates.length > 0) {
      const firstTemplate = aiDefaultTemplates[0];
      setSelectedTemplate(firstTemplate.id);
      updateNodeData(id, {
        templateId: firstTemplate.id,
        customPrompt: firstTemplate.prompt,
        customTemplateName: firstTemplate.label,
      });
    }
  }, [selectedTemplate, aiDefaultTemplates]);


  const handleGenerate = async () => {
    // 优先使用预记录的 upstreamIds，兼容旧数据则回退到遍历 edges
    let upstreamIds: string[] = data.upstreamIds || [];

    // 兼容旧数据：如果没有 upstreamIds，从 edges 中获取
    if (upstreamIds.length === 0) {
      const incomingEdges = edges.filter((edge) => edge.target === id);
      upstreamIds = incomingEdges.map((edge) => edge.source);
    }

    if (upstreamIds.length === 0) return;

    // Gather text from all upstream nodes
    let upstreamText = '';
    for (const sourceId of upstreamIds) {
      const sourceNode = getNode(sourceId);
      if (sourceNode && sourceNode.data && sourceNode.data.text) {
        upstreamText += sourceNode.data.text + '\n\n';
      }
    }

    if (!upstreamText.trim()) return;

    const activeProfile = apiProfiles.find((p) => p.id === activeProfileId);
    if (!activeProfile) {
      alert('请先配置 API');
      return;
    }

    const fullPrompt = promptText + upstreamText;

    setIsGenerating(true);
    let fullText = '';

    // Set generating state on incoming edges for animation
    const setEdgesGenerating = useStore.getState().setEdgesGenerating;
    // 根据 upstreamIds 找到对应的 edge IDs
    const edgeIds = edges
      .filter((e) => e.target === id && upstreamIds.includes(e.source))
      .map((e) => e.id);
    setEdgesGenerating(edgeIds, true);

    // Clear textarea immediately
    if (textareaRef.current) {
      textareaRef.current.value = '';
      adjustHeight(textareaRef.current);
    }

      // Try streaming first, fallback to non-streaming if fails
    let useStreaming = true;

    try {
      const response = await fetch(`${activeProfile.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeProfile.apiKey}`,
        },
        body: JSON.stringify({
          model: activeProfile.modelName,
          messages: [{ role: 'user', content: fullPrompt }],
          stream: useStreaming,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error ${response.status}: ${errorText.slice(0, 200)}`);
      }

      // Handle streaming response
      if (useStreaming && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            // Decode chunk
            buffer += decoder.decode(value, { stream: true });

            // Parse SSE format
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);

                if (data === '[DONE]') {
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const chunk = parsed.choices?.[0]?.delta?.content || '';

                  if (chunk) {
                    fullText += chunk;
                    if (textareaRef.current) {
                      textareaRef.current.value = fullText;
                      adjustHeight(textareaRef.current);
                      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                    }
                  }
                } catch (e) {
                  console.warn('Parse SSE data failed:', e, 'data:', data);
                }
              }
            }
          }

          // Process remaining data
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data !== '[DONE]') {
                  try {
                    const parsed = JSON.parse(data);
                    const chunk = parsed.choices?.[0]?.delta?.content || '';
                    if (chunk) {
                      fullText += chunk;
                    }
                  } catch (e) {
                    console.warn('Parse remaining SSE data failed:', e);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream reading error:', error);
          throw error;
        } finally {
          reader.releaseLock();
        }
      }

      // Final update with complete text
      if (textareaRef.current) {
        textareaRef.current.value = fullText;
        adjustHeight(textareaRef.current);
      }
      updateNodeData(id, { text: fullText, templateId: selectedTemplate, customPrompt: promptText });

    } catch (error: any) {
      console.error('Generation error:', error);

      // Fallback to non-streaming mode
      if (error.message?.includes('network') || error.message?.includes('Network') || error.name === 'TypeError') {
        console.log('Streaming failed, trying non-streaming mode...');
        try {
          const response = await fetch(`${activeProfile.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeProfile.apiKey}`,
            },
            body: JSON.stringify({
              model: activeProfile.modelName,
              messages: [{ role: 'user', content: fullPrompt }],
              stream: false,
            }),
          });

          if (!response.ok) {
            throw new Error(`API Error ${response.status}`);
          }

          const result = await response.json();
          const content = result.choices?.[0]?.message?.content || '';

          if (content) {
            fullText = content;
            // Simulate streaming display for better UX
            const chars = fullText.split('');
            let displayedText = '';

            for (let i = 0; i < chars.length; i++) {
              displayedText += chars[i];
              if (textareaRef.current) {
                textareaRef.current.value = displayedText;
                adjustHeight(textareaRef.current);
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
              }
              // Update periodically
              if (i % 10 === 0 || i === chars.length - 1) {
                updateNodeData(id, { text: displayedText, templateId: selectedTemplate, customPrompt: promptText });
              }
              // Small delay for visual effect
              if (i < chars.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3));
              }
            }
          }
        } catch (fallbackError: any) {
          console.error('Fallback also failed:', fallbackError);
          alert(`生成失败: ${error.message || '请检查 API 配置'}`);
        }
      } else {
        alert(`生成失败: ${error.message || '请检查 API 配置'}`);
      }
    } finally {
      setIsGenerating(false);
      setEdgesGenerating(edgeIds, false);
    }
  };

  const handleCopy = async () => {
    const text = data.text || '';
    try {
      // 尝试使用现代 Clipboard API（需要 HTTPS）
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback：使用传统方法
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动选择文本复制');
    }
  };

  const handleAddTemplate = () => {
    const newTemplate: Omit<PromptTemplate, 'id'> = {
      label: '新模板',
      prompt: '请输入提示词内容...',
      isDefault: false,
    };
    addCustomTemplate(newTemplate);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (customTemplates.length <= 1) {
      alert('至少保留一个模板');
      return;
    }
    const template = customTemplates.find((t) => t.id === templateId);
    const isDefault = template?.isDefault;
    const confirmMsg = isDefault
      ? '这是默认模板，删除后可以点击"恢复默认模板"找回。确定删除吗？'
      : '确定要删除这个模板吗？';
    if (confirm(confirmMsg)) {
      deleteCustomTemplate(templateId);
      if (selectedTemplate === templateId && customTemplates.length > 1) {
        const remainingTemplates = customTemplates.filter((t) => t.id !== templateId);
        const newTemplate = remainingTemplates[0];
        setSelectedTemplate(newTemplate.id);
        updateNodeData(id, {
          templateId: newTemplate.id,
          customPrompt: newTemplate.prompt,
          customTemplateName: newTemplate.label,
        });
      }
    }
  };

  const handleSaveTemplateEdit = () => {
    if (editingTemplateId) {
      // 所有模板都直接保存到原模板，不创建副本
      updateCustomTemplate(editingTemplateId, {
        label: localTemplateName,
        prompt: localPromptText,
      });
      // If this is the currently selected template, update node data too
      if (selectedTemplate === editingTemplateId) {
        updateNodeData(id, {
          customTemplateName: localTemplateName,
          customPrompt: localPromptText,
        });
      }
    }
    setIsEditingTemplate(false);
    setEditingTemplateId(null);
  };

  // 复制模板功能
  const handleDuplicateTemplate = () => {
    if (editingTemplateId) {
      const editingTemplate = customTemplates.find((t) => t.id === editingTemplateId);
      if (editingTemplate) {
        addCustomTemplate({
          label: editingTemplate.label + ' (副本)',
          prompt: editingTemplate.prompt,
          isDefault: false,
        });
        // 切换到新创建的副本
        const newTemplate = customTemplates[customTemplates.length - 1];
        if (newTemplate) {
          setSelectedTemplate(newTemplate.id);
          setEditingTemplateId(newTemplate.id);
          setLocalTemplateName(newTemplate.label);
          setLocalPromptText(newTemplate.prompt);
        }
      }
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder templates
    const newTemplates = [...customTemplates];
    const [removed] = newTemplates.splice(draggedIndex, 1);
    newTemplates.splice(dropIndex, 0, removed);
    reorderCustomTemplates(newTemplates);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const openTemplateEditor = (template: PromptTemplate) => {
    setEditingTemplateId(template.id);
    setLocalTemplateName(template.label);
    setLocalPromptText(template.prompt);
    setIsEditingTemplate(true);
    setTimeout(() => adjustHeight(modalTextareaRef.current), 0);
  };

  return (
    <div className={`bg-[#FAF9F6] border-2 rounded-xl shadow-sm w-80 overflow-hidden flex flex-col font-sans transition-all duration-200 ${selected ? 'border-[#8B9D83] shadow-lg ring-2 ring-[#8B9D83]/20' : 'border-[#E5E5E0]'}`}>
      <div className="bg-[#F2F2EC] px-4 py-3 border-b border-[#E5E5E0] flex justify-between items-center">
        {isEditingName ? (
          <input
            autoFocus
            className="nodrag bg-white border border-[#D5D5D0] rounded px-2 py-1 text-sm text-[#333] outline-none w-full"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            onBlur={() => {
              setIsEditingName(false);
              updateNodeData(id, { label: nodeName });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingName(false);
                updateNodeData(id, { label: nodeName });
              }
            }}
          />
        ) : (
          <span
            className="text-sm font-medium text-[#4A4A4A] cursor-pointer hover:text-[#2A2A2A]"
            onDoubleClick={() => setIsEditingName(true)}
          >
            {nodeName}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <select
            className="flex-1 bg-white border border-[#E5E5E0] rounded-lg px-3 py-2 text-sm text-[#4A4A4A] outline-none focus:border-[#8B9D83]"
            value={selectedTemplate}
            onChange={(e) => {
              const newTemplateId = e.target.value;
              const newTemplate = customTemplates.find((t) => t.id === newTemplateId);
              setSelectedTemplate(newTemplateId);
              updateNodeData(id, {
                templateId: newTemplateId,
                customPrompt: newTemplate?.prompt,
                customTemplateName: newTemplate?.label,
              });
            }}
          >
            {aiDefaultTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsPromptModalOpen(true)}
            className="p-2 bg-white border border-[#E5E5E0] rounded-lg text-[#666] hover:text-[#333] hover:bg-[#F9F9F6] transition-colors"
            title="管理提示词模板"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!isConnected || isGenerating}
          className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
            isConnected && !isGenerating
              ? 'bg-[#E8F3EE] text-[#4B8A6E] hover:bg-[#DDF0E7]'
              : 'bg-[#F2F2EC] text-[#A0A09C] cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : data.text ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          {isGenerating ? '生成中...' : data.text ? '再次生成' : '生成'}
        </button>

        <div className="relative mt-2 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-[#888]">生成结果</span>
            {data.text && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 bg-white border border-[#E5E5E0] rounded-md text-xs text-[#4B8A6E] hover:bg-[#F9F9F6] transition-colors shadow-sm"
              >
                <Copy className="w-3 h-3" />
                {isCopied ? '已复制!' : '一键复制'}
              </button>
            )}
          </div>
          <textarea
            ref={textareaRef}
            className="nodrag w-full bg-white border border-[#E5E5E0] rounded-lg p-3 text-sm text-[#333] outline-none focus:border-[#8B9D83] resize-none overflow-y-scroll custom-scrollbar"
            style={{ minHeight: '160px', maxHeight: '400px' }}
            placeholder="等待生成内容..."
            defaultValue={data.text || ''}
            onChange={(e) => updateNodeData(id, { text: e.target.value })}
          />
        </div>
      </div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      {/* Template Management Modal */}
      {isPromptModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#FAF9F6] border border-[#E5E5E0] rounded-xl shadow-xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#E5E5E0] flex justify-between items-center bg-[#F2F2EC]">
              <h3 className="text-sm font-medium text-[#1A1A1A]">AI引擎提示词管理</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Open full prompt library
                    window.dispatchEvent(new CustomEvent('openPromptLibrary'));
                    setIsPromptModalOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4B8A6E] bg-[#E8F3EE] hover:bg-[#DDF0E7] rounded-lg transition-colors"
                >
                  <Library className="w-3.5 h-3.5" />
                  打开提示词库
                </button>
                <button onClick={() => setIsPromptModalOpen(false)} className="text-[#666] hover:text-[#333] p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Template List Sidebar */}
              <div className="w-48 bg-[#EBEBE5] border-r border-[#E5E5E0] p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                {customTemplates.map((template, index) => (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      editingTemplateId === template.id
                        ? 'bg-white shadow-sm border border-[#D5D5D0]'
                        : 'hover:bg-[#E5E5E0] border border-transparent'
                    } ${draggedIndex === index ? 'opacity-50' : ''} ${
                      dragOverIndex === index && draggedIndex !== index
                        ? 'border-t-2 border-t-[#4B8A6E]'
                        : ''
                    }`}
                    onClick={() => openTemplateEditor(template)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="text-[#999] cursor-grab active:cursor-grabbing">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
                        </svg>
                      </div>
                      <span className="text-sm text-[#333] truncate">{template.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTemplateInAIDefaults(template.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          template.isInAIDefaults
                            ? 'text-yellow-500 hover:bg-yellow-50'
                            : 'text-[#999] hover:text-yellow-400 hover:bg-[#F2F2EC]'
                        }`}
                        title={template.isInAIDefaults ? '点击从AI引擎默认中移除' : '点击添加到AI引擎默认'}
                      >
                        <Star className={`w-3.5 h-3.5 ${template.isInAIDefaults ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="p-1 text-[#E84C3D] hover:bg-[#FDECEA] rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleAddTemplate}
                  className="flex items-center gap-2 p-2 text-sm text-[#666] hover:text-[#333] hover:bg-[#E5E5E0] rounded-lg transition-colors mt-2"
                >
                  <Plus className="w-4 h-4" />
                  添加模板
                </button>

                {/* Restore Default Templates Button */}
                {(() => {
                  const defaultIds = ['draft', 'hook', 'xiaohongshu', 'video', 'xiaolvshu'];
                  const missingCount = defaultIds.filter(
                    (id) => !customTemplates.some((t) => t.id === id)
                  ).length;
                  if (missingCount > 0) {
                    return (
                      <button
                        onClick={() => {
                          resetDefaultTemplates();
                        }}
                        className="flex items-center gap-2 p-2 text-sm text-[#4B8A6E] hover:text-[#3A7058] hover:bg-[#E8F3EE] rounded-lg transition-colors mt-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        恢复默认模板 ({missingCount}个缺失)
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Template Editor */}
              <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar bg-white">
                {isEditingTemplate && editingTemplateId ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#666] mb-1.5">模板名称</label>
                      <input
                        className="nodrag w-full bg-white border border-[#D5D5D0] rounded-lg px-3 py-2 text-sm text-[#333] outline-none focus:border-[#8B9D83]"
                        value={localTemplateName}
                        onChange={(e) => setLocalTemplateName(e.target.value)}
                        placeholder="输入模板名称..."
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[#666] mb-1.5">提示词内容</label>
                      <textarea
                        ref={modalTextareaRef}
                        className="nodrag w-full bg-white border border-[#D5D5D0] rounded-lg p-3 text-sm text-[#333] outline-none focus:border-[#8B9D83] resize-none overflow-y-scroll custom-scrollbar"
                        style={{ minHeight: '200px', maxHeight: '400px' }}
                        value={localPromptText}
                        onChange={(e) => {
                          setLocalPromptText(e.target.value);
                          adjustHeight(modalTextareaRef.current);
                        }}
                        placeholder="输入提示词内容..."
                      />
                      <p className="text-xs text-[#888] mt-2">提示词将与上游节点传入的文本拼接后发送给 AI。</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[#E5E5E0]">
                      <button
                        onClick={handleDuplicateTemplate}
                        className="px-4 py-2 text-sm text-[#4B8A6E] hover:bg-[#E8F3EE] rounded-lg transition-colors border border-[#4B8A6E]"
                      >
                        复制模板
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsEditingTemplate(false);
                            setEditingTemplateId(null);
                          }}
                          className="px-4 py-2 text-sm text-[#666] hover:bg-[#F2F2EC] rounded-lg transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveTemplateEdit}
                          className="px-4 py-2 bg-[#4B8A6E] text-white text-sm font-medium rounded-lg hover:bg-[#3A7058] transition-colors"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#A0A09C] text-sm">
                    选择一个模板进行编辑，或点击"添加模板"创建新模板
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
