// 時間出裝 — interactive pieces: star-climb CP chart, sleep calculator, personal planner.

const $ = (id) => document.getElementById(id);
const fmt1 = (n) => (Math.round(n * 10) / 10).toString();

// Average of the three shared matches (12:33, 17:38, 23:17) ≈ 18 min, plus ~5 min queue / pick / load.
const MIN_PER_GAME = 23;
// Rough current weekly play time (games + chat), used as the baseline for "hours saved".
const CURRENT_WEEKLY_HOURS = 20;
// Weeks until the May exam, estimated from mid-September.
const WEEKS_TO_EXAM = 35;
const SLEEP_TARGET = 8;

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

/* ---------- Planner ---------- */

const STORE_KEY = "time-build-plan";
function loadPlan() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
  } catch {
    return null;
  }
}
function savePlan(plan) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(plan));
  } catch {
    /* storage unavailable — the planner still works for this visit */
  }
}

function renderPlan() {
  const off = +$("p-off").value;
  const wake = +$("p-wake").value;
  const wd = parseFloat($("p-wd").value);
  const we = parseFloat($("p-we").value);
  savePlan({ off, wake, wd, we });

  $("p-wd-out").textContent = wd + " 小時";
  $("p-we-out").textContent = we + " 小時";

  const weekly = wd * 5 + we * 2;
  const sleep = sleepHours(off, wake);
  const saved = CURRENT_WEEKLY_HOURS - weekly;

  $("o-week").textContent = fmt1(weekly);
  $("o-week-sub").textContent =
    saved > 0 ? `比現在少約 ${fmt1(saved)} 小時` : saved < 0 ? `比現在多約 ${fmt1(-saved)} 小時` : "跟現在差不多";
  $("o-sleep").textContent = fmt1(sleep);
  $("o-sleep-sub").textContent = sleep >= SLEEP_TARGET ? "達標" : `還差 ${fmt1(SLEEP_TARGET - sleep)} 小時`;
  $("o-gain").textContent = Math.round(Math.max(0, saved) * WEEKS_TO_EXAM);

  let build;
  let sub;
  if (sleep >= SLEEP_TARGET && weekly <= 12) {
    build = "節奏流";
    sub = "睡眠和朋友都顧到了。每週再花 3 小時做作品，就是全能流。";
  } else if (sleep < 7 || weekly >= 18) {
    build = "熬夜流";
    sub = sleep < 7 ? "扣血中：先把放下手機的時間提早。" : "扣血中：每週遊戲時間偏高。";
  } else {
    build = "接近節奏流";
    const tips = [];
    if (sleep < SLEEP_TARGET) tips.push(`早 ${Math.round((SLEEP_TARGET - sleep) * 60)} 分鐘放下手機`);
    if (weekly > 12) tips.push(`每週少玩 ${fmt1(weekly - 12)} 小時`);
    sub = `再${tips.join("、")}就達標。`;
  }
  $("o-build").textContent = build;
  $("o-build-sub").textContent = sub;

  // Last game must start one game-length before phone-down time, rounded down to 5 minutes.
  const lastStart = Math.floor((off - MIN_PER_GAME) / 5) * 5;
  $("o-line").textContent = `我 ${hhmm(lastStart)} 開最後一場，打完就下線，明天見！`;
}

$("copy-line").addEventListener("click", async () => {
  const text = $("o-line").textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const range = document.createRange();
    range.selectNodeContents($("o-line"));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
  }
  const note = $("copied");
  note.hidden = false;
  setTimeout(() => (note.hidden = true), 1600);
});

/* ---------- Init ---------- */

fillTimes($("bed"), 21 * 60 + 30, 25 * 60, 30, 24 * 60);
fillTimes($("wake"), 5 * 60 + 30, 8 * 60, 30, 6 * 60 + 30);

const saved = loadPlan();
fillTimes($("p-off"), 21 * 60, 25 * 60, 30, saved?.off ?? 22 * 60 + 30);
fillTimes($("p-wake"), 5 * 60 + 30, 8 * 60, 30, saved?.wake ?? 6 * 60 + 30);
if (saved) {
  $("p-wd").value = saved.wd;
  $("p-we").value = saved.we;
}

["wr", "wk"].forEach((id) => $(id).addEventListener("input", renderClimb));
["bed", "wake"].forEach((id) => $(id).addEventListener("change", renderSleep));
["p-off", "p-wake"].forEach((id) => $(id).addEventListener("change", renderPlan));
["p-wd", "p-we"].forEach((id) => $(id).addEventListener("input", renderPlan));

renderClimb();
renderSleep();
renderPlan();
