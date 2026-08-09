"use client";

import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./graveyard-experience.module.css";

type Language = "en" | "zh";
type Theme = "night" | "day";

type ProductCopy = {
  status: string;
  tagline: string;
  epitaph: string;
  autopsy: string;
  stack: string[];
  signal: string;
};

type Emblem =
  | "gradcap"
  | "idcard"
  | "palette"
  | "mic"
  | "heart"
  | "branch"
  | "camera"
  | "quad"
  | "soap"
  | "envelope"
  | "puzzle";

type Product = {
  id: string;
  name: string;
  repository: string;
  born: string;
  buried: string;
  lane: string;
  plot: string;
  accent: string;
  plant: "sprout" | "mushroom" | "chipflower";
  emblem: Emblem;
  copy: Record<Language, ProductCopy>;
};

type ZombieVariant = "zombieMoss" | "zombieRust" | "zombieSignal";

type RoamingZombie = {
  id: string;
  x: number;
  y: number;
  scale: string;
  zIndex: number;
  variant: ZombieVariant;
};

type ZombiePosition = {
  id: string;
  x: number;
  y: number;
  facing: 1 | -1;
};

type ZombieTarget = {
  x: number;
  y: number;
};

type ZombieMoveDirection = {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
};

type SiteCopy = {
  navAria: string;
  controlsAria: string;
  languageToggleAria: string;
  themeToggleAria: string;
  gravesNav: string;
  eyebrow: string;
  subtitle: string;
  dossierAria: string;
  closeDossier: string;
  currentGrave: string;
  burying: string;
  buried: string;
  dataVinesActive: string;
  buriedLocally: string;
  born: string;
  buriedDate: string;
  stackAria: string;
  exhumeSource: string;
  boardAria: string;
  scoreboardAria: string;
  noShame: string;
  night: string;
  day: string;
  bury: string;
  gravesStat: (count: number) => string;
  standingStat: (count: number) => string;
  buriedStat: (count: number) => string;
  undoBurial: (name: string) => string;
  buryProject: (name: string) => string;
  selectProject: (name: string) => string;
  projectIsBeingBuried: (name: string) => string;
  projectHasBeenBuried: (name: string) => string;
  yearDivider: (previousYear: string, year: string) => string;
};

type CSSVars = CSSProperties & Record<`--${string}`, string>;

/** Below this width the dossier leaves the sidebar and docks to the viewport bottom. */
const dossierDockQuery = "(max-width: 1080px)";

const languageStorageKey = "ai-graveyard-language";
const themeStorageKey = "ai-graveyard-theme";
const buriedStorageKey = "ai-graveyard-buried-ids";

