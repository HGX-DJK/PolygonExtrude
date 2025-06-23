
# Three.js 中自定义 UV 坐标贴图详解

## 一、背景

### 1.1 ✅ 使用场景 / 什么时候需要这样处理

1、当原始几何体没有 UV 信息

* 比如从 GeoJSON 或自定义顶点数据生成的几何体，通常不包含默认的 uv 属性。
* 没有 uv 信息，纹理就无法正确贴在模型表面。

2、当默认 UV 无法满足纹理显示需求

* 比如自动生成的 UV 是按照立方体或球体映射方式，但你希望纹理按照 XY 平面铺开。
* 或你想自定义纹理拉伸、缩放、裁剪方式。

3、贴图范围较大时

* 如将纹理贴在一个很大的面（如整个省份或城市）上，需要归一化 UV才能完整显示整张图，否则纹理可能看起来被挤压或重复。

4、材质设置使用了 map（纹理贴图）

* UV 坐标直接决定了纹理如何映射到顶点上，没有正确的 UV，贴图就是黑的或者混乱的。

### 1.2 ✅ 这样处理的好处

| 好处            | 描述                                           |
| ------------- | -------------------------------------------- |
| ✅ 自定义贴图范围     | 按照 XY 平面的实际边界（bounding box）进行归一化贴图，纹理完整而且可控。 |
| ✅ 保证不同面统一贴图逻辑 | 使所有面在同一坐标系下统一使用纹理坐标，适用于多个 Mesh 的统一贴图。        |
| ✅ 更好地适应实际地理数据 | 尤其适合地图类、建筑投影、城市地块等从经纬度生成的模型。                 |
| ✅ 提高美观性       | 避免贴图拉伸、模糊、重复等问题。让纹理在面上看起来更自然。                |

### 1.3🧠 举个例子

假如你从 GeoJSON 创建了一个类似湖北省的面模型，你贴上一张高清地图 top.png 作为贴图，如果不设置 UV：

* 纹理可能根本看不到。

* 或者整个纹理只出现在几何体的一个小角落（默认 UV 不匹配）。

* 甚至多个面公用同一张纹理，但位置都不对。

## 二、纹理贴图与 UV 的基础知识

在 3D 渲染中，为了将 2D 图片（纹理）映射到 3D 几何体上，需要用到 **UV 坐标**：

| 概念 | 说明 |
|------|------|
| **纹理贴图（Texture Mapping）** | 是将 2D 图像（比如一张地图、照片等）映射到 3D 模型表面的过程。 |
| **UV 坐标** | 是二维坐标系 `[u, v]`，对应图片的水平方向（U）和垂直方向（V），取值范围通常是 `[0, 1]`。 |
| **目的** | 指定几何体的哪个顶点对应纹理图的哪个像素点。没有 UV，Three.js 无法知道贴图怎么“贴”上去。 |

例子：

- `uv = [0,0]` 表示贴图左下角，`[1,1]` 表示右上角。
- 如果某三角面顶点 uv 是 `[0,0]`, `[1,0]`, `[0,1]`，那纹理就会映射为一个右角三角区域。

---

## 📌 三、代码逐步解析

```js
  const group = topPolygonMesh.object3d;
  if (!group) return;
  group.traverse(child => {
    if (child.isMesh && child.geometry && child.geometry.attributes.position) {
      const posAttr = child.geometry.attributes.position;
      const positions = posAttr.array;
      // 1. 计算 XY 投影平面的包围盒
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      };
      const width = maxX - minX;
      const height = maxY - minY;
      // 2. 根据 bbox 生成新的 UV（按 XY 贴图）
      const uv = [];
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const u = (x - minX) / width;
        const v = (y - minY) / height;
        uv.push(u, v);
      };
      // 3. 设置新的 UV
      child.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      child.geometry.attributes.uv.needsUpdate = true;
    }
  })
```

使用你上面的逻辑：

* 会将湖北省这个面在 XY 平面上的投影范围归一化为 [0,1] × [0,1]，然后贴图正好完整覆盖整个省份模型顶面。
* 并且每个三角面上纹理也会均匀分布，不会拉伸、重复或扭曲。

### 代码每部分解析

```js
const group = topPolygonMesh.object3d;
if (!group) return;
group.traverse(child => {
  if (child.isMesh && child.geometry && child.geometry.attributes.position) {
```

🔹 找到场景中的所有 `Mesh`，确保其包含几何体和位置（顶点）数据。

#### ✅ 第一步：计算 XY 平面的包围盒

```js
const posAttr = child.geometry.attributes.position;
const positions = posAttr.array;

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i];
  const y = positions[i + 1];
  if (x < minX) minX = x;
  if (y < minY) minY = y;
  if (x > maxX) maxX = x;
  if (y > maxY) maxY = y;
}
const width = maxX - minX;
const height = maxY - minY;
```

📌 **获取几何体在 XY 平面上的包围盒**

---

#### ✅ 第二步：计算新的 UV 坐标

```js
const uv = [];
for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i];
  const y = positions[i + 1];
  const u = (x - minX) / width;
  const v = (y - minY) / height;
  uv.push(u, v);
}
```

📌 **将 XY 坐标归一化为 UV 区间**

---

#### ✅ 第三步：应用 UV 到几何体

```js
child.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
child.geometry.attributes.uv.needsUpdate = true;
```

📌 **设置 UV 属性并通知渲染系统更新**

---

## 🎯 四、目的总结

> 该段代码的**最终目标**是：  
✅ **使 XY 平面上的任意不规则几何体，都能准确、完整地显示一张贴图（通常是一张地图或图案）**

---

## 📚 五、为什么默认 UV 不适用？

| 场景 | 是否需要手动设置 UV |
|------|--------------------|
| 自定义顶点数据构建几何体 | ✅ 是的，需要自定义 UV |
| 从 GeoJSON/TopoJSON 转换成几何体 | ✅ 是的，没有默认 UV |
| 使用 `ExtrudeGeometry`, `ShapeGeometry` | ❌ 有自动生成 UV，但经常不满足 XY 贴图的需要 |
| 纹理贴图变形严重或重复 | ✅ 需要重设 UV 保证平铺、清晰 |

---

## ✅ 总结

| 项目 | 内容 |
|------|------|
| 📌 目的 | 将纹理按照 XY 平面贴满整个面 |
| 🔧 原理 | 将 XY 坐标归一化为 [0,1] 区间作为 UV |
| 🎯 效果 | 保证纹理不变形、无缝、完整地显示 |
| 🔍 场景 | 地图贴图、建筑贴图、非规则面纹理贴图 |
| 📐 重点 | UV 反映的是“纹理坐标”，不是世界坐标 |
