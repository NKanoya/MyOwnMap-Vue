# Changelog

[![npm version](https://img.shields.io/npm/v/@nkanoya/my-own-map-vue)](https://www.npmjs.com/package/@nkanoya/my-own-map-vue)
[![license](https://img.shields.io/npm/l/@nkanoya/my-own-map-vue)](./LICENSE)
[![downloads](https://img.shields.io/npm/dm/@nkanoya/my-own-map-vue)](https://www.npmjs.com/package/@nkanoya/my-own-map-vue)

## v0.1.12 (正式)

- 新增 `debug` prop：左键复制 `x: %d, y: %d`，右键复制 `x: %d, y: %d, visible: %.2f`（均复制到剪贴板）。
- `visible` 语义调整：`<= 0` / 不填 = 始终可见，`> 0` = 缩放 ≥ 该值时显示。
- 新增规则：`x` 或 `y` 未填的标注默认隐藏（`0` 是合法坐标值，不受影响）。
- 标注现在在锚点处水平 + 垂直双向居中；有图标时图标对齐锚点、文字在下方。
- 图标支持圆角背景框（`iconBg` + `iconColor`）。
- 多行文字 `\n` 每行各自居中，整体块垂直居中于锚点。

## v0.1.11 (正式)

- **Breaking:** 用数字 `visible` 字段替代 `level` + `levelThresholds`。
  - `visible: 0` / 不填 → 永远可见
  - `visible: <0` → 永远不可见
  - `visible: >0` → 缩放倍率 ≥ 该值时显示
- 标注现在在锚点处水平 + 垂直双向居中。

## v0.1.10 (beta)

- 图标: 新增圆角底兜（可配 `iconBg` 背景色 + `iconColor` 图标色）。
- 多行文字 `\n` 每行各自居中。

## v0.1.9 (beta)

- 新增 `icons` prop — 图标解析器 `(desc) => Component | { component, props }`，可接 Lucide / Heroicons 等任意图标库而无需打包进来。
- 标注新增可选 `icon` 字段（图片 URL / `{lucide:'…'}` / 字符串描述符）。

## v0.1.8 (beta)

- 多行文字支持（`\n`）。

## v0.1.7 (beta)

- 样式组新增 `fontWeight`、`stroke`、`textShadow` 覆写。

---

## v0.1.6 (alpha)

- 新增 `initialScale`、`initialCenter`、`boundaryMargin`：控制初始视口并约束平移 / 缩放，防止过度操作。
- home 钮恢复初始视口。

## v0.1.5 (alpha)

- 层级索引重做：层级直接等于数组下标。

## v0.1.4 (alpha)

- 新增 `initialScale` + `initialCenter` 初始视口 props。
- 文档清理（删除所有 PrimeVue / primeicons 引用，包名改为 `@nkanoya`，组件名改为 `MyOwnMap`）。

## v0.1.3 (alpha)

- 修复消费者丢样式 bug：组件样式通过 JS 自动注入。
- 彻底移除双许可 PrimeUI 运行时警告。

## v0.1.2 (alpha)

- 样式从 `<style scoped>` 抽到独立的 `src/styles.css`，由库入口 import — 完全自包含。

## v0.1.1 (alpha)

- 包名改为 `@nkanoya/my-own-map-vue` 重新发布。

## v0.1.0 (alpha)

- 初始版本。图片底图、平移 / 缩放、像素坐标系、标注、按层级显影控制。
