import { useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  NodeTypes,
  Node as FlowNode,
  Edge as FlowEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from './store';
import StaticTextNode from './components/nodes/StaticTextNode';
import AIProcessorNode from './components/nodes/AIProcessorNode';
import TextToImageNode from './components/nodes/TextToImageNode';
import WechatRendererNode from './components/nodes/WechatRendererNode';
import SettingsModal from './components/SettingsModal';
import { PromptLibraryPanel } from './components/PromptLibraryPanel';
import { Settings, Plus, RotateCcw, Library, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes: NodeTypes = {
  staticText: StaticTextNode,
  aiProcessor: AIProcessorNode,
  textToImage: TextToImageNode,
  wechatRenderer: WechatRendererNode,
};

export default function App() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const onConnect = useStore((state) => state.onConnect);
  const resetCanvasFull = useStore((state) => state.resetCanvasFull);
  const clearContentOnly = useStore((state) => state.clearContentOnly);
  const apiProfiles = useStore((state) => state.apiProfiles);
  const activeProfileId = useStore((state) => state.activeProfileId);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [isResetMenuOpen, setIsResetMenuOpen] = useState(false);
  const resetMenuRef = useRef<HTMLDivElement>(null);

  // 复制粘贴功能
  const [copiedNodes, setCopiedNodes] = useState<FlowNode[]>([]);
  const [copiedEdges, setCopiedEdges] = useState<FlowEdge[]>([]);

  // Toast 提示
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, visible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 2000);
  };

  // Close reset menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resetMenuRef.current && !resetMenuRef.current.contains(event.target as globalThis.Node)) {
        setIsResetMenuOpen(false);
      }
    };
    if (isResetMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isResetMenuOpen]);

  // Listen for openPromptLibrary event from AIProcessorNode
  useEffect(() => {
    const handleOpenPromptLibrary = () => {
      setIsPromptLibraryOpen(true);
    };
    window.addEventListener('openPromptLibrary', handleOpenPromptLibrary);
    return () => window.removeEventListener('openPromptLibrary', handleOpenPromptLibrary);
  }, []);

  // 节点复制粘贴功能
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检查焦点是否在输入框中
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // 如果是输入框，不拦截快捷键
      if (isInputFocused) return;

      // 检查是否是 Ctrl+C 或 Cmd+C
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault();
        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length > 0) {
          setCopiedNodes(selectedNodes);
          // 同时复制这些节点之间的边
          const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
          const relevantEdges = edges.filter(
            (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
          );
          setCopiedEdges(relevantEdges);
          showToast(`已复制 ${selectedNodes.length} 个节点`);
        }
      }

      // 检查是否是 Ctrl+V 或 Cmd+V
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault();
        if (copiedNodes.length === 0) return;

        // 生成旧ID到新ID的映射
        const idMapping = new Map<string, string>();
        copiedNodes.forEach((node) => {
          idMapping.set(node.id, uuidv4());
        });

        // 创建新节点，位置偏移
        const newNodes: FlowNode[] = copiedNodes.map((node) => ({
          ...node,
          id: idMapping.get(node.id)!,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          selected: false, // 新节点默认不选中
        }));

        // 创建新边
        const newEdges: FlowEdge[] = copiedEdges.map((edge) => ({
          ...edge,
          id: uuidv4(),
          source: idMapping.get(edge.source)!,
          target: idMapping.get(edge.target)!,
        }));

        // 更新状态，添加新节点和边
        useStore.setState((state) => ({
          nodes: [...state.nodes, ...newNodes],
          edges: [...state.edges, ...newEdges],
        }));

        showToast(`粘贴成功，已创建 ${newNodes.length} 个节点`);

        // 更新复制的节点位置，以便下次粘贴时继续偏移
        setCopiedNodes((prev) =>
          prev.map((node) => ({
            ...node,
            position: {
              x: node.position.x + 50,
              y: node.position.y + 50,
            },
          }))
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, copiedNodes, copiedEdges]);

  const addNode = (type: 'staticText' | 'aiProcessor' | 'textToImage' | 'wechatRenderer', label: string) => {
    const newNode = {
      id: uuidv4(),
      type,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label, text: '' },
    };
    useStore.setState((state) => ({ nodes: [...state.nodes, newNode] }));
  };

  return (
    <div className="w-screen h-screen bg-[#F7F7F5] font-sans">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#F7F7F5]"
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        minZoom={0.1}
        maxZoom={4}
      >
        <Background color="#E5E5E0" gap={24} size={2} />
        <Controls className="bg-white border-[#E5E5E0] shadow-sm rounded-lg overflow-hidden" />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.type) {
              case 'staticText': return '#E5E5E0';
              case 'aiProcessor': return '#8B9D83';
              case 'textToImage': return '#4A4A4A';
              case 'wechatRenderer': return '#2B579A';
              default: return '#eee';
            }
          }}
          maskColor="rgba(247, 247, 245, 0.7)"
          className="bg-white border border-[#E5E5E0] shadow-sm rounded-lg"
        />
        
        <Panel position="top-right" className="flex gap-2 m-4">
          <button
            onClick={() => setIsPromptLibraryOpen(true)}
            className="px-3 py-1.5 bg-white border border-[#E5E5E0] rounded-xl shadow-sm text-sm font-medium text-[#8B9D83] hover:bg-[#E8F3EE] transition-colors flex items-center gap-1.5"
            title="打开提示词库"
          >
            <Library className="w-4 h-4" />
            提示词库
          </button>

          <div className="bg-white border border-[#E5E5E0] rounded-xl shadow-sm p-1.5 flex gap-1.5">
            <button
              onClick={() => addNode('staticText', '文本容器')}
              className="px-3 py-1.5 text-sm font-medium text-[#4A4A4A] hover:bg-[#F2F2EC] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              文本
            </button>
            <button
              onClick={() => addNode('aiProcessor', 'AI 引擎')}
              className="px-3 py-1.5 text-sm font-medium text-[#4B8A6E] bg-[#E8F3EE] hover:bg-[#DDF0E7] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              AI 引擎
            </button>
            <button
              onClick={() => addNode('textToImage', '文章转图片')}
              className="px-3 py-1.5 text-sm font-medium text-white bg-[#4A4A4A] hover:bg-[#333] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              图片渲染
            </button>
            <button
              onClick={() => addNode('wechatRenderer', '公众号排版')}
              className="px-3 py-1.5 text-sm font-medium text-white bg-[#2B579A] hover:bg-[#1A3A6A] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              公众号渲染
            </button>
          </div>
          
          <div className="relative" ref={resetMenuRef}>
            <button
              onClick={() => setIsResetMenuOpen(!isResetMenuOpen)}
              className="p-2.5 bg-white border border-[#E5E5E0] rounded-xl shadow-sm text-[#666] hover:bg-[#F2F2EC] hover:text-[#E84C3D] transition-colors"
              title="重置选项"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            {isResetMenuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-[#E5E5E0] rounded-xl shadow-lg p-2 w-48 z-50">
                <button
                  onClick={() => {
                    if (confirm('确定要清空所有内容吗？\n\n这将保留：\n• 节点布局和连接\n• 提示词设置\n\n这会清空：\n• 所有文本框的内容')) {
                      clearContentOnly();
                    }
                    setIsResetMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-[#4A4A4A] hover:bg-[#F2F2EC] rounded-lg transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  仅清空内容
                </button>
                <div className="my-1 border-t border-[#E5E5E0]"></div>
                <button
                  onClick={() => {
                    if (confirm('确定要完全重置画布吗？\n\n这将：\n• 恢复初始节点布局\n• 清空所有内容和设置\n• 恢复默认提示词\n\n此操作不可恢复！')) {
                      resetCanvasFull();
                    }
                    setIsResetMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-[#E84C3D] hover:bg-[#FFF0F0] rounded-lg transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  完全重置
                </button>
              </div>
            )}
          </div>

          {/* API 配置提示 */}
          {(!activeProfileId || apiProfiles.length === 0) && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-2 bg-[#E84C3D] text-white rounded-xl shadow-sm text-sm font-medium hover:bg-[#D43A2B] transition-colors flex items-center gap-2 animate-pulse"
            >
              <AlertCircle className="w-4 h-4" />
              请先配置 API
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2.5 bg-white border rounded-xl shadow-sm transition-colors ${
              activeProfileId && apiProfiles.length > 0
                ? 'border-[#E5E5E0] text-[#4A4A4A] hover:bg-[#F2F2EC]'
                : 'border-[#E84C3D] text-[#E84C3D] hover:bg-[#FFF0F0]'
            }`}
            title="全局设置"
          >
            <Settings className="w-5 h-5" />
          </button>
        </Panel>
      </ReactFlow>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      <PromptLibraryPanel
        isOpen={isPromptLibraryOpen}
        onClose={() => setIsPromptLibraryOpen(false)}
      />

      {/* Toast 提示 */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${
          toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-[#4B8A6E] text-white px-6 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      </div>
    </div>
  );
}
