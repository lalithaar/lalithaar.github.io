const $ = (id) => document.getElementById(id);
const num = (v) => (v == null ? 0 : v).toLocaleString();
const RANGES = [['7', '7 days'], ['14', '14 days'], ['30', '30 days'], ['90', '90 days'], ['all', 'All']];
let days = '30';
let charts = [];

const CSS = {
  human: '#4f9dff', ai: '#c07cf0', bot: '#5c6474', ok: '#3ecf8e',
  grid: '#262b35', text: '#8b93a4', bar: 'rgba(79,157,255,.13)',
};
// The chart library is a convenience, not a dependency: if the CDN is blocked
// or offline, the tables below still render every number.
const hasChart = typeof Chart !== 'undefined';
if (hasChart) {
  Chart.defaults.color = CSS.text;
  Chart.defaults.borderColor = CSS.grid;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 11;
}

function ranges() {
  $('ranges').innerHTML = '';
  for (const [value, label] of RANGES) {
    const b = document.createElement('button');
    b.textContent = label;
    b.setAttribute('aria-pressed', String(value === days));
    b.onclick = () => { days = value; load(); };
    $('ranges').append(b);
  }
}

/** Render a value/key table. `spec` lists [heading, key, isNumeric] columns. */
function table(el, rows, spec, { bar } = {}) {
  const host = $(el);
  if (!rows || !rows.length) { host.innerHTML = '<p class="empty">Nothing in this range.</p>'; return; }
  const total = bar ? Math.max(...rows.map((r) => r[bar] || 0), 1) : 0;
  const head = spec.map(([, label, n]) => `<th class="${n ? 'n' : ''}">${label}</th>`).join('');
  const body = rows.map((r) => {
    const tds = spec.map(([key, , n]) => {
      const width = bar && key === bar ? ` style="--w:${((r[key] || 0) / total) * 100}%"` : '';
      const cls = `${n ? 'n' : ''} ${bar && key === bar ? 'bar-cell' : ''}`;
      return `<td class="${cls}"${width}>${n ? num(r[key]) : `<span>${r[key] ?? ''}</span>`}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  host.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function chart(id, labels, datasets, kind = 'line') {
  const el = $(id);
  if (!el) return;
  if (!hasChart) {
    const host = el.closest('.chart');
    if (host) host.innerHTML = '<p class="empty">Chart library unavailable offline. The tables below have the same numbers.</p>';
    return;
  }
  const old = Chart.getChart(id);
  if (old) old.destroy();
  charts.push(new Chart(el, {
    type: kind,
    data: { labels, datasets: datasets.map((d) => ({
      label: d.label, data: d.data, borderColor: d.color, backgroundColor: d.fill ? d.color + '22' : d.color,
      borderWidth: 2, tension: .3, pointRadius: 0, pointHoverRadius: 4, fill: !!d.fill, borderRadius: 3,
    })) },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle' } } },
      scales: kind === 'bar'
        ? { y: { beginAtZero: true, grid: { color: CSS.grid } }, x: { grid: { display: false } } }
        : { y: { beginAtZero: true, grid: { color: CSS.grid } }, x: { grid: { display: false } } },
    },
  }));
}

function cards(d) {
  const s = (d.summary || [{}])[0] || {};
  const uniques = (d.uniques || []).reduce((a, r) => a + (r.approx_users || 0), 0);
  const other = Math.max((s.bots || 0) - (s.ai || 0), 0);
  $('cards').innerHTML = [
    ['human', num(s.humans), 'human reads'],
    ['ai', num(s.ai), 'ai fetches'],
    ['bot', num(other), 'other bots'],
    ['', num(s.total), 'all reads'],
    ['', num(uniques), 'approx. unique readers'],
    ['', num(s.avg_per_day), 'avg reads / day'],
  ].map(([c, v, l]) => `<div class="card ${c}"><b>${v}</b><small>${l}</small></div>`).join('');
}

async function load() {
  ranges();
  $('err').style.display = 'none';
  try {
    const res = await fetch(`/api/overview?days=${days}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || res.status);
    const d = body.data;
    for (const [k, v] of Object.entries(d)) {
      if (v && v.error) throw new Error(`${k}: ${v.error}`);
    }

    cards(d);
    const daily = d.daily || [];
    chart('trend', daily.map((r) => r.day), [
      { label: 'humans', data: daily.map((r) => r.humans), color: CSS.human, fill: true },
      { label: 'ai', data: daily.map((r) => r.ai), color: CSS.ai },
      { label: 'other bots', data: daily.map((r) => r.bots - r.ai), color: CSS.bot },
    ]);

    const hrs = Array.from({ length: 24 }, (_, h) => (d.hours || []).find((r) => r.hour === h) || { humans: 0, bots: 0 });
    chart('hours', hrs.map((_, h) => String(h).padStart(2, '0')), [
      { label: 'humans', data: hrs.map((r) => r.humans), color: CSS.human, fill: true },
      { label: 'bots', data: hrs.map((r) => r.bots), color: CSS.bot },
    ]);

    table('pages', d.pages, [['page', 'page'], ['human', 'humans', 1], ['ai', 'ai', 1], ['bots', 'bots', 1]], { bar: 'humans' });
    table('refs', d.refs, [['ref', 'referrer'], ['humans', 'reads', 1]], { bar: 'humans' });
    table('countries', d.countries, [['country', 'country'], ['humans', 'reads', 1]], { bar: 'humans' });
    table('devices', d.devices, [['device', 'device'], ['humans', 'reads', 1]], { bar: 'humans' });
    table('os', d.os, [['os', 'os'], ['humans', 'reads', 1]], { bar: 'humans' });
    table('browsers', d.browsers, [['browser', 'browser'], ['humans', 'reads', 1]], { bar: 'humans' });
    table('regions', d.regions, [['country', 'country'], ['region', 'region'], ['humans', 'reads', 1]], { bar: 'humans' });
    table('kinds', d.kinds, [['kind', 'kind'], ['reads', 'reads', 1]], { bar: 'reads' });
    table('ai_agents', d.ai_agents, [['kind', 'kind'], ['agent', 'agent'], ['fetches', 'fetches', 1], ['pages', 'pages', 1], ['example_ref', 'referrer']]);
    table('ai_refs', d.ai_refs, [['kind', 'kind'], ['ref', 'referrer'], ['fetches', 'fetches', 1], ['agents', 'agents', 1]]);
    table('ai_pages', d.ai_pages, [['page', 'page'], ['fetches', 'fetches', 1], ['agents', 'agents', 1]]);
    table('crawlers', d.crawlers, [['kind', 'kind'], ['bot', 'bot'], ['fetches', 'fetches', 1], ['pages', 'pages', 1]]);
  } catch (error) {
    $('err').style.display = 'block';
    $('err').textContent = 'Could not load: ' + error.message;
  } finally {
    document.body.dataset.ready = '1';
  }
}

load();
