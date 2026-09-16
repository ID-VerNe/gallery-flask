# Gallery Culling (Tauri 2.0 + React 19) 交互与用户体验 (UX) 深度审计报告

> **审计工具规范**：基于 `/better-interface` 跨学科统一审查框架，协同调度 `better-accessibility`、`better-layout`、`better-writing`、`better-typography`、`better-colors` 以及 `better-ui` 六大领域能力。  
> **审计日期**：2026-09-16  
> **审查基准**：桌面级专业选图工作流、WCAG 2.2 AA / APG 键盘交互规范、桌面端微交互与视觉层级体系。

---

## 一、审查范围与覆盖率 (Scope & Coverage)

- **审查模式**：`full`（全量深度审计，覆盖主流程、边界状态、弱视力/读屏无障碍、小窗口视口自适应等）
- **审查范围**：`src/` 桌面端全部交互界面与核心组件：
  - `src/App.tsx`（应用顶层状态、视图容器布局、快捷键接入）
  - `src/components/TopBar.tsx`（顶部目录选择、扫描触发、过滤与排序、视图切换控制栏）
  - `src/components/ThumbnailGrid.tsx`（万级图片虚拟滚动网格、侧边栏缩略图卡片、状态角标）
  - `src/components/PreviewViewport.tsx`（单图大图检视、滚轮无级缩放平移、悬浮 EXIF 信息与快捷打分胶囊）
  - `src/components/SplitCompareViewport.tsx`（双图并排对比、联动同步缩放平移与对比控制）
  - `src/components/BottomBar.tsx`（底部照片参数、快捷键指南与进度指示器）
  - `src/components/BatchExportModal.tsx`（批量挑选导出弹窗）
  - `src/components/SettingsModal.tsx`（首选项与工具配置弹窗）
  - `src/hooks/useKeyboardShortcuts.ts`（单手高频专业快捷键流）
  - `src/index.css` & `index.html`（全局基础排版、光标与文本选中规则）
- **技术栈**：React 19 + TypeScript + Vite 6 + Tailwind CSS + Tauri 2.0 (Rust)
- **审查边界**：聚焦现代化桌面选图检视体验，不包含已归档至 `legacy_flask/` 的旧版代码。

### 领域覆盖矩阵

| 领域 (Domain) | 审查对象与凭据 (Evidence Inspected) | 发现数 (Result) |
| :--- | :--- | :---: |
| **Accessibility (无障碍)** | 键盘可达性、焦点指示器、ARIA 属性、语义化标签、模态窗焦点陷阱 | **3 项 (2 HIGH, 1 MEDIUM)** |
| **Layout (布局结构)** | 栅格流、自适应折叠、控件边界、元素内间距、视口溢出与全局选择锁定 | **3 项 (1 HIGH, 2 MEDIUM)** |
| **Writing (文案与微文案)** | 按钮动作命名、错误提示语义、术语中英文统一性、空状态指引 | **2 项 (2 MEDIUM)** |
| **Typography (排版细节)** | 动态数字排版 (tabular-nums)、字号底线、层级与信息可读性 | **2 项 (2 MEDIUM)** |
| **Colors (色彩与对比度)** | 淘汰图对比度与明度衰减、语义色一致性、暗色模式边界 | **1 项 (1 MEDIUM)** |
| **UI Polish (质感与动效)** | 按压缩放微交互、过渡动画属性特定性、同心圆角、图片轮廓 | **3 项 (3 LOW)** |

---

## 二、整合审计发现清单 (Consolidated Findings)

本表依据严重度（Severity）由高至低降序排列；同一根本原因归并为单一条目。

