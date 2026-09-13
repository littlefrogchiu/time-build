// 時間出裝 — interactive pieces: star-climb CP chart, sleep calculator, exam countdown, weekly planner.

const $ = (id) => document.getElementById(id);
const fmt1 = (n) => (Math.round(n * 10) / 10).toString();

// Average of the three shared matches (12:33, 17:38, 23:17) ≈ 18 min, plus ~5 min queue / pick / load.
const MIN_PER_GAME = 23;
// Rough current weekly play time (games + chat), used as the baseline for "hours saved".
const CURRENT_WEEKLY_HOURS = 20;
const SLEEP_TARGET = 8;
// 116 年國中教育會考: 2027-05-15 (Sat) and 05-16 (Sun), Taiwan time.
const EXAM_DATE = new Date("2027-05-15T08:00:00+08:00");
const WEEKS_TO_EXAM = Math.max(0, Math.ceil((EXAM_DATE - Date.now()) / (7 * 24 * 3600 * 1000)));

/* ---------- Star-climb CP chart ---------- */

const BRACKETS = [
  { name: "戰場傳說", range: "0 → 10 星", chip: "已完成", done: true },
  { name: "光影", range: "10 → 20 星", chip: "下一步" },
  { name: "天際", range: "20 → 30 星" },
  { name: "新月", range: "30 → 40 星" },
];
const HEART = "M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.9 1.2 5.4 3.1 1.5-1.9 3.3-3.1 5.4-3.1 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z";

// Each bracket up, the win-rate edge over 50% halves (matchmaking pulls you toward 50%).
function computeClimb(winRate, weekly) {
  const edge = winRate - 50;
  return BRACKETS.map((b, i) => {
    const p = 50 + edge / 2 ** i;
    const net = (2 * p) / 100 - 1;
    const games = Math.ceil(10 / net);
    const hours = (games * MIN_PER_GAME) / 60;
    return { ...b, p, net, games, hours, weeks: hours / weekly };
  });
}

function niceMax(v) {
  const steps = [50, 100, 150, 200, 300, 400, 600, 800, 1000, 1500, 2000, 3000, 4000, 6000];
  return steps.find((s) => s >= v) || Math.ceil(v / 1000) * 1000;
}

function heartSvg(size) {
  const box = 46;
  const k = size / 24;
  const off = (box - 24 * k) / 2;
  return `<svg width="${box}" height="${box}" viewBox="0 0 ${box} ${box}" aria-hidden="true">
    <g transform="translate(${off} ${off + 2}) scale(${k})"><path class="heart" d="${HEART}"/></g></svg>`;
}

function renderClimb() {
  const wr = parseFloat($("wr").value);
  const wk = parseFloat($("wk").value);
  $("wr-out").textContent = wr + "%";
  $("wk-out").textContent = wk + " 小時";
  const rows = computeClimb(wr, wk);
  const max = niceMax(Math.max(...rows.map((r) => r.hours)) * 1.2);

  const grid = [0.5, 1]
    .map((f) => `<div class="gridline" style="bottom:${f * 100}%"><span>${Math.round(max * f)} 小時</span></div>`)
    .join("");
  const bars = rows
    .map(
      (r, i) => `
      <div class="barcell${r.done ? " done" : ""}" tabindex="0" data-i="${i}"
           aria-label="${r.name} ${r.range}：約 ${r.games} 場，${Math.round(r.hours)} 小時">
        <div class="val">${Math.round(r.hours)}<small>${r.games} 場</small></div>
        <div class="bar" style="height:${(r.hours / max) * 100 * 0.8}%"></div>
      </div>`
    )
    .join("");
  $("plot").innerHTML = grid + `<div class="cols">${bars}</div>`;

  $("xlabels").innerHTML = rows
    .map(
      (r) => `<div class="x"><span class="name">${r.name}</span><span class="range">${r.range}</span>
      ${r.chip ? `<span class="chip${r.done ? " ghost" : ""}">${r.chip}</span>` : ""}</div>`
    )
    .join("");

  $("praise").innerHTML = rows
    .map(() => `<div class="glyphcell">${heartSvg(26)}<span class="cap">≈ 一樣</span></div>`)
    .join("");

  const h0 = rows[0].hours;
  $("cpv").innerHTML = rows
    .map((r) => {
      const ratio = h0 / r.hours;
      return `<div class="glyphcell">${heartSvg(Math.max(30 * Math.sqrt(ratio), 5))}
        <span class="cap"><b>${Math.round(ratio * 100)}%</b></span></div>`;
    })
    .join("");

  const next = rows[1];
  $("cp-headline").innerHTML =
    `從 10 星爬到 20 星，大約要 <b>${next.games} 場、${Math.round(next.hours)} 小時</b>` +
    `（每週排位 ${wk} 小時，要打 <b>${fmt1(next.weeks)} 週</b>），是前 10 顆星的 <b>${fmt1(next.hours / h0)} 倍</b>。` +
    `但同學的反應、IG 的按讚，幾乎沒有差別。`;

  $("tbody").innerHTML = rows
    .map(
      (r) => `<tr><td>${r.name}（${r.range}）</td><td>${fmt1(r.p)}%</td><td>${r.net.toFixed(3)}</td>
      <td>${r.games}</td><td>${Math.round(r.hours)}</td><td>${fmt1(r.weeks)}</td></tr>`
    )
    .join("");

  document.querySelectorAll(".barcell").forEach((el) => {
    const r = rows[+el.dataset.i];
    el.addEventListener("pointerenter", () => showTip(el, r));
    el.addEventListener("pointerleave", hideTip);
    el.addEventListener("focus", () => showTip(el, r));
    el.addEventListener("blur", hideTip);
  });
}

