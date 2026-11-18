# 梅塔维尔 CityOS · 城市运行管理中心（演示）

一套**纯静态**的智慧城市 / 数字孪生运营平台演示系统，围绕虚拟城市「梅塔维尔」构建，无需后端。数据由确定性模拟数据层生成，并由内置**实时仿真引擎**驱动持续变化（指标抖动、随机事件推送）。

## 快速开始

```bash
cd cityos
python3 -m http.server 8080   # 或 npx serve .
# 打开 http://localhost:8080
```

## 模块

| 页面 | 文件 | 内容 |
| --- | --- | --- |
| 可视化大屏 | `cityos/screen.html` | 指挥中心投影风：SVG 城市一张图（车流光线/车辆光点/事件闪烁定位）、大字号实时计数、滚动趋势、拥堵 TOP5 实时重排、事件流自动滚动、底部快报走马灯 |
| 态势总览 | `cityos/index.html` | KPI 卡（滚动+迷你趋势）、24h 城市脉搏（车流/能耗切换）、城区对比、能源结构、AQI、事件流；接入实时引擎：LIVE 徽标、新事件高亮插入、KPI 抖动、脉搏当前点跟随 |
| 3D 城市沙盘 | `cityos/sandbox.html` | Three.js 程序化地形/河流/441 栋建筑/180 辆车/2600 棵树/大桥/昼夜循环；**数字孪生交互**：图层开关、六视角巡航、时间轴拖动、点击建筑拾取孪生档案（高度/能耗/入驻率/标签）+ 高亮框 |
| 交通运行 | `cityos/traffic.html` | 流量车速双轴、拥堵榜、道路×小时热力图、轨道满载、停车饱和度、出行分担 |
| 能源与碳排 | `cityos/energy.html` | 负荷曲线（日/月切换）、供电结构、储能 SOC 仪表盘、碳排趋势、双碳目标 |
| 应急指挥 | `cityos/emergency.html` | 预警条幅、事件接报表（可筛选）、等级分布、分时段接报、资源待命、演练计划 |
| 数据分析 | `cityos/data.html` | 车流×能耗回归散点、六区雷达对比、传感器数据表（筛选/排序/分页/CSV 导出/打印） |
| 系统说明 | `cityos/about.html` | 架构、页面清单、运行方式 |

## 工程结构

```
cityos/
├── screen.html / index.html / sandbox.html / traffic.html
├── energy.html / emergency.html / data.html / about.html
└── assets/
    ├── css/main.css     # 设计系统：令牌 + 布局 + 组件
    └── js/
        ├── data.js      # 模拟数据层（mulberry32 种子随机，刷新一致）
        ├── common.js    # 页面外壳、时钟、ECharts 主题、工具
        └── live.js      # 实时仿真引擎：3s 指标抖动 + 8~16s 随机事件
```

依赖（均走 CDN）：Three.js r160、ECharts 5.5。

> 根目录的 `index.html`（本 README 同级）为早期独立的 3D 沙盘单页，与 `cityos/sandbox.html` 同源但不含后续交互增强。
