import { useState, useEffect, useRef } from "react";

/* ---------- Pixel wave (sweeps across the screen every few seconds) ---------- */
// A wave of little pixel squares sweeps across the screen every so often.
const CELL = 26;        // pixel size (px)
const FIRST = 4000;     // wait before the first wave (ms)
const EVERY = 10000;    // pause between waves (ms)
const DUR = 3400;       // how long one sweep takes (ms)
const COLORS = ["#39ff14", "#ffffff", "#12b3bd", "#8bf5d0"];

export function PixelWave({ fixed = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, raf = 0, timer = 0, dead = false;

    const size = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = W * d; cv.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const run = () => {
      if (dead) return;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const t0 = performance.now();
      const frame = (now) => {
        const p = (now - t0) / DUR;
        ctx.clearRect(0, 0, W, H);
        if (dead) return;
        if (p >= 1) { timer = setTimeout(run, EVERY); return; }
        const band = Math.max(160, W * 0.16);
        const front = -band + p * (W + band * 2);
        const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
        for (let r = 0; r < rows; r++) {
          const wob = Math.sin(r * 0.38 + p * 9) * band * 0.45;
          for (let c = 0; c < cols; c++) {
            const x = c * CELL, y = r * CELL;
            const d = Math.abs((dir > 0 ? x : W - x) - (front + wob));
            if (d > band) continue;
            let k = 1 - d / band;
            k = k * k * (3 - 2 * k);
            const h = ((r * 73856093) ^ (c * 19349663)) >>> 0;
            if (h % 7 === 0 && k < 0.35) continue; // ragged, dissolving edge
            const s = (CELL - 3) * (0.35 + 0.65 * k);
            ctx.globalAlpha = k * 0.75;
            ctx.fillStyle = h % 13 === 0 ? "#ff7a1a" : COLORS[h % COLORS.length];
            ctx.fillRect(x + (CELL - s) / 2, y + (CELL - s) / 2, s, s);
          }
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    timer = setTimeout(run, FIRST);

    return () => {
      dead = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas ref={ref} className={"pixwave" + (fixed ? " fixed" : "")} aria-hidden="true" />;
}

/* ---------- Theme button ---------- */
export function ThemeBtn({ theme, toggle, t }) {
  const dark = theme === "dark";
  return (
    <button className="btn ghost" onClick={toggle} aria-label={dark ? t.themeLight : t.themeDark}>
      <i className={"bi " + (dark ? "bi-sun-fill" : "bi-moon-stars-fill")} />{" "}
      {dark ? t.themeLight : t.themeDark}
    </button>
  );
}

/* ---------- Ticker strip (shared by welcome + main page) ---------- */
export function Ticker({ text }) {
  return (
    <div className="ticker" aria-hidden="true">
      <div>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i}>
            {text} <b>◆</b>
          </span>
        ))}
      </div>
    </div>
  );
}

const BUB = [
  [-6, 58, 240, 0],
  [78, 4, 150, 2],
  [90, 46, 90, 4],
  [20, 6, 80, 1],
  [60, 70, 170, 3],
  [38, 30, 54, 5],
  [4, 36, 46, 2.5],
];

/* ---------- Welcome page ---------- */
export default function Welcome({ t, lang, setLang, theme, toggleTheme, onStart, ghost }) {
  const [bn, ...rest] = t.app.split(" ");
  return (
    <div className={"welcome" + (ghost ? " ghost" : "")} {...(ghost ? { inert: "" } : {})}>
      <div className="w-layer w-grid" />
      <div className="w-layer w-rings" />
      {!ghost && <PixelWave />}
      <div className="bubbles" aria-hidden="true">
        {BUB.map(([l, tp, s, d], i) => (
          <span key={i} style={{ left: l + "%", top: tp + "%", width: s, height: s, animationDelay: d + "s" }} />
        ))}
      </div>

      <div className="w-top">
        <span className="w-badge">
          <i className="bi bi-hexagon-fill" /> AI DEVFEST 2026
        </span>
        <div className="w-ctl">
          <ThemeBtn theme={theme} toggle={toggleTheme} t={t} />
          <button className="btn green" onClick={() => setLang(lang === "en" ? "bn" : "en")}>
            <i className="bi bi-translate" /> {t.lang}
          </button>
        </div>
      </div>

      <div className="w-center">
        <p className="w-kicker">{t.welcome}</p>
        <h1 className="w-title">
          <span className="w-bn">{bn}</span> <span className="w-en">{rest.join(" ")}</span>
        </h1>
        <p className="w-tag">{t.tag}</p>
        <button className="btn green w-go" onClick={onStart}>
          {t.start} <i className="bi bi-arrow-right-circle-fill" />
        </button>
      </div>

      <div className="w-stripes" />
      <Ticker text={t.ticker} />
    </div>
  );
}

/* ---------- Page-tear + bubble transition ---------- */
// Jagged seam down the middle of the screen (deterministic, so both halves match).
const SEAM = Array.from({ length: 21 }, (_, i) => {
  const edge = i === 0 || i === 20;
  const x = 50 + (edge ? 0 : (i % 2 ? -1 : 1) * (1.1 + ((i * 37) % 10) / 7));
  return [x, i * 5];
});
const pts = (dx) => SEAM.map(([x, y]) => `${(x + dx).toFixed(2)}% ${y}%`).join(",");
const L = `polygon(0% 0%,${pts(0)},0% 100%)`;
const R = `polygon(100% 0%,${pts(0)},100% 100%)`;
const L_EDGE = `polygon(0% 0%,${pts(0.9)},0% 100%)`;
const R_EDGE = `polygon(100% 0%,${pts(-0.9)},100% 100%)`;

function Burst() {
  const [bubs] = useState(() =>
    Array.from({ length: 70 }, () => {
      const size = Math.round(14 + Math.pow(Math.random(), 2.2) * 270);
      const l = Math.random() * 100;
      const tp = Math.random() * 100;
      return {
        size,
        l,
        tp,
        fx: (50 - l).toFixed(1) + "vw",
        fy: (50 - tp).toFixed(1) + "vh",
        d: (0.4 + Math.random() * 0.8).toFixed(2) + "s",
      };
    }),
  );
  return (
    <div className="burst">
      {bubs.map((b, i) => (
        <span
          key={i}
          className="bub pop"
          style={{
            width: b.size,
            height: b.size,
            left: `calc(${b.l}% - ${b.size / 2}px)`,
            top: `calc(${b.tp}% - ${b.size / 2}px)`,
            "--fx": b.fx,
            "--fy": b.fy,
            animationDelay: b.d,
          }}
        />
      ))}
    </div>
  );
}

export function TearOverlay(props) {
  return (
    <div className="tear" aria-hidden="true">
      <div className="tear-half l">
        <div className="edge" style={{ clipPath: L_EDGE }} />
        <div className="clip" style={{ clipPath: L }}>
          <Welcome {...props} ghost />
        </div>
      </div>
      <div className="tear-half r">
        <div className="edge" style={{ clipPath: R_EDGE }} />
        <div className="clip" style={{ clipPath: R }}>
          <Welcome {...props} ghost />
        </div>
      </div>
      <div className="veil" />
      <Burst />
    </div>
  );
}