const tip = $("tip");
function showTip(el, r) {
  tip.innerHTML = `<b>${r.name}　${r.range}</b>
    <div class="t-row"><span>假設勝率</span><span>${fmt1(r.p)}%</span></div>
    <div class="t-row"><span>每場平均淨得</span><span>${r.net.toFixed(3)} 星</span></div>
    <div class="t-row"><span>需要場次</span><span>約 ${r.games} 場</span></div>
    <div class="t-row"><span>需要時間</span><span>約 ${Math.round(r.hours)} 小時</span></div>
    <div class="t-row"><span>照目前節奏</span><span>約 ${fmt1(r.weeks)} 週</span></div>`;
  tip.hidden = false;
  const bar = el.querySelector(".bar").getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const left = Math.max(8, Math.min(bar.left + bar.width / 2 - tw / 2, innerWidth - tw - 8));
  let top = bar.top - th - 10;
  if (top < 8) top = bar.bottom + 10;
  tip.style.left = left + "px";
  tip.style.top = top + "px";
}
function hideTip() {
  tip.hidden = true;
}
addEventListener("scroll", hideTip, { passive: true });

/* ---------- Time helpers ---------- */

// Minutes after midnight → "HH:MM"
const hhmm = (m) => {
  const t = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
function fillTimes(select, from, to, step, value) {
  for (let m = from; m <= to; m += step) {
    const opt = document.createElement("option");
    opt.value = String(m);
    opt.textContent = hhmm(m);
    select.append(opt);
  }
  select.value = String(value);
}
// Bedtimes are stored as minutes that may exceed 1440 (after midnight).
const sleepHours = (bed, wake) => (wake + 1440 - bed) / 60;

/* ---------- Sleep calculator ---------- */

function renderSleep() {
  const h = sleepHours(+$("bed").value, +$("wake").value);
  $("sleep-h").textContent = fmt1(h);
  $("sleep-fill").style.width = Math.min(h / 12, 1) * 100 + "%";
  const debt = Math.max(0, SLEEP_TARGET - h) * 5;
  $("sleep-debt").innerHTML =
    debt === 0
      ? "睡眠達標，大腦每天都有好好存檔。"
      : `平日一週少睡 <b class="red">${fmt1(debt)} 小時</b>${debt >= 7 ? "，等於每週少睡一整晚" : ""}。`;
}

/* ---------- Exam countdown & target-school scale ---------- */

function renderCountdown() {
  $("weeks-left").textContent = WEEKS_TO_EXAM;
  $("weeks-left-2").textContent = WEEKS_TO_EXAM;
  $("hours-5").textContent = WEEKS_TO_EXAM * 5;
}

function renderScaleTicks() {
  const ticks = [];
  for (let p = 25; p <= 35; p++) ticks.push(`<span style="left:${(p - 25) * 10}%">${p}</span>`);
  ticks.push(`<em style="left:0">全 A</em>`, `<em style="left:100%">5A++ 滿分</em>`);
  $("scale-ticks").innerHTML = ticks.join("");
}

/* ---------- Weekly planner ---------- */

const DAY_NAMES = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
const T_START = 6 * 60; // timeline starts 06:00
const T_END = 25 * 60 + 30; // …and ends 01:30
const SCHOOL = [7 * 60 + 30, 17 * 60];
const CRAM_END_WEEKDAY = 21 * 60 + 30;
const CRAM_WEEKEND = [9 * 60, 12 * 60];
const LABELS = { school: "學校", cram: "補習", study: "讀書", ex: "運動", game: "遊戲" };
const USER_BLOCKS = ["study", "ex", "game"];

// Times are minutes after midnight; values past 1440 mean after midnight. Hours are decimals.
const DEFAULT_PLAN = {
  wakeWd: 6 * 60 + 30,
  wakeWe: 7 * 60 + 30,
  cramStart: 18 * 60,
  days: [
    { study: [22 * 60 + 15, 0.25], ex: [18 * 60, 0], game: [21 * 60, 0], bed: 23 * 60 },
    { study: [22 * 60 + 15, 0.25], ex: [18 * 60, 0], game: [21 * 60, 0], bed: 23 * 60 },
    { study: [22 * 60 + 15, 0.25], ex: [18 * 60, 0], game: [21 * 60, 0], bed: 23 * 60 },
    { study: [18 * 60 + 30, 2], ex: [18 * 60, 0], game: [20 * 60 + 30, 1.25], bed: 22 * 60 + 30 },
    { study: [18 * 60 + 30, 2], ex: [18 * 60, 0], game: [20 * 60 + 30, 1.5], bed: 23 * 60 },
    { study: [14 * 60, 2.5], ex: [16 * 60 + 30, 1], game: [19 * 60 + 30, 2], bed: 23 * 60 },
    { study: [13 * 60 + 30, 2.5], ex: [18 * 60, 0], game: [16 * 60, 1.5], bed: 22 * 60 },
  ],
};

const STORE_KEY = "time-build-week";
const clone = (o) => JSON.parse(JSON.stringify(o));
function loadPlan() {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY));
    return p && Array.isArray(p.days) && p.days.length === 7 ? p : null;
  } catch {
    return null;
  }
}
function savePlan() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(plan));
  } catch {
    /* storage unavailable — the planner still works for this visit */
  }
}