const products: Product[] = [
  {
    id: "bi-le-ma",
    name: "bi-le-ma",
    repository: "https://github.com/ai-graveyard/bi-le-ma",
    born: "2025.12",
    buried: "2026.01",
    lane: "1",
    plot: "1",
    accent: "#a5e4ff",
    plant: "chipflower",
    emblem: "gradcap",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "Graduation readiness quiz",
        epitaph: "Are you ready to graduate? The product already did.",
        autopsy:
          "A graduation-readiness experiment that left school early and came back as public source.",
        stack: ["JavaScript", "Web app", "Graduation UX"],
        signal: "0 stars",
      },
      zh: {
        status: "已开源",
        tagline: "毕业准备度测试",
        epitaph: "准备毕业了吗？产品已经先毕业了。",
        autopsy: "一个毕业准备度实验，提前离校，又以公开源码的身份回来。",
        stack: ["JavaScript", "网页应用", "毕业体验"],
        signal: "0 星标",
      },
    },
  },
  {
    id: "persona-guide",
    name: "persona-guide",
    repository: "https://github.com/ai-graveyard/persona-guide",
    born: "2026.04",
    buried: "2026.04",
    lane: "1",
    plot: "3",
    accent: "#44d17a",
    plant: "sprout",
    emblem: "idcard",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "User persona builder",
        epitaph: "A thousand personas, no paying users.",
        autopsy:
          "A persona builder that made tidy profiles, then discovered nobody wanted another ritual before building.",
        stack: ["TypeScript", "Next.js", "Prompt UX"],
        signal: "3 stars",
      },
      zh: {
        status: "已开源",
        tagline: "用户画像生成器",
        epitaph: "一千个人设，没有一个付费用户。",
        autopsy:
          "一个能整理出漂亮画像的 persona 工具，最后发现大家并不想在动手前再多走一套仪式。",
        stack: ["TypeScript", "Next.js", "提示词体验"],
        signal: "3 星标",
      },
    },
  },
  {
    id: "design-vibes",
    name: "design-vibes",
    repository: "https://github.com/ai-graveyard/design-vibes",
    born: "2026.02",
    buried: "2026.02",
    lane: "1",
    plot: "5",
    accent: "#ff9bd4",
    plant: "mushroom",
    emblem: "palette",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "Design style almanac",
        epitaph: "Twenty-four vibes entered. One graveyard archived them.",
        autopsy:
          "An interactive design-style guide that became more useful as a fossil than as a product bet.",
        stack: ["TypeScript", "Design guide", "Interactive UI"],
        signal: "0 stars",
      },
      zh: {
        status: "已开源",
        tagline: "设计风格图鉴",
        epitaph: "二十四种 vibe 入场，最后都被墓园归档。",
        autopsy: "一个互动设计风格指南，作为化石反而比作为产品赌注更有用。",
        stack: ["TypeScript", "设计指南", "交互界面"],
        signal: "0 星标",
      },
    },
  },
  {
    id: "ai-interview",
    name: "ai-interview",
    repository: "https://github.com/ai-graveyard/ai-interview",
    born: "2026.01",
    buried: "2026.01",
    lane: "2",
    plot: "2",
    accent: "#ffcf4a",
    plant: "mushroom",
    emblem: "mic",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "AI interviewer",
        epitaph: "It asked great questions. Nobody answered.",
        autopsy:
          "A recruiting assistant with careful loops, buried by a market that wanted fewer interviews, not smarter ones.",
        stack: ["TypeScript", "LLM UX", "Evaluation"],
        signal: "2 stars",
      },
      zh: {
        status: "已开源",
        tagline: "AI 面试官",
        epitaph: "它问了很好的问题。没人回答。",
        autopsy:
          "一款流程细致的招聘助手，最后被一个想要更少面试而不是更聪明面试的市场埋掉。",
        stack: ["TypeScript", "LLM 体验", "评估"],
        signal: "2 星标",
      },
    },
  },
  {
    id: "iclaw-web",
    name: "iclaw-web",
    repository: "https://github.com/ai-graveyard/iclaw-web",
    born: "2026.03",
    buried: "2026.03",
    lane: "2",
    plot: "4",
    accent: "#b99cff",
    plant: "sprout",
    emblem: "heart",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "Public-interest AI site",
        epitaph: "AI belonged to everyone. The roadmap belonged to nobody.",
        autopsy:
          "A public-interest AI web project with noble energy and not enough product gravity to stay alive.",
        stack: ["TypeScript", "AI policy", "Web app"],
        signal: "0 stars",
      },
      zh: {
        status: "已开源",
        tagline: "公益 AI 网站",
        epitaph: "AI 属于所有人，路线图不属于任何人。",
        autopsy:
          "一个公共利益 AI 网站项目，志向很正，但产品引力不足，没能继续活下去。",
        stack: ["TypeScript", "AI 政策", "网页应用"],
        signal: "0 星标",
      },
    },
  },
  {
    id: "ai-plot",
    name: "ai-plot",
    repository: "https://github.com/ai-graveyard/ai-plot",
    born: "2025.12",
    buried: "2026.01",
    lane: "3",
    plot: "3",
    accent: "#ff7f61",
    plant: "chipflower",
    emblem: "branch",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "Branching story engine",
        epitaph: "The plot was generated. The market was not.",
        autopsy:
          "A story engine that branched into anything except a reason for strangers to return every week.",
        stack: ["TypeScript", "Story tooling", "Generative UI"],
        signal: "0 stars",
      },
      zh: {
        status: "已开源",
        tagline: "剧情生成引擎",
        epitaph: "剧情生成了，市场没有。",
        autopsy:
          "一个故事引擎，可以分叉出任何情节，唯独没长出让陌生人每周回来的理由。",
        stack: ["TypeScript", "故事工具", "生成式界面"],
        signal: "0 星标",
      },
    },
  },
  {
    id: "snap-stick",
    name: "snap-stick",
    repository: "https://github.com/ai-graveyard/snap-stick",
    born: "2026.07",
    buried: "2026.07",
    lane: "3",
    plot: "5",
    accent: "#33e0c0",
    plant: "chipflower",
    emblem: "camera",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "Sticker camera",
        epitaph: "Point, shoot, sticker. Nobody stuck around.",
        autopsy:
          "A Polaroid-style camera that turned any moment into a cartoon sticker on web and on-device, yet never turned a cute demo into a reason to keep shooting.",
        stack: ["Swift", "Next.js", "Sticker UX"],
        signal: "0 stars",
      },
      zh: {
        status: "已开源",
        tagline: "贴纸相机",
        epitaph: "对准、快门、贴纸，却没黏住一个用户。",
        autopsy:
          "一台拍立得风格的相机，把任意瞬间变成卡通贴纸，网页端和 iOS 端都能玩，却没能把一个可爱的 demo 变成让人一直拍下去的理由。",
        stack: ["Swift", "Next.js", "贴纸体验"],
        signal: "0 星标",
      },
    },
  },
  {
    id: "mbai",
    name: "mbai",
    repository: "https://github.com/ai-graveyard/mbai",
    born: "2026.04",
    buried: "2026.04",
    lane: "2",
    plot: "6",
    accent: "#5da9ff",
    plant: "mushroom",
    emblem: "quad",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "AI personality quiz",
        epitaph: "Sixteen personalities. Zero returning visitors.",
        autopsy:
          "A twelve-question AI-personality quiz that mapped everyone into a tidy four-letter type, then learned self-discovery isn't a habit people repeat.",
        stack: ["Next.js", "Framer Motion", "Personality Quiz"],
        signal: "0 stars",
      },
      zh: {
        status: "已开源",
        tagline: "AI 人格测试",
        epitaph: "十六种人格，零个回头客。",
        autopsy:
          "一份十二题的 AI 人格测试，把每个人都装进四个字母的整齐格子，最后发现自我认知这件事，大家并不想天天做。",
        stack: ["Next.js", "Framer Motion", "人格测试"],
        signal: "0 星标",
      },
    },
  },
  {
    id: "remove-ai-flavor",
    name: "remove-ai-flavor",
    repository: "https://github.com/ai-graveyard/remove-ai-flavor",
    born: "2025.10",
    buried: "2026.07",
    lane: "1",
    plot: "2",
    accent: "#f5b94a",
    plant: "sprout",
    emblem: "soap",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "AI-flavor scrubber",
        epitaph: "It scrubbed the AI flavor out of your writing. Nobody came back for a second wash.",
        autopsy:
          "A full-stack humanizer — auth, membership tiers, Stripe, an admin panel — all to make AI text sound less like AI. Turns out people run that wash once, not as a habit.",
        stack: ["Next.js", "FastAPI", "AI Humanizer"],
        signal: "0 stars",
      },
      zh: {
        status: "已开源",
        tagline: "去 AI 味工具",
        epitaph: "把别人文字里的 AI 味洗干净，却没洗来第二次的用户。",
        autopsy:
          "一整套全栈去味工具：登录、会员分级、Stripe 收款、管理后台样样齐全，只为把 AI 文本改得不像 AI。可惜这道工序大家只走一次，凑不成回头客。",
        stack: ["Next.js", "FastAPI", "去 AI 味"],
        signal: "0 星标",
      },
    },
  },
  {
    id: "ai-reset",
    name: "ai-reset",
    repository: "https://github.com/ai-graveyard/ai-reset",
    born: "2026.07",
    buried: "2026.07",
    lane: "3",
    plot: "1",
    accent: "#ff5c5c",
    plant: "sprout",
    emblem: "envelope",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "Quota reset tracker",
        epitaph: "It watched every quota reset. Nobody was watching back.",
        autopsy:
          "An email alert system that verified official quota-reset announcements for Codex and Claude Code and refused to fire on rumors, but couldn't compete with a habit of just checking X for good news.",
        stack: ["Next.js", "SQLite", "Resend"],
        signal: "0 stars",
      },
      zh: {
        status: "已开源",
        tagline: "配额重置提醒",
        epitaph: "它盯紧了每一次配额重置，却没人盯着它。",
        autopsy:
          "一套邮件提醒系统，专门核实 Codex 和 Claude Code 的官方配额重置公告，拒绝为谣言发信，却还是没能替代大家刷 X 等好消息的习惯。",
        stack: ["Next.js", "SQLite", "Resend"],
        signal: "0 星标",
      },
    },
  },
  {
    id: "we-match",
    name: "we-match",
    repository: "https://github.com/ai-graveyard/we-match",
    born: "2026.08",
    buried: "2026.08",
    lane: "3",
    plot: "2",
    accent: "#c2f24d",
    plant: "chipflower",
    emblem: "puzzle",
    copy: {
      en: {
        status: "Open sourced",
        tagline: "Needs-and-offers board",
        epitaph: "Ready to introduce everyone to everyone. Almost nobody walked in.",
        autopsy:
          "One card per person, a public square for “I need” and “I offer”, SMS login, a single-file SQLite box you can self-host, even an open API and an agent skill. Matching needs both sides of the market to show up; only the builder did.",
        stack: ["Next.js", "SQLite", "Matchmaking"],
        signal: "0 stars",
      },
      zh: {
        status: "已开源",
        tagline: "供需匹配广场",
        epitaph: "它准备好替所有人牵线，可进门的没几个。",
        autopsy:
          "每人一张名片，把「我需要 / 我提供」挂到公开广场，短信登录、单文件 SQLite、开放 API、Agent Skill 一样不缺。可匹配这件事要供需两头都有人，最后到场的只有作者自己。",
        stack: ["Next.js", "SQLite", "供需匹配"],
        signal: "0 星标",
      },
    },
  },
];