| # | 严重度 | 领域 | 位置 | 现状 (Before) | 建议重构 (After) | 归因与用户影响 (Why) |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| 1 | **HIGH** | Accessibility | `src/components/ThumbnailGrid.tsx:123` | `<div onClick={onSelect} className="...">` 纯 div 处理卡片点击与激活 | 改为 `<button type="button" role="option" tabIndex={0} aria-selected={isSelected}>` 或补充完整的无障碍键盘操作事件与焦点外框 | 违反 APG 复合组件规范。纯 div 导致键盘焦点无法进入侧边栏列表，键盘用户无法通过 Tab / 上下箭头逐张检阅照片。 |
| 2 | **HIGH** | Accessibility | `src/components/TopBar.tsx:66,84,142,153,164,188`<br>`src/components/PreviewViewport.tsx:151,161,226`<br>`src/components/SplitCompareViewport.tsx:101-140`<br>`src/components/BatchExportModal.tsx:80`<br>`src/components/SettingsModal.tsx:58` | 诸多图标按钮仅有 `title` 甚至缺少名称：`<button><FolderOpen /></button>` | 增加显式 `aria-label`（如 `aria-label="浏览 JPG 目录"`、`aria-label="关闭"`、`aria-label="重置缩放"`），并在图标 SVG 上标记 `aria-hidden="true"` | 违反“无障碍名称随处可见”准则。屏幕阅读器会将纯图标按钮朗读为毫无含义的“button”，严重破坏辅助工具使用。 |
| 3 | **HIGH** | Accessibility | `src/components/BatchExportModal.tsx:72`<br>`src/components/SettingsModal.tsx:50` | 遮罩层仅使用普通 `fixed inset-0` 容器，无键盘拦截与语义包裹 | 增加 `role="dialog"`、`aria-modal="true"`、`aria-labelledby="..."`，并监听 `Escape` 键关闭，关闭后恢复前置焦点 | 弹窗未做焦点捕获（Focus Trap）与 Esc 退出，键盘焦点仍可穿透到背景画布，容易引发选片误操作。 |
| 4 | **HIGH** | Layout | `src/App.tsx:208`<br>`index.html:9`<br>`src/index.css:7` | 在根节点 `body` 与外层容器滥用全局 `select-none` | 移除根节点全局 `select-none`；仅在画布拖拽视口（`PreviewViewport`、`SplitCompareViewport`）及按钮上局部声明 `select-none` | 违反“保持有用文本可选”原则。导致用户无法在界面中框选复制文件名、完整目录路径、相机型号或 EXIF 关键参数。 |
| 5 | **MEDIUM** | Layout | `src/components/TopBar.tsx:54` | 目录输入区使用刚性 `max-w-3xl flex items-center gap-2` | 增加小视口弹性换行或收缩支持（`min-w-0 flex-wrap lg:flex-nowrap`）并设定最小输入宽度 | 当窗口宽度小于 1200px 时，路径输入框和加载按钮相互挤压，甚至将右侧筛选控件挤出可视区域。 |
| 6 | **MEDIUM** | Layout | `src/components/BatchExportModal.tsx:88,109,155`<br>`src/components/SettingsModal.tsx:66,91` | 表单项仅使用悬浮的独立 `<label>` 标签，未关联目标控件 | 为 `<label>` 增加 `htmlFor="input-id"`，并在对应 `<input>` 增加对应 `id` | 表单缺少关联。点击说明文本无法聚焦对应输入框，降低鼠标操作命中容错率。 |
| 7 | **MEDIUM** | Writing | `src/components/PreviewViewport.tsx:93`<br>`src/App.tsx:90` | 空状态仅有一句冷淡的 `请选择文件夹并加载照片`；错误使用原生阻塞式 `alert()` | 空状态补充指引并放置直达主动作按钮（`<button>选择文件夹开始选片</button>`）；将 `alert()` 升级为现代非阻塞轻提示 (Toast) | 空状态缺乏前瞻行动点（Empty State should point forward）；原生 `alert()` 破坏桌面沉浸感并卡顿 UI 渲染。 |
| 8 | **MEDIUM** | Writing | `src/components/TopBar.tsx:100`<br>`src/components/PreviewViewport.tsx:244` | TopBar 按钮为“加载图片”，预览区按钮为“打开 RAW” | TopBar 改为动词优先的“扫描照片”；预览区根据当前组实际情况动态显示“在修图软件中打开”或“在外部打开” | 当照片组仅有 JPG 时，“打开 RAW”名不符实且容易误导摄影师；按钮文案应更清晰贴合当前状态。 |
| 9 | **MEDIUM** | Typography | `src/components/BottomBar.tsx:73`<br>`src/components/ThumbnailGrid.tsx:172,197`<br>`src/components/PreviewViewport.tsx:137` | 动态数字计数器 `currentIndex / totalCount` 与 EXIF 曝光数值未使用等宽字体特性 | 在数字容器上增加 `tabular-nums` 类（`font-mono tabular-nums`） | 比例字体的数字宽度不同，当切图时索引从 9 变为 10 或快门变化时，底栏和悬浮胶囊会发生肉眼可见的左右微抖动（Layout Shift）。 |
| 10 | **MEDIUM** | Typography | `src/components/ThumbnailGrid.tsx:179,184` | 侧边栏照片角标使用超小固定尺寸 `text-[9px]` | 提升角标字号至 `text-[11px]` 或 `text-xs`，通过 `px-1.5 py-0.5` 保持紧凑 | `9px` 明显低于 UI 字号底线（12px），在高分辨率高缩放屏幕或小尺寸副屏上极其吃力且难以辨认。 |
| 11 | **MEDIUM** | Colors | `src/components/ThumbnailGrid.tsx:119` | 淘汰标记采用 `group.flag === 'reject' ? 'opacity-40'` 粗暴降低整卡透明度 | 移除整卡降低透明度，改为在卡片上方保留文件名可读性，仅叠加柔和半透明红角标与灰色遮罩 | 40% 的全透明度让暗底上的文件名和 EXIF 文本对比度降至 APCA 临界点以下，导致用户想重新核对淘汰照片时根本看不清文件名。 |
| 12 | **LOW** | UI Polish | `src/components/TopBar.tsx:97`<br>`src/components/PreviewViewport.tsx:201,213,240`<br>`src/components/BottomBar.tsx:80` | 关键动作按钮缺少点击瞬间的微按压反馈 | 增加 `active:scale-[0.96] transition-transform` | 缺少微交互导致高频选片操作下界面缺少实体触感，响应感觉生硬。 |
| 13 | **LOW** | UI Polish | `src/components/ThumbnailGrid.tsx:132` | 缩略图外层容器无精致描边，黑底与深灰背景融为一体 | 增加 `ring-1 ring-white/10` 纯色半透明轮廓层 | 在暗色界面中，纯黑或暗影照片的边缘与应用背景粘连，无法清晰感知图片画幅长宽比。 |
| 14 | **LOW** | UI Polish | `src/components/ThumbnailGrid.tsx:125` | 使用宽泛的 `transition-all` 处理卡片悬停效果 | 改为明确声明过渡属性 `transition-[background-color,border-color,box-shadow]` | 宽泛的 `transition-all` 会触发浏览器非必要的计算开销，在快速上下滚动虚拟列表时易引发微掉帧。 |

