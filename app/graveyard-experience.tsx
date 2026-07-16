"use client";

import type { CSSProperties, MouseEvent } from "react";
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
};

type CSSVars = CSSProperties & Record<`--${string}`, string>;

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
  },
};

const graveyardYears = ["2025", "2026"];
const plots = ["1", "2", "3", "4", "5", "6"];
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
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [consumingId, setConsumingId] = useState<string | null>(null);
  const [buriedIds, setBuriedIds] = useState<Set<string>>(() => new Set());
  const [lastBuriedId, setLastBuriedId] = useState<string | null>(null);
  const [zombiePositions, setZombiePositions] = useState<ZombiePosition[]>(
    createInitialZombiePositions,
  );
  const zombiePositionsRef = useRef<ZombiePosition[]>(zombiePositions);
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

  const previewProduct = useMemo(
    () =>
      products.find((product) => product.id === hoverId) ?? activeProduct,
    [activeProduct, hoverId],
  );

  const zombiePositionsById = useMemo(
    () => new Map(zombiePositions.map((position) => [position.id, position])),
    [zombiePositions],
  );

  const occupiedPlots = useMemo(
    () => {
      const plotsByYear = new Map<string, Product>();

      for (const year of graveyardYears) {
        const productsInYear = products
          .filter((product) => getProductYear(product) === year)
          .sort(compareProductsByBorn);

        productsInYear.slice(0, plots.length).forEach((product, plotIndex) => {
          plotsByYear.set(`${year}-${plots[plotIndex]}`, product);
        });
      }

      return plotsByYear;
    },
    [],
  );

  const t = copy[language];
  const previewProductCopy = previewProduct.copy[language];
  const buriedCount = buriedIds.size;
  const standingCount = graveCount - buriedCount;
  const previewIsBuried = buriedIds.has(previewProduct.id);
  const previewIsConsuming = consumingId === previewProduct.id;
  const lastBuriedProduct = lastBuriedId
    ? products.find((product) => product.id === lastBuriedId)
    : null;
  const themeOptions: { value: Theme; label: string }[] = [
    { value: "night", label: t.night },
    { value: "day", label: t.day },
  ];

  const buryProduct = (product: Product) => {
    if (consumingId || buriedIds.has(product.id)) {
      return;
    }

    setActiveId(product.id);
    setHoverId(null);
    setLastBuriedId(null);
    setConsumingId(product.id);
  };

  const restoreBuriedProduct = (productId: string) => {
    setBuriedIds((currentBuriedIds) => {
      const nextBuriedIds = new Set(currentBuriedIds);
      nextBuriedIds.delete(productId);
      return nextBuriedIds;
    });
    setActiveId(productId);

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
        <a className={styles.brand} href="https://github.com/ai-graveyard">
          <img className={styles.logo} src="/logo.png" alt="" width={200} height={200} />
          AI Graveyard
        </a>
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
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1 id="graveyard-title" className={styles.title}>
            AI Graveyard
          </h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
          <figure className={styles.memorial} aria-hidden="true">
            <span className={styles.memorialFrame}>
              <img
                className={styles.memorialArt}
                src="/logo.png"
                alt=""
                width={200}
                height={200}
              />
            </span>
            <span className={styles.memorialLegs} />
            <span className={styles.memorialGround} />
          </figure>
        </div>

        <aside
          key={activeProduct.id}
          className={styles.dossier}
          style={{ "--accent": previewProduct.accent } as CSSVars}
          aria-label={t.dossierAria}
        >
          <span className={styles.dossierVines} aria-hidden="true" />
          <span className={styles.dossierDust} aria-hidden="true" />
          <div className={styles.dossierTopline}>
            <span>{t.currentGrave}</span>
            <span>
              {previewIsConsuming
                ? t.burying
                : previewIsBuried
                  ? t.buried
                  : previewProductCopy.signal}
            </span>
          </div>
          <h2>{previewProduct.name}</h2>
          <p className={styles.dossierTagline}>{previewProductCopy.tagline}</p>
          {(previewIsConsuming || previewIsBuried) && (
            <p
              className={`${styles.status} ${
                previewIsConsuming ? styles.statusConsuming : ""
              } ${previewIsBuried ? styles.statusBuried : ""}`}
            >
              {previewIsConsuming ? t.dataVinesActive : t.buriedLocally}
            </p>
          )}
          <p className={styles.epitaph}>{previewProductCopy.epitaph}</p>
          <p className={styles.autopsy}>{previewProductCopy.autopsy}</p>
          <dl className={styles.facts}>
            <div>
              <dt>{t.born}</dt>
              <dd>{previewProduct.born}</dd>
            </div>
            <div>
              <dt>{t.buriedDate}</dt>
              <dd>{previewProduct.buried}</dd>
            </div>
          </dl>
          <div className={styles.stack} aria-label={t.stackAria}>
            {previewProductCopy.stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className={styles.dossierActions}>
            <a
              className={styles.exhume}
              href={previewProduct.repository}
              target="_blank"
              rel="noreferrer"
            >
              {t.exhumeSource}
            </a>
            {!previewIsBuried && !previewIsConsuming ? (
              <button
                className={styles.dossierBuryButton}
                onClick={() => buryProduct(previewProduct)}
                aria-label={t.buryProject(previewProduct.name)}
              >
                {t.bury}
              </button>
            ) : previewIsConsuming ? (
              <span className={styles.dossierBuryBusy}>{t.burying}</span>
            ) : (
              <button
                className={styles.dossierBuryDone}
                type="button"
                onClick={() => restoreBuriedProduct(previewProduct.id)}
                aria-label={t.undoBurial(previewProduct.name)}
              >
                {t.buried}
              </button>
            )}
          </div>
        </aside>
      </section>

      <section id="graveyard" className={styles.boardWrap} aria-label={t.boardAria}>
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

        <div className={styles.boardScroll}>
          <div className={styles.board} onClick={moveZombiesToClick}>
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
            {graveyardYears.map((year, yearIndex) => {
              const isRaisedYear = year === "2026";

              return (
                <div
                  key={year}
                  className={`${styles.yearSign} ${isRaisedYear ? styles.raisedYearRow : ""}`}
                  style={
                    {
                      "--year-row": String(yearIndex + 1),
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
            {graveyardYears.map((year, yearIndex) =>
              plots.map((plot) => {
                const product = occupiedPlots.get(`${year}-${plot}`);
                const yearRow = String(yearIndex + 1);
                const isRaisedYear = year === "2026";
                const isBuried = product ? buriedIds.has(product.id) : false;
                const isActive = product ? activeId === product.id : false;
                const isConsuming = product ? consumingId === product.id : false;
                const isHovered = product ? hoverId === product.id : false;
                const productCopy = product?.copy[language];

                return (
                  <div
                    key={`${year}-${plot}`}
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
                          onClick={() => setActiveId(product.id)}
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
                          <span className={styles.ghost} aria-hidden="true">
                            <span className={styles.ghostEye} />
                            <span className={styles.ghostEye} />
                          </span>
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
                          <span className={styles.tombName}>{product.name}</span>
                          <span className={styles.tombDates}>
                            {product.born} - {product.buried}
                          </span>
                          <span className={styles.tombTagline}>
                            {productCopy.tagline}
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
                        onClick={() => restoreBuriedProduct(product.id)}
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
