/* ============================================================
 * CityOS 模拟数据层 · data.js
 * 所有页面共享的确定性模拟数据（种子随机，刷新不变）
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 确定性随机 ---------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261118);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const rint = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const rfloat = (a, b, d = 1) => +(a + rand() * (b - a)).toFixed(d);

  /* ---------- 基础字典 ---------- */
  const DISTRICTS = [
    { id: 'cbd',        name: '汉口滨江商务区', short: '汉口',   area: 4.2,  pop: 18.6 },
    { id: 'midtown',    name: '武昌综合区',     short: '武昌',   area: 7.8,  pop: 32.4 },
    { id: 'riverside',  name: '汉阳居住区',     short: '汉阳',   area: 9.6,  pop: 41.2 },
    { id: 'industrial', name: '青山工业区',     short: '青山',   area: 12.3, pop: 15.8 },
    { id: 'hillside',   name: '东湖生态区',     short: '东湖',   area: 21.5, pop: 6.3  },
    { id: 'harbor',     name: '阳逻港区',       short: '阳逻',   area: 6.1,  pop: 9.7  },
  ];

  const ROADS = [
    { id: 'R01', name: '中山大道',     level: '主干路', lanes: 8, length: 6.8 },
    { id: 'R02', name: '沿江大道',     level: '主干路', lanes: 6, length: 7.4 },
    { id: 'R03', name: '临江大道',     level: '主干路', lanes: 6, length: 7.1 },
    { id: 'R04', name: '武汉三环线',   level: '快速路', lanes: 6, length: 18.9 },
    { id: 'R05', name: '冶金大道',     level: '主干路', lanes: 6, length: 5.6 },
    { id: 'R06', name: '光谷创业街',   level: '次干路', lanes: 4, length: 3.2 },
    { id: 'R07', name: '阳逻快速通道', level: '快速路', lanes: 6, length: 9.3 },
    { id: 'R08', name: '东湖绿道',     level: '次干路', lanes: 2, length: 11.4 },
    { id: 'R09', name: '江汉路步行街', level: '支路',   lanes: 2, length: 1.6 },
    { id: 'R10', name: '武汉长江大桥', level: '快速路', lanes: 6, length: 0.9 },
  ];

  // 各区典型道路（事件地点 / 传感器所属道路按真实城区归属配对）
  const DISTRICT_ROADS = {
    '汉口滨江商务区': ['中山大道', '沿江大道', '江汉路步行街'],
    '武昌综合区':     ['临江大道', '武珞路', '武汉长江大桥'],
    '汉阳居住区':     ['琴台大道', '鹦鹉大道', '江城大道'],
    '青山工业区':     ['冶金大道', '和平大道', '建设十路'],
    '东湖生态区':     ['东湖绿道', '珞喻路', '鲁磨路'],
    '阳逻港区':       ['阳逻快速通道', '平江大道', '汉施公路'],
  };

  const BUILDINGS_TOP = [
    { name: '武汉绿地中心',   district: 'cbd',        height: 475, floors: 100, usage: '办公/酒店' },
    { name: '武汉中心大厦',   district: 'cbd',        height: 438, floors: 88, usage: '办公' },
    { name: '武汉天地·云廷',  district: 'cbd',        height: 376, floors: 73, usage: '办公/商业' },
    { name: '民生银行大厦',   district: 'cbd',        height: 331, floors: 68, usage: '金融' },
    { name: '楚河汉街·万达尊', district: 'midtown',   height: 218, floors: 49, usage: '商业综合体' },
    { name: '汉阳滨江天玺',   district: 'riverside',  height: 186, floors: 55, usage: '住宅' },
    { name: '光谷之星',       district: 'midtown',    height: 172, floors: 40, usage: '研发办公' },
    { name: '阳逻港联检大楼', district: 'harbor',     height: 158, floors: 36, usage: '港口物流' },
    { name: '武汉国际博览中心', district: 'cbd',      height: 149, floors: 34, usage: '会展' },
    { name: '龟山电视塔',     district: 'hillside',   height: 221, floors: 28, usage: '文旅/发射' },
  ];

  const POI_TYPES = ['医院', '学校', '消防站', '派出所', '地铁站', '公交站', '公园', '体育馆'];

  /* ---------- 时间序列生成器 ---------- */
  // 生成 24h 曲线：基线 + 早晚高峰 + 噪声
  function dailyProfile(base, peakAmp, noise, seedShift = 0) {
    const arr = [];
    for (let h = 0; h < 24; h++) {
      const morning = Math.exp(-Math.pow(h - 8.2 - seedShift, 2) / 2.6);
      const evening = Math.exp(-Math.pow(h - 18.0 - seedShift, 2) / 3.4);
      const mid = 0.35 * Math.exp(-Math.pow(h - 13, 2) / 12);
      const v = base * (0.28 + morning * peakAmp + evening * peakAmp * 1.12 + mid) + (rand() - 0.5) * noise;
      arr.push(Math.max(0, Math.round(v)));
    }
    return arr;
  }
  // 生成 30 天曲线
  function monthSeries(base, trend, noise) {
    const arr = [];
    for (let d = 0; d < 30; d++) {
      const weekly = 1 + 0.18 * Math.sin((d % 7) / 7 * Math.PI * 2);
      arr.push(Math.max(0, +(base * weekly * (1 + trend * d / 30) + (rand() - 0.5) * noise).toFixed(1)));
    }
    return arr;
  }

  /* ---------- 交通 ---------- */
  const traffic = {
    flow24h: dailyProfile(5200, 1.35, 700),           // 全城车流量（辆/h）
    speed24h: dailyProfile(38, -0.45, 4).map(v => Math.max(12, 52 - (v - 38))), // 反相关车速
    congestionIndex: ROADS.map(r => ({
      ...r,
      index: rfloat(1.0, 2.6, 2),
      speed: rint(18, 62),
      flow: rint(800, 5200),
      status: null, // 下面按指数填充
    })),
    transit: {
      metroLines: [
        { name: '1 号线', color: '#e64747', stations: 24, onTime: 99.2, crowd: rfloat(0.55, 0.9, 2) },
        { name: '2 号线', color: '#3f8cff', stations: 19, onTime: 98.7, crowd: rfloat(0.55, 0.9, 2) },
        { name: '3 号线', color: '#35c26e', stations: 16, onTime: 99.5, crowd: rfloat(0.4, 0.8, 2) },
        { name: '4 号线', color: '#b15cff', stations: 11, onTime: 99.8, crowd: rfloat(0.3, 0.7, 2) },
      ],
      busRoutes: 86, busOnTime: rfloat(91, 95, 1), metroDaily: rint(88, 96), // 万人次
    },
    parking: DISTRICTS.map(d => ({
      name: d.short, total: rint(3200, 9800), used: 0,
    })),
  };
  traffic.congestionIndex.forEach(r => {
    r.status = r.index >= 2.1 ? '严重拥堵' : r.index >= 1.7 ? '拥堵' : r.index >= 1.35 ? '缓行' : '畅通';
  });
  traffic.parking.forEach(p => { p.used = Math.round(p.total * rfloat(0.45, 0.92, 2)); });

  /* ---------- 能源 ---------- */
  const energy = {
    load24h: dailyProfile(620, 0.85, 60, 0.6),        // MW
    monthKwh: monthSeries(1450, 0.06, 120),           // 万 kWh / 天
    mix: [
      { name: '光伏发电', value: 18.4 },
      { name: '风力发电', value: 12.1 },
      { name: '水力发电', value: 9.6 },
      { name: '燃气调峰', value: 22.8 },
      { name: '市电购入', value: 31.5 },
      { name: '储能放电', value: 5.6 },
    ],
    carbon: {
      today: rfloat(820, 940, 0),                     // 吨 CO₂
      monthTrend: monthSeries(880, -0.09, 60),
      perCapita: rfloat(5.8, 6.4, 2),
    },
    buildings: BUILDINGS_TOP.slice(0, 8).map(b => ({
      name: b.name,
      kwh: rint(8200, 26800),
      saving: rfloat(2, 14, 1),
      level: null,
    })),
    storage: { soc: rint(58, 86), power: rint(-40, 60), cap: 120 }, // 储能 MWh
  };
  energy.buildings.forEach(b => {
    b.level = b.saving >= 10 ? '优秀' : b.saving >= 6 ? '良好' : '一般';
  });

  /* ---------- 应急 ---------- */
  const EVENT_TYPES = [
    { type: '交通事故', level: 'warn' },
    { type: '火警',     level: 'danger' },
    { type: '医疗救援', level: 'info' },
    { type: '水管爆裂', level: 'warn' },
    { type: '燃气泄漏', level: 'danger' },
    { type: '人群聚集', level: 'info' },
    { type: '设备故障', level: 'mute' },
  ];
  const emergency = {
    events: [],
    resources: [
      { name: '消防站', total: 12, available: 10, unit: '座' },
      { name: '急救车辆', total: 46, available: 38, unit: '辆' },
      { name: '消防车', total: 58, available: 51, unit: '辆' },
      { name: '应急避难所', total: 24, available: 24, unit: '处' },
      { name: '移动发电车', total: 15, available: 13, unit: '辆' },
      { name: '排涝泵车', total: 9, available: 8, unit: '辆' },
    ],
    drills: [
      { name: '高层建筑消防演练', date: '2026-11-24', dept: '消防救援支队', status: '待开展' },
      { name: '汛期排涝联合演练', date: '2026-11-12', dept: '水务局', status: '已完成' },
      { name: '地铁大客流疏散演练', date: '2026-10-28', dept: '轨道交通集团', status: '已完成' },
    ],
  };
  {
    let minuteCursor = 0;
    for (let i = 0; i < 14; i++) {
      const t = pick(EVENT_TYPES);
      minuteCursor += rint(4, 58);
      const hh = String(Math.floor(Math.min(minuteCursor, 720) / 60) + 6).padStart(2, '0');
      const mm = String(Math.min(minuteCursor, 720) % 60).padStart(2, '0');
      emergency.events.push({
        id: 'EV-' + (2611 + i * 3),
        time: `${hh}:${mm}`,
        type: t.type,
        level: t.level,
        place: (() => { const dn = pick(DISTRICTS).name; return dn + '·' + pick(DISTRICT_ROADS[dn] || ROADS.map(r => r.name)) + pick(['交叉口', '沿线', '辅道', '商圈', '地铁站口']); })(),
        status: pick(['已处置', '已处置', '处置中', '已派单', '已处置']),
        duration: rint(6, 74) + ' 分钟',
      });
    }
    emergency.events.sort((a, b) => b.time.localeCompare(a.time));
  }

  /* ---------- 环境 ---------- */
  const environment = {
    aqi: rint(42, 78),
    pm25: rint(18, 46),
    pm10: rint(35, 78),
    noise: rfloat(48, 62, 1),
    waterQuality: pick(['Ⅱ 类', 'Ⅱ 类', 'Ⅲ 类']),
    aqiWeek: Array.from({ length: 7 }, () => rint(38, 92)),
  };

  /* ---------- 总览 KPI ---------- */
  const overview = {
    kpis: [
      { id: 'pop',      label: '常住人口',     value: 123.7, unit: '万人',  trend: +0.8, spark: monthSeries(120, 0.03, 2) },
      { id: 'gdp',      label: '今日城市产值', value: 9.84,  unit: '亿元',  trend: +2.1, spark: monthSeries(9.4, 0.05, 0.4) },
      { id: 'energy',   label: '实时用电负荷', value: 712,   unit: 'MW',    trend: -1.2, spark: dailyProfile(620, 0.85, 60) },
      { id: 'aqi',      label: '空气质量 AQI', value: environment.aqi, unit: '', trend: -4.5, spark: environment.aqiWeek },
      { id: 'traffic',  label: '拥堵指数',     value: 1.62,  unit: '',      trend: +3.1, spark: dailyProfile(1.4, 0.5, 0.2).map(v => +v.toFixed(2)) },
      { id: 'security', label: '今日警情',     value: 47,    unit: '起',    trend: -6.0, spark: monthSeries(52, -0.04, 8) },
    ],
    weather: { temp: rint(9, 14), text: '多云转阴', humidity: rint(52, 68), wind: '东北风 3 级' },
  };

  /* ---------- 水务与环境 ---------- */
  const water = {
    stations: [
      { name: '长江 · 汉口武汉关水文站', river: '长江', level: rfloat(2.8, 3.6, 2), warn: 5.50, trend: null },
      { name: '长江 · 武昌中华路闸口站', river: '长江', level: rfloat(3.4, 4.2, 2), warn: 6.00, trend: null },
      { name: '汉江 · 龙王庙入口站', river: '汉江', level: rfloat(1.6, 2.4, 2), warn: 4.00, trend: null },
    ],
    rain24h: Array.from({ length: 24 }, (_, h) => {
      const peak = Math.exp(-Math.pow(h - 21, 2) / 6);
      return +(peak * 14 + rand() * 1.2).toFixed(1);
    }),
    quality: [
      { name: 'pH', value: rfloat(7.1, 7.6, 2), std: '6.5~8.5', pct: 0 },
      { name: '溶解氧', value: rfloat(6.2, 8.4, 1), std: '≥5 mg/L', pct: 0 },
      { name: '氨氮', value: rfloat(0.2, 0.7, 2), std: '≤1.0 mg/L', pct: 0 },
      { name: 'COD', value: rfloat(9, 16, 0), std: '≤20 mg/L', pct: 0 },
      { name: '浊度', value: rfloat(2, 6, 1), std: '≤10 NTU', pct: 0 },
    ],
    pumps: [
      { name: '沿江 1# 泵站', flow: rint(60, 95), status: '运行' },
      { name: '沿江 2# 泵站', flow: rint(50, 90), status: '运行' },
      { name: '青山工业雨水泵站', flow: rint(30, 70), status: '运行' },
      { name: '阳逻排涝泵站', flow: 0, status: '待机' },
      { name: '江汉路合流泵站', flow: rint(20, 60), status: '运行' },
      { name: '东湖补水泵站', flow: 0, status: '检修' },
    ],
    floodSpots: [
      { place: '沿江大道下穿通道', risk: '高', depth: rint(8, 22) },
      { place: '江汉路步行街南口', risk: '中', depth: rint(4, 10) },
      { place: '冶金大道辅道低洼段', risk: '中', depth: rint(3, 9) },
      { place: '阳逻港西区', risk: '低', depth: rint(0, 4) },
    ],
  };
  water.stations.forEach(s => {
    s.trend = Array.from({ length: 24 }, (_, h) =>
      +(s.level + Math.sin((h - 15) / 24 * Math.PI * 2) * 0.3 + (rand() - 0.5) * 0.1).toFixed(2));
    s.riskPct = Math.round(s.level / s.warn * 100);
  });
  water.quality.forEach(q => { q.ok = true; });

  /* ---------- 市民服务（12345 热线） ---------- */
  const citizen = {
    todayTotal: rint(860, 980),
    categories: [
      { name: '物业服务', value: rint(150, 220) },
      { name: '市容环境', value: rint(120, 190) },
      { name: '噪音扰民', value: rint(90, 150) },
      { name: '交通出行', value: rint(80, 140) },
      { name: '水电气暖', value: rint(60, 110) },
      { name: '消费维权', value: rint(40, 80) },
      { name: '其他', value: rint(50, 90) },
    ],
    timeliness: rfloat(93, 97, 1),       // 按时办结率 %
    avgHours: rfloat(18, 30, 1),          // 平均办理时长
    satisfaction: rfloat(92, 97, 1),      // 满意率 %
    trend30d: monthSeries(880, 0.02, 90),
    hotWords: [
      { word: '电梯故障', heat: rint(70, 98) },
      { word: '夜间施工噪音', heat: rint(60, 92) },
      { word: '占道停车', heat: rint(55, 88) },
      { word: '垃圾清运', heat: rint(40, 75) },
      { word: '供暖温度', heat: rint(35, 70) },
      { word: '油烟排放', heat: rint(30, 62) },
      { word: '路灯不亮', heat: rint(25, 55) },
      { word: '犬只管理', heat: rint(18, 45) },
    ],
    tickets: [],
  };
  {
    const STATES = ['已办结', '已办结', '办理中', '已转派', '已回访'];
    const DEPTS = ['住建局', '城管局', '生态环境分局', '交通局', '水务局', '市场监管局', '公安分局'];
    for (let i = 0; i < 12; i++) {
      const cat = pick(citizen.categories);
      const hh = String(rint(7, 20)).padStart(2, '0');
      const mm = String(rint(0, 59)).padStart(2, '0');
      citizen.tickets.push({
        id: 'GD-2611' + String(140 + i * 7),
        time: `${hh}:${mm}`,
        title: cat.name + '类诉求 · ' + pick(DISTRICTS).name,
        dept: pick(DEPTS),
        status: pick(STATES),
        urgent: rand() < 0.22,
      });
    }
    citizen.tickets.sort((a, b) => b.time.localeCompare(a.time));
  }

  /* ---------- 预测研判 ---------- */
  const forecast = {
    loadPred: [], loadActual: [], jamPred: [],
    rules: [
      { id: 'r1', name: '电网负荷越限', metric: 'load', op: '>', threshold: 900, unit: 'MW', enabled: true },
      { id: 'r2', name: '全城拥堵预警', metric: 'jam', op: '>', threshold: 2.0, unit: '', enabled: true },
      { id: 'r3', name: 'AQI 轻度污染', metric: 'aqi', op: '>', threshold: 100, unit: '', enabled: true },
      { id: 'r4', name: '河道水位警戒', metric: 'wlevel', op: '>', threshold: 5.2, unit: 'm', enabled: true },
      { id: 'r5', name: '诉求量突增', metric: 'citizen', op: '>', threshold: 950, unit: '件', enabled: false },
    ],
    accuracy: { load: rfloat(94, 97, 1), jam: rfloat(89, 93, 1), aqi: rfloat(91, 95, 1) },
  };
  {
    const base = D => D; // 占位
    const h0 = new Date().getHours();
    for (let h = 0; h < 24; h++) {
      const morning = Math.exp(-Math.pow(h - 8.6, 2) / 3.2);
      const evening = Math.exp(-Math.pow(h - 18.6, 2) / 4.2);
      const pred = Math.round(620 * (0.3 + morning * 0.9 + evening * 1.05) + 40);
      forecast.loadPred.push(pred);
      forecast.loadActual.push(h <= h0 ? Math.max(0, Math.round(pred + (rand() - 0.5) * 60)) : null);
      forecast.jamPred.push(+(1.3 + morning * 0.5 + evening * 0.75 + (rand() - 0.5) * 0.06).toFixed(2));
    }
  }

  /* ---------- 传感器（数据分析页） ---------- */  const sensors = [];
  {
    const kinds = ['流量', '环境', '能耗', '水位', '结构'];
    for (let i = 0; i < 60; i++) {
      const kind = pick(kinds);
      const district = pick(DISTRICTS).name;
      sensors.push({
        id: 'SN-' + String(10000 + i),
        kind,
        district,
        road: pick(DISTRICT_ROADS[district] || ROADS.map(r => r.name)),
        value: kind === '流量' ? rint(200, 5200)
             : kind === '环境' ? rint(15, 90)
             : kind === '能耗' ? rfloat(2, 98, 1)
             : kind === '水位' ? rfloat(1.2, 6.8, 2)
             : rfloat(0.01, 0.4, 3),
        unit: kind === '流量' ? '辆/h' : kind === '环境' ? 'AQI' : kind === '能耗' ? 'kW' : kind === '水位' ? 'm' : 'mm',
        status: rand() < 0.9 ? '在线' : '离线',
        updated: rint(1, 30) + ' 分钟前',
      });
    }
  }

  /* ---------- 导出 ---------- */
  global.CITY_DATA = {
    DISTRICTS, ROADS, BUILDINGS_TOP, POI_TYPES,
    traffic, energy, emergency, environment, overview, sensors,
    water, citizen, forecast,
    dailyProfile, monthSeries,
    _util: { rand, pick, rint, rfloat },
  };
})(window);
