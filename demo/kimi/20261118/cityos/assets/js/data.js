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
    { id: 'cbd',        name: '中央商务区', short: 'CBD',    area: 4.2,  pop: 18.6 },
    { id: 'midtown',    name: '中城综合区', short: '中城',   area: 7.8,  pop: 32.4 },
    { id: 'riverside',  name: '滨河居住区', short: '滨河',   area: 9.6,  pop: 41.2 },
    { id: 'industrial', name: '南部工业区', short: '工业区', area: 12.3, pop: 15.8 },
    { id: 'hillside',   name: '山岭生态区', short: '山岭',   area: 21.5, pop: 6.3  },
    { id: 'harbor',     name: '临港物流区', short: '临港',   area: 6.1,  pop: 9.7  },
  ];

  const ROADS = [
    { id: 'R01', name: '中央大道',   level: '主干路', lanes: 8, length: 6.8 },
    { id: 'R02', name: '滨河东路',   level: '主干路', lanes: 6, length: 7.4 },
    { id: 'R03', name: '滨河西路',   level: '主干路', lanes: 6, length: 7.1 },
    { id: 'R04', name: '环城高架',   level: '快速路', lanes: 6, length: 18.9 },
    { id: 'R05', name: '工业大道',   level: '主干路', lanes: 6, length: 5.6 },
    { id: 'R06', name: '科创街',     level: '次干路', lanes: 4, length: 3.2 },
    { id: 'R07', name: '临港快速路', level: '快速路', lanes: 6, length: 9.3 },
    { id: 'R08', name: '山岭景观道', level: '次干路', lanes: 2, length: 11.4 },
    { id: 'R09', name: '老城步行街', level: '支路',   lanes: 2, length: 1.6 },
    { id: 'R10', name: '跨河大桥',   level: '快速路', lanes: 6, length: 0.9 },
  ];

  const BUILDINGS_TOP = [
    { name: '云际中心',       district: 'cbd',        height: 328, floors: 72, usage: '办公/酒店' },
    { name: '梅塔双子塔·东',  district: 'cbd',        height: 296, floors: 66, usage: '办公' },
    { name: '梅塔双子塔·西',  district: 'cbd',        height: 296, floors: 66, usage: '办公' },
    { name: '汇流金融大厦',   district: 'cbd',        height: 261, floors: 58, usage: '金融' },
    { name: '中城寰宇广场',   district: 'midtown',    height: 218, floors: 49, usage: '商业综合体' },
    { name: '滨河天际公寓',   district: 'riverside',  height: 186, floors: 55, usage: '住宅' },
    { name: '科创之眼大厦',   district: 'midtown',    height: 172, floors: 40, usage: '研发办公' },
    { name: '临港国际物流塔', district: 'harbor',     height: 158, floors: 36, usage: '物流总部' },
    { name: '城市之门',       district: 'cbd',        height: 149, floors: 34, usage: '会展' },
    { name: '山岭观景塔',     district: 'hillside',   height: 132, floors: 28, usage: '文旅' },
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
        { name: '滨河线', color: '#b15cff', stations: 11, onTime: 99.8, crowd: rfloat(0.3, 0.7, 2) },
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
        place: pick(DISTRICTS).name + pick(['·', '·']) + pick(ROADS).name + pick(['交叉口', '沿线', '辅道', '商圈', '地铁站口']),
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

  /* ---------- 传感器（数据分析页） ---------- */
  const sensors = [];
  {
    const kinds = ['流量', '环境', '能耗', '水位', '结构'];
    for (let i = 0; i < 60; i++) {
      const kind = pick(kinds);
      sensors.push({
        id: 'SN-' + String(10000 + i),
        kind,
        district: pick(DISTRICTS).name,
        road: pick(ROADS).name,
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
    dailyProfile, monthSeries,
    _util: { rand, pick, rint, rfloat },
  };
})(window);
