/* Tiny SVG charts for the prototypes. One series per chart (ink), the latest/current mark in orange and always labeled
   (orange is 2.98:1 on Tyvek, so it never carries a value alone). Every chart has a hover/tap tooltip and a table view. */
(function(){
const {esc, fmt} = Kit;
const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

/* points: [{x:Date|label, y:number, label:string, sub?:string}] ; opts: {kind:'line'|'bar', unit, yFmt, height, hi:index, title, xFmt, zero} */
function chart(points, opts = {}){
  const id = 'ch' + (++uid);
  const H = opts.height || 180, W = 360, padL = 36, padR = 12, padT = 16, padB = 26;
  if (!points.length) return `<div class="chart empty"><p>${opts.empty || 'Nothing logged in this range yet.'}</p></div>`;
  const ys = points.map(p => p.y);
  let lo = opts.zero ? 0 : Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi){ lo -= 1; hi += 1; }
  const span = hi - lo, stepRaw = span / 3, mag = Math.pow(10, Math.floor(Math.log10(stepRaw))), step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= stepRaw);
  lo = opts.zero ? 0 : Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const ticks = []; for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  const n = points.length, iw = W - padL - padR, ih = H - padT - padB;
  const X = i => opts.kind === 'bar' ? padL + iw * (i + .5) / n : padL + (n === 1 ? iw / 2 : iw * i / (n - 1));
  const Y = v => padT + ih * (1 - (v - lo) / (hi - lo));
  const hiIdx = opts.hi ?? n - 1;
  const yF = opts.yFmt || (v => fmt(v, 1));
  let marks = '';
  if (opts.kind === 'bar'){
    const bw = Math.min(24, iw / n - 2);
    points.forEach((p, i) => {
      const x = X(i) - bw / 2, y = Y(p.y), h = Math.max(0, Y(lo) - y), r = Math.min(4, h);
      const d = h <= 0 ? '' : `M${x},${Y(lo)}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${Y(lo)}Z`;
      marks += `<path d="${d}" class="${i === hiIdx ? 'hi' : 'm'}${p.muted ? ' mu' : ''}"/>`;
    });
  } else {
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
    marks += `<path d="${d}" class="ln"/>`;
    points.forEach((p, i) => { if (i === hiIdx || p.dot) marks += `<circle cx="${X(i)}" cy="${Y(p.y)}" r="${i === hiIdx ? 5 : 4}" class="${i === hiIdx ? 'hi' : 'm'}"/>`; });
  }
  const hp = points[hiIdx];
  const lx = Math.min(W - padR, Math.max(padL, X(hiIdx))), ly = Y(hp.y) - 9;
  const lab = opts.kind === 'bar'
    ? `<text x="${X(hiIdx)}" y="${Math.max(11, ly)}" text-anchor="middle" class="vl">${esc(hp.short ?? yF(hp.y))}</text>`
    : `<text x="${lx}" y="${Math.max(11, ly)}" text-anchor="${hiIdx === n - 1 ? 'end' : 'middle'}" class="vl">${esc(hp.label ?? yF(hp.y))}</text>`;
  const grid = ticks.map(v => `<line x1="${padL}" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}" class="gr"/><text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" class="ax">${yF(v)}</text>`).join('');
  const xl = opts.xTicks || [0, Math.floor((n - 1) / 2), n - 1];
  const xlab = [...new Set(xl)].map(i => points[i] ? `<text x="${X(i)}" y="${H - 8}" text-anchor="${i === 0 && opts.kind !== 'bar' ? 'start' : i === n - 1 && opts.kind !== 'bar' ? 'end' : 'middle'}" class="ax">${esc(points[i].x)}</text>` : '').join('');
  const hits = points.map((p, i) => { const w = iw / n; return `<rect x="${opts.kind === 'bar' ? X(i) - w / 2 : X(i) - w / 2}" y="${padT}" width="${w}" height="${ih}" class="hit" data-i="${i}" tabindex="-1"/>`; }).join('');
  const table = `<table class="ctable" hidden><caption class="sr">${esc(opts.title || '')}</caption><thead><tr><th>${opts.xHead || 'Date'}</th><th>${opts.yHead || 'Value'}</th></tr></thead><tbody>${points.map(p => `<tr><td>${esc(p.x)}</td><td>${esc(p.label ?? yF(p.y))}${p.sub ? ` · ${esc(p.sub)}` : ''}</td></tr>`).join('')}</tbody></table>`;
  CH[id] = {points, yF};
  return `<figure class="chart" id="${id}" aria-label="${esc(opts.title || 'Chart')}">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title || '')}: latest ${esc(hp.label ?? yF(hp.y))}">${grid}${marks}${lab}${xlab}<line class="xh" x1="0" x2="0" y1="${padT}" y2="${padT + ih}" visibility="hidden"/>${hits}</svg>
    <div class="tipbox" role="status" hidden></div>
    ${table}
    <button class="tview" data-act="ctable" data-id="${id}" aria-pressed="false">Show as table</button>
  </figure>`;
}
const CH = {};
function hover(ev){
  const r = ev.target.closest?.('.chart .hit'); const fig = ev.target.closest?.('.chart');
  document.querySelectorAll('.chart .tipbox').forEach(t => { if (!fig || !fig.contains(t)) t.hidden = true; });
  document.querySelectorAll('.chart .xh').forEach(l => { if (!fig || !fig.contains(l)) l.setAttribute('visibility', 'hidden'); });
  if (!r) return;
  const c = CH[fig.id], p = c.points[+r.dataset.i];
  const t = fig.querySelector('.tipbox');
  t.innerHTML = `<b>${esc(p.label ?? c.yF(p.y))}</b> ${esc(p.x)}${p.sub ? `<br>${esc(p.sub)}` : ''}`;
  t.hidden = false;
  const box = fig.getBoundingClientRect(), rb = r.getBoundingClientRect();
  const cx = rb.left + rb.width / 2 - box.left;
  t.style.left = Math.max(4, Math.min(box.width - t.offsetWidth - 4, cx - t.offsetWidth / 2)) + 'px';
  const xh = fig.querySelector('.xh'), sx = +r.getAttribute('x') + +r.getAttribute('width') / 2;
  xh.setAttribute('x1', sx); xh.setAttribute('x2', sx); xh.setAttribute('visibility', 'visible');
}
document.addEventListener('pointermove', hover);
document.addEventListener('pointerdown', hover);
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="ctable"]'); if (!b) return;
  const fig = document.getElementById(b.dataset.id), t = fig.querySelector('.ctable'), on = t.hidden;
  t.hidden = !on; fig.querySelector('svg').style.display = on ? 'none' : ''; b.textContent = on ? 'Show as chart' : 'Show as table'; b.setAttribute('aria-pressed', on);
});
window.Chart = {chart};
})();
