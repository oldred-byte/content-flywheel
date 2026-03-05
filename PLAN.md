# 2026-03-02 提示词库系统 + 节点复制功能

## 已完成功能

### 1. 提示词库管理面板
- **入口**: 顶部工具栏"提示词库"按钮
- **三栏布局**:
  - 左边: 一级分类（可增删改、重命名）
  - 中间: 二级分类（可增删改、重命名）
  - 右边: 提示词卡片（可编辑、删除、设为默认）
- **星标功能**: 点击提示词卡片的星星，设为AI引擎默认提示词

### 2. AI引擎节点改造
- 下拉框只显示 `isInAIDefaults=true` 的提示词
- 模板管理弹窗添加"打开提示词库"按钮和星标按钮

### 3. 节点复制粘贴功能 (Ctrl+C / Ctrl+V)
- 选中节点后按 Ctrl+C 复制
- Ctrl+V 粘贴，自动偏移位置
- 支持多选节点复制，连线和节点一起复制

## 文件修改
- `src/store.ts` - 数据结构扩展、分类管理 actions
- `src/components/PromptLibraryPanel.tsx` - 新增提示词库面板
- `src/components/nodes/AIProcessorNode.tsx` - 改造模板选择逻辑
- `src/App.tsx` - 添加入口按钮、复制粘贴功能

## 数据结构
```typescript
PromptTemplate: {
  id, label, prompt,
  categoryId?,      // 所属一级分类
  subCategoryId?,   // 所属二级分类
  isInAIDefaults?,  // 是否AI引擎默认
  order,            // 排序
}
```