const copy: Record<Language, SiteCopy> = {
  en: {
    navAria: "Project links",
    controlsAria: "Display preferences",
    languageToggleAria: "Language",
    themeToggleAria: "Theme",
    gravesNav: "Graves",
    eyebrow: "Open-source remains",
    subtitle:
      "A pixel garden for AI products that missed product-market fit and came back as public code.",
    dossierAria: "Selected project",
    closeDossier: "Close dossier",
    currentGrave: "Current grave",
    burying: "Burying...",
    buried: "Buried",
    dataVinesActive: "Data vines active",
    buriedLocally: "Buried locally",
    born: "Born",
    buriedDate: "Buried",
    stackAria: "Technology stack",
    exhumeSource: "Exhume source",
    boardAria: "AI product cemetery",
    scoreboardAria: "Archive stats",
    noShame: "0 shame",
    night: "Night",
    day: "Day",
    bury: "Bury",
    gravesStat: (count) => `${count} graves`,
    standingStat: (count) => `${count} standing`,
    buriedStat: (count) => `${count} buried`,
    undoBurial: (name) => `Undo ${name}`,
    buryProject: (name) => `Bury ${name}`,
    selectProject: (name) => `Select ${name}`,
    projectIsBeingBuried: (name) => `${name} is being buried`,
    projectHasBeenBuried: (name) => `${name} has been buried`,
    yearDivider: (previousYear, year) =>
      `End of ${previousYear}, start of ${year}`,
  },
  zh: {
    navAria: "项目链接",
    controlsAria: "显示偏好",
    languageToggleAria: "语言",
    themeToggleAria: "主题",
    gravesNav: "墓地",
    eyebrow: "开源遗迹",
    subtitle: "一座像素花园，收留那些错过产品市场契合、又作为公开代码回来的 AI 产品。",
    dossierAria: "当前项目",
    closeDossier: "收起详情",
    currentGrave: "当前墓碑",
    burying: "埋葬中...",
    buried: "已埋葬",
    dataVinesActive: "数据藤蔓已启动",
    buriedLocally: "已在本地埋葬",
    born: "诞生",
    buriedDate: "入土",
    stackAria: "技术栈",
    exhumeSource: "挖出源码",
    boardAria: "AI 产品墓园",
    scoreboardAria: "归档统计",
    noShame: "0 羞耻",
    night: "夜晚",
    day: "白天",
    bury: "埋葬",
    gravesStat: (count) => `${count} 座墓`,
    standingStat: (count) => `${count} 座还站着`,
    buriedStat: (count) => `${count} 座已埋`,
    undoBurial: (name) => `撤销 ${name}`,
    buryProject: (name) => `埋葬 ${name}`,
    selectProject: (name) => `选择 ${name}`,
    projectIsBeingBuried: (name) => `${name} 正在被埋葬`,
    projectHasBeenBuried: (name) => `${name} 已被埋葬`,
    yearDivider: (previousYear, year) => `${previousYear} 年到此为止，下面是 ${year} 年`,
  },
};

/** Plot columns the board drops down to as the space for it shrinks. The widths
    are what the board itself gets, year sign column included. */
const boardColumnSteps = [
  { minWidth: 660, columns: 4 },
  { minWidth: 520, columns: 3 },
  { minWidth: 330, columns: 2 },
  { minWidth: 0, columns: 1 },
];

const widestBoard = boardColumnSteps[0].columns;

const columnsForBoardWidth = (width: number) =>
  boardColumnSteps.find((step) => width >= step.minWidth)?.columns ?? 1;
const graveCount = products.length;
const buryAnimationMs = 1450;
const productIds = new Set(products.map((product) => product.id));
const productOrder = new Map(products.map((product, index) => [product.id, index]));
const roamingZombies: RoamingZombie[] = [
  {
    id: "moss-crawler",
    x: 50,
    y: 58,
    scale: "1",
    zIndex: 11,
    variant: "zombieMoss",
  },
];
const zombieMoveIntervalsMs = [1000, 3000, 5000, 7000] as const;
const zombieMoveDistanceMultipliers = [1, 2, 3] as const;
const zombieMoveDirections: ZombieMoveDirection[] = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
];
const zombieStepX = 10;
const zombieStepY = 12;
const zombieChaseIntervalMs = 320;
const zombieChaseStepX = 5;
const zombieChaseStepY = 6;
const zombieBounds = {
  minX: 4,
  maxX: 90,
  minY: 18,
  maxY: 84,
};

const isLanguage = (value: string | null): value is Language =>
  value === "en" || value === "zh";

const isTheme = (value: string | null): value is Theme =>
  value === "night" || value === "day";

const getProductYear = (product: Product) => product.born.slice(0, 4);

/** Every year that owns at least one grave, oldest first. Derived from the data
    so a product from a new year gets its own section without any config. */
const graveyardYears = Array.from(new Set(products.map(getProductYear))).sort();

/** Sprigs cycled along a year boundary — flowers with grass tufts mixed in and a
    few pixels of vertical jitter, so the row reads as planting, not a dotted rule.
    `petal: null` is a tuft. */
const dividerSprigs: { petal: string | null; lift: string }[] = [
  { petal: "#ffd9ec", lift: "0px" },
  { petal: null, lift: "2px" },
  { petal: "#fff3b0", lift: "-3px" },
  { petal: null, lift: "-1px" },
  { petal: "#c9e7ff", lift: "2px" },
  { petal: "#ffc7c7", lift: "-2px" },
  { petal: null, lift: "1px" },
];

