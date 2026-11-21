/* Shared SAMPLE data for every prototype slice. Deterministic, invented for design review — not real users or real results.
   "Today" is pinned to Wednesday 18 Nov 2026 so every slice tells the same story:
   PPL plan, last Push A on Thu 12 Nov (matches prototypes/workout-log), Pull A Sat 14 Nov, Legs Mon 16 Nov, Push A next. */
(function(){
const TODAY = new Date(2026, 10, 18, 9, 30);
const day = (y, m, d, h = 18, min = 0) => new Date(y, m - 1, d, h, min);

/* Exercise catalog — the 42-entry allowlist (apps/api/prisma/seed/catalog.yaml), EN names + draft VI names + aliases. */
const G = {chest:'Chest', back:'Back', shoulders:'Shoulders', biceps:'Biceps', triceps:'Triceps', quads:'Quads', hams:'Hamstrings', glutes:'Glutes', calves:'Calves', core:'Core', cardio:'Cardio'};
const C = (id, name, vi, alias, equip, muscle, extra = {}) => ({id, name, vi, alias, equip, muscle, metric:'weight_reps', load:'total', step:2.5, bar:0, ...extra});
const CATALOG = [
  C('squat', 'Barbell squat', 'Squat tạ đòn', ['squat','gánh tạ'], 'Barbell', ['quads','glutes'], {bar:20}),
  C('bench', 'Barbell bench press', 'Đẩy ngực ngang tạ đòn', ['bench press','bench','đẩy ngực'], 'Barbell', ['chest','triceps'], {bar:20}),
  C('deadlift', 'Barbell deadlift', 'Deadlift tạ đòn', ['deadlift','kéo đất'], 'Barbell', ['hams','glutes','back'], {bar:20, step:5}),
  C('ohp', 'Overhead press', 'Đẩy vai đứng tạ đòn', ['overhead press','ohp','military press','đẩy vai'], 'Barbell', ['shoulders','triceps'], {bar:20}),
  C('row', 'Bent-over barbell row', 'Kéo tạ đòn cúi người', ['barbell row','chèo tạ đòn'], 'Barbell', ['back','biceps'], {bar:20}),
  C('pullup', 'Pull-up', 'Kéo xà', ['pull up','pull-up','hít xà'], 'Pull-up bar', ['back','biceps'], {metric:'reps', load:'added_weight', step:2.5}),
  C('chinup', 'Chin-up', 'Kéo xà ngửa tay', ['chin up','chinup'], 'Pull-up bar', ['back','biceps'], {metric:'reps', load:'added_weight'}),
  C('latpd', 'Wide-grip lat pulldown', 'Kéo xô rộng tay', ['lat pulldown','kéo xô'], 'Cable', ['back','biceps'], {load:'stack', step:5}),
  C('dips', 'Dips', 'Dip tay sau', ['dips','dip','chống xà kép'], 'Dip bars', ['triceps','chest'], {metric:'reps', load:'added_weight'}),
  C('pushup', 'Push-up', 'Hít đất', ['push up','pushup','chống đẩy'], 'Bodyweight', ['chest','triceps'], {metric:'reps', load:'added_weight'}),
  C('bbcurl', 'Barbell curl', 'Cuốn tạ đòn tay trước', ['barbell curl','curl tạ đòn'], 'Barbell', ['biceps'], {bar:10, step:2.5}),
  C('dbcurl', 'Dumbbell curl', 'Cuốn tạ đơn tay trước', ['dumbbell curl','bicep curl','curl tạ đơn'], 'Dumbbell', ['biceps'], {load:'per_dumbbell', step:1}),
  C('hammer', 'Hammer curl', 'Cuốn tạ đơn kiểu búa', ['hammer curl'], 'Dumbbell', ['biceps'], {load:'per_dumbbell', step:1}),
  C('incl', 'Incline dumbbell press', 'Đẩy ngực trên tạ đơn', ['incline dumbbell press','incline','đẩy ngực trên'], 'Dumbbell', ['chest','shoulders'], {load:'per_dumbbell', step:2}),
  C('dbbench', 'Dumbbell bench press', 'Đẩy ngực ngang tạ đơn', ['dumbbell bench press'], 'Dumbbell', ['chest','triceps'], {load:'per_dumbbell', step:2}),
  C('inclbb', 'Incline barbell bench press', 'Đẩy ngực trên tạ đòn', ['incline bench press','incline bench'], 'Barbell', ['chest','shoulders'], {bar:20}),
  C('dbfly', 'Dumbbell fly', 'Ép ngực tạ đơn', ['dumbbell fly','fly','ép ngực'], 'Dumbbell', ['chest'], {load:'per_dumbbell', step:1}),
  C('fly', 'Cable crossover', 'Ép ngực cáp', ['cable crossover','cable fly'], 'Cable', ['chest'], {load:'stack', step:5}),
  C('rdl', 'Romanian deadlift', 'Deadlift kiểu Romania', ['rdl','romanian deadlift'], 'Barbell', ['hams','glutes'], {bar:20}),
  C('legpress', 'Leg press', 'Đạp đùi máy', ['leg press','đạp đùi'], 'Machine', ['quads','glutes'], {load:'total', step:10}),
  C('legext', 'Leg extension', 'Duỗi đùi trước máy', ['leg extension'], 'Machine', ['quads'], {load:'stack', step:5}),
  C('legcurl', 'Lying leg curl', 'Gập đùi sau nằm máy', ['leg curl','lying leg curl','gập đùi sau'], 'Machine', ['hams'], {load:'stack', step:5}),
  C('calf', 'Standing calf raise', 'Nhón bắp chân đứng máy', ['calf raise','nhón bắp chân'], 'Machine', ['calves'], {load:'stack', step:5}),
  C('scalf', 'Seated calf raise', 'Nhón bắp chân ngồi máy', ['seated calf raise'], 'Machine', ['calves'], {load:'stack', step:5}),
  C('plank', 'Plank', 'Plank', ['chống plank'], 'Bodyweight', ['core'], {metric:'duration', load:null, step:null}),
  C('crunch', 'Crunch', 'Cuốn bụng', ['crunch','gập bụng'], 'Bodyweight', ['core'], {metric:'reps', load:null}),
  C('hlr', 'Hanging leg raise', 'Treo xà nâng chân', ['hanging leg raise','nâng chân xà'], 'Pull-up bar', ['core'], {metric:'reps', load:null}),
  C('lat', 'Dumbbell lateral raise', 'Nâng tạ đơn sang ngang', ['lateral raise','side raise','vai giữa'], 'Dumbbell', ['shoulders'], {load:'per_dumbbell', step:1}),
  C('front', 'Front dumbbell raise', 'Nâng tạ đơn ra trước', ['front raise'], 'Dumbbell', ['shoulders'], {load:'per_dumbbell', step:1}),
  C('rfly', 'Reverse fly', 'Ép vai sau tạ đơn', ['reverse fly','rear delt fly','vai sau'], 'Dumbbell', ['shoulders','back'], {load:'per_dumbbell', step:1}),
  C('push', 'Triceps pushdown', 'Đẩy cáp tay sau', ['triceps pushdown','pushdown'], 'Cable', ['triceps'], {load:'stack', step:5}),
  C('skull', 'EZ-bar skullcrusher', 'Skullcrusher thanh EZ', ['skullcrusher','skull crusher'], 'EZ bar', ['triceps'], {bar:10}),
  C('cgbench', 'Close-grip bench press', 'Đẩy ngực tay hẹp tạ đòn', ['close grip bench press','close grip bench'], 'Barbell', ['triceps','chest'], {bar:20}),
  C('cablerow', 'Seated cable row', 'Kéo cáp ngồi', ['seated cable row','cable row'], 'Cable', ['back','biceps'], {load:'stack', step:5}),
  C('dbrow', 'One-arm dumbbell row', 'Kéo tạ đơn một tay', ['one arm dumbbell row','dumbbell row','chèo tạ đơn'], 'Dumbbell', ['back','biceps'], {load:'per_dumbbell', step:2}),
  C('facepull', 'Face pull', 'Face pull kéo cáp về mặt', ['face pull'], 'Cable', ['shoulders','back'], {load:'stack', step:5}),
  C('shrug', 'Barbell shrug', 'Nhún vai tạ đòn', ['shrug','barbell shrug','nhún vai'], 'Barbell', ['back'], {bar:20, step:5}),
  C('hipthrust', 'Barbell hip thrust', 'Hip thrust tạ đòn', ['hip thrust','đẩy hông'], 'Barbell', ['glutes'], {bar:20, step:5}),
  C('lunge', 'Dumbbell lunge', 'Bước dài tạ đơn', ['lunge','dumbbell lunge','chùng chân'], 'Dumbbell', ['quads','glutes'], {load:'per_dumbbell', step:2}),
  C('goblet', 'Goblet squat', 'Squat ôm tạ', ['goblet squat'], 'Dumbbell', ['quads','glutes'], {step:2}),
  C('dbohp', 'Dumbbell shoulder press', 'Đẩy vai tạ đơn', ['dumbbell shoulder press','shoulder press'], 'Dumbbell', ['shoulders','triceps'], {load:'per_dumbbell', step:2}),
  C('tread', 'Treadmill run', 'Chạy bộ máy', ['treadmill','chạy bộ'], 'Machine', ['cardio'], {metric:'duration', load:null, step:null}),
];
const LOAD = {total:'Total', per_side:'Per side', per_dumbbell:'Per dumbbell', stack:'Stack', added_weight:'Added weight'};
const METRIC = {weight_reps:'Weight × reps', reps:'Reps only', duration:'Time', distance:'Distance'};
const ex = id => CATALOG.find(c => c.id === id);
/* How a set is logged, from metric_type + load input:
   wr   = weight × reps (weight_reps)
   bw+  = reps, with optional added weight (reps + added_weight: pull-up, dips). 0 kg = bodyweight only
   reps = reps only (reps, no load: crunch, hanging leg raise)
   time = a timed hold (duration: plank). Sets are [null, null, seconds] */
const kind = c => c.metric === 'weight_reps' ? 'wr' : c.metric === 'duration' ? 'time' : c.metric === 'distance' ? 'dist' : c.load === 'added_weight' ? 'bw+' : 'reps';

/* The user's active plan (UC05) and the template catalog (UC24). initialWeight is static from the plan — the engine never guesses one (R8). */
/* timed exercises carry a target time range (target_duration_min_s / max_s) instead of a rep range */
const P = (id, sets, repMin, repMax, o = {}) => ({id, sets, repMin, repMax, durMin:o.dur?.[0] ?? null, durMax:o.dur?.[1] ?? null, rest:o.rest ?? 120, warmup:!!o.warmup, initialWeight:o.w ?? null, group:o.group ?? null});
const PLANS = [
  {id:'ppl', name:'My push / pull / legs', source:'manual', active:true, days:[
    {id:'pushA', name:'Push A', ex:[P('bench',4,6,8,{rest:150,warmup:true}), P('ohp',3,6,10,{warmup:true}), P('incl',3,8,12,{rest:90}), P('fly',3,10,15,{rest:75,group:'A'}), P('push',3,10,15,{rest:75,group:'A'})]},
    {id:'pullA', name:'Pull A', ex:[P('deadlift',3,3,5,{rest:180,warmup:true}), P('pullup',4,6,10), P('cablerow',3,8,12,{rest:90}), P('facepull',3,12,15,{rest:60,group:'B'}), P('hammer',3,8,12,{rest:60,group:'B'})]},
    {id:'legs', name:'Legs', ex:[P('squat',4,5,8,{rest:180,warmup:true}), P('rdl',3,8,10,{rest:120}), P('legpress',3,10,12,{rest:90}), P('legcurl',3,10,15,{rest:75}), P('calf',4,10,15,{rest:60}), P('hlr',3,10,15,{rest:60}), P('plank',3,null,null,{rest:60,dur:[30,60]})]},
  ]},
];
const TEMPLATES = [
  {id:'full-body-3day', name:'Full body, 3 days a week', level:'Beginner', perWeek:3, minutes:45, equipment:'Gym', goal:'General strength', draft:true,
    blurb:'Three compound lifts a day, alternating A and B. Written by the founder from ACSM guidance. Draft until reviewed.',
    days:[
      {name:'Full body A', ex:[P('squat',3,5,8), P('bench',3,5,8), P('row',3,6,10)]},
      {name:'Full body B', ex:[P('deadlift',3,3,5), P('ohp',3,5,8), P('pullup',3,5,10)]},
    ]},
  {id:'upper-lower-4day', name:'Upper / lower, 4 days', level:'Intermediate', perWeek:4, minutes:60, equipment:'Gym', goal:'Muscle', draft:true, sample:true,
    blurb:'Sample entry for layout review only; not in packages/programs yet.',
    days:[{name:'Upper A', ex:[P('bench',4,6,8), P('row',4,6,10), P('dbohp',3,8,12), P('latpd',3,8,12)]},{name:'Lower A', ex:[P('squat',4,5,8), P('rdl',3,8,10), P('legcurl',3,10,15), P('calf',4,10,15)]},{name:'Upper B', ex:[P('inclbb',4,6,10), P('cablerow',3,8,12), P('lat',3,12,15), P('push',3,10,15)]},{name:'Lower B', ex:[P('deadlift',3,3,5), P('legpress',3,10,12), P('lunge',3,8,12), P('scalf',4,12,15)]}]},
  {id:'home-2day', name:'Dumbbells at home, 2 days', level:'Beginner', perWeek:2, minutes:40, equipment:'Home', goal:'General strength', draft:true, sample:true,
    blurb:'Sample entry for layout review only; not in packages/programs yet.',
    days:[{name:'Day A', ex:[P('goblet',3,8,12), P('dbbench',3,8,12), P('dbrow',3,8,12), P('plank',3,null,null,{dur:[30,60],rest:60})]},{name:'Day B', ex:[P('lunge',3,8,12), P('dbohp',3,8,12), P('dbcurl',3,10,12), P('pushup',3,8,15)]}]},
];

/* History generator — deterministic. Finals match workout-log's "last time" numbers. */
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const FINAL = {bench:80, ohp:45, incl:22.5, fly:35, push:30, deadlift:140, pullup:5, cablerow:60, facepull:25, hammer:14, squat:100, rdl:80, legpress:160, legcurl:45, calf:70, hlr:0};
const LASTPUSH = {bench:[[80,8],[80,8],[80,8],[80,7]], ohp:[[45,10],[45,10],[45,10]], incl:[[22.5,12],[22.5,11],[22.5,10]], fly:[[35,15],[35,14],[35,12]], push:[[30,15],[30,13],[30,12]]};
/* Training dates, oldest first: three a week, with a deload week (5–11 Oct) and a missed week (21–27 Sep). */
const DATES = [];
(function(){
  const start = day(2026, 8, 24);
  for (let w = 0; w < 13; w++){
    const mon = new Date(start); mon.setDate(start.getDate() + w * 7);
    const off = [[0, 18, 10], [3, 19, 5], [5, 9, 40]];
    if (w === 4){ DATES.push({d:new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 2, 18, 30)}); continue; } // a 1-session week (21–27 Sep)
    off.forEach(([dd, h, m], k) => {
      if (w === 12 && k > 0) return; // this week: only Monday so far
      if (w === 9 && k === 2) return; // 2-session week (26 Oct – 1 Nov)
      DATES.push({d:new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + dd, h, m), deload: w === 6});
    });
  }
})();
const DAYS = PLANS[0].days;
const SESSIONS = [];
(function(){
  // rotate Push → Pull → Legs so that the last three are Push (12 Nov), Pull (14 Nov), Legs (16 Nov)
  const n = DATES.length, prev = {};
  DATES.forEach((t, i) => {
    const dIdx = ((i - (n - 3)) % 3 + 3) % 3; // n-3 → Push
    const pd = DAYS[dIdx];
    const back = Math.floor((n - 1 - i) / 3); // sessions ago for this day
    const exs = pd.ex.map(pe => {
      const c = ex(pe.id);
      if (c.metric === 'duration'){
        // plank: holds grow 5 s every other session; the last Legs day reached the 1:00 top on every set
        const base = Math.min(pe.durMax, pe.durMax - 5 * Math.ceil(back / 2));
        let ts = back === 0 ? [base, base, base] : [base, base - 5, base - 10].map(t => Math.max(20, t));
        if (t.deload) ts = ts.map(x => Math.round(x * 0.6 / 5) * 5);
        return {id:pe.id, sets:ts.map(x => [null, null, x])};
      }
      if (dIdx === 0 && back === 0 && LASTPUSH[pe.id]) return {id:pe.id, sets:LASTPUSH[pe.id].map(s => s.slice())};
      // accessories on Push A have sat at last time's numbers for a few sessions; only bench moves on 12 Nov
      if (dIdx === 0 && back >= 1 && back <= 3 && LASTPUSH[pe.id] && pe.id !== 'bench'){ const ps = LASTPUSH[pe.id].map(x => x.slice()); if (back > 1) ps[ps.length - 1][1] -= 1; prev[pe.id] = ps; return {id:pe.id, sets:ps}; }
      const step = c.step || 1;
      /* plateaus: the weight goes up one step every third session of this day; reps climb inside a block, with off days */
      const block = Math.ceil(back / 3), inBlock = (3 - back % 3) % 3; // 0 = first session at this weight
      let w = FINAL[pe.id] - step * block;
      if (c.load === 'added_weight') w = Math.max(0, FINAL[pe.id] - 2.5 * Math.floor(back / 4));
      if (t.deload) w = Math.round(w * 0.5 / step) * step;
      w = Math.max(c.bar || 0, w);
      /* most sessions most lifts just repeat last time (or a rep short): records arrive at a believable rate */
      if (!t.deload && prev[pe.id] && rnd() < .72){ const ps = prev[pe.id].map(x => x.slice()); if (rnd() < .5) ps[ps.length - 1][1] = Math.max(pe.repMin - 1, ps.at(-1)[1] - 1); prev[pe.id] = ps; return {id:pe.id, sets:ps}; }
      const off = rnd() < .3;
      const sets = [];
      for (let s = 0; s < pe.sets; s++){
        let r = pe.repMin + inBlock - (off ? 1 : 0) - (s > 1 && rnd() > .5 ? 1 : 0);
        r = Math.min(pe.repMax, Math.max(pe.repMin - 1, r));
        if (t.deload) r = Math.max(pe.repMin, Math.round(r * 0.6));
        sets.push([w, r]);
      }
      if (!t.deload) prev[pe.id] = sets;
      return {id:pe.id, sets};
    });
    const nSets = exs.reduce((a, e) => a + e.sets.length, 0);
    SESSIONS.push({id:'s' + (i + 1), dayId:pd.id, name:pd.name, start:t.d, minutes: t.deload ? 34 : 48 + Math.round(rnd() * 22), deload:!!t.deload, exs, sets:nSets});
  });
  SESSIONS.reverse(); // newest first
})();

