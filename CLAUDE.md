# Your Sweetheart — H5 Horror Game

## 项目概述
基于 PixiJS v7.4.2 的病娇恐怖小游戏，玩家必须始终注视 NPC 少女，离开视野超过 6 秒即游戏结束。

## 部署
- **GitHub Pages**: `https://freedark0.github.io/YourSweetheart/`
- **部署方式**: 推送到 `origin/master` 后 GitHub Pages 自动从分支根目录部署
- **源分支**: `master`

## 每次修改后的同步要求
- **每次代码修改完成后，必须立即 commit 并 push 到 `origin/master`**，确保 GitHub Pages 展示的是最新版本。
- 不允许在本地累积多个未推送的 commit，除非用户明确要求暂不推送。
- 推送后提醒用户 Pages 可能需要 1-2 分钟完成部署。

## 技术栈
- PixiJS v7.4.2（CDN 引入，无构建工具）
- 原生 ES Module（`type="module"`）
- 纯黑全屏，鼠标/触控控制视野

## 关键文件结构
```
index.html       — 入口，CDN 加载 PixiJS + main.js
css/style.css    — 全屏纯黑样式
js/main.js       — 创建 PIXI.Application，预加载纹理，启动 Game
js/Game.js       — 主游戏循环，协调所有子系统
js/ai/           — NPC AI（RandomAI 为病娇行为模式）
js/entities/     — NPC、Ghost、Item、Tombstone 实体
js/effects/      — 心形粒子、地上文字、惊吓画面
assets/          — NPC 精灵图素材（idle + 四方向 3 帧动画）
```

## NPC 精灵素材约定
| 文件 | 用途 | 尺寸 |
|------|------|------|
| `girl_idle.png` | 静止待机（单帧） | 572×619 |
| `girl_move_down.png` | 向下移动（3帧水平排列） | 1721×619 |
| `girl_move_right.png` | 向右移动（3帧水平排列） | 1721×619 |
| `girl_move_up.png` | 向上移动（3帧水平排列） | 1721×619 |

- 向左移动通过水平翻转 `girl_move_right.png` 实现
- 帧动画速率：6 FPS
- 精灵显示高度：96px（等比缩放）