let plan = loadPlan() || clone(DEFAULT_PLAN);
let sel = (new Date().getDay() + 6) % 7; // open on today

const wakeOf = (d) => (d < 5 ? plan.wakeWd : plan.wakeWe);
const sleepOf = (d) => (wakeOf((d + 1) % 7) + 1440 - plan.days[d].bed) / 60;

function blocksOf(d) {
  const day = plan.days[d];
  const out = [];
  if (d < 5) out.push({ type: "school", s: SCHOOL[0], e: SCHOOL[1] });
  if (d < 3) out.push({ type: "cram", s: plan.cramStart, e: CRAM_END_WEEKDAY });
  if (d >= 5) out.push({ type: "cram", s: CRAM_WEEKEND[0], e: CRAM_WEEKEND[1] });
  for (const t of USER_BLOCKS) {
    const [s, h] = day[t];
    if (h > 0) out.push({ type: t, s, e: s + h * 60 });
  }
  return out;
}

function checkDay(d) {
  const blocks = blocksOf(d);
  const bed = plan.days[d].bed;
  const msgs = [];
  const clash = new Set();
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.s < b.e && b.s < a.e) {
        msgs.push(`${LABELS[a.type]}和${LABELS[b.type]}時間重疊`);
        clash.add(a.type).add(b.type);
      }
    }
  }
  for (const b of blocks) {
    if (USER_BLOCKS.includes(b.type) && b.e > bed) {
      msgs.push(`${LABELS[b.type]}到 ${hhmm(b.e)} 才結束，已經過了睡覺時間`);
      clash.add(b.type);
    }
  }
  const game = blocks.find((b) => b.type === "game");
  if (game && game.e <= bed && bed - game.e < 15) msgs.push("打完遊戲到睡覺至少留 15 分鐘，腦袋才靜得下來");
  const sleep = sleepOf(d);
  if (sleep < 7) msgs.push(`這晚只睡 ${fmt1(sleep)} 小時`);
  return { msgs, clash };
}

const pct = (m) => ((Math.min(Math.max(m, T_START), T_END) - T_START) / (T_END - T_START)) * 100;

function blockHtml(type, s, e, clash, label) {
  const left = pct(s);
  const width = pct(e) - left;
  if (width <= 0) return "";
  const text = label ?? LABELS[type];
  const tipText = type === "sleep" ? `睡覺 ${hhmm(s)}–${hhmm(e)}` : `${text} ${hhmm(s)}–${hhmm(e)}`;
  return `<div class="blk ${type}${clash ? " clash" : ""}" style="left:${left}%;width:${width}%" title="${tipText}">${width >= 5.5 ? text : ""}</div>`;
}