/* Personal records — recomputed from history in time order (server is the source of truth; client values are provisional). */
const PRS = [];
(function(){
  const best = {}, reps = {}, added = {};
  [...SESSIONS].reverse().forEach(s => s.exs.forEach(e => {
    const c = ex(e.id), k = kind(c), seen = e.id in best || e.id in reps || e.id in added;
    const pr = o => { if (seen) PRS.push({ex:e.id, date:s.start, session:s.id, ...o}); };
    e.sets.forEach(([w, r]) => {
      if (k === 'wr'){
        // e1RM, only for weight × reps
        const v = e1rm(w, r);
        if (!best[e.id] || v > best[e.id] + 0.05){
          if (best[e.id]) PRS.push({ex:e.id, type:'e1RM', w, r, value:v, date:s.start, session:s.id, prev:best[e.id]});
          best[e.id] = v;
        }
      } else if (k === 'reps' || (k === 'bw+' && !w)){
        // most reps at bodyweight
        if (r > (reps[e.id] ?? 0)){ if (e.id in reps) pr({type:'max_reps', w:0, r, value:r}); reps[e.id] = r; }
      } else if (k === 'bw+'){
        // heaviest added weight for at least this many reps
        const list = added[e.id] || (added[e.id] = []);
        const top = Math.max(0, ...list.filter(x => x[1] >= r).map(x => x[0]));
        if (w > top) pr({type:'weight_at_reps', w, r, value:w});
        list.push([w, r]);
      }
    });
  }));
  PRS.reverse();
})();
function e1rm(w, r){ return w * (1 + r / 30); }

