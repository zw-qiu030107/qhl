# 清醒风格角色扮演对话前端 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 LLM 角色扮演对话游戏前端原型——清醒风格、简约大气、三栏布局、世界书可编辑、纯静态无依赖。

**Architecture:** 单页 HTML + 模块化 CSS（7 文件）+ 模块化 JS（10 文件）。CSS 使用 CSS Variables 实现主题化，JS 使用简易 Pub/Sub 状态管理。所有数据持久化到 localStorage。

**Tech Stack:** HTML5 · CSS3 (Variables + Flexbox/Grid + Transitions) · Vanilla JS (ES2020+) · 零外部依赖

## Global Constraints

- 纯前端原型 — 不涉及后端，不含 API 调用
- 全中文化 — 除 logo/视觉设计外全部中文
- 禁止 emoji — 使用内联 SVG 图标
- 使用真实 qhl.json 数据填充，非占位符
- 使用自建 toast 通知，不使用浏览器 alert
- 颜色：冷峻深色系 `#141619` 基底，`#7eb8da` 冰蓝强调
- 字体：`"Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, -apple-system, sans-serif`
- 等宽字体：`"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace`
- 动画仅使用 transform + opacity（GPU 加速）
- 文件放在 `E:\ai\ai liaotian\` 项目根目录

---

### Task 1: CSS 基础 + HTML 骨架

**Files:**
- Create: `css/reset.css`
- Create: `css/variables.css`
- Create: `css/layout.css`
- Create: `index.html`（骨架结构）

**Interfaces:**
- Produces: CSS 变量 `--bg-primary: #141619` 等全部色彩变量、`--font-sans`、`--font-mono`、间距变量 `--space-xs` 到 `--space-xl`
- Produces: HTML 语义结构 — `<header id="topnav">` / `<aside id="left-panel">` / `<main id="chat-area">` / `<aside id="right-panel">` / `<footer id="input-bar">`

- [ ] **Step 1: 创建 CSS Reset**

```css
/* css/reset.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { font-family: var(--font-sans); line-height: 1.6; color: var(--text-secondary); background: var(--bg-primary); overflow: hidden; height: 100vh; }
img, svg { display: block; max-width: 100%; }
button, input, textarea, select { font: inherit; color: inherit; border: none; background: none; outline: none; }
button { cursor: pointer; }
a { color: inherit; text-decoration: none; }
ul, ol { list-style: none; }
details summary { list-style: none; }
details summary::-webkit-details-marker { display: none; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }
```

- [ ] **Step 2: 创建 CSS Variables**

```css
/* css/variables.css */
:root {
  /* 色彩 */
  --bg-primary: #141619;
  --bg-panel: #1a1d23;
  --bg-surface: #20242a;
  --bg-hover: #252830;
  --border-color: #2d3140;
  --border-active: #3a4050;
  --text-primary: #e8eaed;
  --text-secondary: #c8ccd4;
  --text-tertiary: #8b95a5;
  --text-muted: #6b7583;
  --text-dim: #4a5060;
  --accent: #7eb8da;
  --accent-dim: #5a8aaa;
  --accent-glow: rgba(126, 184, 218, 0.25);
  --success: #6fc98f;
  --warning: #d4a860;
  --danger: #c46b6b;
  --danger-bg: rgba(196, 107, 107, 0.12);
  --bubble-char: #252830;
  --bubble-user: #1e3a4a;

  /* 字体 */
  --font-sans: "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace;

  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 50%;

  /* 阴影 */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
  --glow-accent: 0 0 12px var(--accent-glow);

  /* 过渡 */
  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease-out;

  /* 尺寸 */
  --left-panel-width: 220px;
  --right-panel-width: 280px;
  --topnav-height: 40px;
  --input-bar-height: 64px;
}

/* 深色主题变体 */
[data-theme="darker"] {
  --bg-primary: #0c0e12;
  --bg-panel: #111318;
  --bg-surface: #161920;
  --bg-hover: #1c1f27;
}
```

- [ ] **Step 3: 创建 Layout CSS**

```css
/* css/layout.css */
body { display: flex; flex-direction: column; height: 100vh; }

#topnav {
  height: var(--topnav-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  z-index: 100;
}

#app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

#left-panel {
  width: var(--left-panel-width);
  flex-shrink: 0;
  background: var(--bg-panel);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

#right-panel {
  width: var(--right-panel-width);
  flex-shrink: 0;
  background: var(--bg-panel);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#input-bar {
  height: var(--input-bar-height);
  background: var(--bg-panel);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 var(--space-lg);
  gap: var(--space-md);
  flex-shrink: 0;
  z-index: 100;
}

/* 响应式：小屏幕隐藏侧边栏 */
@media (max-width: 900px) {
  #left-panel, #right-panel { display: none; }
}
```

- [ ] **Step 4: 创建 HTML 骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>清醒酒馆 · 角色扮演</title>
  <link rel="stylesheet" href="css/reset.css">
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/layout.css">
</head>
<body>
  <header id="topnav">
    <div id="nav-left">
      <span id="app-logo">清醒酒馆</span>
    </div>
    <div id="nav-right">
      <button id="btn-character-manager" class="nav-btn" title="角色管理">
        <!-- SVG 用户图标 -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </button>
      <button id="btn-settings" class="nav-btn" title="设置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
      </button>
      <button id="btn-notifications" class="nav-btn" title="通知">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      </button>
    </div>
  </header>

  <div id="app-main">
    <aside id="left-panel">
      <!-- Task 2 fills this -->
    </aside>
    <main id="chat-area">
      <div id="chat-messages">
        <!-- Task 3 fills this -->
      </div>
    </main>
    <aside id="right-panel">
      <!-- Task 4 fills this -->
    </aside>
  </div>

  <footer id="input-bar">
    <!-- Task 3 fills this -->
  </footer>

  <!-- Overlay containers -->
  <div id="modal-overlay" class="modal-overlay hidden"></div>
  <div id="toast-container" class="toast-container"></div>

  <script src="js/utils.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/state.js"></script>
  <script src="js/notifications.js"></script>
  <script src="js/modals.js"></script>
  <script src="js/chat.js"></script>
  <script src="js/character.js"></script>
  <script src="js/worldbook.js"></script>
  <script src="js/settings.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 5: 浏览器验证**

打开 `index.html`，检查三栏布局是否正确渲染，顶部导航和底部输入栏是否可见，面板是否为空。

---

### Task 2: 左侧角色状态栏

**Files:**
- Create: `css/components.css`（左侧面板部分）
- Modify: `index.html`（填充 `#left-panel`）

**Interfaces:**
- Consumes: CSS 变量（`--bg-panel`, `--text-primary` 等）
- Produces: DOM 结构 `#left-panel` 包含 4 个 `<details>` 折叠模块

- [ ] **Step 1: 添加左侧面板 CSS**

