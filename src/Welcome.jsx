import { useState } from "react";

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

const HEX = [
  // left%, top%, size, color class, delay
  [6, 22, 120, "hx-n", 0],
  [14, 62, 76, "hx-o", 1.2],
  [82, 14, 96, "hx-g", 0.6],
  [88, 58, 140, "hx-t", 2],
  [70, 78, 64, "hx-k", 0.3],
  [30, 10, 58, "hx-o", 1.8],
  [48, 84, 90, "hx-n", 2.4],
  [2, 80, 100, "hx-k", 0.9],
];

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
      <div className="w-layer w-hex" />
      <div className="w-layer w-grid" />
      <div className="w-layer w-rings" />
      {HEX.map(([l, tp, s, c, d], i) => (
        <span
          key={i}
          className={"hx " + c}
          style={{ left: l + "%", top: tp + "%", width: s, height: s * 1.1, animationDelay: d + "s" }}
        />
      ))}
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