/* Body metrics (UC18) — manual entries */
const BODY = [];
(function(){
  for (let i = 0; i < 12; i++){
    const d = day(2026, 8, 26 + i * 7, 7, 10);
    BODY.push({type:'weight', value: Math.round((74.8 - i * 0.19 + (rnd() - .5) * .5) * 10) / 10, unit:'kg', at:d, source:'manual'});
  }
  BODY.push({type:'waist', value:84, unit:'cm', at:day(2026, 9, 1, 7, 15), source:'manual'});
  BODY.push({type:'waist', value:82.5, unit:'cm', at:day(2026, 10, 15, 7, 12), source:'manual'});
  BODY.push({type:'body_fat', value:18.5, unit:'%', at:day(2026, 9, 1, 7, 16), source:'manual'});
  BODY.reverse();
})();

/* Goals (UC15). The weekly_frequency goal was created by onboarding from "3 sessions a week". */
const GOALS = [
  {id:'g1', type:'weekly_frequency', target:3, status:'active', created:day(2026, 8, 24), origin:'onboarding'},
  {id:'g2', type:'pr_target', ex:'bench', target:110, deadline:day(2027, 3, 31), status:'active', created:day(2026, 9, 10)},
  {id:'g3', type:'body_metric', metric:'weight', target:72, deadline:day(2026, 12, 31), status:'active', created:day(2026, 8, 24)},
  {id:'g4', type:'pr_target', ex:'squat', target:100, status:'achieved', created:day(2026, 8, 24), achieved:day(2026, 11, 16)},
];
const DELOADS = [{mode:'half_load', days:7, start:day(2026, 10, 5), end:day(2026, 10, 11), source:'manual'}];

