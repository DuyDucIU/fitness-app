/* Shared prototype kit (classic script, works from file://). Sample data only — nothing here talks to Dexie, the engine or the API. */
(function(){
const LOCALE = 'en-US'; /* product copy for prototypes is English; number + date formatting follows the active locale */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n, d = 2) => n == null || Number.isNaN(n) ? '' : Number(n).toLocaleString(LOCALE, {maximumFractionDigits: d});
const parse = s => { const v = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(v) ? v : null; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/* durations: shown as m:ss; typed as "1:30", or digits only where 1–2 digits are seconds and 3–4 digits are m ss ("130" = 1:30) */
const dur = sec => sec == null ? '–' : mmss(sec * 1000);
function parseDur(v){
  const t = String(v ?? '').trim(); if (!t) return null;
  if (t.includes(':')){ const [m, s] = t.split(':').map(x => parseInt(x || '0', 10)); return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : null; }
  const d = t.replace(/\D/g, ''); if (!d) return null;
  return d.length <= 2 ? +d : +d.slice(0, -2) * 60 + +d.slice(-2);
}
/* one set as text, by how the exercise is logged (DATA.kind): 80 × 8 · +5 × 8 · BW × 12 · 12 reps · 0:45 */
function setText(k, set, conv = x => x){
  const [w, r, t] = set;
  if (k === 'time') return dur(t);
  if (k === 'reps') return `${r ?? '–'} reps`;
  if (k === 'bw+') return `${w ? '+' + fmt(conv(w)) : 'BW'} × ${r ?? '–'}`;
  return `${w == null ? '–' : fmt(conv(w))} × ${r ?? '–'}`;
}
/* a whole exercise's sets, compact: 80×8 · 8 · 7 (first load, then reps) */
function setsText(k, sets, conv = x => x){
  if (!sets?.length) return '';
  if (k === 'time') return sets.map(s => dur(s[2])).join(' · ');
  if (k === 'reps') return sets.map(s => s[1]).join(' · ');
  const same = sets.every(s => s[0] === sets[0][0]);
  const load = w => k === 'bw+' ? (w ? '+' + fmt(conv(w)) : 'BW') : fmt(conv(w));
  return same ? `${load(sets[0][0])}×${sets.map(s => s[1]).join(' · ')}` : sets.map(s => `${load(s[0])}×${s[1]}`).join(' · ');
}
const plural = (n, w, p) => `${fmt(n)} ${n === 1 ? w : (p || w + 's')}`;
const shortDate = d => d.toLocaleDateString(LOCALE, {month:'short', day:'numeric'});
const longDate = d => d.toLocaleDateString(LOCALE, {weekday:'long', month:'short', day:'numeric'});
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const e1rm = (w, r) => w * (1 + r / 30);
const ladder = (w, step) => Math.max(0, Math.round(w / step) * step);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LB = 2.20462;

const I = {
  check:'<path d="M20 6 9 17l-5-5"/>', minus:'<path d="M5 12h14"/>', plus:'<path d="M5 12h14M12 5v14"/>',
  more:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', up:'<path d="m18 15-6-6-6 6"/>', down:'<path d="m6 9 6 6 6-6"/>',
  left:'<path d="m15 18-6-6 6-6"/>', right:'<path d="m9 18 6-6-6-6"/>', x:'<path d="M18 6 6 18M6 6l12 12"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  swap:'<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  off:'<path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M16.9 11.3a10 10 0 0 1 2.2 1.6M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5a15 15 0 0 1 11.3 3.8M12 20h.01"/>',
  cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/><path d="m9.5 14 2 2 3.5-3.5"/>',
  play:'<path d="M7 4v16l13-8z"/>', edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  grip:'<circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>',
  alert:'<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  share:'<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  flag:'<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>', scale:'<path d="M5 21h14"/><path d="M6 7h12l-2 9H8Z"/><path d="M12 7V3"/>',
  chart:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>', history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  dumbbell:'<path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/>', calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', google:'<path d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5Z" fill="currentColor" stroke="none"/><path d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z" fill="currentColor" stroke="none" opacity=".75"/><path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9Z" fill="currentColor" stroke="none" opacity=".55"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z" fill="currentColor" stroke="none" opacity=".9"/>',
  pause:'<path d="M8 5v14M16 5v14"/>', target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  download:'<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 21h14"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
};
const ic = (k, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k] || ''}</svg>`;

/* ---------- sync pill ---------- */
function syncPill(el, st){
  if (!el) return;
  if (!st.online){ el.className = 'sync off'; el.innerHTML = `${ic('off')}<span>Offline${st.pending ? ' · ' + plural(st.pending, 'change') : ''}</span>`; el.title = st.pending ? `${plural(st.pending, 'change')} saved on this device, waiting for a connection` : 'Offline. Everything you log is saved on this device.'; return; }
  el.title = '';
  if (st.pending){ el.className = 'sync'; el.innerHTML = `<span class="dot"></span><span>${st.syncing ? 'Syncing…' : `${st.pending} pending`}</span>`; return; }
  el.className = 'sync ok'; el.innerHTML = `<span class="dot"></span><span>Synced</span>`;
}

/* ---------- sheet ---------- */
let lastFocus = null, onClose = null;
function openSheet(title, body, opts = {}){
  const sh = $('#sheet'), wasOpen = sh.classList.contains('open');
  if (!wasOpen) lastFocus = document.activeElement;
  /* opening a different sheet from a sheet (e.g. exercise settings → Change exercise): drop the old one and slide the new one up.
     Re-rendering the same sheet (same title) stays in place. */
  if (wasOpen && $('#sheetTitle').textContent !== title){ sh.style.transition = 'none'; sh.classList.remove('open'); void sh.offsetHeight; sh.style.transition = ''; $('#sheetBody').scrollTop = 0; }
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = body;
  const ft = $('#sheetFoot');
  if (ft){ ft.innerHTML = opts.foot || ''; ft.hidden = !opts.foot; }
  onClose = opts.onClose || null;
  sh.classList.add('open'); $('#scrim').classList.add('open');
  setTimeout(() => ($('#sheetBody [autofocus]') || $('#sheet .hd button')).focus({preventScroll:true}), 60);
}
function closeSheet(){
  $('#sheet').classList.remove('open'); $('#scrim').classList.remove('open');
  if (lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
  const f = onClose; onClose = null; f && f();
}
const sheetOpen = () => $('#sheet')?.classList.contains('open');

/* ---------- toast / live region ---------- */
let toastT;
function toast(html, ms = 2800){ const t = $('#toast'); if (!t) return; t.innerHTML = html; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
function hideToast(){ clearTimeout(toastT); $('#toast')?.classList.remove('show'); }
function announce(t){ const a = $('#alert'); if (!a) return; a.textContent = ''; setTimeout(() => { a.textContent = t; }, 30); }

/* ---------- demo panel (desktop aside + mobile flask button) ---------- */
let demoFn = () => '';
function demo(fn){ demoFn = fn; renderDemo(); }
function renderDemo(){ $$('[data-demo]').forEach(n => { n.innerHTML = demoFn(); }); }
function openDemo(){ openSheet('Prototype · sample data', `<p style="margin-bottom:12px">Everything here is mock data for design review, not real data.</p><div class="demo-list" data-demo>${demoFn()}</div>`); }
const pressed = (on, label) => `aria-pressed="${!!on}"`;

document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && sheetOpen()) closeSheet(); });

/* ---------- shared markup ---------- */
const shellMarkup = `
  <div class="scrim" id="scrim" data-act="close"></div>
  <section class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
    <div class="grab"></div>
    <div class="hd"><h2 id="sheetTitle"></h2><button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button></div>
    <div class="bd" id="sheetBody"></div>
    <div class="ft" id="sheetFoot" hidden></div>
  </section>
  <div class="live"><div class="toast" id="toast" role="status" aria-live="polite"></div></div>
  <div class="sr" aria-live="assertive" id="alert"></div>`;
const demoBtn = `<button class="icon-btn demo-btn" data-act="demo" aria-label="Prototype controls"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2v7.31L4.5 19a2 2 0 0 0 1.73 3h11.54a2 2 0 0 0 1.73-3L14 9.31V2M8.5 2h7M7 16h10"/></svg></button>`;

/* ---------- app shell (out-of-session navigation) ----------
   One place decides how destinations are reached; every slice calls navFoot()/navTop(). Inside a workout the shell is gone. */
const ROOT = (() => { const p = location.pathname.replace(/\\/g, '/'); const i = p.lastIndexOf('/prototypes/'); return i >= 0 ? p.slice(0, i + 12) : '../'; })();
/* Shell chosen in the decision round: bib wallet on Today + a bottom tab bar. Me holds Goals and Settings; body measurements live in Progress. */
const DEST = [
  {id:'today', label:'Today', href:'home/index.html', icon:'calendar'},
  {id:'plans', label:'Plans', href:'plans/index.html', icon:'list'},
  {id:'history', label:'History', href:'history/index.html', icon:'history'},
  {id:'progress', label:'Progress', href:'progress/index.html', icon:'chart'},
  {id:'me', label:'Me', href:'me/index.html', icon:'user'},
];
const href = id => ROOT + DEST.find(d => d.id === id).href;
/* Footer for a root screen: optional primary action (64px) above the tab bar. Drill-in screens pass their own foot and no tabs. */
function navFoot(active, primary = ''){
  return `<div class="foot tabbed">${primary ? `<div class="dock">${primary}</div>` : ''}<nav class="tabs" aria-label="Main">${DEST.map(d => `<a href="${ROOT + d.href}" ${d.id === active ? 'aria-current="page"' : ''}>${ic(d.icon)}<span>${d.label}</span></a>`).join('')}</nav></div>`;
}
function menuSheet(){}

/* Banners every slice can show */
const resumeBar = s => `<a class="resume" href="${ROOT}workout-log/index.html" aria-label="Workout in progress: ${esc(s.name)}, ${s.elapsed}. Resume">
  <span class="name">${esc(s.name)} · in progress<span>${s.done} sets logged</span></span><b class="num">${s.elapsed}</b><span class="btn">Resume</span></a>`;

window.Kit = {LOCALE, $, $$, fmt, parse, esc, mmss, dur, parseDur, setText, setsText, plural, shortDate, longDate, norm, e1rm, ladder, reduce, LB, I, ic,
  syncPill, openSheet, closeSheet, sheetOpen, toast, hideToast, announce, demo, renderDemo, openDemo, pressed, shellMarkup, demoBtn,
  ROOT, DEST, href, navFoot, menuSheet, resumeBar};
})();
