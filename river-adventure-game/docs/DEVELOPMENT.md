# 开发与验证

这是独立可运行的源码快照。运行时保持原生 HTML、CSS、JavaScript、WebGL 和 Web Audio。页面入口使用普通脚本按顺序加载，不需要前端打包。

| 文件 | 职责 |
| --- | --- |
| [index.html](../index.html)、CSS | 游戏页面、HUD、指南、设置、暂停与结算；入口的样式顺序决定覆盖关系 |
| [model.js](../model.js) | 固定步长物理、输入动作、扫掠碰撞、奖励、搭子和荣誉 |
| [four-stage.js](../four-stage.js) | 扩展基础模型：四关配置、确定性路线、关卡切换、无尽模式 |
| [game.js](../game.js) | 动画帧调度、事件分发、输入、教学、暂停及结算状态 |
| [renderer.js](../renderer.js)、[ending.js](../ending.js) | WebGL 场景、模型、水体、镜头与过场 |
| [platform.js](../platform.js)、[audio.js](../audio.js) | 存档、设置、宿主能力和本地合成音效 |
| [ranking.js](../ranking.js)、[leaderboard.js](../leaderboard.js) | 平台榜单适配、读取和展示 |
| [boats.js](../boats.js)、[follow-skin.js](../follow-skin.js) | 船只预览、选择和平台关注福利 |
| [assets/](../assets/) | 图片与图标；指南、徽章和船只预览有动态引用，移动前须核对调用处 |
| [tests/](../tests/)、[scripts/lib/](../scripts/lib/) | Node 回归与 UI 替身，无需浏览器或父目录项目 |

## 变更约定

- 读玩法逻辑时先看 `model.js`，再看 `four-stage.js` 对其原型的扩展。保持 `model.js → four-stage.js → game.js` 的相对加载顺序。
- 把玩法规则留在模型层。渲染和过场读取状态，不推进正式计时或奖励。路线调整使用相同种子复现，避免视觉随机数影响玩法路线。
- 暂停、切后台、教学停顿和取消触摸时检查计时与输入状态。存档改动兼顾旧字段、读写失败和重试。
- 普通模式和无尽共享基础物理，但结束和奖励条件不同；练习不写正式成绩。改玩法时同步更新提示、指南、教学和结算。
- 运行代码保持 ES2017 语法目标；资源保存在项目内。继续适配小红书容器时需按当前平台规范独立验证，见[运行环境与存档](PLATFORM.md)。

## 如何验证

1. 用 Node.js 22 从项目目录运行 `node --test tests/*.test.mjs`。用例涵盖四关和无尽、路线可达、碰撞与跳跃、教学、榜单降级和 UI 状态等。UI 用例的 DOM、存档和渲染使用替身。
2. 按 [README](../README.md) 启动 HTTP 服务。至少检查首页、开漂、触控换道、暂停和设置；有 UI 改动时检查 390×844、320×568，以及短屏弹框、焦点和安全区。
3. 有 3D 改动时分别检查默认画质、流畅画质和减少动态。浏览器模拟视口与软件 WebGL 可用于复现，但不能验证真实设备帧率或小红书容器行为。

截图来自本源码快照的本地 Chrome 预览，可在 [screenshots/](screenshots/) 查看。历史安装包、试验录屏、绑定旧报告的发布脚本和旧版美术未随源码复制。