---

## 三、深层领域归因剖析 (Domain Deep-Dives)

### 1. 无障碍交互体系 (Accessibility)
- **卡片焦点缺失**：选图工具核心交互在于照片切换。当前虽然顶层实现了 `useKeyboardShortcuts` 监听全局按键，但在 DOM 语义层面，侧边栏缩略图卡片只是包含 `onClick` 的 `div`。一旦视障用户使用屏幕阅读器，或者辅助设备（如外接脚踏板、轮椅控制器、无鼠标设备）接入时，无法感知照片列表的当前项、总数及激活状态。
- **图标按钮命名断层**：顶部栏和预览浮层为了界面紧凑，使用了大量的纯图标操作（如 `FolderOpen`、`Columns2`、`RotateCcw`）。虽然带有 `title` 属性，但在屏幕阅读器访问树（Accessibility Tree）中，`title` 的权重及兼容性远低于标准的 `aria-label`。

### 2. 布局弹性与可用文本可选中性 (Layout)
- **全局 `select-none` 的误伤**：在应用根节点（`body` 和 `App.tsx` 最外层）加上 `select-none` 虽然能防止连续快速双击缩放图片时选中文本产生蓝色高亮，但它将整个应用变成了“不可选取的静止图片”。专业摄影师经常需要复制文件名去微信/钉钉/飞书沟通，或者复制完整路径在资源管理器中定位。应当将 `select-none` 的作用域收窄至 `PreviewViewport`（画布拖拽平移区）和功能按钮本身。
- **顶栏空间挤压**：顶栏在 1920x1080 分辨率下表现良好，但当用户在小屏幕笔记本（如 13 寸 1280x800）或将窗口双开并排（半屏 960px）时，`max-w-3xl` 会强行霸占空间，导致右侧的“导出”、“设置”等关键按钮被遮挡或溢出。

### 3. 微文案与交互指引 (Writing)
- **空状态应当“指引前行”**：冷冰冰的“请选择文件夹并加载照片”只是描述了现状，没有给予用户最直观的下一步动作路径。优秀桌面的空状态应当居中呈现友好的引导卡片，并带有醒目的“选择图片目录”按钮，点击即可直接拉起原生文件夹选择器。
- **淘汰照片的可识别度与色彩安全 (Colors)**：摄影师选片经常要“复活”误淘汰的照片。如果淘汰的照片被设为 40% 的极低透明度，文本对比度彻底丢失，摄影师在暗光环境下无法辨认文件名和参数，极易造成误删或找回困难。正确的做法是保持文字清晰度，通过灰度滤镜或红标指示。

---

## 四、经考量但明确否决的方案 (Considered but Rejected)

根据 `/better-interface` 的自制力（Restraint）原则，记录在本次审计中经过深思熟虑但决定**不采纳**的方案：