```css
/* css/components.css — 左侧面板 */
#left-panel .avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-lg) var(--space-md) var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

#left-panel .avatar-img {
  width: 64px; height: 64px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--border-color), var(--border-active));
  border: 2px solid var(--text-dim);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: var(--space-sm);
}

#left-panel .char-name {
  font-size: 16px; font-weight: 600; color: var(--text-primary);
}

#left-panel .char-subtitle {
  font-size: 10px; color: var(--text-muted); margin-top: 2px;
}

#left-panel .affection-mini {
  width: 100%; margin-top: 10px;
}

#left-panel .affection-mini .aff-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 3px;
}

#left-panel .affection-mini .aff-label {
  font-size: 9px; color: var(--text-dim);
}

#left-panel .affection-mini .aff-value {
  font-size: 11px; color: var(--success);
}

#left-panel .affection-mini .aff-bar {
  height: 2px; background: var(--border-color); border-radius: 1px;
}

#left-panel .affection-mini .aff-bar-fill {
  height: 100%; background: var(--accent); border-radius: 1px;
  transition: width var(--transition-normal);
}

/* 折叠模块 */
#left-panel .status-modules {
  overflow-y: auto; flex: 1;
}

#left-panel details {
  border-bottom: 1px solid var(--border-color);
}

#left-panel details summary {
  padding: 10px 14px;
  font-size: 11px;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 0.5px;
  user-select: none;
  transition: color var(--transition-fast);
}

#left-panel details summary:hover {
  color: var(--text-secondary);
}

#left-panel details summary .chevron {
  width: 10px; height: 10px;
  transition: transform var(--transition-normal);
}

#left-panel details[open] summary .chevron {
  transform: rotate(90deg);
}

#left-panel details summary .summary-hint {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 400;
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

#left-panel details .module-body {
  padding: 0 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 10px;
}

#left-panel .field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#left-panel .field-label {
  color: var(--text-dim);
  flex-shrink: 0;
}

#left-panel .field-value {
  color: var(--text-secondary);
  text-align: right;
}

#left-panel .field-value.muted {
  color: var(--text-muted);
}

#left-panel .inner-thought {
  font-size: 10px;
  color: var(--text-tertiary);
  line-height: 1.5;
  font-style: italic;
  background: var(--bg-surface);
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--text-tertiary);
}

#left-panel .action-item {
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: flex;
  gap: 4px;
}

#left-panel .action-item .diamond {
  color: var(--accent);
  flex-shrink: 0;
}

#left-panel .divider-thin {
  border-top: 1px solid var(--border-color);
  margin: 2px 0;
}

#left-panel .section-label {
  font-size: 9px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: -2px;
}
```

- [ ] **Step 2: 创建左侧面板 HTML 结构并填入 index.html**

在 `index.html` 的 `#left-panel` 中填入：

```html
<aside id="left-panel">
  <!-- 头像区 -->
  <div class="avatar-section">
    <div class="avatar-img">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>
    </div>
    <div class="char-name" id="char-name-display">邱惠玲</div>
    <div class="char-subtitle" id="char-subtitle-display">玲玲 · 14岁 · 巨蟹座</div>
    <div class="affection-mini">
      <div class="aff-row">
        <span class="aff-label">好感度</span>
        <span class="aff-value" id="aff-value-display">↑ 87</span>
      </div>
      <div class="aff-bar"><div class="aff-bar-fill" id="aff-bar-display" style="width:87%"></div></div>
    </div>
  </div>

  <!-- 折叠模块 -->
  <div class="status-modules">
    <!-- 基本信息（默认展开） -->
    <details id="mod-basic" open>
      <summary>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
        基本信息
      </summary>
      <div class="module-body">
        <div class="field-row"><span class="field-label">名称</span><span class="field-value" id="s-name">邱惠玲</span></div>
        <div class="field-row"><span class="field-label">位置</span><span class="field-value" id="s-location">自建房·四楼房间</span></div>
        <div class="field-row"><span class="field-label">好感度</span><span class="field-value" id="s-affection" style="color:var(--success)">↑ 87</span></div>
        <div class="field-row"><span class="field-label">原因</span><span class="field-value muted" id="s-aff-reason">堂哥给了零花钱</span></div>
        <div class="field-row"><span class="field-label">周围</span><span class="field-value muted" id="s-surrounding">母亲小娟 — 已出门</span></div>
      </div>
    </details>

    <!-- 外观（默认折叠） -->
    <details id="mod-appearance">
      <summary>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
        外观
        <span class="summary-hint" id="appearance-hint">灰色吊带 + 黑色短裤</span>
      </summary>
      <div class="module-body">
        <div class="field-row"><span class="field-label">表情</span><span class="field-value" id="s-expression">嘴唇轻抿，带点紧张</span></div>
        <div class="field-row"><span class="field-label">身体</span><span class="field-value muted" id="s-body">娇小纤瘦，腰细臀翘</span></div>
        <div class="divider-thin"></div>
        <div class="section-label">当前穿着</div>
        <div class="field-row"><span class="field-label">外套</span><span class="field-value muted" id="s-outerwear">—</span></div>
        <div class="field-row"><span class="field-label">上衣</span><span class="field-value" id="s-top">灰色吊带</span></div>
        <div class="field-row"><span class="field-label">内衣</span><span class="field-value muted" id="s-inner-top">浅粉色少女款</span></div>
        <div class="field-row"><span class="field-label">下装</span><span class="field-value" id="s-bottom">黑色短裤</span></div>
        <div class="field-row"><span class="field-label">内裤</span><span class="field-value muted" id="s-underwear">白色纯棉</span></div>
        <div class="field-row"><span class="field-label">袜子</span><span class="field-value muted" id="s-socks">—</span></div>
        <div class="field-row"><span class="field-label">鞋子</span><span class="field-value muted" id="s-shoes">—（光脚）</span></div>
        <div class="field-row"><span class="field-label">配饰</span><span class="field-value muted" id="s-accessories">—</span></div>
      </div>
    </details>

    <!-- 心理（默认折叠） -->
    <details id="mod-psychology">
      <summary>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
        心理
        <span class="summary-hint" id="psychology-hint">想让堂哥答应她留下…</span>
      </summary>
      <div class="module-body">
        <div>
          <div style="font-size:9px;color:var(--text-dim);margin-bottom:3px">内心想法</div>
          <div class="inner-thought" id="s-inner-thought">"堂哥会让我留下吗…今晚不想一个人"</div>
        </div>
        <div class="action-item">
          <span class="diamond">◆</span>
          <span id="s-action">推开门探进半个身子，手还搭在门把上</span>
        </div>
        <div class="action-item">
          <span class="diamond" style="color:var(--text-tertiary)">◆</span>
          <span id="s-plan" style="color:var(--text-tertiary)">撒娇让堂哥答应她留下来，再要点零花钱</span>
        </div>
      </div>
    </details>

    <!-- 角色档案（默认折叠） -->
    <details id="mod-profile">
      <summary>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
        角色档案
      </summary>
      <div class="module-body">
        <div class="field-row"><span class="field-label">年龄</span><span class="field-value muted" id="s-age">14岁 / 初一</span></div>
        <div class="field-row"><span class="field-label">星座</span><span class="field-value muted" id="s-zodiac">巨蟹座</span></div>
        <div class="field-row"><span class="field-label">体征</span><span class="field-value muted" id="s-physical">148cm / 38kg</span></div>
        <div class="field-row"><span class="field-label">性格</span><span class="field-value muted" id="s-personality">敏感早熟 · 拜金虚荣</span></div>
        <div class="field-row"><span class="field-label">喜好</span><span class="field-value muted" id="s-likes">热舞 · 妆造 · 薅羊毛</span></div>
      </div>
    </details>
  </div>
</aside>
```

- [ ] **Step 3: 验证**

