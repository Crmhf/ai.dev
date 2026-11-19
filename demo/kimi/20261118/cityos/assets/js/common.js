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
    { id: 'sandbox',   href: 'sandbox.html',   ico: '🏙️', label: '数智一张图' },
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
    sandbox:   ['运行监测', '数智一张图'],
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
          <div class="name">武汉 <em>CityOS</em></div>
          <div class="sub">City Operation System</div>
          <button class="sb-toggle" id="sb-toggle" title="收起 / 展开侧栏">⇤</button>
        </div><nav>`;
      NAV.forEach(n => {
        if (n.group) { html += `<div class="nav-group">${n.group}</div>`; return; }
        html += `<a class="nav-item ${n.id === pageId ? 'active' : ''}" href="${n.href}" title="${n.label}">
          <span class="ico">${n.ico}</span><span class="lbl">${n.label}</span></a>`;
      });
      html += `</nav><div class="foot">v2.4.1 · 静态演示环境<br/>数据为程序生成模拟值</div>`;
      sb.innerHTML = html;
      initSidebarToggle();
    }
    if (tb) {
      const [grp, name] = TITLES[pageId] || ['', ''];
      tb.innerHTML = `
        <div class="crumb"><span class="path">${grp} /</span>${name}</div>
        <div class="spacer"></div>
        <div class="alert-bell" id="alert-bell" title="告警中心">🔔<span class="alert-badge" id="alert-badge"></span></div>
        <div class="badge-env"><span class="dot"></span>全市 12,847 个物联感知设备在线</div>
        <div class="clock" id="top-clock">--:--:--</div>`;
      mountAlertCenter();
    }
    startClock();
  }

  /* ---------- 侧栏折叠（localStorage 记忆 + 窄屏自动收起） ---------- */
  const SB_KEY = 'cityos_sidebar';
  function initSidebarToggle() {
    let pref = null;
    try { pref = localStorage.getItem(SB_KEY); } catch (e) { /* ignore */ }
    // 无用户偏好时：窄屏（<1100px）默认收起
    const collapsed = pref === null ? (window.innerWidth || 1920) < 1100 : pref === '1';
    document.body.classList.toggle('sb-collapsed', collapsed);
    const btn = document.getElementById('sb-toggle');
    if (btn) {
      btn.textContent = collapsed ? '⇥' : '⇤';
      btn.addEventListener('click', () => {
        const next = !document.body.classList.contains('sb-collapsed');
        document.body.classList.toggle('sb-collapsed', next);
        btn.textContent = next ? '⇥' : '⇤';
        try { localStorage.setItem(SB_KEY, next ? '1' : '0'); } catch (e) { /* ignore */ }
      });
    }
  }

  /* ---------- 全局告警中心 ----------
   * 跨页面共享的告警收件箱：
   *  - 以 data.js 静态事件为已读基线（首次初始化）
   *  - 订阅 CityLive 实时事件流，新事件未读并顶栏角标计数
   *  - localStorage 持久化（key: cityos_alerts，最多保留 30 条）
   */
  const ALERT_KEY = 'cityos_alerts';
  const ALERT_MAX = 30;
  const ALERT_LEVEL_NAME = { danger: '严重', warn: '关注', info: '提示', mute: '一般' };

  const CityAlerts = {
    list: [],
    _panelOpen: false,

    init() {
      let stored = null;
      try { stored = JSON.parse(localStorage.getItem(ALERT_KEY)); } catch (e) { /* 损坏时重建 */ }
      if (!Array.isArray(stored)) {
        stored = (global.CITY_DATA ? global.CITY_DATA.emergency.events.slice(0, 10) : [])
          .map((ev, i) => ({ id: 'seed-' + i, time: ev.time, level: ev.level, type: ev.type, place: ev.place, read: true }));
        this._save(stored);
      }
      this.list = stored;
      // 页面已引入 live.js：直接订阅；未引入（data/about/emergency 等）：动态加载，仅为告警中心供流
      if (typeof global.CityLive !== 'undefined') {
        global.CityLive.on('event', ev => this.push(ev));
      } else {
        const s = document.createElement('script');
        s.src = 'assets/js/live.js';
        s.onload = () => {
          global.CityLive.on('event', ev => this.push(ev));
          global.CityLive.start();
        };
        document.head.appendChild(s);
      }
      this.renderBadge();
    },

    _save(list) {
      try { localStorage.setItem(ALERT_KEY, JSON.stringify((list || this.list).slice(0, ALERT_MAX))); } catch (e) { /* 隐私模式等 */ }
    },

    push(ev) {
      this.list.unshift({
        id: 'live-' + Date.now() + '-' + Math.floor(Math.random() * 1e4),
        time: ev.time, level: ev.level, type: ev.type, place: ev.place, read: false,
      });
      this.list = this.list.slice(0, ALERT_MAX);
      this._save();
      this.renderBadge();
      if (this._panelOpen) this.renderPanel();
      const bell = document.getElementById('alert-bell');
      if (bell && ev.level === 'danger') {
        bell.classList.remove('alarm');
        void bell.offsetWidth; // 重启动画
        bell.classList.add('alarm');
      }
    },

    unreadCount() { return this.list.filter(a => !a.read).length; },

    markAllRead() {
      this.list.forEach(a => { a.read = true; });
      this._save();
      this.renderBadge();
      this.renderPanel();
    },

    markRead(id) {
      const a = this.list.find(x => x.id === id);
      if (a && !a.read) { a.read = true; this._save(); this.renderBadge(); this.renderPanel(); }
    },

    renderBadge() {
      const badge = document.getElementById('alert-badge');
      if (!badge) return;
      const n = this.unreadCount();
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.classList.toggle('show', n > 0);
    },

    renderPanel() {
      const panel = document.getElementById('alert-panel');
      if (!panel) return;
      const n = this.unreadCount();
      const rows = this.list.length ? this.list.map(a => `
        <div class="alert-row ${a.read ? '' : 'unread'}" data-aid="${a.id}">
          <span class="t">${a.time}</span>
          ${tag(ALERT_LEVEL_NAME[a.level] || '提示', EVT_TAG[a.level] || 'info')}
          <span class="tag mute" style="flex-shrink:0">${a.type}</span>
          <span class="m">${a.place}</span>
        </div>`).join('')
        : '<div class="ap-empty">暂无告警，城市运行平稳</div>';
      panel.innerHTML = `
        <div class="ap-head">
          <span>告警中心 <span class="dim" style="font-weight:400">未读 ${n} 条</span></span>
          <span class="clear-btn" id="alert-clear">全部已读</span>
        </div>
        <div class="ap-list">${rows}</div>`;
      panel.querySelector('#alert-clear').addEventListener('click', () => this.markAllRead());
      panel.querySelectorAll('.alert-row').forEach(row => {
        row.addEventListener('click', () => this.markRead(row.dataset.aid));
      });
    },

    togglePanel() {
      let panel = document.getElementById('alert-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'alert-panel';
        panel.id = 'alert-panel';
        document.body.appendChild(panel);
        document.addEventListener('click', e => {
          if (this._panelOpen && !panel.contains(e.target) && e.target.id !== 'alert-bell' && !document.getElementById('alert-bell').contains(e.target)) {
            this.togglePanel();
          }
        });
      }
      this._panelOpen = !this._panelOpen;
      panel.classList.toggle('open', this._panelOpen);
      if (this._panelOpen) this.renderPanel();
    },
  };

  let alertCenterMounted = false;
  function mountAlertCenter() {
    if (alertCenterMounted) return;
    alertCenterMounted = true;
    CityAlerts.init();
    const bell = document.getElementById('alert-bell');
    if (bell) bell.addEventListener('click', () => CityAlerts.togglePanel());
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

  global.CityOS = { mount, makeChart, sparkline, baseOption, $, $$, fmt, tag, LEVEL_TAG, EVT_TAG, exportCSV, countUp, PALETTE, alerts: CityAlerts };
})(window);