| 位置 | 候选方案 | 否决原因 (Engineering Rationale) |
| :--- | :--- | :--- |
| `src/components/ThumbnailGrid.tsx:26` | 将右侧侧边栏由单列卡片改为双列小图瀑布流 | 侧边栏设计宽度仅为 320px（80 阶），若强制拆分为双列，每张缩略图宽度将不足 110px，根本无法看清人物面部表情和对焦微锐度；同时会挤压 EXIF 参数展示区域，违背了快速精准选片的专业初衷。 |
| `src/components/TopBar.tsx:52` | 为顶部工具栏增加半透明磨砂玻璃背景 (`backdrop-blur-md`) | 顶部控制栏下方固定为暗色选图视口，不存在穿透滚动的图文内容；滥用 CSS 高斯模糊滤镜不仅无实际视觉收益，还会导致低配电脑或笔记本在调整窗口大小时出现明显的渲染掉帧。 |
| `src/App.tsx:20` | 在目录扫描加载成功后，自动将视图从 `grid` 网格模式强行切换为 `single` 单图大图模式 | 摄影师工作流差异极大：部分摄影师习惯在开工时先通过全网格宏观概览整场活动的曝光和色温分布。强行切换视图破坏了用户已建立的心智模型，视图控制权应始终留在用户手中。 |

---

## 五、UX 重构分步落地实施路线图 (Action Plan)

### Step 1: 基础无障碍与键盘体验修复（消灭 HIGH 级别缺陷）
1. 重构 `src/components/ThumbnailGrid.tsx`：
   - 将卡片外层改造为具备可聚焦语义的控件，增加 `role="button"`、`tabIndex={0}`、`aria-selected={isSelected}`，支持键盘 Enter / 空格快速切换选中。
2. 强化模态弹窗体验：
   - 在 `BatchExportModal.tsx` 与 `SettingsModal.tsx` 中增加 `role="dialog"` 与 `aria-modal="true"`，添加 `Escape` 键盘监听快速关闭，并在弹窗挂载时自动聚焦首个输入框。
3. 补齐所有图标按钮的无障碍语义：
   - 遍历 `TopBar`、`PreviewViewport`、`SplitCompareViewport` 中的所有纯图标按钮，添加精准的 `aria-label`，并将内嵌 Lucide 图标标记为 `aria-hidden="true"`。

### Step 2: 布局弹性与文本选取自由度恢复
1. 移除 `index.html`、`src/index.css` 及 `src/App.tsx` 根容器的 `select-none`。
2. 仅在 `PreviewViewport.tsx` 的画布容器及工具栏按钮上局部应用 `select-none`，恢复文件名、EXIF 参数及路径的鼠标高亮与复制功能。
3. 优化 `TopBar.tsx` 栅格，加入响应式收缩策略，适配 960px~1280px 窄窗口桌面排布。

### Step 3: 排版与视觉质感升级 (Typography & UI Polish)
1. 在底部状态栏 `BottomBar` 与预览悬浮胶囊的所有数值（照片序号、曝光参数、文件大小）上应用 `tabular-nums`，消除数值变动时的界面抖动。
2. 调整侧边栏卡片微字号，将 `9px` 提升至可读性良好的 `11px` / `text-xs`。
3. 为淘汰照片重构视觉样式：移除整体 40% 不透明度，改为使用左上角红标与适度弱化边框，确保文件名在暗光下清晰可辨。
4. 为全站主要按钮增加 `active:scale-[0.96] transition-transform` 实体触感反馈。

---

## 六、验证方式 (Verification)

1. **静态代码与类型检查**：运行 `pnpm build`，确保无任何 TypeScript 类型定义或 JSX 属性报错。
2. **纯键盘操作流测试**：
   - 禁用鼠标，仅通过 Tab 键、左右方向键、Enter、空格及 Esc 键，验证是否能完整遍历照片列表并完成弹窗打开与退出。
3. **文本框选验证**：
   - 验证是否能在底部状态栏和悬浮 EXIF 胶囊中自由划选并复制文件名和参数文本。
4. **窗口缩放自适应核验**：
   - 将窗口宽度调整至 960px（系统设定的 minWidth），验证顶部栏与底栏是否发生元素裁剪或控制冲突。

---

## 七、审查裁定 (Verdict)

**Block**

> **裁定说明**：当前界面存在 4 项阻碍无障碍操作、键盘流转及剥夺基本文本选取能力的 **HIGH** 级别问题。依照 `/better-interface` 的严谨标准，在进入下一阶段功能扩展前，应优先执行上述 UX 重构优化，将体验提升至生产级专业软件标准。