刷新浏览器，确认左侧面板显示头像、名称、好感度条，四个模块可以折叠/展开，外观模块默认折叠。

---

### Task 3: 中央聊天区 + 底部输入栏

**Files:**
- Modify: `css/components.css`（添加聊天和输入栏样式）
- Create: `js/chat.js`
- Create: `js/utils.js`
- Modify: `index.html`（填充中央区和底部栏）

**Interfaces:**
- Consumes: CSS 变量
- Produces: `ChatRenderer.render(messages)` 函数, `ChatInput` 对象（事件绑定），`utils.escapeHTML()`, `utils.parseMessage(text)` 解析 `*动作*` / `"对话"` 标记

- [ ] **Step 1: 添加聊天区和输入栏 CSS**

```css
/* 加到 css/components.css */
/* 聊天区 */
#chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  scroll-behavior: smooth;
}

.chat-msg {
  display: flex;
  flex-direction: column;
  animation: msgIn 300ms ease-out;
}

.chat-msg.char { align-items: flex-start; }
.chat-msg.user { align-items: flex-end; }

.chat-msg .msg-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 2px;
  padding: 0 4px;
}

.chat-msg .msg-bubble {
  padding: 10px 14px;
  border-radius: var(--radius-xl);
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
  max-width: 70%;
}

.chat-msg.char .msg-bubble {
  background: var(--bubble-char);
  color: var(--text-secondary);
  border-bottom-left-radius: var(--radius-sm);
}

.chat-msg.user .msg-bubble {
  background: var(--bubble-user);
  color: var(--text-secondary);
  border-bottom-right-radius: var(--radius-sm);
  max-width: 60%;
}

/* 消息内标记 */
.msg-bubble .action-text {
  color: var(--text-tertiary);
  font-style: italic;
}

.chat-msg.user .msg-bubble .action-text {
  color: #7ea8c4;
}

.msg-bubble .speech-text {
  color: #d4d8df;
}

.chat-msg.user .msg-bubble .speech-text {
  color: #d0dce6;
}

/* 叙述段落 */
.chat-narration {
  align-self: stretch;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
  padding: 4px var(--space-lg);
  line-height: 1.6;
  border-left: 2px solid var(--border-color);
  margin: 4px 0;
}

/* 底部输入栏 */
#input-bar .msg-input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  color: var(--text-secondary);
  font-size: 14px;
  resize: none;
  min-height: 40px;
  max-height: 120px;
  line-height: 1.5;
  transition: border-color var(--transition-fast);
  field-sizing: content; /* 自适应高度 */
}

#input-bar .msg-input:focus {
  border-color: var(--accent);
}

#input-bar .msg-input::placeholder {
  color: var(--text-dim);
}

#input-bar .token-count {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  white-space: nowrap;
  min-width: 80px;
  text-align: center;
}

/* 操作菜单 */
.action-menu-wrap { position: relative; }
.action-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xs);
  min-width: 140px;
  box-shadow: var(--shadow-md);
  display: none;
}

.action-menu.show { display: block; }

.action-menu button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: left;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.action-menu button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 发送按钮 */
#btn-send {
  width: 40px; height: 40px;
  border-radius: var(--radius-full);
  background: var(--accent);
  color: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

#btn-send:hover {
  transform: scale(1.05);
  box-shadow: var(--glow-accent);
}

#btn-send:active {
  transform: scale(0.95);
}
```

- [ ] **Step 2: 创建 utils.js**

```javascript
// js/utils.js
const utils = {
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // 解析消息中的 *动作* 和 "对话" 标记
  parseMessage(text) {
    let html = utils.escapeHTML(text);
    // "对话" → speech
    html = html.replace(/&quot;([^&]+)&quot;/g, '<span class="speech-text">"$1"</span>');
    // *动作* → action
    html = html.replace(/\*([^*]+)\*/g, '<span class="action-text">*$1*</span>');
    return html;
  },

  // 生成唯一 ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // 估算 token 数（粗略：中文 1 字 ≈ 2 token，英文 1 词 ≈ 1.3 token）
  estimateTokens(text) {
    const cn = (text.match(/[一-鿿]/g) || []).length;
    const en = (text.match(/[a-zA-Z]+/g) || []).reduce((s, w) => s + w.length, 0);
    return Math.ceil(cn * 2 + en * 0.3);
  },

  debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
};
```

- [ ] **Step 3: 创建 chat.js**

```javascript
// js/chat.js
const ChatRenderer = {
  container: null,

  init() {
    this.container = document.getElementById('chat-messages');
    this.loadSampleConversation();
  },

  // 渲染单条消息
  renderMessage(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg ${msg.role}`;

    if (msg.type === 'narration') {
      wrapper.className = 'chat-narration';
      wrapper.textContent = msg.text;
      this.container.appendChild(wrapper);
      return;
    }

    const label = document.createElement('div');
    label.className = 'msg-label';
    label.textContent = msg.role === 'char' ? msg.senderName || '角色' : '你';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = utils.parseMessage(msg.text);

    wrapper.appendChild(label);
    wrapper.appendChild(bubble);
    this.container.appendChild(wrapper);
  },

  // 批量渲染
  renderMessages(messages) {
    const frag = document.createDocumentFragment();
    messages.forEach(msg => {
      /* 复用 renderMessage 逻辑到 frag */
      const wrapper = document.createElement('div');
      wrapper.className = `chat-msg ${msg.role}`;
      if (msg.type === 'narration') {
        wrapper.className = 'chat-narration';
        wrapper.textContent = msg.text;
        frag.appendChild(wrapper);
        return;
      }
      const label = document.createElement('div');
      label.className = 'msg-label';
      label.textContent = msg.role === 'char' ? (msg.senderName || '角色') : '你';
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.innerHTML = utils.parseMessage(msg.text);
      wrapper.appendChild(label);
      wrapper.appendChild(bubble);
      frag.appendChild(wrapper);
    });
    this.container.appendChild(frag);
    this.scrollToBottom();
  },

  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  },

  // 加载基于 qhl.json 的示例对话
  loadSampleConversation() {
    const samples = [
      { role: 'narration', type: 'narration', text: '五楼走廊那头传来翻箱倒柜的声响…母亲小娟正往脸上抹粉，口红涂歪了一道。' },
      { role: 'char', senderName: '玲玲', text: '*玲玲退回自己房间，把门掩上，没关严。她坐在床边拿起手机，屏幕上是抖音里一个跳舞的视频，音量调到最低。*' },
      { role: 'narration', type: 'narration', text: '走廊里高跟鞋踩瓷砖的声音由远及近。' },
      { role: 'char', senderName: '玲玲', text: '*光着脚走到门口，手搭在门把上停了停，嘴唇抿了一下。然后踩着楼梯往下走。四楼堂哥的房门没关紧，她直接推开半扇，探进脑袋。*' },
      { role: 'char', senderName: '玲玲', text: '"哥，我妈又出去了，你要不要上来。" 声音压得低，尾音往上飘' },
      { role: 'user', senderName: '你', text: '"这么晚了还不睡？上来吧，我在打游戏。"' },
      { role: 'char', senderName: '玲玲', text: '*她推门进来，光着脚踩在地板上，径直走到你床沿坐下。栗色卷发散在肩上，灰色吊带的肩带滑了一边。*\n\n"哥——" *拖长了尾音，把手机翻过来给你看屏幕。*\n\n"我妈又去找那个叔叔了。我不想一个人在五楼。" *她低头抠着手机壳边缘，声音越来越小。*' },
    ];
    this.renderMessages(samples);
    // 存到全局状态
    if (window.state) window.state.set('messages', samples);
  },

  addMessage(role, text, senderName) {
    const msg = { role, text, senderName, id: utils.uid(), time: Date.now() };
    this.renderMessage(msg);
    this.scrollToBottom();
    return msg;
  }
};

