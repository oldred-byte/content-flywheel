<div align="center">
  <h1>🔄 内容飞轮</h1>
  <p>一个为内容创作者打造的 AI 辅助工作流画布</p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" />
    <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss" />
  </p>
</div>

---

## 👋 关于这个项目

我不是程序员出身，而是一个做了多年营销的人。

在做内容的过程中，我发现自己总是在重复一些固定的流程：把口播稿变成文章、从文章里提取钩子、改写成不同平台格式……这些工作本身不复杂，但需要在各种工具之间来回切换，很打断思路。

于是我做了这个工具。它不是什么高大上的产品，只是**按照我自己的工作习惯搭建的一个小型流水线**。如果你也有类似的需求，希望可以帮到你。

> 📕 小红书：[@废话老洪](https://www.xiaohongshu.com/user/profile/5f3c8b4a000000000101f535)

---

## ✨ 功能特点

| 功能 | 说明 |
|------|------|
| 🎨 **可视化画布** | 节点拖拽、自由连线，像搭积木一样搭建内容工作流 |
| 🤖 **多 AI 供应商支持** | 支持 OpenAI、DeepSeek、Kimi、Claude、Gemini、通义千问、智谱 GLM 等 |
| 📝 **提示词库** | 分类管理提示词，支持拖拽排序，可设置 AI 引擎默认模板 |
| 📱 **公众号渲染** | 实时预览公众号排版效果，支持 Markdown 和可视化编辑 |
| 🖼️ **文章转图片** | 将文字内容渲染成精美图片，支持自定义头像、昵称、样式 |
| ⌨️ **快捷键支持** | `Ctrl+C/V` 复制粘贴节点，`滚轮`缩放画布 |

---

## 📖 使用教程

### 快速开始

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动项目**
   ```bash
   npm run dev
   ```

3. **配置 API**（详见下方「API 配置指南」）

4. **开始使用**
   - 点击右上角按钮添加节点
   - 拖拽连接节点建立工作流
   - 点击 AI 引擎节点的「生成」按钮运行

### 节点类型说明

#### 📝 文本节点
- 纯文本容器，用于输入或保存内容
- 可作为 AI 引擎的输入源或输出目的地

#### 🤖 AI 引擎节点
- 核心处理节点，调用 AI 处理上游内容
- 内置多种提示词模板（可自定义）
- 支持流式输出，实时显示生成结果

#### 🖼️ 图片渲染节点
- 将文字内容渲染成图片
- 支持设置头像、昵称、认证标识
- 支持 1:1 和 3:4 两种比例
- 可自定义底部引言

#### 📱 公众号渲染节点
- 左侧 Markdown 编辑，右侧实时预览
- 预览区域可直接编辑，双向同步
- 模拟手机宽度（375px）真实预览

### 提示词库管理

1. 点击右上角「提示词库」按钮打开面板
2. 左侧管理分类，右侧管理提示词
3. 勾选「设为 AI 默认」可将提示词加入 AI 引擎的下拉菜单（最多显示 5 个）
4. 支持拖拽排序，自定义常用提示词顺序

---

## 🔌 API 配置指南

**重要：使用本工具前必须先配置 API，否则 AI 引擎节点无法工作。**

### 配置步骤

1. 点击右上角的 ⚙️ 设置按钮
2. 在左侧面板选择「快速添加供应商」，或点击「自定义配置」
3. 填写 API Key 和 Base URL
4. 点击「测试连接」验证配置是否正确
5. 测试通过后，点击「设为当前使用」

### 支持的供应商

| 供应商 | API 获取地址 | 备注 |
|--------|-------------|------|
| **DeepSeek** | https://platform.deepseek.com/api_keys | 国产模型，性价比高 |
| **Kimi (月之暗面)** | https://platform.moonshot.cn/console/api-keys | 长文本支持好 |
| **通义千问** | https://dashscope.console.aliyun.com/apiKey | 阿里云出品 |
| **智谱 GLM** | https://open.bigmodel.cn/usercenter/apikeys | 需要实名认证 |
| **Gemini** | https://aistudio.google.com/app/apikey | 国内访问可能需要代理 |
| **OpenRouter** | https://openrouter.ai/keys | 聚合平台，支持支付宝 |
| **OpenAI** | https://platform.openai.com/api-keys | 需海外手机号和信用卡 |
| **Claude** | https://console.anthropic.com/settings/keys | 需海外手机号和信用卡 |

### 常见问题

**Q: API Key 安全吗？**
A: API Key 仅保存在你的浏览器本地（localStorage），不会上传到任何服务器。

**Q: 为什么连接测试失败？**
A: 请检查以下几点：
- API Key 是否正确复制（不要有前后空格）
- Base URL 是否完整（通常以 `/v1` 结尾）
- 账号是否有足够余额或免费额度
- 国内厂商是否已完成实名认证
- 部分服务（如 OpenAI、Claude、Gemini）需要代理才能访问

**Q: 可以同时配置多个供应商吗？**
A: 可以，最多支持保存 5 组配置，可随时切换使用。

**Q: 如何添加自定义模型？**
A: 在配置详情页点击「模型列表」标签，可以添加、编辑、删除模型，设置默认模型。

---

## 🛠️ 技术栈

- **React 19** + **TypeScript**
- **Zustand** - 状态管理
- **React Flow** - 画布交互
- **Tailwind CSS** - 样式
- **Marked** - Markdown 解析
- **html-to-image** - 图片生成

---

## 🤝 贡献与反馈

这个项目是我边学边做的，代码可能不够优雅，功能也可能不够完善。如果你：

- 发现了 bug
- 有功能建议
- 想要优化代码

都欢迎提 Issue 或 PR。

如果你觉得这个工具对你有帮助，请给我一个 ⭐️ Star，这会给我很大鼓励！

---

## 📄 开源协议

MIT License

---

<div align="center">
  <p>Made with 💚 by 一个想做点有用工具的营销人</p>
  <p>小红书：<a href="https://www.xiaohongshu.com/user/profile/5f3c8b4a000000000101f535">@废话老洪</a></p>
</div>