const compareProductsByBorn = (firstProduct: Product, secondProduct: Product) => {
  const bornOrder = firstProduct.born.localeCompare(secondProduct.born);

  if (bornOrder !== 0) {
    return bornOrder;
  }

  return (
    (productOrder.get(firstProduct.id) ?? 0) -
    (productOrder.get(secondProduct.id) ?? 0)
  );
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getNextZombieCoordinate = (current: number, target: number, step: number) => {
  if (Math.abs(target - current) <= step) {
    return target;
  }

  return current + Math.sign(target - current) * step;
};

const getRandomItem = <Item,>(items: readonly Item[]) =>
  items[Math.floor(Math.random() * items.length)];

const createInitialZombiePositions = (): ZombiePosition[] =>
  roamingZombies.map((zombie) => ({
    id: zombie.id,
    x: zombie.x,
    y: zombie.y,
    facing: 1,
  }));

const moveZombie = (
  position: ZombiePosition,
  direction: ZombieMoveDirection,
  distanceMultiplier: number,
): ZombiePosition => ({
  ...position,
  x: clamp(
    position.x + direction.x * zombieStepX * distanceMultiplier,
    zombieBounds.minX,
    zombieBounds.maxX,
  ),
  y: clamp(
    position.y + direction.y * zombieStepY * distanceMultiplier,
    zombieBounds.minY,
    zombieBounds.maxY,
  ),
  facing: direction.x === 0 ? position.facing : direction.x > 0 ? 1 : -1,
});

const moveZombieTowardTarget = (
  position: ZombiePosition,
  target: ZombieTarget,
): ZombiePosition => {
  const nextX = getNextZombieCoordinate(position.x, target.x, zombieChaseStepX);
  const nextY = getNextZombieCoordinate(position.y, target.y, zombieChaseStepY);
  const horizontalDelta = target.x - position.x;

  return {
    ...position,
    x: clamp(nextX, zombieBounds.minX, zombieBounds.maxX),
    y: clamp(nextY, zombieBounds.minY, zombieBounds.maxY),
    facing:
      horizontalDelta === 0 ? position.facing : horizontalDelta > 0 ? 1 : -1,
  };
};

const hasZombieReachedTarget = (
  position: ZombiePosition,
  target: ZombieTarget,
) => position.x === target.x && position.y === target.y;

// 16x18 pixel grid: O=outline S=stone L=stone highlight D=stone shadow E=engraving G=grass H=grass highlight
const pixelTombstoneRows = [
  "......OOOO......",
  ".....OSSSSO.....",
  "....OSSSSSSO....",
  "...OSSSSSSSSO...",
  "...OLSSSSSSDO...",
  "...OLSSSSSSDO...",
  "...OLSSESSSDO...",
  "...OLSSESSSDO...",
  "...OEEEEEEEEO...",
  "...OLSSESSSDO...",
  "...OLSSESSSDO...",
  "...OLSSSSSSDO...",
  "...OLSSSSSSDO...",
  "...ODDDDDDDDO...",
  "...OGGGGGGGGO...",
  "..OGGGGGGGGGGO..",
  ".OGGHGGGGGGHGGO.",
  "OGGGGGGGGGGGGGGO",
];

const pixelTombstoneColors: Record<string, string> = {
  O: "var(--ts-outline)",
  S: "var(--ts-stone)",
  L: "var(--ts-stone-light)",
  D: "var(--ts-stone-dark)",
  E: "var(--ts-engrave)",
  G: "var(--ts-grass)",
  H: "var(--ts-grass-light)",
};

function PixelTombstoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 18"
      role="img"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {pixelTombstoneRows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={pixelTombstoneColors[cell]} />
          ),
        ),
      )}
    </svg>
  );
}

// 12x12 pixel grids: O=outline A=accent B=accent light C=accent dark W=paper
const emblemArt: Record<Emblem, string[]> = {
  gradcap: [
    "............",
    ".....OO.....",
    "...OOAAOO...",
    ".OOAAAAAAOO.",
    "OAAAAAAAAAAO",
    ".OOAAAAAAOOO",
    "...OOAAOO.BO",
    "....OCCO..BO",
    "....OCCO.OBO",
    "....OCCO..O.",
    "....OOOO....",
    "............",
  ],
  idcard: [
    "............",
    "OOOOOOOOOOOO",
    "OWWWWWWWWWWO",
    "OWWAAWWWWWWO",
    "OWWAAWCCCCWO",
    "OWWWWWWWWWWO",
    "OWAAAAWCCWWO",
    "OWAAAAWWWWWO",
    "OWWWWWWWWWWO",
    "OOOOOOOOOOOO",
    "............",
    "............",
  ],
  palette: [
    "............",
    "...OOOOOO...",
    ".OOAAAAAAOO.",
    "OAABBAAWWAAO",
    "OAABBAAWWAAO",
    "OAAAAAAAAAAO",
    "OAACCAAOOAAO",
    "OAACCAAOOAAO",
    ".OOAAAAAAOO.",
    "...OOOOOO...",
    "............",
    "............",
  ],
  mic: [
    "............",
    "....OOOO....",
    "...OABBAO...",
    "...OABBAO...",
    "...OAAAAO...",
    "...OCCCCO...",
    "....OOOO....",
    ".....OO.....",
    ".....OO.....",
    "...OOOOOO...",
    "............",
    "............",
  ],
  heart: [
    "............",
    ".OOOO..OOOO.",
    "OBBAAOOAAAAO",
    "OBAAAAAAAAAO",
    "OAAAAAAAAAAO",
    ".OAAAAAAAAO.",
    "..OAAAAAAO..",
    "...OAAAAO...",
    "....OAAO....",
    ".....OO.....",
    "............",
    "............",
  ],
  branch: [
    "............",
    ".OOO....OOO.",
    ".OBO....OAO.",
    ".OOO....OOO.",
    "..O......O..",
    "...O....O...",
    "....O..O....",
    ".....OO.....",
    ".....OO.....",
    "....OCCO....",
    "....OOOO....",
    "............",
  ],
  camera: [
    "............",
    "..OOOO......",
    "OOOOOOOOOOOO",
    "OAAAAAAAAWAO",
    "OAAAOOOOAAAO",
    "OAAOWWBBOAAO",
    "OAAOBBCCOAAO",
    "OAAAOOOOAAAO",
    "OAAAAAAAAAAO",
    "OOOOOOOOOOOO",
    "............",
    "............",
  ],
  quad: [
    "............",
    "OOOOOOOOOOOO",
    "OAAAAOOBBBBO",
    "OAAAAOOBBBBO",
    "OAAAAOOBBBBO",
    "OOOOOOOOOOOO",
    "OWWWWOOCCCCO",
    "OWWWWOOCCCCO",
    "OWWWWOOCCCCO",
    "OOOOOOOOOOOO",
    "............",
    "............",
  ],
  soap: [
    "..OOO..OOO..",
    "..OWO..OWO..",
    "..OOO..OOO..",
    "............",
    ".OOOOOOOOOO.",
    "OBBAAAAAAAAO",
    "OAAAWWWWAAAO",
    "OAAAAAAAAAAO",
    "OCCCCCCCCCCO",
    ".OOOOOOOOOO.",
    "............",
    "............",
  ],
  envelope: [
    "............",
    "............",
    "OOOOOOOOOOOO",
    "OOAAAAAAAAOO",
    "OAOAAAAAAOAO",
    "OAAOAAAAOAAO",
    "OAAAOAAOAAAO",
    "OWWWWOOWWWWO",
    "OWWWWWWWWWWO",
    "OOOOOOOOOOOO",
    "............",
    "............",
  ],
  puzzle: [
    "............",
    "............",
    ".OOOOOOOOOO.",
    ".OBBBOAAAAO.",
    ".OBBBBOAAAO.",
    ".OBBBBBOAAO.",
    ".OBBBBOAAAO.",
    ".OBBBOAAAAO.",
    ".OOOOOOOOOO.",
    "............",
    "............",
    "............",
  ],
};