// 输入栏
const ChatInput = {
  input: null,
  tokenDisplay: null,
  sendBtn: null,
  actionMenu: null,

  init() {
    this.input = document.getElementById('msg-input');
    this.tokenDisplay = document.getElementById('token-count-display');
    this.sendBtn = document.getElementById('btn-send');
    this.actionMenu = document.getElementById('action-menu');

    this.input.addEventListener('input', () => this.updateTokenCount());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    this.sendBtn.addEventListener('click', () => this.send());

    document.getElementById('btn-actions').addEventListener('click', () => {
      this.actionMenu.classList.toggle('show');
    });

    // 点击其他地方关闭菜单
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.action-menu-wrap')) {
        this.actionMenu.classList.remove('show');
      }
    });

    // 操作菜单项
    document.getElementById('act-regenerate').addEventListener('click', () => this.regenerate());
    document.getElementById('act-continue').addEventListener('click', () => this.continueWrite());
    document.getElementById('act-undo').addEventListener('click', () => this.undo());
    document.getElementById('act-clear').addEventListener('click', () => this.clearChat());
  },

  updateTokenCount() {
    const text = this.input.value;
    const count = utils.estimateTokens(text);
    this.tokenDisplay.textContent = `Token: ${count}/4096`;
  },

  send() {
    const text = this.input.value.trim();
    if (!text) return;
    const msg = ChatRenderer.addMessage('user', text, '你');
    // 保存到状态
    if (window.state) {
      const msgs = window.state.get('messages') || [];
      msgs.push(msg);
      window.state.set('messages', msgs);
    }
    this.input.value = '';
    this.updateTokenCount();
    this.actionMenu.classList.remove('show');
    // TODO: 未来连接 LLM 后端时在此处发送请求
  },

  regenerate() {
    notifications.show('info', '重新生成', '此功能将在连接后端后可用');
    this.actionMenu.classList.remove('show');
  },

  continueWrite() {
    notifications.show('info', '继续写', '此功能将在连接后端后可用');
    this.actionMenu.classList.remove('show');
  },

  undo() {
    const msgs = window.state?.get('messages') || [];
    if (msgs.length > 0) {
      msgs.pop();
      // 重建聊天区
      ChatRenderer.container.innerHTML = '';
      ChatRenderer.renderMessages(msgs);
      window.state?.set('messages', msgs);
    }
    this.actionMenu.classList.remove('show');
  },

  clearChat() {
    ChatRenderer.container.innerHTML = '';
    if (window.state) window.state.set('messages', []);
    notifications.show('success', '已清空', '对话内容已清除');
    this.actionMenu.classList.remove('show');
  },

  simulateCharReply(text) {
    // 模拟角色回复（用于演示）
    setTimeout(() => {
      const msg = ChatRenderer.addMessage('char', text, '玲玲');
      if (window.state) {
        const msgs = window.state.get('messages') || [];
        msgs.push(msg);
        window.state.set('messages', msgs);
      }
    }, 800);
  }
};
```

- [ ] **Step 4: 更新 HTML 聊天区和输入栏**

在 `index.html` 中：
- `#chat-area` 内放置 `<div id="chat-messages"></div>`
- `#input-bar` 填入完整结构（见下方）

```html
<footer id="input-bar">
  <textarea id="msg-input" class="msg-input" placeholder="输入你的回复…" rows="1"></textarea>
  <span class="token-count" id="token-count-display">Token: 0/4096</span>
  <div class="action-menu-wrap">
    <button id="btn-actions" class="nav-btn" title="操作">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
    </button>
    <div class="action-menu" id="action-menu">
      <button id="act-regenerate">重新生成</button>
      <button id="act-continue">继续写</button>
      <button id="act-undo">撤回最后一条</button>
      <button id="act-clear" style="color:var(--danger)">清空对话</button>
    </div>
  </div>
  <button id="btn-send" title="发送">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  </button>
</footer>
```

- [ ] **Step 5: 验证**

刷新浏览器，确认示例对话正确显示，`*动作*` 斜体灰、`"对话"` 亮白、叙述居中。在输入框打字观察 token 计数变化，按 Enter 发送消息，点击操作菜单。

---

### Task 4: 右侧面板 · 标签页框架 + 角色设定

**Files:**
- Modify: `css/components.css`（右侧面板样式）
- Modify: `index.html`（填充 `#right-panel`）
- Create: `js/character.js`

**Interfaces:**
- Produces: 标签页切换系统、`CharacterSettings` 对象（加载/保存角色设定字段）

- [ ] **Step 1: 添加右侧面板 CSS**

```css
/* 加到 css/components.css */
/* 右侧面板标签 */
#right-panel .tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

#right-panel .tab-btn {
  flex: 1;
  padding: 10px 8px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  position: relative;
  transition: color var(--transition-fast);
}

#right-panel .tab-btn:hover { color: var(--text-secondary); }

#right-panel .tab-btn.active {
  color: var(--text-primary);
  font-weight: 600;
}

#right-panel .tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 2px;
  background: var(--accent);
  transition: left var(--transition-normal), right var(--transition-normal);
}

#right-panel .tab-content {
  display: none;
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
}

#right-panel .tab-content.active { display: block; }

/* 角色设定表单 */
.char-field {
  margin-bottom: var(--space-md);
}

.char-field label {
  display: block;
  font-size: 10px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.char-field input,
.char-field textarea {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: border-color var(--transition-fast);
}

.char-field input:focus,
.char-field textarea:focus {
  border-color: var(--accent);
}

.char-field textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}
```

- [ ] **Step 2: 创建 character.js**

```javascript
// js/character.js
const CharacterSettings = {
  fields: {},

  init() {
    this.fields = {
      name: document.getElementById('cs-name'),
      nickname: document.getElementById('cs-nickname'),
      age: document.getElementById('cs-age'),
      zodiac: document.getElementById('cs-zodiac'),
      personality: document.getElementById('cs-personality'),
      likes: document.getElementById('cs-likes'),
      background: document.getElementById('cs-background'),
      relationship: document.getElementById('cs-relationship'),
    };
    this.loadFromCard();
  },

  loadFromCard() {
    const card = window.storage?.get('character_card');
    if (!card) return;
    const d = card.data || card;
    this.setVal('name', d.name || '');
    this.setVal('nickname', d.description || ''); // 简易映射
    this.setVal('personality', d.personality || '');
    this.setVal('background', d.scenario || '');
  },

  setVal(key, val) {
    if (this.fields[key]) this.fields[key].value = val;
  },

  getVal(key) {
    return this.fields[key]?.value || '';
  },

  save() {
    const card = window.storage?.get('character_card') || {};
    card.data = card.data || {};
    card.data.name = this.getVal('name');
    card.data.personality = this.getVal('personality');
    card.data.scenario = this.getVal('background');
    window.storage?.set('character_card', card);
    window.notifications?.show('success', '已保存', '角色设定已更新');
  }
};
```

