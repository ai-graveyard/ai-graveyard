# AI Graveyard PRD

## 产品定位

AI Graveyard 是像素单页网站，以“墓园”展示错过 PMF、最终开源的 AI 产品。首页即体验：浏览墓碑、查看档案、切换语言/主题，把项目“埋葬”或“复活”。语气诙谐克制，有黑色幽默，但不嘲讽。

## 技术与数据

使用 Next.js App Router、React、TypeScript、Tailwind v4、CSS Modules。`app/page.tsx` 只渲染客户端组件 `GraveyardExperience`；产品数据硬编码。每个产品含 `id`、名称、仓库、出生/入土月份、墓园位置（lane/plot）、强调色、植物类型（sprout / mushroom / chipflower）和双语 copy；copy 含状态、标语（tagline）、墓志铭、复盘、技术栈和信号值。偏好写入 `localStorage`：语言、主题、已埋葬 ID。

## 页面结构

顶部为品牌文字、GitHub 链接、语言/主题分段控件。首屏左侧是绿色标签、超大标题、副标题和一座像素墓碑纪念图标（SVG 像素画）；右侧是旧纸板档案卡（dossier），展示当前项目名、标语、信号/状态、墓志铭、复盘、出生/入土、技术栈、源码链接和埋葬按钮。下方墓园按出生年份（2025、2026）分组，每年至少一排、每排最多 5 个 plot，超出自动换行；左侧有年份木牌。统计条显示总墓数、仍站立数、已埋数和最近撤销按钮。

## 核心交互

点击墓碑选中项目并刷新档案卡；选中墓碑轻微跳动（`.activeTombstone`），悬浮时墓碑上浮发光（`.hoverTombstone`）并出现幽灵。悬浮或聚焦墓碑/灰烬土丘时，档案卡实时预览该项目（`hoverId`），移开后回退到点击选中项（`activeId`）。墓碑上始终显示项目名、生卒日期和标语。点击 "Bury / 埋葬" 后进入 1450ms 动画：藤蔓升起、墓碑碎裂、文字故障消失，完成后变灰烬土丘和 "Buried / 已埋葬" 标签。点击灰烬土丘、档案卡已埋按钮或统计条撤销可恢复。夜间僵尸随机游走，点击棋盘时朝点击位置移动；白天隐藏。

## 视觉与响应式

整体为硬边像素风：粗边框、阶梯阴影、扫描噪声、`image-rendering: pixelated`、`steps()` 动画；避免玻璃拟态和圆角卡片。夜间深蓝到紫棕，含月亮、星星、云和绿色墓地；白天浅蓝天空、太阳、白云和亮草地。主色为奶油黄、荧光绿、珊瑚橙、天蓝、深紫边框；植物有 sprout、mushroom、chipflower。桌面两列，小屏单列，显示项目选择器，墓园横向滚动。交互需有 `aria-label`、`aria-pressed` 或 `aria-live`，语言同步 HTML lang，尊重 `prefers-reduced-motion`。
