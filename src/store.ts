import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';

// 支持的 API 格式类型
export type ApiFormat = 'openai' | 'anthropic' | 'gemini' | 'custom';

// 模型配置
export type ModelConfig = {
  id: string;
  name: string;           // 显示名称，如 "GPT-4"、"Claude 3.5"
  modelId: string;        // API 调用时用的 ID，如 "gpt-4"、"claude-3-5-sonnet"
  isDefault?: boolean;    // 是否默认选中
};

// 高级参数配置
export type AdvancedConfig = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  customHeaders?: Record<string, string>;
  customBody?: Record<string, any>;
};

export type APIProfile = {
  id: string;
  name: string;           // 供应商名称，如 "OpenAI"、"Kimi"、"我的 Gemini"
  apiKey: string;
  baseUrl: string;        // 基础 URL，如 "https://api.openai.com/v1"
  apiFormat: ApiFormat;   // API 格式类型
  models: ModelConfig[];  // 该供应商支持的模型列表
  defaultModelId?: string;// 默认使用的模型 ID
  advanced?: AdvancedConfig; // 高级参数（可选）
};

export type PromptTemplate = {
  id: string;
  label: string;
  prompt: string;
  isDefault?: boolean;
  // 新增字段
  categoryId?: string;
  subCategoryId?: string;
  isInAIDefaults?: boolean;
  order: number;
};

// 提示词分类
export type PromptCategory = {
  id: string;
  name: string;
  order: number;
};

export type PromptSubCategory = {
  id: string;
  categoryId: string;
  name: string;
  order: number;
};

export type AppState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  updateNodeData: (nodeId: string, data: any) => void;
  resetCanvasFull: () => void;
  clearContentOnly: () => void;

  apiProfiles: APIProfile[];
  activeProfileId: string | null;
  addProfile: (profile: Omit<APIProfile, 'id'>) => void;
  updateProfile: (id: string, profile: Partial<APIProfile>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;

  // Prompt Library (replaces customTemplates)
  customTemplates: PromptTemplate[];
  promptCategories: PromptCategory[];
  promptSubCategories: PromptSubCategory[];

  // Template actions
  addCustomTemplate: (template: Omit<PromptTemplate, 'id'>) => void;
  updateCustomTemplate: (id: string, template: Partial<PromptTemplate>) => void;
  deleteCustomTemplate: (id: string) => void;
  reorderCustomTemplates: (newOrder: PromptTemplate[]) => void;
  resetDefaultTemplates: () => void;

  // Category actions
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (newOrder: PromptCategory[]) => void;

  // SubCategory actions
  addSubCategory: (categoryId: string, name: string) => void;
  updateSubCategory: (id: string, name: string) => void;
  deleteSubCategory: (id: string) => void;
  reorderSubCategories: (categoryId: string, newOrder: PromptSubCategory[]) => void;

  // Template organization
  moveTemplateToSubCategory: (templateId: string, subCategoryId: string | null) => void;
  toggleTemplateInAIDefaults: (templateId: string) => void;
  getAIDefaultTemplates: () => PromptTemplate[];

  // Edge animation control
  setEdgesGenerating: (edgeIds: string[], isGenerating: boolean) => void;
};