- [ ] **Step 3: 标签页切换逻辑（JS）**

在 `app.js` 中或新建标签切换逻辑：

```javascript
// 标签页切换
document.querySelectorAll('#right-panel .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#right-panel .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#right-panel .tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});
```

- [ ] **Step 4: 验证**

刷新浏览器，点击右侧三个标签 "角色设定"、"世界书"、"对话设置"，确认切换流畅、角色设定字段可编辑。

---

### Task 5: 世界书标签页（完整 CRUD）

**Files:**
- Create: `js/worldbook.js`
- Modify: `index.html`（世界书标签页 HTML）
- Modify: `css/components.css`（世界书条目样式）

**Interfaces:**
- Consumes: `window.storage`, `window.notifications`
- Produces: `WorldBook` 对象 — `create()`, `update(id, data)`, `delete(id)`, `getAll()`, `render()`, `import(json)`, `export()`

- [ ] **Step 1: 世界书条目 CSS**

```css
/* 加到 css/components.css */
.wb-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.wb-toolbar .wb-count { font-size: 11px; color: var(--text-tertiary); }

.wb-toolbar .wb-actions { display: flex; gap: var(--space-sm); }

.wb-toolbar .wb-actions button {
  font-size: 11px;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}

.wb-toolbar .wb-actions button:hover { color: var(--text-secondary); }

.wb-toolbar .btn-add {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--accent);
  color: var(--bg-primary);
  border-radius: var(--radius-sm);
  font-weight: 600;
}

/* 条目卡片 */
.wb-entry {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
  margin-bottom: var(--space-sm);
  transition: border-color var(--transition-fast);
}

.wb-entry.editing { border-color: var(--border-active); }

.wb-entry-header {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-hover);
  cursor: pointer;
  user-select: none;
}

.wb-entry-header .entry-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.wb-entry-header .entry-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--text-muted);
}

.wb-entry-header .entry-status {
  width: 6px; height: 6px;
  border-radius: var(--radius-full);
}

.wb-entry-header .entry-status.enabled { background: var(--success); }
.wb-entry-header .entry-status.disabled { background: var(--text-dim); }

.wb-entry-body {
  display: none;
  padding: 10px 12px;
  flex-direction: column;
  gap: 8px;
}

.wb-entry.editing .wb-entry-body { display: flex; }

.wb-entry-body .wb-field label {
  display: block;
  font-size: 10px;
  color: var(--text-dim);
  margin-bottom: 3px;
}

.wb-entry-body .wb-field input,
.wb-entry-body .wb-field textarea,
.wb-entry-body .wb-field select {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.wb-entry-body .wb-field textarea {
  min-height: 48px;
  resize: vertical;
}

/* 关键词标签 */
.wb-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.wb-keyword-tag {
  padding: 2px 8px;
  background: var(--bg-hover);
  border-radius: 10px;
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.wb-keyword-tag .kw-remove {
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

.wb-keyword-input {
  background: var(--bg-primary) !important;
  border: 1px solid var(--border-color) !important;
  width: 80px !important;
  border-radius: 10px !important;
  padding: 2px 8px !important;
  font-size: 11px !important;
}

/* 深度和出口名称（条件显示） */
.wb-conditional { display: none; }
.wb-conditional.show { display: flex; gap: var(--space-sm); }

.wb-entry-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
}

.wb-entry-actions button {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.wb-btn-save { background: var(--accent); color: var(--bg-primary); }
.wb-btn-cancel { color: var(--text-muted); }
.wb-btn-delete { color: var(--danger); }

/* 删除确认 */
.wb-delete-confirm {
  background: var(--danger-bg);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 11px;
  margin-bottom: var(--space-sm);
}
```

- [ ] **Step 2: 创建 worldbook.js**

关键函数实现 pattern — 完整代码在文件中：

```javascript
// js/worldbook.js
const WorldBook = {
  entries: [],
  container: null,

  INSERT_POSITIONS: [
    { value: 'before_char', label: '角色定义之前', group: '提示词' },
    { value: 'after_char', label: '角色定义之后', group: '提示词' },
    { value: 'before_example', label: '示例消息之前', group: '提示词' },
    { value: 'after_example', label: '示例消息之后', group: '提示词' },
    { value: 'top_an', label: '作者注记顶部', group: '注记' },
    { value: 'bottom_an', label: '作者注记底部', group: '注记' },
    { value: 'at_depth', label: '@ 深度 D', group: '深度' },
    { value: 'as_system', label: '⚙️ 系统角色消息', group: '角色' },
    { value: 'as_user', label: '👤 用户角色消息', group: '角色' },
    { value: 'as_assistant', label: '🤖 助手角色消息', group: '角色' },
    { value: 'outlet', label: '输出口', group: '宏' },
  ],

  TRIGGER_CONDITIONS: [
    { value: 'keyword', label: '关键词匹配' },
    { value: 'always', label: '始终触发' },
    { value: 'probability', label: '概率触发' },
  ],

  init() {
    this.container = document.getElementById('wb-list');
    this.entries = window.storage?.get('worldbook_entries') || [];
    if (this.entries.length === 0) this.loadDefaults();
    this.render();
    this.bindToolbar();
  },

  loadDefaults() {
    this.entries = [
      {
        id: utils.uid(), name: '自建房五层',
        keywords: ['五楼', '四楼', '自建房', '楼梯', '走廊'],
        content: '一栋五层自建房，邱惠玲住在五楼，堂哥住在四楼。楼梯间有声控灯，四楼房門常不关紧。',
        weight: 100, insertPosition: 'before_char', depth: 0, outletName: '',
        triggerCondition: 'keyword', enabled: true, order: 0
      },
      {
        id: utils.uid(), name: '母亲小娟',
        keywords: ['母亲', '小娟', '妈妈', '继父'],
        content: '母亲小娟与抠门继父对邱惠玲刻薄冷淡，经常外出将她独自留在家中。',
        weight: 80, insertPosition: 'after_char', depth: 0, outletName: '',
        triggerCondition: 'keyword', enabled: true, order: 1
      },
      {
        id: utils.uid(), name: '堂哥关系',
        keywords: ['堂哥', '哥', '依赖', '零花钱'],
        content: '堂哥是邱惠玲唯一的心理依赖和情感寄托，常通过撒娇获取关爱与零花钱。关系极度信任。',
        weight: 90, insertPosition: 'before_char', depth: 0, outletName: '',
        triggerCondition: 'keyword', enabled: true, order: 2
      },
    ];
    this.save();
  },

  /* CRUD methods, render, event binding — full implementation in file */
  create(data) { /* 新建条目 */ },
  update(id, data) { /* 更新条目 */ },
  delete(id) { /* 带确认的删除 */ },
  render() { /* 渲染条目列表 */ },
  renderEntry(entry) { /* 渲染单条条目 */ },
  bindEntryEvents(id) { /* 绑定编辑/保存/删除事件 */ },
  save() { window.storage?.set('worldbook_entries', this.entries); },
  import(jsonStr) { /* 导入 JSON */ },
  export() { /* 导出 JSON */ },
  bindToolbar() { /* 绑定新建/导入/导出按钮 */ },
};
```

- [ ] **Step 3: 创建世界书 HTML 结构并放入 index.html 的 tab-content**

