import { useState, useMemo, useRef } from 'react';
import { X, Plus, GripVertical, Trash2, Edit2, Check, XCircle, Star } from 'lucide-react';
import { useStore, PromptTemplate, PromptCategory, PromptSubCategory } from '../store';
import { v4 as uuidv4 } from 'uuid';

interface PromptLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PromptLibraryPanel({ isOpen, onClose }: PromptLibraryPanelProps) {
  const {
    customTemplates,
    promptCategories,
    promptSubCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    addCustomTemplate,
    updateCustomTemplate,
    deleteCustomTemplate,
    toggleTemplateInAIDefaults,
    moveTemplateToSubCategory,
  } = useStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);

  // Editing states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | null>(null);
  const [editingSubCategoryName, setEditingSubCategoryName] = useState('');

  // New item states
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingSubCategory, setIsAddingSubCategory] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  // Template editing modal
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplatePrompt, setEditTemplatePrompt] = useState('');

  // Drag and drop states
  const [draggedTemplate, setDraggedTemplate] = useState<PromptTemplate | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [dragOverSubCategoryId, setDragOverSubCategoryId] = useState<string | null>(null);
  const dragTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize selected category
  useMemo(() => {
    if (!selectedCategoryId && promptCategories.length > 0) {
      setSelectedCategoryId(promptCategories[0].id);
    }
  }, [promptCategories, selectedCategoryId]);

  const currentCategory = useMemo(() =>
    promptCategories.find((c) => c.id === selectedCategoryId),
    [promptCategories, selectedCategoryId]
  );

  const currentSubCategories = useMemo(() =>
    promptSubCategories
      .filter((sc) => sc.categoryId === selectedCategoryId)
      .sort((a, b) => a.order - b.order),
    [promptSubCategories, selectedCategoryId]
  );

  const currentTemplates = useMemo(() => {
    let templates = customTemplates.filter((t) => t.categoryId === selectedCategoryId);
    if (selectedSubCategoryId) {
      templates = templates.filter((t) => t.subCategoryId === selectedSubCategoryId);
    }
    return templates.sort((a, b) => a.order - b.order);
  }, [customTemplates, selectedCategoryId, selectedSubCategoryId]);

  // Handlers
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleUpdateCategory = (id: string) => {
    if (editingCategoryName.trim()) {
      updateCategory(id, editingCategoryName.trim());
      setEditingCategoryId(null);
    }
  };

  const handleAddSubCategory = () => {
    if (newSubCategoryName.trim() && selectedCategoryId) {
      addSubCategory(selectedCategoryId, newSubCategoryName.trim());
      setNewSubCategoryName('');
      setIsAddingSubCategory(false);
    }
  };

  const handleUpdateSubCategory = (id: string) => {
    if (editingSubCategoryName.trim()) {
      updateSubCategory(id, editingSubCategoryName.trim());
      setEditingSubCategoryId(null);
    }
  };

  const handleAddTemplate = () => {
    if (selectedCategoryId) {
      const newTemplate: Omit<PromptTemplate, 'id'> = {
        label: '新提示词',
        prompt: '',
        categoryId: selectedCategoryId,
        subCategoryId: selectedSubCategoryId || undefined,
        isInAIDefaults: false,
        order: customTemplates.length,
      };
      addCustomTemplate(newTemplate);
      // Find and edit the new template
      setTimeout(() => {
        const added = customTemplates[customTemplates.length - 1];
        if (added) {
          setEditingTemplate(added);
          setEditTemplateName(added.label);
          setEditTemplatePrompt(added.prompt);
        }
      }, 0);
    }
    setIsAddingTemplate(false);
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateCustomTemplate(editingTemplate.id, {
        label: editTemplateName,
        prompt: editTemplatePrompt,
      });
      setEditingTemplate(null);
    }
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setEditTemplateName(template.label);
    setEditTemplatePrompt(template.prompt);
  };

  // Drag and drop handlers for templates
  const handleDragStart = (template: PromptTemplate) => {
    setDraggedTemplate(template);
  };

  const handleDragEnd = () => {
    setDraggedTemplate(null);
    setDragOverCategoryId(null);
    setDragOverSubCategoryId(null);
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
  };

  // Category drop handlers
  const handleCategoryDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTemplate && draggedTemplate.categoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  };

  const handleCategoryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategoryId(null);
  };

  const handleCategoryDrop = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTemplate && draggedTemplate.categoryId !== categoryId) {
      // Move template to this category (without subcategory)
      updateCustomTemplate(draggedTemplate.id, {
        categoryId: categoryId,
        subCategoryId: undefined,
      });
    }
    setDragOverCategoryId(null);
    setDraggedTemplate(null);
  };

  // SubCategory drop handlers
  const handleSubCategoryDragOver = (e: React.DragEvent, subCategoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTemplate && draggedTemplate.subCategoryId !== subCategoryId) {
      setDragOverSubCategoryId(subCategoryId);
    }
  };

  const handleSubCategoryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSubCategoryId(null);
  };

  const handleSubCategoryDrop = (e: React.DragEvent, subCategoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTemplate && draggedTemplate.subCategoryId !== subCategoryId) {
      moveTemplateToSubCategory(draggedTemplate.id, subCategoryId);
    }
    setDragOverSubCategoryId(null);
    setDraggedTemplate(null);
  };

  // SubCategory hover to auto-select (when dragging)
  const handleSubCategoryHover = (subCategoryId: string) => {
    if (draggedTemplate) {
      // When dragging, auto-select the subcategory being hovered
      setSelectedSubCategoryId(subCategoryId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#F5F5F0] rounded-xl w-[900px] h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E0]">
          <h2 className="text-lg font-semibold text-[#2C2C2A]">提示词库管理</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#E5E5E0] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#A0A09C]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Categories */}
          <div
            className="w-48 border-r border-[#E5E5E0] flex flex-col bg-white"
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="px-4 py-3 border-b border-[#E5E5E0]">
              <h3 className="text-xs font-medium text-[#A0A09C] uppercase tracking-wide">一级分类</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {promptCategories.sort((a, b) => a.order - b.order).map((category) => (
                <div
                  key={category.id}
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setSelectedSubCategoryId(null);
                  }}
                  onDragOver={(e) => handleCategoryDragOver(e, category.id)}
                  onDragLeave={handleCategoryDragLeave}
                  onDrop={(e) => handleCategoryDrop(e, category.id)}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                    selectedCategoryId === category.id
                      ? 'bg-[#8B9D83]/10 text-[#8B9D83]'
                      : 'hover:bg-[#F5F5F0] text-[#2C2C2A]'
                  } ${
                    dragOverCategoryId === category.id
                      ? 'bg-[#8B9D83]/30 ring-2 ring-[#8B9D83]'
                      : ''
                  }`}
                >
                  {editingCategoryId === category.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        className="flex-1 px-1 py-0.5 text-sm border border-[#8B9D83] rounded"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateCategory(category.id);
                          if (e.key === 'Escape') setEditingCategoryId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateCategory(category.id);
                        }}
                        className="p-0.5 hover:bg-[#8B9D83]/20 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                      <span className="flex-1 truncate">{category.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategoryId(category.id);
                          setEditingCategoryName(category.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#E5E5E0] rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {!category.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('确定删除此分类？其中的提示词将移至未分类。')) {
                              deleteCategory(category.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-[#E5E5E0]">
              {isAddingCategory ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="分类名称"
                    className="flex-1 px-2 py-1 text-sm border border-[#8B9D83] rounded"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCategory();
                      if (e.key === 'Escape') setIsAddingCategory(false);
                    }}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="p-1 hover:bg-[#8B9D83]/20 rounded"
                  >
                    <Check className="w-4 h-4 text-[#8B9D83]" />
                  </button>
                  <button
                    onClick={() => setIsAddingCategory(false)}
                    className="p-1 hover:bg-[#E5E5E0] rounded"
                  >
                    <XCircle className="w-4 h-4 text-[#A0A09C]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingCategory(true)}
                  className="flex items-center gap-1 w-full px-3 py-2 text-sm text-[#8B9D83] hover:bg-[#8B9D83]/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新增分类
                </button>
              )}
            </div>
          </div>

          {/* Middle: SubCategories */}
          <div
            className="w-48 border-r border-[#E5E5E0] flex flex-col bg-white"
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="px-4 py-3 border-b border-[#E5E5E0]">
              <h3 className="text-xs font-medium text-[#A0A09C] uppercase tracking-wide">二级分类</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div
                onClick={() => setSelectedSubCategoryId(null)}
                onDragOver={(e) => handleSubCategoryDragOver(e, 'null')}
                onDragLeave={handleSubCategoryDragLeave}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedTemplate && draggedTemplate.subCategoryId !== undefined) {
                    moveTemplateToSubCategory(draggedTemplate.id, null);
                  }
                  setDragOverSubCategoryId(null);
                  setDraggedTemplate(null);
                }}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                  selectedSubCategoryId === null
                    ? 'bg-[#8B9D83]/10 text-[#8B9D83]'
                    : 'hover:bg-[#F5F5F0] text-[#2C2C2A]'
                } ${
                  dragOverSubCategoryId === 'null'
                    ? 'bg-[#8B9D83]/30 ring-2 ring-[#8B9D83]'
                    : ''
                }`}
              >
                <span className="flex-1">全部</span>
              </div>
              {currentSubCategories.map((subCategory) => (
                <div
                  key={subCategory.id}
                  onClick={() => setSelectedSubCategoryId(subCategory.id)}
                  onDragOver={(e) => handleSubCategoryDragOver(e, subCategory.id)}
                  onDragLeave={handleSubCategoryDragLeave}
                  onDrop={(e) => handleSubCategoryDrop(e, subCategory.id)}
                  onMouseEnter={() => handleSubCategoryHover(subCategory.id)}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                    selectedSubCategoryId === subCategory.id
                      ? 'bg-[#8B9D83]/10 text-[#8B9D83]'
                      : 'hover:bg-[#F5F5F0] text-[#2C2C2A]'
                  } ${
                    dragOverSubCategoryId === subCategory.id
                      ? 'bg-[#8B9D83]/30 ring-2 ring-[#8B9D83]'
                      : ''
                  }`}
                >
                  {editingSubCategoryId === subCategory.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editingSubCategoryName}
                        onChange={(e) => setEditingSubCategoryName(e.target.value)}
                        className="flex-1 px-1 py-0.5 text-sm border border-[#8B9D83] rounded"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateSubCategory(subCategory.id);
                          if (e.key === 'Escape') setEditingSubCategoryId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateSubCategory(subCategory.id);
                        }}
                        className="p-0.5 hover:bg-[#8B9D83]/20 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                      <span className="flex-1 truncate">{subCategory.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSubCategoryId(subCategory.id);
                          setEditingSubCategoryName(subCategory.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#E5E5E0] rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('确定删除此二级分类？')) {
                            deleteSubCategory(subCategory.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-[#E5E5E0]">
              {isAddingSubCategory ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newSubCategoryName}
                    onChange={(e) => setNewSubCategoryName(e.target.value)}
                    placeholder="二级分类名称"
                    className="flex-1 px-2 py-1 text-sm border border-[#8B9D83] rounded"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubCategory();
                      if (e.key === 'Escape') setIsAddingSubCategory(false);
                    }}
                  />
                  <button
                    onClick={handleAddSubCategory}
                    className="p-1 hover:bg-[#8B9D83]/20 rounded"
                  >
                    <Check className="w-4 h-4 text-[#8B9D83]" />
                  </button>
                  <button
                    onClick={() => setIsAddingSubCategory(false)}
                    className="p-1 hover:bg-[#E5E5E0] rounded"
                  >
                    <XCircle className="w-4 h-4 text-[#A0A09C]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingSubCategory(true)}
                  className="flex items-center gap-1 w-full px-3 py-2 text-sm text-[#8B9D83] hover:bg-[#8B9D83]/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新增二级分类
                </button>
              )}
            </div>
          </div>

          {/* Right: Templates */}
          <div className="flex-1 flex flex-col bg-[#F5F5F0]">
            <div className="px-4 py-3 border-b border-[#E5E5E0] flex items-center justify-between">
              <h3 className="text-xs font-medium text-[#A0A09C] uppercase tracking-wide">
                {currentCategory?.name}
                {selectedSubCategoryId && ` / ${currentSubCategories.find((sc) => sc.id === selectedSubCategoryId)?.name}`}
              </h3>
              <span className="text-xs text-[#A0A09C]">{currentTemplates.length} 个提示词</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {currentTemplates.map((template) => (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={() => handleDragStart(template)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg p-4 border hover:shadow-sm transition-all group cursor-move ${
                      draggedTemplate?.id === template.id
                        ? 'opacity-50 border-[#8B9D83]'
                        : 'border-[#E5E5E0] hover:border-[#8B9D83]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="w-4 h-4 text-[#A0A09C] opacity-0 group-hover:opacity-50" />
                        <h4 className="font-medium text-[#2C2C2A] text-sm">{template.label}</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleTemplateInAIDefaults(template.id)}
                          className={`p-1 rounded transition-colors ${
                            template.isInAIDefaults
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-[#E5E5E0] hover:text-yellow-400'
                          }`}
                          title={template.isInAIDefaults ? '已从AI引擎默认中移除' : '添加到AI引擎默认'}
                        >
                          <Star className={`w-4 h-4 ${template.isInAIDefaults ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#A0A09C] line-clamp-3 mb-3">
                      {template.prompt.slice(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#8B9D83] bg-[#8B9D83]/10 px-2 py-0.5 rounded">
                        {template.isInAIDefaults ? 'AI默认' : '库中'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-1 text-[#A0A09C] hover:text-[#8B9D83] hover:bg-[#8B9D83]/10 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定删除此提示词？')) {
                              deleteCustomTemplate(template.id);
                            }
                          }}
                          className="p-1 text-[#A0A09C] hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-[#E5E5E0]">
              <button
                onClick={handleAddTemplate}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#8B9D83] text-white rounded-lg hover:bg-[#7A8D73] transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增提示词
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E0]">
              <h3 className="text-lg font-semibold text-[#2C2C2A]">编辑提示词</h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1 hover:bg-[#E5E5E0] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#A0A09C]" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-[#2C2C2A] mb-1">名称</label>
                <input
                  type="text"
                  value={editTemplateName}
                  onChange={(e) => setEditTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E0] rounded-lg focus:outline-none focus:border-[#8B9D83]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C2C2A] mb-1">提示词内容</label>
                <textarea
                  value={editTemplatePrompt}
                  onChange={(e) => setEditTemplatePrompt(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-[#E5E5E0] rounded-lg focus:outline-none focus:border-[#8B9D83] font-mono text-sm resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={editingTemplate.isInAIDefaults || false}
                  onChange={() => toggleTemplateInAIDefaults(editingTemplate.id)}
                  className="rounded border-[#E5E5E0] text-[#8B9D83] focus:ring-[#8B9D83]"
                />
                <label htmlFor="isDefault" className="text-sm text-[#2C2C2A]">
                  设为AI引擎默认提示词
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E5E5E0]">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-sm text-[#A0A09C] hover:text-[#2C2C2A] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-[#8B9D83] text-white rounded-lg text-sm hover:bg-[#7A8D73] transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
