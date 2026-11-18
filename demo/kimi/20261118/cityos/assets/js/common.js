/* ============================================================
 * CityOS 公共层 · common.js
 * 页面外壳（侧栏/顶栏）、实时时钟、ECharts 统一主题与工具
 * ============================================================ */
(function (global) {
  'use strict';

  const NAV = [
    { group: '指挥中心' },
    { id: 'screen',    href: 'screen.html',    ico: '🖥️', label: '可视化大屏' },
    { group: '运行监测' },
    { id: 'overview',  href: 'index.html',     ico: '📊', label: '态势总览' },
    { id: 'sandbox',   href: 'sandbox.html',   ico: '🏙️', label: '3D 城市沙盘' },
    { id: 'traffic',   href: 'traffic.html',   ico: '🚦', label: '交通运行' },
    { id: 'energy',    href: 'energy.html',    ico: '⚡', label: '能源与碳排' },
    { id: 'water',     href: 'water.html',     ico: '💧', label: '水务与环境' },
    { group: '指挥与分析' },
    { id: 'emergency', href: 'emergency.html', ico: '🚨', label: '应急指挥' },
    { id: 'citizen',   href: 'citizen.html',   ico: '📞', label: '市民服务' },
    { id: 'forecast',  href: 'forecast.html',  ico: '🔮', label: '预测研判' },
    { id: 'data',      href: 'data.html',      ico: '🗃️', label: '数据分析' },
    { group: '系统' },
    { id: 'about',     href: 'about.html',     ico: 'ℹ️', label: '系统说明' },
  ];

  const TITLES = {
    screen:    ['指挥中心', '可视化大屏'],
    overview:  ['运行监测', '态势总览'],
    sandbox:   ['运行监测', '3D 城市沙盘'],
    traffic:   ['运行监测', '交通运行监测'],
    energy:    ['运行监测', '能源与碳排'],
    water:     ['运行监测', '水务与环境'],
    emergency: ['指挥与分析', '应急指挥中心'],
    citizen:   ['指挥与分析', '市民服务热线'],
    forecast:  ['指挥与分析', '预测研判工作台'],
    data:      ['指挥与分析', '数据分析'],
    about:     ['系统', '系统说明'],
  };

  /* ---------- 外壳挂载 ---------- */
  function mount(pageId) {
    const sb = document.getElementById('sidebar');
    const tb = document.getElementById('topbar');
    if (sb) {
      let html = `
        <div class="brand">
          <div class="name">梅塔维尔 <em>CityOS</em></div>
          <div class="sub">City Operation System</div>
        </div><nav>`;
      NAV.forEach(n => {
        if (n.group) { html += `<div class="nav-group">${n.group}</div>`; return; }
        html += `<a class="nav-item ${n.id === pageId ? 'active' : ''}" href="${n.href}">
          <span class="ico">${n.ico}</span>${n.label}</a>`;
      });
      html += `</nav><div class="foot">v2.4.1 · 静态演示环境<br/>数据为程序生成模拟值</div>`;
      sb.innerHTML = html;
    }
    if (tb) {
      const [grp, name] = TITLES[pageId] || ['', ''];
      tb.innerHTML = `
        <div class="crumb"><span class="path">${grp} /</span>${name}</div>
        <div class="spacer"></div>
        <div class="badge-env"><span class="dot"></span>全市 12,847 个物联感知设备在线</div>
        <div class="clock" id="top-clock">--:--:--</div>`;
    }
    startClock();
  }

  /* ---------- 实时时钟 ---------- */
  let clockStarted = false;
  function startClock() {
    if (clockStarted) return;
    clockStarted = true;
    const tick = () => {
      const el = document.getElementById('top-clock');
      if (!el) return;
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      const week = '日一二三四五六'[d.getDay()];
      el.textContent = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 周${week} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- ECharts 统一主题 ---------- */
  const CHART_FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';
  const PALETTE = ['#4fc3f7', '#7c5cff', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#f472b6', '#a3e635'];

  function baseOption() {
    return {
      color: PALETTE,
      textStyle: { fontFamily: CHART_FONT, color: '#a9bcd8' },
      grid: { left: 12, right: 16, top: 32, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,16,28,0.92)',
        borderColor: 'rgba(120,180,255,0.3)',
        textStyle: { color: '#e8f1ff', fontSize: 12, fontFamily: CHART_FONT },
      },
      legend: { textStyle: { color: '#a9bcd8', fontSize: 11 }, top: 2, icon: 'roundRect', itemWidth: 12, itemHeight: 3 },
      xAxis: {
        axisLine: { lineStyle: { color: 'rgba(120,180,255,0.25)' } },
        axisTick: { show: false },
        axisLabel: { color: '#64789a', fontSize: 10.5 },
        splitLine: { show: false },
      },
      yAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64789a', fontSize: 10.5 },
        splitLine: { lineStyle: { color: 'rgba(120,180,255,0.08)' } },
      },
    };
  }
  function merge(base, extra) {
    const out = { ...base };
    Object.keys(extra).forEach(k => {
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        out[k] = { ...base[k], ...extra[k] };
      } else out[k] = extra[k];
    });
    return out;
  }
  function makeChart(el, option) {
    if (!el || typeof echarts === 'undefined') return null;
    const chart = echarts.init(el, null, { renderer: 'canvas' });
    chart.setOption(merge(baseOption(), option));
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return chart;
  }
  // 迷你面积图（KPI 卡用）
  function sparkline(el, data, color) {
    if (!el || typeof echarts === 'undefined') return;
    const c = echarts.init(el);
    c.setOption({
      grid: { left: 0, right: 0, top: 2, bottom: 0 },
      xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
      yAxis: { type: 'value', show: false, min: v => v.min * 0.9 },
      series: [{
        type: 'line', data, smooth: true, symbol: 'none',
        lineStyle: { width: 1.6, color: color || '#4fc3f7' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: (color || '#4fc3f7') + '55' },
              { offset: 1, color: (color || '#4fc3f7') + '00' },
            ],
          },
        },
      }],
      tooltip: { show: false },
    });
    new ResizeObserver(() => c.resize()).observe(el);
    return c;
  }

  /* ---------- DOM / 格式工具 ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const fmt = (n, d = 0) => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: d, minimumFractionDigits: d });

  const LEVEL_TAG = { 严重拥堵: 'danger', 拥堵: 'warn', 缓行: 'info', 畅通: 'ok' };
  const EVT_TAG = { danger: 'danger', warn: 'warn', info: 'info', mute: 'mute' };

  function tag(text, cls) { return `<span class="tag ${cls || ''}">${text}</span>`; }

  /* ---------- CSV 导出 ---------- */
  function exportCSV(filename, headers, rows) {
    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------- 数字滚动动画 ---------- */
  function countUp(el, target, { duration = 1200, decimals = 0, suffix = '' } = {}) {
    if (!el) return;
    const t0 = performance.now();
    const from = 0;
    (function step(now) {
      const k = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (target - from) * e, decimals) + suffix;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  global.CityOS = { mount, makeChart, sparkline, baseOption, $, $$, fmt, tag, LEVEL_TAG, EVT_TAG, exportCSV, countUp, PALETTE };
})(window);