```html
<div class="tab-content active" id="tab-character">
  <!-- 角色设定表单… -->
</div>
<div class="tab-content" id="tab-worldbook">
  <div class="wb-toolbar">
    <span class="wb-count" id="wb-count">3 条条目</span>
    <div class="wb-actions">
      <button id="wb-import">导入</button>
      <button id="wb-export">导出</button>
      <button class="btn-add" id="wb-add">+ 新建</button>
    </div>
  </div>
  <div id="wb-list"></div>
</div>
<div class="tab-content" id="tab-chatsettings">
  <!-- Task 6 -->
</div>
```

- [ ] **Step 4: 验证**

刷新浏览器，切换到世界书标签页，展开条目查看所有字段，编辑关键词（添加/删除），修改内容后保存，新建条目，删除条目（确认对话框）。

---

### Task 6: 对话设置标签页

**Files:**
- Modify: `index.html`（对话设置 tab-content）
- Modify: `js/settings.js`（或内联处理）

**Interfaces:**
- Produces: 滑块和开关的 DOM 绑定，值存入 `settings.chatParams`

- [ ] **Step 1: HTML 创建对话设置标签页**

```html
<div class="tab-content" id="tab-chatsettings">
  <div class="char-field">
    <label>Temperature <span id="temp-val" style="color:var(--accent)">1.0</span></label>
    <input type="range" min="0" max="2" step="0.1" value="1.0" id="cs-temperature"
           style="width:100%;accent-color:var(--accent)">
  </div>
  <div class="char-field">
    <label>Top-P <span id="topp-val" style="color:var(--accent)">0.9</span></label>
    <input type="range" min="0" max="1" step="0.05" value="0.9" id="cs-topp"
           style="width:100%;accent-color:var(--accent)">
  </div>
  <div class="char-field">
    <label>最大回复 Token</label>
    <input type="number" value="512" min="1" max="8192" id="cs-max-tokens">
  </div>
  <div class="char-field">
    <label>上下文长度</label>
    <input type="number" value="4096" min="256" max="32768" id="cs-context">
  </div>
  <div class="char-field">
    <label>作者注记频率（0 = 禁用）</label>
    <input type="number" value="0" min="0" max="10" id="cs-an-frequency">
    <span style="font-size:10px;color:var(--danger);display:none" id="an-warning">
      注记频率为 0 时，位于作者注记位置的世界书条目将被忽略
    </span>
  </div>
  <div class="char-field" style="display:flex;justify-content:space-between;align-items:center">
    <label style="margin-bottom:0">流式输出</label>
    <button id="cs-streaming" class="toggle-btn active" role="switch" aria-checked="true">
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
    </button>
  </div>
</div>
```

- [ ] **Step 2: 切换开关 CSS**

```css
/* 加到 css/components.css */
.toggle-btn {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--border-color);
  position: relative;
  transition: background var(--transition-fast);
}

.toggle-btn.active { background: var(--accent); }

.toggle-btn .toggle-thumb {
  position: absolute;
  top: 2px; left: 2px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: white;
  transition: transform var(--transition-fast);
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}
```

- [ ] **Step 3: 滑块事件绑定（在 settings.js 中）**

```javascript
// js/settings.js 中
['temperature', 'topp'].forEach(id => {
  const slider = document.getElementById(`cs-${id}`);
  const display = document.getElementById(`${id}-val`);
  slider.addEventListener('input', () => {
    display.textContent = parseFloat(slider.value).toFixed(id === 'topp' ? 2 : 1);
  });
});
```

- [ ] **Step 4: 验证**

拖动 Temperature 和 Top-P 滑块确认数值实时更新。开关按钮切换颜色和位置。

---

### Task 7: 通知系统 + 动画

**Files:**
- Create: `css/notifications.css`
- Create: `css/animations.css`
- Create: `js/notifications.js`

**Interfaces:**
- Produces: `notifications.show(type, title, message)` 全局方法

- [ ] **Step 1: notifications.css**

```css
/* css/notifications.css */
.toast-container {
  position: fixed;
  top: 48px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  min-width: 280px;
  max-width: 380px;
  box-shadow: var(--shadow-md);
  animation: toastIn 300ms ease-out;
  position: relative;
}

.toast.removing { animation: toastOut 300ms ease-in forwards; }

.toast.success { border-left: 3px solid var(--success); }
.toast.warning { border-left: 3px solid var(--warning); }
.toast.error { border-left: 3px solid var(--danger); }
.toast.info { border-left: 3px solid var(--accent); }

.toast .toast-icon { flex-shrink: 0; margin-top: 1px; }

.toast .toast-body { flex: 1; }

.toast .toast-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.toast .toast-msg {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

.toast .toast-close {
  flex-shrink: 0;
  color: var(--text-dim);
  cursor: pointer;
  padding: 2px;
  transition: color var(--transition-fast);
}

.toast .toast-close:hover { color: var(--text-secondary); }
```

- [ ] **Step 2: animations.css**

```css
/* css/animations.css */
@keyframes msgIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes toastOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(100%); }
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes modalOut {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(8px) scale(0.98); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse-border {
  0%, 100% { border-color: var(--danger); }
  50% { border-color: transparent; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

- [ ] **Step 3: notifications.js**

```javascript
// js/notifications.js
const notifications = {
  ICONS: {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6fc98f" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4a860" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c46b6b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7eb8da" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  },

  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${this.ICONS[type]}</div>
      <div class="toast-body">
        <div class="toast-title">${utils.escapeHTML(title)}</div>
        <div class="toast-msg">${utils.escapeHTML(message)}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    this.container.appendChild(toast);

    // 限制最多 3 条
    const toasts = this.container.querySelectorAll('.toast');
    if (toasts.length > 3) toasts[0].remove();

    // 3 秒后自动移除
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};
```

- [ ] **Step 5: 更新 HTML 引入新 CSS**

在 `<head>` 中添加：
```html
<link rel="stylesheet" href="css/animations.css">
<link rel="stylesheet" href="css/notifications.css">
```

- [ ] **Step 6: 验证**

在浏览器 console 运行 `notifications.show('success', '测试', '这是一条通知')`，确认通知从右侧滑入，3秒后自动消失。

---

### Task 8: 模态框系统 + 角色卡管理 + 角色卡编辑器

**Files:**
- Create: `css/modals.css`
- Create: `js/modals.js`
- Modify: `index.html`（添加模态框 HTML）

**Interfaces:**
- Produces: `ModalManager.open(id)`, `ModalManager.close(id)` 方法

- [ ] **Step 1: modals.css**

```css
/* css/modals.css */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 200ms ease-out;
}

.modal-overlay.hidden { display: none; }