function renderWeek() {
  const tickTimes = [6, 9, 12, 15, 18, 21, 24].map((h) => h * 60);
  const gridLines = tickTimes.map((t) => `<div class="wk-grid" style="left:${pct(t)}%"></div>`).join("");
  const axis = `<div class="wk-axis"><div></div><div class="wk-track">${tickTimes
    .map((t) => `<span style="left:${pct(t)}%">${hhmm(t)}</span>`)
    .join("")}</div></div>`;

  const rows = DAY_NAMES.map((name, d) => {
    const { msgs, clash } = checkDay(d);
    const bed = plan.days[d].bed;
    const blocks = blocksOf(d)
      .map((b) => blockHtml(b.type, b.s, b.e, clash.has(b.type)))
      .join("");
    const morning = blockHtml("sleep", T_START, wakeOf(d), false, "睡");
    const night = blockHtml("sleep", bed, T_END, false, "睡");
    return `<div class="wk-row${d === sel ? " sel" : ""}" data-d="${d}">
      <button type="button" class="wk-day" aria-pressed="${d === sel}" aria-label="編輯${name}${msgs.length ? "（有需要注意的地方）" : ""}">${name}${msgs.length ? '<i class="dot"></i>' : ""}</button>
      <div class="wk-track">${gridLines}${morning}${blocks}${night}</div>
    </div>`;
  }).join("");

  $("week").innerHTML = axis + rows;
  $("week").querySelectorAll(".wk-row").forEach((row) =>
    row.addEventListener("click", () => {
      sel = +row.dataset.d;
      syncEditor();
      renderAll();
    })
  );
}

function syncEditor() {
  const day = plan.days[sel];
  $("ed-title").textContent = `${DAY_NAMES[sel]}怎麼排`;
  for (const t of USER_BLOCKS) {
    $(`ed-${t}-s`).value = String(day[t][0]);
    $(`ed-${t}-h`).value = String(day[t][1]);
  }
  $("ed-bed").value = String(day.bed);
}

function renderEditor() {
  const day = plan.days[sel];
  for (const t of USER_BLOCKS) $(`ed-${t}-h-out`).textContent = `${day[t][1]} 小時`;
  $("ed-sleep").textContent = `睡到隔天 ${hhmm(wakeOf((sel + 1) % 7))}，這晚睡 ${fmt1(sleepOf(sel))} 小時`;
  const { msgs } = checkDay(sel);
  $("ed-warn").innerHTML = msgs.length
    ? msgs.map((m) => `<li>${m}</li>`).join("")
    : `<li class="ok">這天排得很順，沒有衝突</li>`;
}

function renderTotals() {
  const sum = (t) => plan.days.reduce((a, d) => a + d[t][1], 0);
  const game = sum("game");
  const study = sum("study");
  const ex = sum("ex");
  const sleeps = plan.days.map((_, d) => sleepOf(d));
  const avg = sleeps.reduce((a, b) => a + b, 0) / 7;
  const minSleep = Math.min(...sleeps);
  const cram = (3 * (CRAM_END_WEEKDAY - plan.cramStart) + 2 * (CRAM_WEEKEND[1] - CRAM_WEEKEND[0])) / 60;
  const saved = CURRENT_WEEKLY_HOURS - game;
  const troubled = DAY_NAMES.filter((_, d) => checkDay(d).msgs.length).length;

  $("o-game").textContent = fmt1(game);
  $("o-game-sub").textContent =
    saved > 0
      ? `比現在少約 ${fmt1(saved)} 小時，會考前多出約 ${Math.round(saved * WEEKS_TO_EXAM)} 小時`
      : `比現在多約 ${fmt1(-saved)} 小時`;
  $("o-study").textContent = fmt1(study);
  $("o-study-sub").textContent = `另外還有補習約 ${fmt1(cram)} 小時`;
  $("o-sleep").textContent = fmt1(avg);
  $("o-sleep-sub").textContent = `最少的一晚 ${fmt1(minSleep)} 小時・目標 8 小時`;

  let build;
  let sub;
  if (avg >= 7.75 && game <= 10) {
    build = "節奏流";
    sub = ex > 0 ? "睡眠、朋友、讀書都顧到了，還有運動。" : "睡眠和朋友都顧到了，排一點運動會更好。";
  } else if (avg < 7 || game >= 16) {
    build = "熬夜流";
    sub = avg < 7 ? "扣血中：先把幾天的睡覺時間提早。" : "扣血中：每週遊戲時間偏高。";
  } else {
    build = "接近節奏流";
    const tips = [];
    if (avg < 7.75) tips.push("把幾天的睡覺時間提早");
    if (game > 10) tips.push(`每週少玩 ${fmt1(game - 10)} 小時`);
    sub = `再${tips.join("、")}就達標。`;
  }
  if (troubled) sub = `有 ${troubled} 天要注意（有紅點的日子）。` + sub;
  $("o-build").textContent = build;
  $("o-build-sub").textContent = sub;
}

