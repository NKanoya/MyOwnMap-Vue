# @nkanoya/my-own-map-vue

[English](./README.md) · 中文

一个为 **Vue 3** 定制的自研图片地图组件。把任意图片当作底图，
进行平移、缩放，并用一套**真正的像素坐标系**来标注 —— 效果类似你平时调用
专业地图库得到的东西，但**图是你自己的**，无需瓦片、无需联网、无需 API key。

> 这是一个**开发者工具**：开发者负责传入底图、原点、标注；最终用户拿到的
> 直接就是一张可用的交互式地图。

---

## 特性

- **任意图片作底图** —— `imageSrc` 支持 PNG / JPG / SVG / WebP。
- **自定义像素坐标系** —— 指定图像素作为用户坐标 `(0,0)`；+x 向右、+y 向下，
  所有位置都用这套单位描述。
- **平移与缩放** —— 拖拽平移、滚轮缩放（锚定在光标处），外加屏幕上的
  放大 / 缩小 / 复位按钮。
- **清晰的标注文字** —— 原生 HTML 元素按屏幕空间定位，任意缩放下文字保持
  锐利、且不随图片一起缩放。
- **按层级分档显示** —— 一级标注始终显示；二级、三级等要在放大到开发者设定
  的阈值后才出现。
- **可选的实时坐标读数** —— 实时显示光标的用户坐标，可关闭。
- **锐利像素底图** —— 默认以像素化（最近邻）渲染底图，放大后仍清晰锐利，可切换。
- 黑白紧凑的 UI、体积小巧。

---

## 安装

```sh
npm install @nkanoya/my-own-map-vue
```

本组件**除 Vue 本身外零依赖**：控件是纯 HTML 按钮、样式内置在包里。宿主工程不需要任何额外配置，只需要
Vue >= 3.5。

---

## 快速开始

```js
// main.js —— 全局注册（可选）
import { install as installMap } from "@nkanoya/my-own-map-vue"

app.use(installMap)
```

```vue
<!-- 任意页面 —— 也可以直接 import 组件 -->
<script setup>
import { MyOwnMap } from "@nkanoya/my-own-map-vue"

const imageSrc = '/maps/my-map.png'

// 设图像素 (1200, 900) 为你口中的 (0,0)
const origin = { x: 1200, y: 900 }

const annotations = [
  { id: 1, x: -500, y: -300, text: 'A 栋',     level: -1 },
  { id: 2, x:  200, y: -150, text: 'B 栋',     level:  0 },
  { id: 3, x: -120, y:   60, text: '前台',     level:  1 },
  { id: 4, x:   80, y:  100, text: '消防通道', level: -1 },
]
</script>

<template>
  <MyOwnMap
    :imageSrc="imageSrc"
    :origin="origin"
    :annotations="annotations"
    width="100%"
    height="640px"
  />
</template>
```

挂载时若设了 `initialScale` + `initialCenter` 则按该初始视口定位，否则图片自动适配容器。标注立即出现。拖拽平移、滚轮缩放，home 钮恢复初始视口。平移与缩放受 `boundaryMargin` 约束——地图不能被拖到距容器边超过该边距，也不能缩到比适配容器更小。

---

## 坐标系

三层空间，依次换算：

```
用户坐标 ──[ 按原点平移 ]──▶ 图像像素 ──[ *缩放倍率 + 偏移 ]──▶ 屏幕像素
```

- **图像像素** —— 位图自身像素，原点在左上角，+x 向右、+y 向下。
- **用户坐标** —— 开发者定义。图像上的像素 `origin` 成为 `(0,0)`；
  +x 向右、+y 向下（朝向一致，只是原点偏移了）。
- **屏幕像素** —— 组件内部的实际屏幕坐标。

用户坐标里的 `{ x: 100, y: 50 }` 表示"从原点起往右 100 像素、往下 50 像素"
—— 对应底图上的一个具体位置。

---

## Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `imageSrc` | `String` | *(必填)* | 底图图片地址。 |
| `imageAlt` | `String` | `'map'` | 图片的替代文本。 |
| `width` | `String` | `'100%'` | 任意 CSS 长度 —— 组件宽度。 |
| `height` | `String` | `'600px'` | 任意 CSS 长度 —— 组件高度。 |
| `origin` | `{ x, y }` | `{ x: 0, y: 0 }` | 映射为用户 `(0,0)` 的图像像素。 |
| `annotations` | `Array` | `[]` | 见 [annotations](#annotations)。 |
| `labelFontSize` | `Number` | `14` | 标注字号（px）—— 任意缩放下保持不变。 |
| `labelBold` | `Boolean` | `true` | 标注字重：`true`→700，`false`→400。 |
| `pixelated` | `Boolean` | `true` | 底图采用最近邻（nearest-neighbor）缩放——放大后像素锐利清晰，而非浏览器默认的平滑模糊。 |
| `initialScale` | `Number\|null` | `null` | 初始缩放倍率（相对于图片原始尺寸）。`null` 时自动适配容器；设了则以 `initialCenter` 为锚点。 |
| `initialCenter` | `{ x, y }` | `{ x: 0, y: 0 }` | 初始视口中心（用户坐标，相对原点）。`initialScale` 为 `null` 时忽略。 |
| `boundaryMargin` | `Number` | `100` | 平移 / 缩放时允许的最大背景边距（px）。地图不能被拖到距容器边超过该距离，也不能缩到比适配容器更小。 |
| `icons` | `Function` | `null` | 图标解析器：`(desc) => 组件 | null`。接收标注的 `icon` 字段（如 `{lucide:'Home'}`）并返回 Vue 组件。为 `null` 时 `icon` 被当作图片 URL 处理。 |
| `styles` | `Array<{ fontSize?, fontWeight?, color?, stroke?, textShadow?, iconColor?, iconBg? }>` | `[]` | 标注样式组。每个标注通过 `style` 字段引用一个下标；组内未填写的字段、以及越界 / `-1` 下标均回退到组件默认样式。 |
| `showCoordinate` | `Boolean` | `true` | 是否显示光标的实时坐标读数。 |
| `coordinatePrecision` | `Number` | `1` | 坐标读数的小数位数。 |
| `debug` | `Boolean` | `false` | 调试模式：左键点击复制 `x: %d, y: %d`（用户坐标）；右键复制 `x: %d, y: %d, visible: %.2f`（坐标+缩放倍率）。 |

### annotations

```ts
type Annotation = {
  id: string | number   // 稳定的 key，也会通过事件回传
  x: number              // 用户坐标 x（+x 向右）
  x?: number             // 用户坐标 x（+x 向右）；不填则隐藏
  y?: number             // 用户坐标 y（+y 向下）；不填则隐藏
  text: string           // 标注文字；用 \n 换行（每行各自居中）
  visible?: number       // 0 / 不填 = 始终可见 · < 0 = 永远不可见 · > 0 = scale >= 该值
  style?: number         // 指向组件 `styles` prop 的下标（默认 -1）
  icon?: string | object // 图片 URL，或传给 `icons()` 的描述符（如 {lucide:'Home'}）
}
```

### 可见性

每个标注携带一个数字 `visible` 阈值：

- `visible: 0` 或不填 —— 始终可见。
- `visible: <0` —— 永远不可见。
- `visible: >0` —— 缩放倍率 `scale >= 该值` 时才显示。

`x` 或 `y` 不填的标注始终隐藏。

### 按标注独立的样式组

`styles` 是 `{ fontSize?, color? }[]` 数组 —— 与 `level` 正交的另一维度。每个
标注通过 `style` 字段指向数组里的某一项（默认 `-1`，表示"用组件默认"）。组内
声明了什么字段就覆盖什么字段，其余（字重、描边、阴影）沿用组件默认；越界下标
等同于 `-1`。

```js
const styles = [
  { fontSize: 20, color: '#ffd166' }, // 下标 0
  { color: '#ff5555' },               // 下标 1，字号用默认
]
const annotations = [
  { id: 1, x: 100, y: 50, text: '重点', style: 0 },
  { id: 2, x: 200, y: 80, text: '警告', style: 1 },
  { id: 3, x: 0,   y: 0,  text: '普通', style: -1 }, // 默认白色
]
```

### 图标

`icons` 解析器让你接入任意图标库而无需将它打进包里。标注的 `icon` 字段可以是字符串或任意描述符——由解析器决定渲染什么。

```js
// 全局注册的 <Icon name="lucide:..." />（如 Nuxt 通过插件注册）
const getIcon = (desc) => {
  if (typeof desc === 'string') {
    return { component: Icon, props: { name: desc } };
  }
  return null;
};
const annotations = [
  { id: 1, x: 100, y: 50, text: '书店', icon: 'lucide:book-marked' },
];
```

```js
// lucide-vue-next（按需引入）
import { Home, Plane } from 'lucide-vue-next';
const lucideIcons = { Home, Plane };
const getIcon = (desc) => (desc?.lucide ? lucideIcons[desc.lucide] : null);
const annotations = [
  { id: 1, x: 100, y: 50, text: '首页', icon: { lucide: 'Home' } },
];
```

---

## 事件

| 事件 | 载荷 | 触发时机 |
|------|------|----------|
| `view-change` | `{ scale, offsetX, offsetY, visibleUserRect }` | 每次平移 / 缩放都会触发。`visibleUserRect` 是当前可见的用户坐标矩形 `{ x, y, w, h }` —— 如果你要动态计算自己的标注很有用。 |
| `annotation-click` | `annotation` 对象 | 预留 —— 点击了某个标注。 |
| `annotation-hover` | `(annotation, mouseEvent)` | 预留 —— 光标进入某个标注。 |
| `ready` | — | 预留 —— 初始布局完成。 |

`annotation-click` / `annotation-hover` / `ready` 都是预留好的钩子：按正确的载荷触发，
但**目前没有内置行为**，方便你后续接入而无需改 API。

---

## 暴露方法（命令式句柄）

通过模板 ref 访问：

```vue
<MyOwnMap ref="map" ... />
```

```js
const map = ref(null)
map.value.zoomIn()                  // 视图中心放大 25%
map.value.zoomOut()                 // 视图中心缩小 20%
map.value.resetView()               // 恢复初始视口
map.value.getScale()                // → 当前缩放倍率
map.value.userToScreen(ux, uy)      // → { sx, sy }
map.value.screenToUser(sx, sy)      // → { ux, uy }
```

---

## 本地开发 / demo

```sh
npm install
npm run dev
```

`src/App.vue` 里的 demo 混用了三个层级的标注，并提供阈值滑块和加粗开关，
可在线演示每个 prop 的效果。把任意测试图放到 `public/maps/` 下，把 demo 的
`imageSrc` 指过去即可。

---

## 项目结构

```
src/
  index.js                        # 库入口
  types.d.ts                      # 公开类型声明
  components/MyOwnMap.vue         # 组件本体
  composables/useMapTransform.js  # 纯响应式坐标换算逻辑（无 DOM）
  App.vue                         # 本地 demo（不随包发布）
dist/                             # 发布产物（已 gitignore）
```

---

## 许可证

[MIT](./LICENSE)