.modal {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90vw;
  max-width: 640px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: modalIn 200ms ease-out;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  width: 28px; height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.modal-close:hover { color: var(--text-primary); background: var(--bg-hover); }

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

/* 按钮样式 */
.btn { padding: 8px 16px; font-size: 12px; border-radius: var(--radius-sm); font-weight: 500; transition: all var(--transition-fast); }
.btn-primary { background: var(--accent); color: var(--bg-primary); }
.btn-primary:hover { box-shadow: var(--glow-accent); }
.btn-secondary { background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-color); }
.btn-secondary:hover { border-color: var(--text-dim); }
.btn-danger { background: var(--danger); color: white; }
.btn-danger:hover { opacity: 0.9; }
```

- [ ] **Step 2: modals.js**

```javascript
// js/modals.js
const ModalManager = {
  overlay: null,
  current: null,

  init() {
    this.overlay = document.getElementById('modal-overlay');
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  open(modalId) {
    this.close();
    this.current = document.getElementById(modalId);
    if (!this.current) return;
    this.overlay.classList.remove('hidden');
    this.current.classList.remove('hidden');
  },

  close() {
    if (this.current) this.current.classList.add('hidden');
    this.overlay.classList.add('hidden');
    this.current = null;
  }
};
```

- [ ] **Step 3: 角色卡管理模态框 HTML**

放在 `#modal-overlay` 内部：

```html
<!-- 角色卡管理 -->
<div class="modal hidden" id="modal-char-manager">
  <div class="modal-header">
    <h3>角色卡管理</h3>
    <button class="modal-close" onclick="ModalManager.close()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div class="modal-body">
    <div id="char-card-list" style="display:flex;flex-direction:column;gap:8px">
      <!-- 动态渲染 -->
    </div>
    <div style="margin-top:16px;padding:16px;border:2px dashed var(--border-color);border-radius:8px;text-align:center;cursor:pointer" id="char-drop-zone">
      <p style="color:var(--text-muted);font-size:13px">拖拽 JSON 角色卡文件到此处导入</p>
      <input type="file" accept=".json" id="char-file-input" style="display:none">
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="ModalManager.close()">关闭</button>
  </div>
</div>

<!-- 角色卡编辑器 -->
<div class="modal hidden" id="modal-char-editor">
  <div class="modal-header">
    <h3>角色卡编辑器</h3>
    <div style="display:flex;gap:8px">
      <button id="editor-toggle-view" class="btn btn-secondary" style="font-size:10px;padding:4px 8px">JSON 视图</button>
      <button class="modal-close" onclick="ModalManager.close()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  </div>
  <div class="modal-body" id="char-editor-body">
    <!-- 可视化表单 或 JSON 编辑器 -->
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="ModalManager.close()">取消</button>
    <button class="btn btn-primary" id="editor-save">保存</button>
  </div>
</div>
```

- [ ] **Step 4: 角色卡管理 JS（在 character.js 中扩展）**

```javascript
// character.js 扩展
const CharacterManager = {
  init() {
    document.getElementById('btn-character-manager').addEventListener('click', () => {
      this.renderList();
      ModalManager.open('modal-char-manager');
    });
    this.setupDragDrop();
  },

  renderList() { /* 渲染角色卡列表 */ },
  setupDragDrop() { /* 文件拖拽导入 */ },
  importCard(jsonData) { /* 解析并保存角色卡 */ },
  exportCard() { /* 导出当前角色卡为 JSON 文件下载 */ },
  deleteCard(id) { /* 删除并刷新列表 */ },
};

const CharacterEditor = {
  init() { /* 表单 ↔ JSON 双视图切换 */ },
  loadCard(card) { /* 填充编辑器字段 */ },
  save() { /* 保存到 localStorage */ },
  toggleView() { /* 表单视图 ↔ JSON 源码 */ },
};
```

- [ ] **Step 5: 验证**

点击顶部导航角色图标打开角色卡管理模态框。拖拽 JSON 文件导入。点击编辑打开编辑器模态框。

---

### Task 9: 对话历史 + 书签模态框

**Files:**
- Modify: `index.html`（历史、书签模态框 HTML）
- Modify: `js/chat.js`（扩展历史记录功能）

**Interfaces:**
- Consumes: `ModalManager`, `window.storage`
- Produces: 历史记录列表渲染、书签列表

- [ ] **Step 1: 对话历史模态框 HTML**

```html
<div class="modal hidden" id="modal-chat-history">
  <div class="modal-header">
    <h3>对话历史</h3>
    <button class="modal-close" onclick="ModalManager.close()">...</button>
  </div>
  <div class="modal-body" id="history-list">
    <!-- 会话时间线 -->
    <div class="history-empty" style="text-align:center;padding:40px;color:var(--text-muted)">
      <p>暂无对话记录</p>
    </div>
  </div>
</div>

<div class="modal hidden" id="modal-bookmarks">
  <div class="modal-header">
    <h3>书签收藏</h3>
    <button class="modal-close" onclick="ModalManager.close()">...</button>
  </div>
  <div class="modal-body" id="bookmark-list">
    <div class="history-empty" style="text-align:center;padding:40px;color:var(--text-muted)">
      <p>暂无书签</p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 实现逻辑（chat.js 扩展）**

书架和书签的创建/读取/删除功能，从 localStorage 读写。每条对话可收藏为书签。

- [ ] **Step 3: 验证**

发送几条消息后查看历史记录。给消息打书签后查看书签列表。

---

### Task 10: 全局设置模态框

**Files:**
- Modify: `index.html`（设置模态框 HTML）
- Create: `js/settings.js`

**Interfaces:**
- Produces: 全局设置读写，主题切换，字体大小调节

- [ ] **Step 1: 设置模态框 HTML**

```html
<div class="modal hidden" id="modal-settings">
  <div class="modal-header">
    <h3>全局设置</h3>
    <button class="modal-close" onclick="ModalManager.close()">...</button>
  </div>
  <div class="modal-body">
    <div class="char-field">
      <label>主题</label>
      <select id="setting-theme">
        <option value="default">深色（默认）</option>
        <option value="darker">更暗</option>
      </select>
    </div>
    <div class="char-field">
      <label>字体大小</label>
      <select id="setting-font-size">
        <option value="small">小</option>
        <option value="medium" selected>中</option>
        <option value="large">大</option>
      </select>
    </div>
    <div class="char-field">
      <label>气泡样式</label>
      <select id="setting-bubble-style">
        <option value="default" selected>当前风格</option>
        <option value="compact">紧凑风格</option>
      </select>
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color)">
      <h4 style="font-size:13px;color:var(--text-primary);margin-bottom:8px">键盘快捷键</h4>
      <table style="width:100%;font-size:11px;color:var(--text-muted)">
        <tr><td style="padding:4px 0">发送消息</td><td style="color:var(--text-secondary)">Enter</td></tr>
        <tr><td style="padding:4px 0">换行</td><td style="color:var(--text-secondary)">Shift + Enter</td></tr>
        <tr><td style="padding:4px 0">关闭弹窗</td><td style="color:var(--text-secondary)">Esc</td></tr>
      </table>
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color)">
      <h4 style="font-size:13px;color:var(--danger);margin-bottom:8px">数据管理</h4>
      <button class="btn btn-danger" id="btn-clear-all">清空所有本地数据</button>
      <p style="font-size:10px;color:var(--text-muted);margin-top:4px">此操作将删除所有角色卡、世界书条目、对话历史和设置</p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: settings.js**

