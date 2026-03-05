import { Handle, Position } from '@xyflow/react';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';

export default function StaticTextNode({ id, data, selected }: { id: string; data: any; selected?: boolean }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nodeName, setNodeName] = useState(data.label || '静态文本');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-adjust textarea height
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 128), 400)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [data.text]);

  return (
    <div className={`bg-[#FAF9F6] border-2 rounded-xl shadow-sm w-72 overflow-hidden flex flex-col font-sans transition-all duration-200 ${selected ? 'border-[#8B9D83] shadow-lg ring-2 ring-[#8B9D83]/20' : 'border-[#E5E5E0]'}`}>
      <div className="bg-[#F2F2EC] px-4 py-2 border-b border-[#E5E5E0] flex justify-between items-center">
        {isEditingName ? (
          <input
            autoFocus
            className="nodrag text-sm font-medium text-[#4A4A4A] bg-white border border-[#8B9D83] rounded px-1 py-0.5 outline-none w-full"
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
      <div className="p-4">
        <textarea
          ref={textareaRef}
          className="nodrag w-full bg-transparent border-none outline-none resize-none text-sm text-[#333] placeholder-[#A0A09C] overflow-y-scroll custom-scrollbar"
          style={{ minHeight: '128px', maxHeight: '400px' }}
          placeholder="在此输入或粘贴文本..."
          value={data.text || ''}
          onChange={(e) => {
            updateNodeData(id, { text: e.target.value });
            adjustHeight();
          }}
        />
      </div>
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  );
}
