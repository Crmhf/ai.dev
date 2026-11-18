# 梅塔维尔 CityOS · 城市运行管理中心（演示）

一套**纯静态**的智慧城市运营平台演示系统，围绕虚拟城市「梅塔维尔」构建，无需后端，所有数据由内置确定性模拟数据层生成。

## 快速开始

```bash
cd cityos
python3 -m http.server 8080   # 或 npx serve .
# 打开 http://localhost:8080
```

## 模块

| 页面 | 文件 | 内容 |
| --- | --- | --- |
| 态势总览 | `cityos/index.html` | KPI 卡（数字滚动+迷你趋势）、24h 城市脉搏、城区对比、能源结构、AQI、事件流 |
| 3D 城市沙盘 | `cityos/sandbox.html` | Three.js 程序化地形/河流/千栋建筑/车流/大桥/昼夜循环/星空 |
| 交通运行 | `cityos/traffic.html` | 流量车速双轴、拥堵榜、道路×小时热力图、轨道满载、停车饱和度、出行分担 |
| 能源与碳排 | `cityos/energy.html` | 负荷曲线（日/月切换）、供电结构、储能 SOC 仪表盘、碳排趋势、双碳目标 |
| 应急指挥 | `cityos/emergency.html` | 预警条幅、事件接报表（可筛选）、等级分布、分时段接报、资源待命、演练计划 |
| 数据分析 | `cityos/data.html` | 车流×能耗回归散点、六区雷达对比、传感器数据表（筛选/排序/分页/CSV 导出/打印） |
| 系统说明 | `cityos/about.html` | 架构、页面清单、运行方式 |

## 工程结构

```
cityos/
├── index.html / sandbox.html / traffic.html / energy.html / emergency.html / data.html / about.html
└── assets/
    ├── css/main.css     # 设计系统：令牌 + 布局 + 组件
    └── js/
        ├── data.js      # 模拟数据层（mulberry32 种子随机，刷新一致）
        └── common.js    # 页面外壳、时钟、ECharts 主题、工具
```

依赖（均走 CDN）：Three.js r160、ECharts 5.5。

> 根目录的 `index.html`（本 README 同级）为早期独立的 3D 沙盘单页，与 `cityos/sandbox.html` 内容同源。
