/* Drag-to-reorder for prototype lists. Standalone (no Kit dependency) so the workout log can use it too.
   Delegated on document, so lists can be re-rendered freely.
   Touch / mouse: press the grip and drag. Keyboard: focus the grip, Space to pick up, Up/Down to move, Space to drop, Esc to cancel.
   Sortable.attach('#dayList', {item:'.sort-item', handle:'.grip', onMove(from, to), name(i), announce(text)}) */
(function(){
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lists = [];
function attach(sel, o){ if (!lists.some(l => l.sel === sel)) lists.push({sel, ...o}); else Object.assign(lists.find(l => l.sel === sel), o); }
const find = t => { for (const l of lists){ const list = t.closest?.(l.sel); if (list){ const h = t.closest(l.handle); if (h && list.contains(h)) return {l, list, h}; } } return null; };
const itemsOf = (list, l) => [...list.querySelectorAll(l.item)].filter(x => x.closest(l.sel) === list);
const scroller = list => list.closest('.scroll,.bd,.main') || document.scrollingElement;

let drag = null, raf = 0, vel = 0, lastY = 0;
document.addEventListener('pointerdown', ev => {
  if (ev.button > 0) return;
  const f = find(ev.target); if (!f) return;
  const {l, list, h} = f, el = h.closest(l.item), all = itemsOf(list, l), from = all.indexOf(el); if (from < 0) return;
  ev.preventDefault();
  try { h.setPointerCapture(ev.pointerId); } catch {}
  const sc = scroller(list);
  drag = {l, list, el, all, from, to:from, rects:all.map(x => x.getBoundingClientRect()), y0:ev.clientY, s0:sc.scrollTop, sc, id:ev.pointerId};
  drag.h = drag.rects[from].height;
  el.classList.add('dragging'); list.classList.add('sorting');
  all.forEach(x => { if (x !== el) x.style.transition = reduce ? 'none' : 'transform .18s cubic-bezier(.16,1,.3,1)'; });
  try { navigator.vibrate && navigator.vibrate(8); } catch {}
});
document.addEventListener('pointermove', ev => {
  if (!drag || ev.pointerId !== drag.id) return;
  ev.preventDefault(); lastY = ev.clientY; edge(); move();
}, {passive:false});
function move(){
  const d = drag, dy = lastY - d.y0 + (d.sc.scrollTop - d.s0);
  d.el.style.transform = `translateY(${dy}px)`;
  const r0 = d.rects[d.from], mid = r0.top + r0.height / 2 + dy;
  let to = 0; d.rects.forEach((r, i) => { if (i !== d.from && mid > r.top + r.height / 2) to++; });
  d.to = to;
  d.all.forEach((x, i) => {
    if (i === d.from) return;
    const s = d.from < to && i > d.from && i <= to ? -d.h : d.from > to && i >= to && i < d.from ? d.h : 0;
    x.style.transform = s ? `translateY(${s}px)` : '';
  });
}
function end(ev){
  if (!drag || (ev && ev.pointerId !== drag.id)) return;
  const {l, from, to, all, el, list} = drag; drag = null; vel = 0; cancelAnimationFrame(raf); raf = 0;
  all.forEach(x => { x.style.transform = ''; x.style.transition = ''; });
  el.classList.remove('dragging'); list.classList.remove('sorting');
  if (from !== to){ l.onMove(from, to); l.announce && l.announce(`${l.name ? l.name(to) : 'Item'} moved to position ${to + 1} of ${all.length}.`); }
}
document.addEventListener('pointerup', end);
document.addEventListener('pointercancel', end);
function edge(){
  const r = drag.sc.getBoundingClientRect(), z = 56;
  vel = lastY < r.top + z ? -Math.ceil((r.top + z - lastY) / 5) : lastY > r.bottom - z ? Math.ceil((lastY - (r.bottom - z)) / 5) : 0;
  if (vel && !raf){ const loop = () => { if (!vel || !drag){ raf = 0; return; } drag.sc.scrollTop += vel; move(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
}

/* keyboard */
let held = null;
document.addEventListener('keydown', ev => {
  const f = find(ev.target); if (!f) return;
  const {l, list, h} = f, all = itemsOf(list, l), i = all.indexOf(h.closest(l.item));
  const say = t => l.announce && l.announce(t), nm = k => l.name ? l.name(k) : 'Item';
  const refocus = to => requestAnimationFrame(() => { const nl = document.querySelector(l.sel); const nh = nl && itemsOf(nl, l)[to]?.querySelector(l.handle); if (nh){ nh.focus(); if (held){ nh.setAttribute('aria-pressed', 'true'); nh.closest(l.item).classList.add('held'); } } });
  if (ev.key === ' ' || ev.key === 'Enter'){
    ev.preventDefault();
    if (!held){ held = {start:i}; h.setAttribute('aria-pressed', 'true'); h.closest(l.item).classList.add('held'); say(`${nm(i)} picked up, position ${i + 1} of ${all.length}. Arrow keys to move, Space to drop.`); }
    else { held = null; h.setAttribute('aria-pressed', 'false'); h.closest(l.item).classList.remove('held'); say(`Dropped at position ${i + 1}.`); }
  } else if (held && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')){
    ev.preventDefault();
    const to = i + (ev.key === 'ArrowUp' ? -1 : 1); if (to < 0 || to >= all.length) return;
    l.onMove(i, to); refocus(to); say(`Position ${to + 1} of ${all.length}.`);
  } else if (held && ev.key === 'Escape'){
    ev.preventDefault(); ev.stopPropagation();
    const start = held.start; held = null;
    if (i !== start){ l.onMove(i, start); refocus(start); }
    h.setAttribute('aria-pressed', 'false'); h.closest(l.item).classList.remove('held'); say('Move cancelled.');
  }
}, true);
document.addEventListener('focusout', ev => { if (held && ev.target.closest?.('.grip') && !ev.relatedTarget?.closest?.('.grip')) setTimeout(() => { if (!document.activeElement?.closest?.('.grip')) held = null; }, 0); });

window.Sortable = {attach};
})();