function renderLine() {
  const [s, h] = plan.days[sel].game;
  $("o-line-label").textContent = `${DAY_NAMES[sel]}給朋友的下線台詞`;
  if (h > 0) {
    // Start the last game one game-length before the block ends, rounded down to 5 minutes.
    const lastStart = Math.max(s, Math.floor((s + h * 60 - MIN_PER_GAME) / 5) * 5);
    $("o-line").textContent = `我 ${hhmm(lastStart)} 開最後一場，打完就下線，明天見！`;
    return;
  }
  for (let k = 1; k <= 7; k++) {
    const d = (sel + k) % 7;
    const [ns, nh] = plan.days[d].game;
    if (nh > 0) {
      $("o-line").textContent = `今天我不開，${DAY_NAMES[d]} ${hhmm(ns)} 見！`;
      return;
    }
  }
  $("o-line").textContent = "這陣子我先不開，考完再一起打！";
}

function renderAll() {
  savePlan();
  renderWeek();
  renderEditor();
  renderTotals();
  renderLine();
}

function initPlanner() {
  fillTimes($("p-wake-wd"), 5 * 60 + 30, 8 * 60 + 30, 15, plan.wakeWd);
  fillTimes($("p-wake-we"), 5 * 60 + 30, 10 * 60, 15, plan.wakeWe);
  fillTimes($("p-cram"), 17 * 60, 20 * 60, 15, plan.cramStart);
  for (const t of USER_BLOCKS) fillTimes($(`ed-${t}-s`), 6 * 60, 25 * 60, 15, plan.days[sel][t][0]);
  fillTimes($("ed-bed"), 21 * 60, 25 * 60 + 30, 15, plan.days[sel].bed);

  $("p-wake-wd").addEventListener("change", (e) => ((plan.wakeWd = +e.target.value), renderAll()));
  $("p-wake-we").addEventListener("change", (e) => ((plan.wakeWe = +e.target.value), renderAll()));
  $("p-cram").addEventListener("change", (e) => ((plan.cramStart = +e.target.value), renderAll()));
  for (const t of USER_BLOCKS) {
    $(`ed-${t}-s`).addEventListener("change", (e) => ((plan.days[sel][t][0] = +e.target.value), renderAll()));
    $(`ed-${t}-h`).addEventListener("input", (e) => ((plan.days[sel][t][1] = +e.target.value), renderAll()));
  }
  $("ed-bed").addEventListener("change", (e) => ((plan.days[sel].bed = +e.target.value), renderAll()));
  $("p-reset").addEventListener("click", () => {
    plan = clone(DEFAULT_PLAN);
    $("p-wake-wd").value = String(plan.wakeWd);
    $("p-wake-we").value = String(plan.wakeWe);
    $("p-cram").value = String(plan.cramStart);
    syncEditor();
    renderAll();
  });

  syncEditor();
  renderAll();
}

$("copy-line").addEventListener("click", async () => {
  const text = $("o-line").textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const range = document.createRange();
    range.selectNodeContents($("o-line"));
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(range);
    document.execCommand("copy");
  }
  const note = $("copied");
  note.hidden = false;
  setTimeout(() => (note.hidden = true), 1600);
});

/* ---------- Init ---------- */

fillTimes($("bed"), 21 * 60 + 30, 25 * 60, 30, 24 * 60);
fillTimes($("wake"), 5 * 60 + 30, 8 * 60, 30, 6 * 60 + 30);

["wr", "wk"].forEach((id) => $(id).addEventListener("input", renderClimb));
["bed", "wake"].forEach((id) => $(id).addEventListener("change", renderSleep));

renderClimb();
renderSleep();
renderCountdown();
renderScaleTicks();
initPlanner();