const emblemColors: Record<string, string> = {
  O: "#2d2130",
  A: "var(--accent)",
  B: "color-mix(in srgb, var(--accent), #ffffff 45%)",
  C: "color-mix(in srgb, var(--accent), #1f1626 40%)",
  W: "#fff6da",
};

function PixelEmblemIcon({
  emblem,
  className,
}: {
  emblem: Emblem;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      role="img"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {emblemArt[emblem].flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={emblemColors[cell]}
            />
          ),
        ),
      )}
    </svg>
  );
}

// 18x20 sheet ghost: O=outline W=cloth H=moonlit fold S=shaded fold E=eye socket
// The sheet flares as it falls; rows 14+ are the hem, which swaps between two frames.
const ghostBody = [
  ".......OOOO.......",
  ".....OOHWWWOO.....",
  "....OHWWWWWWSO....",
  "...OHWWWWWWWWSO...",
  "...OHWWWWWWWWSO...",
  "..OHWWWWWWWWWWSO..",
  "..OHWWWWWWWWWWSO..",
  "..OHWEEWWWWEEWSO..",
  "..OHWEEWWWWEEWSO..",
  "..OHWEEWWWWEEWSO..",
  "..OHWSSWWWWSSWSO..",
  ".OHWWWWWWWWWWWSSO.",
  ".OHWWWWWWWWWWWSSO.",
  ".OHWWWWWWWWWWWSSO.",
];

const ghostHemHangs = [
  "OHWWWWWWWWWWWWWWSO",
  "OHWWWWWWWWWWWWWWSO",
  "OHWWSOOWWWSOOWWWSO",
  "OHWSO..OHSO..OHWSO",
  ".OHSO..OHSO...OOO.",
  "..OO....OO........",
];

const ghostHemSways = [
  "OHWWWWWWWWWWWWWWSO",
  "OHWWWWWWWWWWWWWWSO",
  "OHWWSOWWWWSOWWWWSO",
  "OHWSO.OHWSO.OHWWSO",
  "OHSO...OHO...OHSO.",
  ".OO.....OO....OO..",
];

const ghostColors: Record<string, string> = {
  O: "#3d3663",
  W: "#e8f5ff",
  H: "#ffffff",
  S: "#aed0e6",
  E: "#241d3d",
};

// One <rect> per run of same-colored pixels instead of one per pixel.
function ghostRects(rows: string[], offsetY: number) {
  const rects: ReactElement[] = [];

  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    let x = 0;

    while (x < row.length) {
      const cell = row[x];

      if (cell === ".") {
        x += 1;
        continue;
      }

      let width = 1;
      while (row[x + width] === cell) {
        width += 1;
      }

      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y + offsetY}
          width={width}
          height={1}
          fill={ghostColors[cell]}
        />,
      );
      x += width;
    }
  }

  return rects;
}

function PixelGhost({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 20"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {ghostRects(ghostBody, 0)}
      <g className={styles.ghostHemHang}>
        {ghostRects(ghostHemHangs, ghostBody.length)}
      </g>
      <g className={styles.ghostHemSway}>
        {ghostRects(ghostHemSways, ghostBody.length)}
      </g>
    </svg>
  );
}

const parseBuriedIds = (value: string | null) => {
  if (!value) {
    return new Set<string>();
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return new Set<string>();
    }

    return new Set(
      parsedValue.filter(
        (id): id is string => typeof id === "string" && productIds.has(id),
      ),
    );
  } catch {
    return new Set<string>();
  }
};