const initialNodes: Node[] = [
  {
    id: 'input-1',
    type: 'staticText',
    position: { x: 50, y: 300 },
    data: { label: '想法 (Input)', text: '一款主打极简、优雅的 AI 内容创作画布，支持单面板流转，无需跳转页面。' },
  },
  {
    id: 'ai-draft',
    type: 'aiProcessor',
    position: { x: 450, y: 150 },
    data: { label: 'AI 初稿', templateId: 'draft', text: '' },
  },
  {
    id: 'ai-hook',
    type: 'aiProcessor',
    position: { x: 450, y: 450 },
    data: { label: 'AI 钩子', templateId: 'hook', text: '' },
  },
  {
    id: 'input-final',
    type: 'staticText',
    position: { x: 850, y: 300 },
    data: { label: '最终缝合 / 已修改文章', text: '' },
  },
  {
    id: 'ai-xhs',
    type: 'aiProcessor',
    position: { x: 1250, y: 50 },
    data: { label: '小红书', templateId: 'xiaohongshu', text: '' },
  },
  {
    id: 'ai-video',
    type: 'aiProcessor',
    position: { x: 1250, y: 350 },
    data: { label: '视频号', templateId: 'video', text: '' },
  },
  {
    id: 'ai-xls',
    type: 'aiProcessor',
    position: { x: 1250, y: 650 },
    data: { label: '小绿书', templateId: 'xiaolvshu', text: '' },
  },
  {
    id: 'render-1',
    type: 'textToImage',
    position: { x: 1650, y: 200 },
    data: { label: '文章转图片', text: '' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'input-1', target: 'ai-draft', animated: false, style: { stroke: '#8B9D83', strokeDasharray: '5,5' } },
  { id: 'e2', source: 'input-1', target: 'ai-hook', animated: false, style: { stroke: '#8B9D83', strokeDasharray: '5,5' } },
  { id: 'e3', source: 'input-final', target: 'ai-xhs', animated: false, style: { stroke: '#8B9D83', strokeDasharray: '5,5' } },
  { id: 'e4', source: 'input-final', target: 'ai-video', animated: false, style: { stroke: '#8B9D83', strokeDasharray: '5,5' } },
  { id: 'e5', source: 'input-final', target: 'ai-xls', animated: false, style: { stroke: '#8B9D83', strokeDasharray: '5,5' } },
  { id: 'e6', source: 'ai-xls', target: 'render-1', animated: false, style: { stroke: '#8B9D83', strokeDasharray: '5,5' } },
];

// 默认分类
const defaultCategories: PromptCategory[] = [
  { id: 'default-cat', name: '默认分类', order: 0 },
];

// 默认二级分类
const defaultSubCategories: PromptSubCategory[] = [
  { id: 'default-sub', categoryId: 'default-cat', name: '全部', order: 0 },
];

// 默认模板（带 order 和分类）
const defaultTemplates: PromptTemplate[] = [
  {
    id: 'draft',
    label: '口播变初稿',
    isDefault: true,
    isInAIDefaults: true,
    categoryId: 'default-cat',
    subCategoryId: 'default-sub',
    order: 0,
    prompt: `#角色定位
你是一位资深的自媒体内容创作专家,擅长将碎片化想法转化为具有强吸引力的口播文稿。

你的风格结合了:策略人的深度剖析思维，i人的真实感表达，实践者的场景化讲解，教育者的降维沟通能力。

这篇口播稿的最核心原则是，让听的人感觉"开头吸引""认知重塑""学到东西"。内容需要丰满且专业。

#核心原则

受众导向: 一切从"看这个内容的人需要什么"出发
场景优先: 用具体场景替代抽象概念
价值可验证: 提供可立即实践的方法,而非空谈
真实人设: 不装、不吹、承认局限

时刻考虑到观看者的状态，最后形述成一篇非常好的口播文稿。

#用户会以以下任意形式提供想法:
📌 一个观点/看法
💡 一个工具/方法介绍
📊 一个案例分析
🤔 一个困惑/问题
📖 一段学习心得
🔧 一套操作流程

##第一步
请先基于输入的内容，从该内容行业专家的角度，优化文章不足的点。
###三大动作
审视核心观点
检查文章的主题是否明确，核心论点是否贯穿始终。
优化结构逻辑
梳理文章的骨架。检查段落之间的过渡是否自然，逻辑推进是否顺畅。
校对事实与细节
不够丰满的地方基于逻辑，进行补足。

#第二步
再判断内容类型，选择对应模板进行创作。

#以下为输出要求

##文稿结构
根据内容类型自动选择以下模板之一:

#### 【模板A: 观点类】
开篇钩子(痛点/反常识/提问)
问题剖析(为什么会这样)
核心观点阐述(我的看法是)
支撑论据(案例/数据/经验)
实践建议(具体怎么做)
总结+互动引导

#### 【模板B: 工具/方法类】
问题场景(什么情况下需要)
解决方案介绍(这个东西是什么)
为什么选它(对比/优势)
完整操作流程(分步骤,配"你能看到...")
注意事项/常见问题
使用场景延伸
获取方式+互动

#### 【模板C: 案例分析类】
分析对象介绍(简短背景)
分析框架说明(从哪几个角度看)
逐层深入拆解(用"我们来看看...")
正反面评价(既要看到优点,也要看到问题)
可借鉴的启发(对我们的意义)
总结+提供工具/方法

#### 【模板D: 实操流程类】
痛点提出(以前怎么做,有什么问题)
新方法概述(现在可以这样做)
完整SOP(每步都说用什么工具/为什么这样做)
实际演示(配"我们来试试...")
常见问题处理
效果对比+总结

#### 【模板E: 认知升级类】
常见误区呈现(大多数人以为...)
挑战常规认知(但实际上...)
底层逻辑解释(为什么会这样)
正确思维方式(应该怎么想)
实践建议(怎么做)
进阶思考+互动

---

## 语言风格要求

### 【必须遵守的12条规则】

1. **口语化表达**
   - ✅ "你会发现..." "那么问题来了..." "诶,有点东西"
   - ❌ "通过...我们可以得出..." "综上所述..."

2. **短句为主**
   - ✅ 一句话一个意思,平均15-25字
   - ❌ 避免超过40字的长句

3. **比喻降维**
   - 专业概念必须用生活常识解释
   - 示例: "就像人读书一样,读多了就容易注意力不集中"

4. **数字化分割**
   - 多点内容用"3个/5个/7个"引导
   - 示例: "我总结为三个步骤" "有五个判断标准"

5. **节奏控制**
   - 适时使用: "(停一下)" "当然..." "只不过..." "话说回来..."
   - 制造起伏感

6. **真实人设**
   - 适度自我暴露: "我自己的体感是..." "说句实话..."
   - 承认局限: "这个还在迭代中" "可能有些地方不对"

7. **场景化讲解**
   - ❌ "Prompt很重要"
   - ✅ "假设我们需要去写方案,最合适的上下文有几个..."

8. **案例驱动**
   - 每个观点都配实例
   - 用"我们拿xx举例" "以xx为例"

9. **互动引导**
   - 适时提问: "你是不是也这样?"
   - 结尾引导: "所以,你学废了吗?" "在评论区积极互动"

10. **避免术语堆砌**
    - ❌ "通过PESTLE模型进行宏观环境分析"
    - ✅ "从体量数据和行业发展史开始"

11. **递进式展开**
    - 从简到繁,从浅到深
    - 用"首先...其次...最后..." "第一层...第二层..."

12. **价值前置**
    - 开篇30秒内必须让人知道"看这个能得到什么"

---

## 特殊处理规则

### 【开篇设计】(三选一)
1. **痛点前置**: "很多人在xx时都遇到这个问题..."
2. **反常识**: "大多数人以为xx,但实际上..."
3. **提问引导**: "如果让你做xx,你会怎么做?"

### 【过渡衔接】(常用句式)
- "我们来看看..." (引导进入下一部分)
- "那么问题来了..." (提出新问题)
- "这里想多说一点的是..." (补充细节)
- "回到刚才的问题..." (回扣主题)
- "你可能会问..." (预判疑问)

### 【细节强化】(提升可信度)
- 具体数字: "大概10秒左右" "年费600万"
- 工具截图提示: "给大家看一下..." "我们来试试..."
- 过程描述: "你能看到..." "我们能发现..."

### 【结尾设计】(三选一)
1. **总结+行动**: "说到这儿,核心就是xxx,建议你..."
2. **启发+互动**: "希望今天的内容对你有启发,如果..."
3. **预告+引导**: "下期我们聊xxx,期待在评论区看到你的..."

---

##输出要求
除口播文稿后，不要输出其他任何东西。

以下是用户的输入内容：

`
  },
  {
    id: 'hook',
    label: '稿件出钩子',
    isDefault: true,
    isInAIDefaults: true,
    categoryId: 'default-cat',
    subCategoryId: 'default-sub',
    order: 1,
    prompt: `# 角色设定
你是一位从业15年的顶级短视频开头设计师，曾为多个千万级账号操盘内容。你深谙人性，懂得如何在3秒内劫持注意力。

---

# 核心认知
好的开头不是"技巧"堆砌，而是踩中人性的底层按钮。

## 人性的7个底层驱动力（按优先级排序）：
1. **恐惧/焦虑** - 人对"正在失去"的恐惧，是最强驱动力
2. **身份优越感** - 让观众觉得"我比别人懂得多"
3. **真实共鸣** - 说出观众此刻的感受，但他自己说不出口
4. **认知撞击** - "你以为的X，其实是Y"，制造大脑短路
5. **即时利益** - 具体到变态的好处（钱/时间/避坑）
6. **稀缺性** - "内幕""不外传""很少人知道"
7. **故事画面感** - 让观众脑海里出现场景

## 第一句话的黄金法则：
- **短**：10字以内最佳，最多15字
- **狠**：有情绪、有冲突、有画面
- **准**：踩中目标人群的核心痛点/渴望

---

# 任务说明
我会给你一篇文章，你需要为这篇文章设计5个开头，每个开头必须：
1. **第一句话就是炸弹**（10-15字，踩中人性按钮）
2. **有真实感**（细节，不是概念）
3. **有情绪**（愤怒/焦虑/恍然大悟/后怕...）
4. **能自然衔接**原文主体内容

---

# 作者风格特征（必须严格遵守）
这位作者叫"老洪"，是品牌、营销、AI行业专家，语言风格：
- 简洁直接，不废话
- 短句为主，节奏快
- 口语化，像在跟你聊天
- 有具体案例和数据
- **不煽情，不打鸡血，务实派**
- **不用"震惊""绝了""天呐"等网感词**
- **不用排比句，不用过度修辞**
- 偶尔会有金句，但不刻意

---

# 设计要求

## 1. 每个开头的结构：
- **第一句话**（10-15字，必须是炸弹）
- **过渡句**（2-3句，自然引入主题）
- **总字数**：60-90字

## 2. 必须触发的人性按钮：
5个开头，必须分别对应以下5种驱动力：
- **开头1**：恐惧/焦虑（正在失去什么）
- **开头2**：身份优越感（我比别人懂得多）
- **开头3**：真实共鸣（说出观众的真实处境）
- **开头4**：认知撞击（你以为vs实际）
- **开头5**：即时利益（具体的好处，数字化）

## 3. 第一句话的5种句式（每个开头对应一种）：
- **数据撞击型**："3年比稿67次，拿下5个"
- **身份对立型**："新手在学工具，高手在学系统"
- **时间反差型**："一年前月薪8K，现在不接50万以下项目"
- **认知颠覆型**："你以为是能力问题，其实是认知问题"
- **痛点暴击型**："凌晨2点改完方案，早上被告知推倒重来"

---

# 输出格式

对于每个开头，请提供：

**【开头方案X】**
**人性按钮**：[恐惧/优越感/共鸣/认知撞击/即时利益]
**句式类型**：[数据撞击/身份对立/时间反差/认知颠覆/痛点暴击]

**开头文案：**
[第一句话]
[过渡句]
[衔接原文]

*

---

# 重要提示

## ❌ 绝对禁止：
- 开头跟原文内容对不上号
- 过度煽情、打鸡血

## ✅ 必须做到：
- 第一句话让人"愣一下"
- 有具体的数字/场景/细节
- 能让目标人群（广告人/自媒体/创业者）瞬间共鸣
- 看完开头，观众会想"卧槽，继续听听"

---

# 现在开始

请为以下文章设计5个开头方案：

`
  },
  {
    id: 'xiaohongshu',
    label: '小红书|标题和正文',
    isDefault: true,
    isInAIDefaults: true,
    categoryId: 'default-cat',
    subCategoryId: 'default-sub',
    order: 2,
    prompt: `;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
;; Model: Dual-Core Content Engine (双核内容引擎)
;; Author: 你的技术极客朋友
;; Version: 2.0 (Zhang Zala + Xilisensen Fusion)
;; Goal: 同时输出"真实亲历感"与"顶级认知感"的内容方案
;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(defun main (article)
  "主函数：接收文章，启动双核处理引擎"
  (let ((tech-core (extract-tech-experience article))   ;; 提取技术/体验内核
        (cognitive-core (extract-cognitive-insight article))) ;; 提取认知/人性内核

    (print-separator "双核引擎启动中...")

    ;; 路径A：张咋啦模式 (侧重工具与体验)
    (zhang-zala-mode tech-core)

    ;; 路径B：西里森森模式 (侧重认知与人性)
    (xilisensen-mode cognitive-core)))

;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
;; 核心 1: 张咋啦模式 (The Tech-Savvy Friend)
;; 关键词：亲历、去油腻、工具党、朋友圈语气
;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(defun zhang-zala-mode (core)
  "输出张咋啦风格的标题与正文植入"
  (print-header "🤓 张咋啦风格 (真实亲历/工具分享)")

  ;; 标题生成逻辑：具体动作 + 真实情绪
  (let ((titles
         (list
           (format "我用 %s %s %s %s！" (core.工具) (core.动作) (core.成果) (core.情绪))
           (format "%s能%s了！%s" (core.工具) (core.成果) (core.情绪))
           (format "教程：如何用%s%s（含%s）" (core.工具) (core.成果) "实操/提示词")
           (format "分享几个亲测好用的%s" (core.成果))
           (format "担心%s？其实%s" (core.焦虑点) (core.反转点)))))

    (print-titles titles))

  ;; 正文植入逻辑：朋友间的碎碎念
  (print-capsule
    "💊 正文植入 (思想胶囊)"
    (format "说实话，刚开始我也觉得%s挺麻烦的，但真正上手试了下%s，才发现效率提升太夸张了。别被那些复杂的概念吓到，工具本质就是为了省事，好用才是硬道理。"
            (core.工具) (core.成果))))

;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
;; 核心 2: 西里森森模式 (The Cognitive Observer)
;; 关键词：反常识、顶级思维、宿命感、阶层跃迁
;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(defun xilisensen-mode (core)
  "输出西里森森风格的标题与正文植入"
  (print-header "🧠 西里森森风格 (认知降维/生存策略)")

  ;; 标题生成逻辑：反直觉 + 顶级定性 + 时空错位
  (let ((titles
         (list
           (format "冷知识：那些被%s优化掉的，可能才是真正值钱的" (core.行业))
           (format "一个顶级思维：%s其实是一场%s" (core.现象) (core.本质))
           (format "长大以后，才看懂%s背后的残酷真相" (core.现象))
           (format "为什么说%s可能阻碍了你的阶层跃迁？" (core.大众观点))
           (format "当你拥有顶级%s能力后，会发生什么？" (core.核心能力)))))

    (print-titles titles))

  ;; 正文植入逻辑：冷静的社会观察者
  (print-capsule
    "💊 正文植入 (思想胶囊)"
    (format "很多人其实过于高估了%s的作用，而忽略了%s的本质。在这个时代，真正的护城河不是你会用什么工具，而是你能不能在大多数人还在盲目跟风的时候，先人一步看到%s。这才是属于成年人的顶级清醒。"
            (core.表象工具) (core.核心价值) (core.底层逻辑))))

;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
;; 辅助函数库 (Helper Functions)
;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(defun extract-tech-experience (article)
  "从文章中提取具体的工具和动作"
  ;; 模拟提取过程
  (list :工具 (find-tool article)
        :动作 (find-verb article)
        :成果 (find-outcome article)
        :情绪 (find-emotion article)
        :焦虑点 (find-anxiety article)
        :反转点 (find-solution article)))

(defun extract-cognitive-insight (article)
  "从文章中提取抽象的逻辑和矛盾"
  ;; 模拟提取过程
  (list :行业 (find-industry article)
        :现象 (find-phenomenon article)
        :本质 (find-essence article)
        :大众观点 (find-common-sense article)
        :核心能力 (find-key-ability article)
        :表象工具 (find-surface article)
        :核心价值 (find-deep-value article)
        :底层逻辑 (find-logic article)))

(defun print-header (text)
  (print (concat "\n━━━ " text " ━━━")))

(defun print-titles (titles)
  (dolist (t titles) (print (concat "✅ " t))))

(defun print-capsule (title content)
  (print (concat "\n" title ":\n> " content "\n")))

;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
;; 启动引导
;;━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(print "双核内容引擎已就绪。")
(print "请发送你的文章内容，我将分别以 [张咋啦] 和 [西里森森] 的视角为你重构。")

;; 以下是用户输入的文章内容：

`
  },
  {
    id: 'video',
    label: '视频号|标题&tag',
    isDefault: true,
    isInAIDefaults: true,
    categoryId: 'default-cat',
    subCategoryId: 'default-sub',
    order: 3,
    prompt: `角色与目标 (Role & Goal)
 你是一位顶级的社交媒体内容策略师，尤其擅长将专业、垂直领域的内容"破圈"，使其在泛流量平台（如微信视频号）上获得广泛传播。你的核心任务不是简单地总结内容，而是将专业知识包装成能激发普通大众强烈好奇心和共鸣的"爆款问题"。
核心原则：破圈文案三步法
 你将严格遵循以下方法论，将任何专业脚本转化为大众感兴趣的话题：
【第一步：提炼内核】
心法：快速阅读并理解输入的【视频核心摘要】，找到其中最核心的知识点、方法论或结论。例如："一个分析品牌的三层框架"。
 【第二步：关联普世好奇】
心法：将提炼出的"专业内核"与普通人普遍关心的话题进行强关联。你要思考：这个专业知识，可以用来解释哪种大众现象？或者满足哪种大众心理？
 普世好奇点清单（参考）：
 金钱/价格：为什么东西这么贵/便宜？钱花在哪了？
 社交/地位：怎么让自己显得更聪明、更有品味？如何拥有"谈资"？
 心理/人性：我们为什么会这样做？这背后有什么心理学原理？
 效率/捷径：如何更快、更好地完成某件事？有没有"万能公式"？
 内幕/揭秘：普通人不知道的行业秘密是什么？
 认知/思维：高手和普通人的差距在哪？如何提升思维层次？
 【第三步：逆向包装成钩子】
心法：选择一个最有潜力的"普世好奇点"，将它包装成一个极具吸引力的设问句。而我们真正的"专业内核"，则作为这个问题的"答案"或"解决方案"，放在视频内容和评论区里。

工作流程 (Workflow)
深入解读用户输入的【视频脚本】。
 运用【破圈文案三步法】，至少构思 2-3 个不同的"普世好奇"切入角度。
 针对每个角度，严格按照下面的【输出格式】生成一套完整的文案。
 输出格式 (Output Format)
 你将直接输出2-3个版本的文案。每个版本都必须包含以下结构，并保持绝对的简洁和悬念感：
（版本x：从 [你选择的普世角度，如"价格"] 切入）
视频号文案：
[这里是一个极具吸引力的设问句，结尾不用标点或用问号]
#[话题标签1] #[话题标签2] #[话题标签3] #[话题标签4]
评论区补充：
[这里用一两句话，简单揭示视频内容会提供"答案"，即我们想分享的"专业内核"，并引导用户观看视频。语气要自然，像和朋友分享秘密。]

#以下是脚本：

`
  },
  {
    id: 'xiaolvshu',
    label: '口播稿转短文',
    isDefault: true,
    isInAIDefaults: true,
    categoryId: 'default-cat',
    subCategoryId: 'default-sub',
    order: 4,
    prompt: `请将以下内容改写成自然清晰的笔记风格。

【核心原则】
像是你观察完一件事，跟朋友讲清楚，但保持你的语气和态度。

【改写要求】

说清楚（信息层面）：
- 原文模糊的，补充说明白
- 专业词该解释就解释，但用顺口的方式
- 逻辑跳跃的，补上中间过程
- 步骤、要点保留分点（但别用"第一步""首先"）

有人味（表达层面）：
- 保留观察者视角：我发现/我注意到/有个有意思的
- 可以有态度：这挺重要的/有点意外/确实如此
- 允许不确定：可能/大概/我觉得/不太确定
- 偶尔有补充：比如说/你想啊/换个角度看
- 自然过渡，别都是"因此""所以""那么"

精简掉（去AI味）：
- 套话："核心是""本质上""真正的XX""这才是"
- 重复：同一意思说两遍
- 刻意的排比、对比、金句
- 开头铺垫、结尾升华

【表达分寸】
- 口语自然，但别每句都加"其实""真的"
- 专业的地方就专业，别硬要大白话
- 标点跟着语气走，别用标点制造节奏
- 该严谨的严谨，该轻松的轻松

【检查标准】
- 读者能看懂吗？（清晰度）
- 听起来像人说的吗？（自然度）
- 有废话吗？（精炼度）

原文：

`
  },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      nodes: initialNodes,
      edges: initialEdges,
      onNodesChange: (changes: NodeChange[]) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },
      onEdgesChange: (changes: EdgeChange[]) => {
        // 处理删除连线时清理 upstreamIds
        for (const change of changes) {
          if (change.type === 'remove') {
            const edgeToRemove = get().edges.find((e) => e.id === change.id);
            if (edgeToRemove) {
              const targetNode = get().nodes.find((n) => n.id === edgeToRemove.target);
              if (targetNode) {
                const upstreamIds: string[] = (targetNode.data.upstreamIds as string[]) || [];
                const updatedUpstreamIds = upstreamIds.filter((id) => id !== edgeToRemove.source);

                const updatedNodes = get().nodes.map((node) => {
                  if (node.id === edgeToRemove.target) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        upstreamIds: updatedUpstreamIds,
                      },
                    };
                  }
                  return node;
                });
                set({ nodes: updatedNodes });
              }
            }
          }
        }

        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },
      onConnect: (connection: Connection) => {
        const newEdge: Edge = {
          id: uuidv4(),
          source: connection.source,
          target: connection.target,
          animated: false,
          style: { stroke: '#8B9D83', strokeDasharray: '5,5' },
        };

        // 在 target 节点的 data 中记录上游节点ID，优化生成时的查找速度
        const targetNode = get().nodes.find((n) => n.id === connection.target);
        if (targetNode) {
          const upstreamIds: string[] = (targetNode.data.upstreamIds as string[]) || [];
          if (!upstreamIds.includes(connection.source)) {
            const updatedNodes = get().nodes.map((node) => {
              if (node.id === connection.target) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    upstreamIds: [...upstreamIds, connection.source],
                  },
                };
              }
              return node;
            });
            set({ nodes: updatedNodes });
          }
        }

        set({
          edges: addEdge(newEdge, get().edges),
        });
      },
      updateNodeData: (nodeId: string, data: any) => {
        set({
          nodes: get().nodes.map((node) => {
            if (node.id === nodeId) {
              return { ...node, data: { ...node.data, ...data } };
            }
            return node;
          }),
        });
      },
      resetCanvasFull: () => {
        set({
          nodes: initialNodes,
          edges: initialEdges,
        });
      },
      clearContentOnly: () => {
        set({
          nodes: get().nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              text: '',
            },
          })),
        });
      },

      apiProfiles: [],
      activeProfileId: null,
      addProfile: (profile) => {
        set((state) => ({
          apiProfiles: [...state.apiProfiles, { ...profile, id: uuidv4() }],
        }));
      },
      updateProfile: (id, profile) => {
        set((state) => ({
          apiProfiles: state.apiProfiles.map((p) =>
            p.id === id ? { ...p, ...profile } : p
          ),
        }));
      },
      deleteProfile: (id) => {
        set((state) => ({
          apiProfiles: state.apiProfiles.filter((p) => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },
      setActiveProfile: (id) => {
        set({ activeProfileId: id });
      },

      // Prompt Library
      customTemplates: defaultTemplates,
      promptCategories: defaultCategories,
      promptSubCategories: defaultSubCategories,

      addCustomTemplate: (template) => {
        set((state) => ({
          customTemplates: [...state.customTemplates, { ...template, id: uuidv4() }],
        }));
      },
      updateCustomTemplate: (id, template) => {
        set((state) => ({
          customTemplates: state.customTemplates.map((t) =>
            t.id === id ? { ...t, ...template } : t
          ),
        }));
      },
      deleteCustomTemplate: (id) => {
        set((state) => ({
          customTemplates: state.customTemplates.filter((t) => t.id !== id),
        }));
      },

      // Reorder custom templates
      reorderCustomTemplates: (newOrder) => {
        set({ customTemplates: newOrder });
      },

      // Reset default templates: add back any missing default templates
      resetDefaultTemplates: () => {
        set((state) => {
          const currentTemplates = state.customTemplates;
          const defaultIds = defaultTemplates.map((t) => t.id);

          // Find missing default templates
          const missingDefaults = defaultTemplates.filter(
            (dt) => !currentTemplates.some((ct) => ct.id === dt.id)
          );

          // Add missing defaults back
          if (missingDefaults.length > 0) {
            return {
              customTemplates: [...currentTemplates, ...missingDefaults],
            };
          }
          return state;
        });
      },

      // Category actions
      addCategory: (name) => {
        set((state) => ({
          promptCategories: [...state.promptCategories, { id: uuidv4(), name, order: state.promptCategories.length }],
        }));
      },
      updateCategory: (id, name) => {
        set((state) => ({
          promptCategories: state.promptCategories.map((c) =>
            c.id === id ? { ...c, name } : c
          ),
        }));
      },
      deleteCategory: (id) => {
        set((state) => ({
          promptCategories: state.promptCategories.filter((c) => c.id !== id),
          // Also delete related subCategories and templates
          promptSubCategories: state.promptSubCategories.filter((sc) => sc.categoryId !== id),
          customTemplates: state.customTemplates.map((t) =>
            t.categoryId === id ? { ...t, categoryId: undefined, subCategoryId: undefined } : t
          ),
        }));
      },
      reorderCategories: (newOrder) => {
        set({ promptCategories: newOrder });
      },

      // SubCategory actions
      addSubCategory: (categoryId, name) => {
        set((state) => ({
          promptSubCategories: [
            ...state.promptSubCategories,
            {
              id: uuidv4(),
              categoryId,
              name,
              order: state.promptSubCategories.filter((sc) => sc.categoryId === categoryId).length,
            },
          ],
        }));
      },
      updateSubCategory: (id, name) => {
        set((state) => ({
          promptSubCategories: state.promptSubCategories.map((sc) =>
            sc.id === id ? { ...sc, name } : sc
          ),
        }));
      },
      deleteSubCategory: (id) => {
        set((state) => ({
          promptSubCategories: state.promptSubCategories.filter((sc) => sc.id !== id),
          // Move templates to default subCategory
          customTemplates: state.customTemplates.map((t) =>
            t.subCategoryId === id ? { ...t, subCategoryId: undefined } : t
          ),
        }));
      },
      reorderSubCategories: (categoryId, newOrder) => {
        set((state) => ({
          promptSubCategories: state.promptSubCategories.filter((sc) => sc.categoryId !== categoryId).concat(newOrder),
        }));
      },

      // Template organization
      moveTemplateToSubCategory: (templateId, subCategoryId) => {
        set((state) => {
          const subCategory = subCategoryId
            ? state.promptSubCategories.find((sc) => sc.id === subCategoryId)
            : null;
          return {
            customTemplates: state.customTemplates.map((t) =>
              t.id === templateId
                ? {
                    ...t,
                    subCategoryId: subCategoryId || undefined,
                    categoryId: subCategory?.categoryId || t.categoryId,
                  }
                : t
            ),
          };
        });
      },
      toggleTemplateInAIDefaults: (templateId) => {
        set((state) => ({
          customTemplates: state.customTemplates.map((t) =>
            t.id === templateId ? { ...t, isInAIDefaults: !t.isInAIDefaults } : t
          ),
        }));
      },
      getAIDefaultTemplates: () => {
        const state = get();
        return state.customTemplates
          .filter((t) => t.isInAIDefaults)
          .sort((a, b) => a.order - b.order);
      },

      // Edge animation control
      setEdgesGenerating: (edgeIds, isGenerating) => {
        set((state) => ({
          edges: state.edges.map((edge) =>
            edgeIds.includes(edge.id)
              ? { ...edge, animated: isGenerating, style: { ...edge.style, strokeDasharray: isGenerating ? undefined : '5,5' } }
              : edge
          ),
        }));
      },
    }),
    {
      name: 'content-canvas-storage',
      version: 3,
      migrate: (persistedState: any, version: number) => {
        // 版本 2 -> 3: 迁移 API Profile 到新的格式
        if (version < 3) {
          if (persistedState.apiProfiles && Array.isArray(persistedState.apiProfiles)) {
            persistedState.apiProfiles = persistedState.apiProfiles.map((profile: any) => {
              // 如果已经是新格式，保持不变
              if (profile.apiFormat && profile.models) {
                return profile;
              }
              // 旧格式迁移：将单个 modelName 转换为 models 数组
              const oldModelName = profile.modelName || 'gpt-4';
              const oldBaseUrl = profile.baseUrl || '';

              // 自动检测 API 格式
              let apiFormat: ApiFormat = 'openai';
              if (oldBaseUrl.includes('anthropic')) {
                apiFormat = 'anthropic';
              } else if (oldBaseUrl.includes('google') || oldBaseUrl.includes('gemini')) {
                apiFormat = 'gemini';
              }

              return {
                ...profile,
                apiFormat,
                models: [{
                  id: uuidv4(),
                  name: oldModelName,
                  modelId: oldModelName,
                  isDefault: true,
                }],
                defaultModelId: oldModelName,
              };
            });
          }
        }

        // 版本 1 -> 2: 迁移到新的提示词库结构
        if (version < 2) {
          // 1. 先处理模板名称更新（保留原有逻辑）
          if (persistedState.customTemplates) {
            const templateNameMap: Record<string, string> = {
              'draft': '口播变初稿',
              'hook': '稿件出钩子',
              'xiaohongshu': '小红书|标题和正文',
              'video': '视频号|标题&tag',
              'xiaolvshu': '口播稿转短文',
            };

            persistedState.customTemplates = persistedState.customTemplates.map((t: any) => {
              if (templateNameMap[t.id] && t.isDefault) {
                return { ...t, label: templateNameMap[t.id] };
              }
              return t;
            });
          }

          // 2. 迁移到新的分类结构
          const defaultCategory = { id: 'default-cat', name: '默认分类', order: 0 };
          const defaultSubCategory = { id: 'default-sub', categoryId: 'default-cat', name: '全部', order: 0 };

          // 迁移模板数据
          if (persistedState.customTemplates) {
            persistedState.customTemplates = persistedState.customTemplates.map((t: any, index: number) => ({
              ...t,
              categoryId: defaultCategory.id,
              subCategoryId: defaultSubCategory.id,
              isInAIDefaults: t.isDefault || false,
              order: t.order ?? index,
            }));
          }

          persistedState.promptCategories = [defaultCategory];
          persistedState.promptSubCategories = [defaultSubCategory];
        }

        return persistedState;
      },
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        apiProfiles: state.apiProfiles,
        activeProfileId: state.activeProfileId,
        customTemplates: state.customTemplates,
        promptCategories: state.promptCategories,
        promptSubCategories: state.promptSubCategories,
      }),
    }
  )
);
