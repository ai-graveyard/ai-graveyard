# AI Graveyard

像素风单页网站，纪念那些错过 PMF、最终选择开源的 AI 产品。逛墓园、翻档案、把项目埋葬或复活。

线上地址：<https://ai-graveyard.v2ai.org>

## 技术栈

Next.js 16（App Router）· React 19 · TypeScript 5 · Tailwind CSS v4 · CSS Modules · pnpm

## 本地开发

```bash
pnpm install
```

```bash
pnpm dev
```

打开 <http://localhost:3000>。

## 构建

```bash
pnpm build
```

`next.config.ts` 里配了 `output: "export"`，构建产物是纯静态文件，全部落在 `out/`。

因为没有服务端运行时，`pnpm start`（`next start`）在本项目里跑不起来。要预览构建产物，用任意静态服务器：

```bash
pnpm dlx serve out
```

## 部署

托管在 GitHub Pages，推送到 `main` 即自动发布，不需要任何 secret。

- `.github/workflows/nextjs.yml`：在 runner 上 `pnpm build`，把 `out/` 作为 Pages artifact 上传并部署。
- `.github/workflows/ci.yml`：push 和 PR 上跑 `tsc --noEmit`、`pnpm lint`、`pnpm build`。

两个前提，缺一不可：

- 仓库 Settings → Pages 的 Source 必须是 **GitHub Actions**，否则部署 job 直接失败。
- 自定义域名写在 `public/CNAME` 里，静态导出会把它拷进 `out/CNAME`。删掉它，站点会退回 `github.io` 子路径，所有资源 URL 都会失效。

站点地址默认 `https://ai-graveyard.v2ai.org`，可用 `NEXT_PUBLIC_SITE_URL` 覆盖。

## 添加一座墓碑

所有产品数据硬编码在 [`app/graveyard-experience.tsx`](app/graveyard-experience.tsx) 的 `products` 数组里，字段含义和注意事项见 [AGENTS.md](AGENTS.md)。

## 其他文档

- [AGENTS.md](AGENTS.md) — 给 AI 编码助手看的项目约定
- [PRD.md](PRD.md) — 产品需求

## License

MIT，见 [LICENSE](LICENSE)。
