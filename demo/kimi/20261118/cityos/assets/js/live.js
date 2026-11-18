/* ============================================================
 * CityOS 实时仿真引擎 · live.js
 * 模拟物联数据流：周期性指标抖动 + 随机事件推送
 * 页面通过 CityLive.on('tick'|'event', cb) 订阅
 * ============================================================ */
(function (global) {
  'use strict';

  const listeners = { tick: [], event: [] };
  let started = false;
  let seq = 0;

  const EVENT_POOL = [
    { type: '交通事故', level: 'warn',  tpl: '{road}{suffix}发生两车剐蹭，交警已到场' },
    { type: '交通事故', level: 'warn',  tpl: '{road}{suffix}车辆抛锚，占用一条车道' },
    { type: '火警',     level: 'danger', tpl: '{district}一{dtype}烟感报警，消防已出动' },
    { type: '医疗救援', level: 'info',  tpl: '{district}{poi}附近有人晕倒，120 已派车' },
    { type: '水管爆裂', level: 'warn',  tpl: '{road}供水主管网压力异常，抢修队已出发' },
    { type: '燃气泄漏', level: 'danger', tpl: '{district}一餐饮店铺燃气报警，已疏散' },
    { type: '人群聚集', level: 'info',  tpl: '{poi}周边客流达到警戒阈值，启动疏导' },
    { type: '设备故障', level: 'mute',  tpl: '{road}{suffix}信号灯故障，已转人工指挥' },
    { type: '积水预警', level: 'warn',  tpl: '{district}低洼路段出现积水，排涝车待命' },
  ];
  const DTYPE = ['写字楼', '商场', '餐厅后厨', '地下车库', '仓库'];
  const SUFFIX = ['交叉口', '辅道', '高架段', '隧道口', '公交站台'];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rint(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function makeEvent() {
    const D = global.CITY_DATA;
    const p = pick(EVENT_POOL);
    seq += 1;
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const place = p.tpl
      .replace('{road}', pick(D.ROADS).name)
      .replace('{district}', pick(D.DISTRICTS).name)
      .replace('{poi}', pick(D.POI_TYPES))
      .replace('{dtype}', pick(DTYPE))
      .replace('{suffix}', pick(SUFFIX));
    return {
      id: 'EV-L' + (2600 + seq * 7),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      type: p.type,
      level: p.level,
      place,
      status: Math.random() < 0.55 ? '处置中' : '已派单',
      duration: rint(4, 40) + ' 分钟',
      live: true,
    };
  }

  function makeTick() {
    const D = global.CITY_DATA;
    const h = new Date().getHours();
    return {
      ts: Date.now(),
      load: Math.max(0, (D.energy.load24h[h] || 600) + rnd(-25, 25)),      // MW
      flow: Math.max(0, (D.traffic.flow24h[h] || 3000) + rnd(-260, 260)),   // 辆/h
      aqi: Math.max(12, D.environment.aqi + rnd(-4, 4)),
      jamIndex: +(1.45 + Math.sin(Date.now() / 60000) * 0.2 + rnd(-0.05, 0.05)).toFixed(2),
      online: 12800 + rint(-30, 60),
    };
  }

  function emit(kind, payload) {
    listeners[kind].forEach(cb => { try { cb(payload); } catch (e) { console.error(e); } });
  }

  function start() {
    if (started) return;
    started = true;
    // 每 3 秒一次指标抖动
    setInterval(() => emit('tick', makeTick()), 3000);
    // 每 8~16 秒随机推送一起新事件
    (function scheduleEvent() {
      setTimeout(() => {
        emit('event', makeEvent());
        scheduleEvent();
      }, rint(8000, 16000));
    })();
  }

  global.CityLive = {
    on(kind, cb) { if (listeners[kind]) listeners[kind].push(cb); },
    start,
    now: makeTick,
  };
})(window);
