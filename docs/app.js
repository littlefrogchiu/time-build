// 時間出裝 — two controls drive a one-week timeline, weekly totals and a logoff line.

const $ = (id) => document.getElementById(id);
const fmt1 = (n) => (Math.round(n * 10) / 10).toString();
// Minutes after midnight → "HH:MM" (values past 1440 wrap to the next day).
const hhmm = (m) => {
  const t = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const H = (h, m = 0) => h * 60 + m;

const MIN_PER_GAME = 23;
const GAME_START_THU_FRI = H(20, 30);
const T_START = H(6);
const T_END = H(25, 30);
const DAYS = ["一", "二", "三", "四", "五", "六", "日"];
const STORE_KEY = "time-build-lite";

// Fixed parts of the week; game blocks and late bedtimes are filled in from the controls.
function buildWeek(off, weekendHours) {
  const school = { type: "school", s: H(7, 30), e: H(17) };
  const cramWeekend = { type: "cram", s: H(9), e: H(12) };
  const sat = H(19, 30);
  const sun = H(16);
  const days = [
    ...[0, 1, 2].map(() => ({ blocks: [school, { type: "cram", s: H(18), e: H(21, 30) }], bed: H(23), wake: H(6, 30) })),
    ...[H(6, 30), H(7, 30)].map((nextWake) => ({
      blocks: [school, { type: "study", s: H(18, 30), e: H(20, 30) }, { type: "game", s: GAME_START_THU_FRI, e: Math.max(off, GAME_START_THU_FRI) }],
      bed: Math.max(off, GAME_START_THU_FRI) + 30,
      wake: nextWake,
    })),
    {
      blocks: [cramWeekend, { type: "study", s: H(14), e: H(16, 30) }, { type: "game", s: sat, e: sat + weekendHours * 60 }],
      bed: Math.max(H(23), sat + weekendHours * 60 + 30),
      wake: H(7, 30),
    },
    {
      blocks: [cramWeekend, { type: "study", s: H(13, 30), e: H(16) }, { type: "game", s: sun, e: sun + weekendHours * 60 }],
      bed: Math.max(H(22, 30), sun + weekendHours * 60 + 30),
      wake: H(6, 30),
    },
  ];
  // wake = the following morning's wake-up time
  return days.map((d) => ({ ...d, sleep: (d.wake + 1440 - d.bed) / 60 }));
}

const pct = (m) => ((Math.min(Math.max(m, T_START), T_END) - T_START) / (T_END - T_START)) * 100;

function render() {
  const off = +$("off").value;
  const we = +$("we").value;
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ off, we })); } catch { /* optional */ }

  $("we-out").textContent = `${we} 小時`;
  const week = buildWeek(off, we);

  const ticks = [6, 12, 18, 24].map((h) => `<span style="left:${pct(H(h))}%">${hhmm(H(h))}</span>`).join("");
  $("week").innerHTML =
    `<div class="wk-row wk-axis"><div></div><div class="wk-track">${ticks}</div></div>` +
    week
      .map((d, i) => {
        const late = d.sleep < 7;
        const blocks = d.blocks
          .filter((b) => b.e > b.s)
          .map((b) => `<div class="blk ${b.type}${late && b.type === "game" ? " late" : ""}" style="left:${pct(b.s)}%;width:${pct(b.e) - pct(b.s)}%" title="${hhmm(b.s)}–${hhmm(b.e)}"></div>`)
          .join("");
        return `<div class="wk-row"><span class="wk-day">週${DAYS[i]}</span><div class="wk-track">${blocks}</div></div>`;
      })
      .join("");

  const game = week.reduce((sum, d) => sum + d.blocks.filter((b) => b.type === "game").reduce((a, b) => a + (b.e - b.s) / 60, 0), 0);
  const minSleep = Math.min(...week.map((d) => d.sleep));
  $("o-game").textContent = fmt1(game);
  $("o-sleep").textContent = fmt1(minSleep);

  const verdict = $("verdict");
  if (minSleep < 7) {
    $("o-build").textContent = "熬夜流";
    verdict.className = "tile verdict bad";
  } else if (game > 10) {
    $("o-build").textContent = "玩太多";
    verdict.className = "tile verdict bad";
  } else {
    $("o-build").textContent = "節奏流 ✓";
    verdict.className = "tile verdict ok";
  }

  $("o-line").textContent =
    off > GAME_START_THU_FRI
      ? `我 ${hhmm(Math.max(GAME_START_THU_FRI, Math.floor((off - MIN_PER_GAME) / 5) * 5))} 開最後一場，打完就下線！`
      : "週四、五我不開，週末見！";
}

function init() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { /* optional */ }

  const select = $("off");
  for (let m = H(20, 30); m <= H(24, 30); m += 30) {
    const opt = document.createElement("option");
    opt.value = String(m);
    opt.textContent = m === H(20, 30) ? "不玩" : hhmm(m);
    select.append(opt);
  }
  select.value = String(saved?.off ?? H(22));
  if (saved?.we != null) $("we").value = saved.we;

  select.addEventListener("change", render);
  $("we").addEventListener("input", render);
  $("copy-line").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("o-line").textContent);
      $("copied").hidden = false;
      setTimeout(() => ($("copied").hidden = true), 1500);
    } catch { /* clipboard blocked; the line is still visible to copy by hand */ }
  });
  render();
}

init();