/* Week helpers — Monday to Sunday in the user's time zone (UC16). */
function weekStart(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return x; }
function weeks(n){
  const out = []; const cur = weekStart(TODAY);
  for (let i = n - 1; i >= 0; i--){
    const s = new Date(cur); s.setDate(cur.getDate() - i * 7); const e = new Date(s); e.setDate(s.getDate() + 7);
    const ss = SESSIONS.filter(x => x.start >= s && x.start < e);
    const deload = DELOADS.some(dl => dl.start < e && dl.end >= s);
    out.push({start:s, end:e, sessions:ss, count:ss.length, deload, current:i === 0});
  }
  return out;
}
function streak(target = 3){
  const ws = weeks(20).filter(w => !w.current);
  let cur = 0, best = 0, run = 0;
  ws.forEach(w => { if (w.deload) return; if (w.count >= target){ run++; best = Math.max(best, run); } else run = 0; });
  cur = run;
  return {current:cur, best};
}

window.DATA = {TODAY, CATALOG, LOAD, METRIC, G, ex, kind, PLANS, TEMPLATES, SESSIONS, PRS, BODY, GOALS, DELOADS, weekStart, weeks, streak, e1rm,
  user:{name:'Sam', email:'sample.lifter@example.com', unit:'kg', tz:'Asia/Ho_Chi_Minh', guidance:'standard', warmupDefault:true, rpe:false}};
})();