export default function GraveyardExperience() {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("night");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [activeId, setActiveId] = useState(products[1].id);
  const [dossierDocked, setDossierDocked] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [consumingId, setConsumingId] = useState<string | null>(null);
  const [buriedIds, setBuriedIds] = useState<Set<string>>(() => new Set());
  const [lastBuriedId, setLastBuriedId] = useState<string | null>(null);
  const [zombiePositions, setZombiePositions] = useState<ZombiePosition[]>(
    createInitialZombiePositions,
  );
  const zombiePositionsRef = useRef<ZombiePosition[]>(zombiePositions);
  const dossierRef = useRef<HTMLElement | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const [boardColumns, setBoardColumns] = useState(widestBoard);
  const [zombieTarget, setZombieTarget] = useState<ZombieTarget | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedLanguage = window.localStorage.getItem(languageStorageKey);
      const storedTheme = window.localStorage.getItem(themeStorageKey);
      const storedBuriedIds = parseBuriedIds(
        window.localStorage.getItem(buriedStorageKey),
      );

      if (isLanguage(storedLanguage)) {
        setLanguage(storedLanguage);
      }

      if (isTheme(storedTheme)) {
        setTheme(storedTheme);
      }

      if (storedBuriedIds.size > 0) {
        setBuriedIds(storedBuriedIds);

        if (storedBuriedIds.has(products[1].id)) {
          const nextActiveProduct = products.find(
            (product) => !storedBuriedIds.has(product.id),
          );

          setActiveId(nextActiveProduct?.id ?? products[1].id);
        }
      }

      setPreferencesReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    window.localStorage.setItem(languageStorageKey, language);
  }, [language, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    window.localStorage.setItem(themeStorageKey, theme);
  }, [preferencesReady, theme]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    window.localStorage.setItem(
      buriedStorageKey,
      JSON.stringify(Array.from(buriedIds)),
    );
  }, [buriedIds, preferencesReady]);

  useEffect(() => {
    if (!consumingId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextBuriedIds = new Set(buriedIds);
      nextBuriedIds.add(consumingId);

      setBuriedIds(nextBuriedIds);
      setLastBuriedId(consumingId);
      setConsumingId(null);

      if (activeId === consumingId) {
        const nextActiveProduct = products.find(
          (product) => !nextBuriedIds.has(product.id),
        );

        setActiveId(nextActiveProduct?.id ?? consumingId);
      }
    }, buryAnimationMs);

    return () => window.clearTimeout(timer);
  }, [activeId, buriedIds, consumingId]);

  useEffect(() => {
    if (zombieTarget) {
      return;
    }

    const timeoutIds: number[] = [];

    const scheduleZombieMove = (zombieId: string) => {
      const timeoutId = window.setTimeout(() => {
        const direction = getRandomItem(zombieMoveDirections);
        const distanceMultiplier = getRandomItem(zombieMoveDistanceMultipliers);

        setZombiePositions((currentPositions) =>
          currentPositions.map((position) =>
            position.id === zombieId
              ? moveZombie(position, direction, distanceMultiplier)
              : position,
          ),
        );

        scheduleZombieMove(zombieId);
      }, getRandomItem(zombieMoveIntervalsMs));

      timeoutIds.push(timeoutId);
    };

    roamingZombies.forEach((zombie) => scheduleZombieMove(zombie.id));

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [zombieTarget]);

  useEffect(() => {
    zombiePositionsRef.current = zombiePositions;
  }, [zombiePositions]);

  useEffect(() => {
    if (!zombieTarget) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextPositions = zombiePositionsRef.current.map((position) =>
        moveZombieTowardTarget(position, zombieTarget),
      );

      zombiePositionsRef.current = nextPositions;
      setZombiePositions(nextPositions);

      if (
        nextPositions.every((position) =>
          hasZombieReachedTarget(position, zombieTarget),
        )
      ) {
        setZombieTarget(null);
      }
    }, zombieChaseIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [zombieTarget]);

  const activeProduct = useMemo(
    () => products.find((product) => product.id === activeId) ?? products[0],
    [activeId],
  );

  const zombiePositionsById = useMemo(
    () => new Map(zombiePositions.map((position) => [position.id, position])),
    [zombiePositions],
  );

  // Graves reflow into fewer plots per row as the board narrows, so the layout
  // follows the measured board rather than a viewport media query.
  useEffect(() => {
    const element = boardScrollRef.current;

    if (!element) {
      return;
    }

    const measure = () => {
      setBoardColumns(columnsForBoardWidth(element.clientWidth));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // The docked panel floats over the page, so the board needs to know how tall
  // it currently is to leave the last row somewhere to scroll to.
  useEffect(() => {
    const panel = dossierRef.current;

    if (!panel) {
      return;
    }

    const publishHeight = () => {
      document.documentElement.style.setProperty(
        "--dossier-height",
        `${panel.offsetHeight}px`,
      );
    };

    publishHeight();

    const observer = new ResizeObserver(publishHeight);
    observer.observe(panel);

    return () => observer.disconnect();
  }, [activeId]);

  const boardLayout = useMemo(
    () => {
      const occupiedPlots = new Map<string, Product>();
      const yearRows = new Map<
        string,
        { start: number; span: number; raised: boolean }
      >();
      const rows: { year: string; globalRow: number; raised: boolean }[] = [];
      /** One walkway row in front of every year section but the first. */
      const dividers: { year: string; previousYear: string; globalRow: number }[] =
        [];
      const rowSizes: string[] = [];
      let rowCursor = 0;

      graveyardYears.forEach((year, yearIndex) => {
        const raised = yearIndex > 0;

        if (yearIndex > 0) {
          rowCursor += 1;
          rowSizes.push("var(--year-divider-height)");
          dividers.push({
            year,
            previousYear: graveyardYears[yearIndex - 1],
            globalRow: rowCursor,
          });
        }

        const productsInYear = products
          .filter((product) => getProductYear(product) === year)
          .sort(compareProductsByBorn);

        const rowsInYear = Math.max(
          1,
          Math.ceil(productsInYear.length / boardColumns),
        );

        yearRows.set(year, { start: rowCursor + 1, span: rowsInYear, raised });

        for (let rowInYear = 0; rowInYear < rowsInYear; rowInYear += 1) {
          rowCursor += 1;
          rowSizes.push("var(--plot-row-height)");
          rows.push({ year, globalRow: rowCursor, raised });

          productsInYear
            .slice(rowInYear * boardColumns, (rowInYear + 1) * boardColumns)
            .forEach((product, plotIndex) => {
              occupiedPlots.set(`${rowCursor}-${plotIndex + 1}`, product);
            });
        }
      });

      return {
        occupiedPlots,
        yearRows,
        rows,
        dividers,
        totalRows: rowCursor,
        rowSizes: rowSizes.join(" "),
        plotRowCount: rows.length,
        dividerRowCount: dividers.length,
      };
    },
    [boardColumns],
  );

  const plots = useMemo(
    () => Array.from({ length: boardColumns }, (_, index) => String(index + 1)),
    [boardColumns],
  );

  const t = copy[language];
  const activeProductCopy = activeProduct.copy[language];
  const buriedCount = buriedIds.size;
  const standingCount = graveCount - buriedCount;
  const activeIsBuried = buriedIds.has(activeProduct.id);
  const activeIsConsuming = consumingId === activeProduct.id;
  const lastBuriedProduct = lastBuriedId
    ? products.find((product) => product.id === lastBuriedId)
    : null;
  const themeOptions: { value: Theme; label: string }[] = [
    { value: "night", label: t.night },
    { value: "day", label: t.day },
  ];

  // Below the sidebar breakpoint the dossier rises from the bottom edge and
  // covers the plot that was just clicked, so re-centre that plot inside the
  // strip of viewport the panel leaves behind.
  const keepPlotVisible = (plot?: HTMLElement | null) => {
    if (!plot || !window.matchMedia(dossierDockQuery).matches) {
      return;
    }

    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

    window.requestAnimationFrame(() => {
      const plotRect = plot.getBoundingClientRect();
      const dockHeight =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--dossier-height",
          ),
        ) || 0;
      const margin = Math.max(
        16,
        (window.innerHeight - dockHeight - plotRect.height) / 2,
      );

      window.scrollTo({
        top: window.scrollY + plotRect.top - margin,
        behavior,
      });
    });
  };

  const selectProduct = (product: Product, tombstone?: HTMLElement | null) => {
    setActiveId(product.id);
    setDossierDocked(true);
    keepPlotVisible(tombstone);
  };

  const buryProduct = (product: Product) => {
    if (consumingId || buriedIds.has(product.id)) {
      return;
    }

    setActiveId(product.id);
    setDossierDocked(true);
    setHoverId(null);
    setLastBuriedId(null);
    setConsumingId(product.id);
  };

  const restoreBuriedProduct = (productId: string, mound?: HTMLElement | null) => {
    setBuriedIds((currentBuriedIds) => {
      const nextBuriedIds = new Set(currentBuriedIds);
      nextBuriedIds.delete(productId);
      return nextBuriedIds;
    });
    setActiveId(productId);
    setDossierDocked(true);
    keepPlotVisible(mound);

    if (lastBuriedId === productId) {
      setLastBuriedId(null);
    }
  };

  const restoreLastBuried = () => {
    if (!lastBuriedId) {
      return;
    }

    restoreBuriedProduct(lastBuriedId);
  };

  const moveZombiesToClick = (event: MouseEvent<HTMLDivElement>) => {
    const boardRect = event.currentTarget.getBoundingClientRect();

    if (boardRect.width === 0 || boardRect.height === 0) {
      return;
    }

    setZombieTarget({
      x: clamp(
        ((event.clientX - boardRect.left) / boardRect.width) * 100,
        zombieBounds.minX,
        zombieBounds.maxX,
      ),
      y: clamp(
        ((event.clientY - boardRect.top) / boardRect.height) * 100,
        zombieBounds.minY,
        zombieBounds.maxY,
      ),
    });
  };

  return (
    <main
      className={styles.scene}
      data-preferences-ready={preferencesReady ? "true" : "false"}
      data-theme={theme}
    >
      <div className={styles.pixelNoise} aria-hidden="true" />
      <div className={styles.skyline} aria-hidden="true">
        <span className={styles.moon} />
        <span className={styles.sun} />
        <span className={`${styles.cloud} ${styles.cloudOne}`} />
        <span className={`${styles.cloud} ${styles.cloudTwo}`} />
        <span className={`${styles.cloud} ${styles.cloudThree}`} />
        <span className={styles.starOne} />
        <span className={styles.starTwo} />
        <span className={styles.starThree} />
        <span className={styles.starFour} />
        <span className={styles.starFive} />
      </div>

      <header className={styles.header}>
        <div className={styles.headerActions}>
          <nav className={styles.nav} aria-label={t.navAria}>
            <a href="https://github.com/ai-graveyard">GitHub</a>
          </nav>
          <div className={styles.controls} aria-label={t.controlsAria}>
            <div className={styles.segmentedControl} role="group" aria-label={t.languageToggleAria}>
              <button
                className={`${styles.segmentButton} ${
                  language === "en" ? styles.segmentButtonActive : ""
                }`}
                type="button"
                aria-pressed={language === "en"}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
              <button
                className={`${styles.segmentButton} ${
                  language === "zh" ? styles.segmentButtonActive : ""
                }`}
                type="button"
                aria-pressed={language === "zh"}
                onClick={() => setLanguage("zh")}
              >
                中
              </button>
            </div>
            <div className={styles.segmentedControl} role="group" aria-label={t.themeToggleAria}>
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.segmentButton} ${
                    theme === option.value ? styles.segmentButtonActive : ""
                  }`}
                  type="button"
                  aria-pressed={theme === option.value}
                  onClick={() => setTheme(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className={styles.stage} aria-labelledby="graveyard-title">
        <div className={styles.marquee}>
          <div className={styles.marqueeText}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="graveyard-title" className={styles.title}>
              AI Graveyard
            </h1>
            <p className={styles.subtitle}>{t.subtitle}</p>
          </div>
          <figure className={styles.memorial} aria-hidden="true">
            <span className={styles.memorialFrame}>
              <PixelTombstoneIcon className={`${styles.pixelTombstone} ${styles.memorialArt}`} />
            </span>
            <span className={styles.memorialLegs} />
            <span className={styles.memorialGround} />
          </figure>
        </div>
      </section>

      <section
        id="graveyard"
        className={styles.boardWrap}
        data-dossier-docked={dossierDocked ? "true" : "false"}
        aria-label={t.boardAria}
      >
        <aside
          key={activeProduct.id}
          ref={dossierRef}
          className={styles.dossier}
          data-docked={dossierDocked ? "true" : "false"}
          style={{ "--accent": activeProduct.accent } as CSSVars}
          aria-label={t.dossierAria}
        >
          <span className={styles.dossierVines} aria-hidden="true" />
          <span className={styles.dossierDust} aria-hidden="true" />
          <button
            className={styles.dossierClose}
            type="button"
            onClick={() => setDossierDocked(false)}
            aria-label={t.closeDossier}
          >
            <span aria-hidden="true" />
          </button>
          <div className={styles.dossierTopline}>
            <span>{t.currentGrave}</span>
            <span>
              {activeIsConsuming
                ? t.burying
                : activeIsBuried
                  ? t.buried
                  : activeProductCopy.signal}
            </span>
          </div>
          <h2 className={styles.dossierTitle}>
            <PixelEmblemIcon
              emblem={activeProduct.emblem}
              className={styles.dossierEmblem}
            />
            {activeProduct.name}
          </h2>
          <p className={styles.dossierTagline}>{activeProductCopy.tagline}</p>
          {(activeIsConsuming || activeIsBuried) && (
            <p
              className={`${styles.status} ${
                activeIsConsuming ? styles.statusConsuming : ""
              } ${activeIsBuried ? styles.statusBuried : ""}`}
            >
              {activeIsConsuming ? t.dataVinesActive : t.buriedLocally}
            </p>
          )}
          <p className={styles.epitaph}>{activeProductCopy.epitaph}</p>
          <p className={styles.autopsy}>{activeProductCopy.autopsy}</p>
          <dl className={styles.facts}>
            <div>
              <dt>{t.born}</dt>
              <dd>{activeProduct.born}</dd>
            </div>
            <div>
              <dt>{t.buriedDate}</dt>
              <dd>{activeProduct.buried}</dd>
            </div>
          </dl>
          <div className={styles.stack} aria-label={t.stackAria}>
            {activeProductCopy.stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className={styles.dossierActions}>
            <a
              className={styles.exhume}
              href={activeProduct.repository}
              target="_blank"
              rel="noreferrer"
            >
              {t.exhumeSource}
            </a>
            {!activeIsBuried && !activeIsConsuming ? (
              <button
                className={styles.dossierBuryButton}
                onClick={() => buryProduct(activeProduct)}
                aria-label={t.buryProject(activeProduct.name)}
              >
                {t.bury}
              </button>
            ) : activeIsConsuming ? (
              <span className={styles.dossierBuryBusy}>{t.burying}</span>
            ) : (
              <button
                className={styles.dossierBuryDone}
                type="button"
                onClick={() => restoreBuriedProduct(activeProduct.id)}
                aria-label={t.undoBurial(activeProduct.name)}
              >
                {t.buried}
              </button>
            )}
          </div>
        </aside>

        <div className={styles.scoreboard} aria-label={t.scoreboardAria} aria-live="polite">
          <span>{t.gravesStat(graveCount)}</span>
          <span>{t.standingStat(standingCount)}</span>
          <span>{t.buriedStat(buriedCount)}</span>
          {lastBuriedProduct ? (
            <button className={styles.undoBurial} onClick={restoreLastBuried}>
              {t.undoBurial(lastBuriedProduct.name)}
            </button>
          ) : null}
        </div>

        <div className={styles.boardScroll} ref={boardScrollRef}>
          <div
            className={styles.board}
            data-columns={String(boardColumns)}
            onClick={moveZombiesToClick}
            style={
              {
                "--board-row-sizes": boardLayout.rowSizes,
                "--board-plot-rows": String(boardLayout.plotRowCount),
                "--board-divider-rows": String(boardLayout.dividerRowCount),
              } as CSSVars
            }
          >
            <div className={styles.fence} aria-hidden="true" />
            <div className={styles.zombieLayer} aria-hidden="true">
              {roamingZombies.map((zombie) => {
                const zombiePosition = zombiePositionsById.get(zombie.id);

                return (
                  <span
                    key={zombie.id}
                    className={`${styles.zombieWalker} ${styles[zombie.variant]}`}
                    style={
                      {
                        "--zombie-left": `${zombiePosition?.x ?? zombie.x}%`,
                        "--zombie-top": `${zombiePosition?.y ?? zombie.y}%`,
                        "--zombie-scale": zombie.scale,
                        "--zombie-facing": String(zombiePosition?.facing ?? 1),
                        zIndex: zombie.zIndex,
                      } as CSSVars
                    }
                  >
                    <span className={styles.zombieShadow} />
                    <span className={styles.zombieSprite}>
                      <span className={styles.zombieHead}>
                        <span className={styles.zombieEye} />
                        <span className={styles.zombieEye} />
                      </span>
                      <span className={styles.zombieTorso} />
                      <span className={styles.zombieArm} />
                      <span className={styles.zombieArm} />
                      <span className={styles.zombieLeg} />
                      <span className={styles.zombieLeg} />
                    </span>
                  </span>
                );
              })}
            </div>
            {boardLayout.dividers.map(({ year, previousYear, globalRow }) => (
              <div
                key={`divider-${year}`}
                className={styles.yearDivider}
                style={{ "--year-row": String(globalRow) } as CSSVars}
                role="separator"
                aria-label={t.yearDivider(previousYear, year)}
              >
                <span className={styles.yearDividerFlowers} aria-hidden="true">
                  {Array.from(
                    { length: boardColumns * 6 + 4 },
                    (_, sprigIndex) => {
                      const sprig =
                        dividerSprigs[sprigIndex % dividerSprigs.length];

                      return sprig.petal ? (
                        <span
                          key={sprigIndex}
                          className={styles.yearDividerFlower}
                          style={
                            {
                              "--petal": sprig.petal,
                              "--sprig-lift": sprig.lift,
                            } as CSSVars
                          }
                        />
                      ) : (
                        <span
                          key={sprigIndex}
                          className={styles.yearDividerBlade}
                          style={{ "--sprig-lift": sprig.lift } as CSSVars}
                        />
                      );
                    },
                  )}
                </span>
              </div>
            ))}
            {graveyardYears.map((year) => {
              const rowInfo = boardLayout.yearRows.get(year);

              if (!rowInfo) {
                return null;
              }

              const isRaisedYear = rowInfo.raised;

              return (
                <div
                  key={year}
                  className={`${styles.yearSign} ${isRaisedYear ? styles.raisedYearRow : ""}`}
                  style={
                    {
                      "--year-row":
                        rowInfo.span > 1
                          ? `${rowInfo.start} / span ${rowInfo.span}`
                          : String(rowInfo.start),
                      zIndex: isRaisedYear ? 8 : 6,
                    } as CSSVars
                  }
                  aria-hidden="true"
                >
                  <span className={styles.yearSignBoard}>{year}</span>
                  <span className={styles.yearSignPost} />
                </div>
              );
            })}
            {boardLayout.rows.map(({ globalRow, raised: isRaisedYear }) =>
              plots.map((plot) => {
                const product = boardLayout.occupiedPlots.get(`${globalRow}-${plot}`);
                const yearRow = String(globalRow);
                const isBuried = product ? buriedIds.has(product.id) : false;
                const isActive = product ? activeId === product.id : false;
                const isConsuming = product ? consumingId === product.id : false;
                const isHovered = product ? hoverId === product.id : false;
                const productCopy = product?.copy[language];

                return (
                  <div
                    key={`${globalRow}-${plot}`}
                    className={`${styles.plot} ${isRaisedYear ? styles.raisedYearRow : ""}`}
                    style={
                      {
                        "--year-row": yearRow,
                        "--plot-column": String(Number(plot) + 1),
                        zIndex: isRaisedYear ? 6 : 4,
                      } as CSSVars
                    }
                  >
                    <span className={styles.grassPixels} aria-hidden="true" />
                    {product && productCopy && !isBuried ? (
                      <>
                        <button
                          className={`${styles.tombstone} ${
                            isActive && !isConsuming ? styles.activeTombstone : ""
                          } ${isHovered ? styles.hoverTombstone : ""} ${
                            isConsuming ? styles.consumingTombstone : ""
                          }`}
                          onClick={(event) =>
                            selectProduct(product, event.currentTarget)
                          }
                          onMouseEnter={() => setHoverId(product.id)}
                          onMouseLeave={() => setHoverId(null)}
                          onFocus={() => setHoverId(product.id)}
                          onBlur={() => setHoverId(null)}
                          style={{ "--accent": product.accent } as CSSVars}
                          aria-label={
                            isConsuming
                              ? t.projectIsBeingBuried(product.name)
                              : t.selectProject(product.name)
                          }
                          aria-pressed={isActive}
                          disabled={isConsuming}
                        >
                          <PixelGhost className={styles.ghost} />
                          <span
                            className={`${styles.plant} ${styles[product.plant]}`}
                            aria-hidden="true"
                          />
                          <span className={styles.vineMaw} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                          <span className={styles.bitePixels} aria-hidden="true" />
                          <span className={styles.tombCap} aria-hidden="true" />
                          <PixelEmblemIcon
                            emblem={product.emblem}
                            className={styles.tombEmblem}
                          />
                          <span className={styles.tombTagline}>
                            {productCopy.tagline}
                          </span>
                          <span className={styles.tombName}>{product.name}</span>
                          <span className={styles.tombDates}>
                            {product.born} - {product.buried}
                          </span>
                        </button>
                        <button
                          className={`${styles.buryButton} ${isActive ? styles.buryButtonVisible : ""}`}
                          onClick={() => buryProduct(product)}
                          aria-label={t.buryProject(product.name)}
                          disabled={isConsuming}
                          tabIndex={isConsuming ? -1 : 0}
                        >
                          {t.bury}
                        </button>
                      </>
                    ) : product && isBuried ? (
                      <button
                        className={`${styles.buriedMarker} ${
                          isHovered ? styles.buriedMarkerHover : ""
                        }`}
                        type="button"
                        onClick={(event) =>
                          restoreBuriedProduct(product.id, event.currentTarget)
                        }
                        onMouseEnter={() => setHoverId(product.id)}
                        onMouseLeave={() => setHoverId(null)}
                        onFocus={() => setHoverId(product.id)}
                        onBlur={() => setHoverId(null)}
                        aria-label={t.undoBurial(product.name)}
                      >
                        <span className={styles.ashMound} aria-hidden="true" />
                        <span className={styles.buriedLabel} aria-hidden="true">
                          {t.buried}
                        </span>
                      </button>
                    ) : (
                      <span className={styles.emptyPlot} aria-hidden="true" />
                    )}
                  </div>
                );
              }),
            )}
            <div className={styles.path} aria-hidden="true" />
          </div>
        </div>
      </section>
    </main>
  );
}