```javascript
// js/settings.js
const Settings = {
  defaults: {
    theme: 'default',
    fontSize: 'medium',
    bubbleStyle: 'default',
  },

  init() {
    this.load();
    document.getElementById('btn-settings').addEventListener('click', () => {
      ModalManager.open('modal-settings');
    });
    document.getElementById('setting-theme').addEventListener('change', (e) => this.set('theme', e.target.value));
    document.getElementById('setting-font-size').addEventListener('change', (e) => this.set('fontSize', e.target.value));
    document.getElementById('setting-bubble-style').addEventListener('change', (e) => this.set('bubbleStyle', e.target.value));
    document.getElementById('btn-clear-all').addEventListener('click', () => this.clearAll());
  },

  load() {
    const saved = window.storage?.get('settings') || {};
    const s = { ...this.defaults, ...saved };
    Object.entries(s).forEach(([k, v]) => {
      const el = document.getElementById(`setting-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
      if (el) el.value = v;
    });
    this.apply(s);
  },

  set(key, val) {
    const s = this.getAll();
    s[key] = val;
    window.storage?.set('settings', s);
    this.apply(s);
  },

  getAll() {
    return { ...this.defaults, ...(window.storage?.get('settings') || {}) };
  },

  apply(s) {
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.style.setProperty('--font-size-multiplier',
      s.fontSize === 'small' ? '0.9' : s.fontSize === 'large' ? '1.15' : '1');
  },

  clearAll() {
    if (confirm('确定要清空所有本地数据吗？此操作不可撤销。')) {
      window.storage?.clearAll();
      window.notifications?.show('success', '已清空', '所有本地数据已清除，刷新页面生效');
    }
  }
};
```

- [ ] **Step 3: 验证**

打开设置模态框，切换主题确认色彩变化，调节字体大小，点击清空数据（二次确认）。

---

### Task 11: 状态管理 + 存储 + 应用初始化

**Files:**
- Create: `js/storage.js`
- Create: `js/state.js`
- Create: `js/app.js`

**Interfaces:**
- Produces: `window.storage` — `get(k)`, `set(k,v)`, `remove(k)`, `clearAll()`
- Produces: `window.state` — `get(k)`, `set(k,v)`, `on(k, fn)`, `off(k, fn)`
- Produces: `App.init()` — 初始化入口

- [ ] **Step 1: storage.js**

```javascript
// js/storage.js
const storage = {
  PREFIX: 'st_',

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(this.PREFIX + key));
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      window.notifications?.show('error', '存储失败', 'localStorage 已满或不可用');
    }
  },

  remove(key) { localStorage.removeItem(this.PREFIX + key); },

  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => localStorage.removeItem(k));
    window.notifications?.show('success', '已清空', '所有数据已清除');
  },

  keys() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .map(k => k.slice(this.PREFIX.length));
  }
};
```

- [ ] **Step 2: state.js**

```javascript
// js/state.js
const state = {
  _data: {},
  _listeners: {},

  get(key) { return this._data[key]; },
  set(key, value) {
    const prev = this._data[key];
    this._data[key] = value;
    (this._listeners[key] || []).forEach(fn => fn(value, prev));
  },

  on(key, fn) {
    (this._listeners[key] = this._listeners[key] || []).push(fn);
  },

  off(key, fn) {
    const arr = this._listeners[key];
    if (arr) this._listeners[key] = arr.filter(f => f !== fn);
  },

  // 批量初始化
  init(initialState) {
    Object.entries(initialState).forEach(([k, v]) => {
      if (this._data[k] === undefined) this._data[k] = v;
    });
  }
};
```

- [ ] **Step 3: app.js**

```javascript
// js/app.js
const App = {
  async init() {
    // 1. 基础组件初始化
    notifications.init();
    ModalManager.init();
    Settings.init();

    // 2. 加载角色卡
    await this.loadCharacterCard();

    // 3. 初始化各模块
    ChatRenderer.init();
    ChatInput.init();
    CharacterSettings.init();
    WorldBook.init();
    CharacterManager.init();
    CharacterEditor.init();

    // 4. 加载持久化状态
    state.init({
      messages: [],
      showLeftPanel: true,
      showRightPanel: true,
    });

    console.log('[App] 初始化完成');
  },

  async loadCharacterCard() {
    let card = storage.get('character_card');
    if (!card) {
      // 从 data/qhl.json 读取默认角色卡
      try {
        const resp = await fetch('data/qhl.json');
        card = await resp.json();
        storage.set('character_card', card);
      } catch (e) {
        console.warn('[App] 无法加载默认角色卡:', e.message);
      }
    }
  }
};

// 启动
document.addEventListener('DOMContentLoaded', () => App.init());
```

- [ ] **Step 4: 验证**

完整刷新页面，console 显示 `[App] 初始化完成`。所有模块正常工作，数据正确填充。

---

### Task 12: 集成测试 + 最终打磨

**Files:**
- Modify: `css/components.css`（样式微调）
- Modify: `index.html`（最终 polish）

**检查清单：**

- [ ] **Step 1: 样式统一检查**
  - 所有颜色使用 CSS 变量（无硬编码色值）
  - 所有字体使用 `var(--font-sans)`
  - 所有间距使用 `var(--space-*)`
  - 所有动画使用 `transform` + `opacity`
  - 无 emoji，全部 SVG 图标

- [ ] **Step 2: 功能完整性检查**
  - 左侧面板：4 模块全部折叠/展开正常，22 个字段全部存在
  - 聊天区：示例对话正确渲染，*动作* 斜体，**对话** 亮白
  - 输入栏：输入文字 → token 计数变化，Enter 发送，操作菜单弹出
  - 右侧面板：3 标签页切换正常
  - 世界书：新建/编辑/删除/展开折叠全部正常，插入位置下拉 11 种
  - 通知：各类型通知正常弹出
  - 模态框：全部模态框可打开/关闭（Esc 和点击遮罩）
  - 设置：主题切换/字体调节生效
  - 存储：刷新页面后数据持久化

- [ ] **Step 3: 性能检查**
  - 首次加载 < 1s
  - 无外部 JS 依赖
  - CSS 动画无 layout thrashing（仅 transform/opacity）
  - 对话使用 DocumentFragment 批量插入

- [ ] **Step 4: 响应式检查**
  - 宽度 > 900px：三栏完整显示
  - 宽度 < 900px：侧栏隐藏，仅聊天区 + 输入栏

---

## 文件清单总结

| 文件 | 任务 | 说明 |
|------|------|------|
| `index.html` | T1, T2, T3, T4, T5, T6, T8, T9, T10 | 主入口，包含所有模态框 |
| `css/reset.css` | T1 | CSS Reset |
| `css/variables.css` | T1 | 色彩/字体/间距变量 |
| `css/layout.css` | T1 | 三栏布局 |
| `css/components.css` | T2, T3, T4, T5, T6 | 全部组件样式 |
| `css/modals.css` | T8 | 模态框样式 |
| `css/animations.css` | T7 | 关键帧动画 |
| `css/notifications.css` | T7 | Toast 通知样式 |
| `js/utils.js` | T3 | 工具函数（HTML 转义/消息解析/Token 估算/UID） |
| `js/storage.js` | T11 | localStorage 封装 |
| `js/state.js` | T11 | 状态管理（Pub/Sub） |
| `js/notifications.js` | T7 | Toast 通知系统 |
| `js/modals.js` | T8 | 模态框管理器 |
| `js/chat.js` | T3, T9 | 聊天渲染 + 输入处理 + 历史 + 书签 |
| `js/character.js` | T4, T8 | 角色设定 + 角色卡管理 + 编辑器 |
| `js/worldbook.js` | T5 | 世界书完整 CRUD |
| `js/settings.js` | T6, T10 | 对话设置 + 全局设置 |
| `js/app.js` | T11 | 应用初始化入口 |
