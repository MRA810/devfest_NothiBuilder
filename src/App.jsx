import { useState, useMemo, useEffect } from "react";
import { inspect, buildPackage } from "./pdfutil";
import { T } from "./i18n";
import Welcome, { TearOverlay, ThemeBtn, Ticker } from "./Welcome";

const ST = {
  missing: ["bad", "bi-x-octagon-fill"],
  needExp: ["warn", "bi-calendar-event-fill"],
  expired: ["bad", "bi-calendar-x-fill"],
  optional: ["neutral", "bi-dash-circle-fill"],
  ok: ["good", "bi-check-circle-fill"],
};
const BLOCK = ["missing", "needExp", "expired"];
const MAX_FILES = 30,
  MAX_BYTES = 50 * 1024 * 1024;

export default function App() {
  const [lang, setLang] = useState("en");
  const t = T[lang];
  const [data, setData] = useState(null);
  const [files, setFiles] = useState([]);
  const [match, setMatch] = useState({});
  const [expiry, setExpiry] = useState({});
  const [notes, setNotes] = useState([]);
  const [idx, setIdx] = useState(true);
  const [pkg, setPkg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Theme (light / dark) - remembers the choice, falls back to the system setting
  const [theme, setTheme] = useState(() => {
    try {
      const s = localStorage.getItem("nothi-theme");
      if (s === "light" || s === "dark") return s;
    } catch {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("nothi-theme", theme);
    } catch {}
  }, [theme]);
  const toggleTheme = () => {
    const flip = () => setTheme((x) => (x === "dark" ? "light" : "dark"));
    if (document.startViewTransition) document.startViewTransition(flip);
    else flip();
  };

  // Screens: welcome -> tearing (page tear + bubbles) -> app
  const [screen, setScreen] = useState("welcome");
  const start = () => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setScreen("app");
      return;
    }
    setScreen("tearing");
    setTimeout(() => setScreen("app"), 2600);
  };
  const welcomeProps = { t, lang, setLang, theme, toggleTheme, onStart: start };

  const reqs = useMemo(
    () =>
      data ? [...data.requirements].sort((a, b) => a.order - b.order) : [],
    [data],
  );
  useEffect(() => {
    setPkg(null);
  }, [match, expiry, files, idx, data]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const dupCount = useMemo(() => {
    const c = {};
    files.forEach((f) => {
      c[f.hash] = (c[f.hash] || 0) + 1;
    });
    return c;
  }, [files]);
  const usedBy = (fid) => Object.keys(match).find((k) => match[k] === fid);

  const status = (r) => {
    if (!match[r.id]) return r.mandatory ? "missing" : "optional";
    if (r.has_expiry) {
      const e = expiry[r.id];
      if (!e) return "needExp";
      if (e < data.tender.submission_deadline) return "expired";
    }
    return "ok";
  };
  const rows = reqs.map((r) => ({
    r,
    f: files.find((x) => x.id === match[r.id]),
    s: status(r),
    e: expiry[r.id],
  }));
  const blockers = rows.filter((x) => BLOCK.includes(x.s));
  const name = (r) => (lang === "bn" ? r.title_bn || r.title_en : r.title_en);

  async function loadJson(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!j.tender?.tender_id || !Array.isArray(j.requirements))
        throw new Error("bad");
      // Deadline must be a real YYYY-MM-DD date, otherwise expiry checks silently never fire
      const dl = String(j.tender.submission_deadline ?? "").trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dl) || isNaN(Date.parse(dl)))
        throw new Error("bad");
      j.tender.submission_deadline = dl;
      if (j.requirements.some((r) => !r || r.id == null || isNaN(Number(r.order))))
        throw new Error("bad");
      setData(j);
      setMatch({});
      setExpiry({});
      setNotes([]);
    } catch {
      setNotes([{ id: "j", k: "json", name: f.name }]);
    }
  }

  async function addFiles(e) {
    const list = [...e.target.files];
    e.target.value = "";
    const ok = [],
      bad = [];
    let count = files.length,
      bytes = files.reduce((a, f) => a + f.buf.byteLength, 0);
    for (const f of list) {
      const id = crypto.randomUUID();
      if (count + 1 > MAX_FILES || bytes + f.size > MAX_BYTES) {
        bad.push({ id, k: "limit", name: f.name });
        continue;
      }
      const r = await inspect(f);
      if (r.error) {
        bad.push({ id, k: r.error, name: f.name });
        continue;
      }
      count++;
      bytes += r.buf.byteLength;
      ok.push({ id, name: f.name, ...r });
    }
    setFiles((p) => [...p, ...ok]);
    setNotes(bad);
  }

  const removeFile = (fid) => {
    const rid = usedBy(fid);
    if (rid) setExpiry((m) => { const n = { ...m }; delete n[rid]; return n; });
    setFiles((p) => p.filter((f) => f.id !== fid));
    setMatch((m) =>
      Object.fromEntries(Object.entries(m).filter(([, v]) => v !== fid)),
    );
  };
  const assign = (rid, fid) => {
    if (fid !== match[rid])
      setExpiry((m) => { const n = { ...m }; delete n[rid]; return n; });
    setMatch((m) => {
      const n = { ...m };
      if (fid) n[rid] = fid;
      else delete n[rid];
      return n;
    });
  };
  const optState = (f, rid) => {
    const u = usedBy(f.id);
    if (u && u !== rid) return t.used;
    const twin = files.some(
      (g) =>
        g.id !== f.id &&
        g.hash === f.hash &&
        usedBy(g.id) &&
        usedBy(g.id) !== rid,
    );
    return twin ? t.dupNo : "";
  };

  async function generate() {
    setBusy(true);
    setNotes([]);
    try {
      const items = rows
        .filter((x) => x.f)
        .map((x) => ({ title: x.r.title_en, file: x.f, expiry: x.e }));
      const bytes = await buildPackage(data.tender, items, idx);
      setPkg(
        URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })),
      );
    } catch {
      setNotes([{ id: "g", k: "gen", name: "" }]);
    }
    setBusy(false);
  }

  function exportCsv() {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      t.csvHead,
      ...rows.map((x) => [name(x.r), x.f?.name, x.f?.pages, x.r.has_expiry ? x.e : "", t.st[x.s]]),
    ];
    const blob = new Blob(
      ["\ufeff" + lines.map((l) => l.map(q).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${data.tender.tender_id}_Checklist.csv`;
    a.click();
  }

  const okCount = rows.filter((x) => x.s === "ok").length;

  if (screen === "welcome") return <Welcome {...welcomeProps} />;

  return (
    <>
      {screen === "tearing" && <TearOverlay {...welcomeProps} />}
      <div className="bubbles" aria-hidden="true">
        {[
          [-6, 62, 230, 0],
          [80, 3, 130, 2],
          [86, 48, 80, 4],
          [8, 8, 70, 1],
          [62, 78, 150, 3],
        ].map(([l, tp, s, d], i) => (
          <span
            key={i}
            style={{
              left: l + "%",
              top: tp + "%",
              width: s,
              height: s,
              animationDelay: d + "s",
            }}
          />
        ))}
      </div>
      <main className="wrap">
        <header className="hero card">
          <div className="orb">
            <i className="bi bi-file-earmark-pdf-fill" />
          </div>
          <div className="hero-text">
            <h1>{t.app}</h1>
            <p>{t.tag}</p>
          </div>
          <div className="hero-ctl">
            <ThemeBtn theme={theme} toggle={toggleTheme} t={t} />
            <button
              className="btn green"
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
            >
              <i className="bi bi-translate" /> {t.lang}
            </button>
          </div>
        </header>
        <div className="ticker-wrap">
          <Ticker text={t.ticker} />
        </div>

        {notes.length > 0 && (
          <div className="notes" role="alert">
            {notes.map((n) => (
              <div key={n.id} className="note">
                <i className="bi bi-exclamation-triangle-fill" />{" "}
                <b>{n.name}</b> {n.name && "-"} {t.err[n.k]}
              </div>
            ))}
          </div>
        )}

        <section className="card">
          <h2>
            <i className="bi bi-1-circle-fill" /> {t.s1}
          </h2>
          <p className="hint">{t.s1h}</p>
          <label className="btn">
            <i className="bi bi-folder2-open" /> {t.s1b}
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={loadJson}
            />
          </label>
          {data && (
            <dl className="tender">
              <div>
                <dt>
                  <i className="bi bi-hash" /> {t.id}
                </dt>
                <dd>{data.tender.tender_id}</dd>
              </div>
              <div>
                <dt>
                  <i className="bi bi-card-heading" /> {t.title}
                </dt>
                <dd>{data.tender.title}</dd>
              </div>
              <div>
                <dt>
                  <i className="bi bi-building" /> {t.entity}
                </dt>
                <dd>{data.tender.procuring_entity}</dd>
              </div>
              <div>
                <dt>
                  <i className="bi bi-briefcase" /> {t.bidder}
                </dt>
                <dd>{data.tender.bidder}</dd>
              </div>
              <div>
                <dt>
                  <i className="bi bi-calendar-check" /> {t.deadline}
                </dt>
                <dd>{data.tender.submission_deadline}</dd>
              </div>
            </dl>
          )}
        </section>

        <div className="grid">
          <section className="card">
            <h2>
              <i className="bi bi-2-circle-fill" /> {t.s2}
            </h2>
            <p className="hint">{t.s2h}</p>
            <label className="btn">
              <i className="bi bi-cloud-arrow-up-fill" /> {t.s2b}
              <input type="file" multiple hidden onChange={addFiles} />
            </label>
            <ul className="files">
              {files.length === 0 && (
                <li className="empty">
                  <i className="bi bi-files" /> {t.none}
                </li>
              )}
              {files.map((f) => (
                <li key={f.id} className="file">
                  <i className="bi bi-file-earmark-pdf" />
                  <div className="fi">
                    <b title={f.name}>{f.name}</b>
                    <small>
                      {f.pages} {t.pages}
                    </small>
                    {dupCount[f.hash] > 1 && (
                      <span className="chip warn">
                        <i className="bi bi-copy" /> {t.dup}
                      </span>
                    )}
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => removeFile(f.id)}
                    title={t.remove}
                    aria-label={t.remove}
                  >
                    <i className="bi bi-trash3-fill" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>
              <i className="bi bi-3-circle-fill" /> {t.s3}
            </h2>
            {!data && (
              <p className="empty">
                <i className="bi bi-info-circle" /> {t.loadFirst}
              </p>
            )}
            <ul className="reqs">
              {rows.map(({ r, f, s }) => {
                const [cls, ic] = ST[s];
                return (
                  <li key={r.id} className={"req " + cls}>
                    <div className="req-top">
                      <span className="ord">{r.order}</span>
                      <div className="rt">
                        <b>{name(r)}</b>
                        <small>
                          {r.mandatory ? t.mandatory : t.optional}
                          {r.has_expiry && (
                            <>
                              {" "}
                              &nbsp;
                              <i className="bi bi-hourglass-split" /> {t.expiry}
                            </>
                          )}
                        </small>
                      </div>
                      <span className={"chip " + cls}>
                        <i className={"bi " + ic} /> {t.st[s]}
                      </span>
                    </div>
                    <div className="req-ctl">
                      <select
                        value={match[r.id] || ""}
                        onChange={(e) => assign(r.id, e.target.value)}
                        aria-label={name(r)}
                      >
                        <option value="">{t.choose}</option>
                        {files.map((x) => {
                          const why = optState(x, r.id);
                          return (
                            <option key={x.id} value={x.id} disabled={!!why}>
                              {x.name} ({x.pages}){why && " - " + why}
                            </option>
                          );
                        })}
                      </select>
                      {f && (
                        <button
                          className="icon-btn"
                          onClick={() => assign(r.id, "")}
                          title={t.clear}
                          aria-label={t.clear}
                        >
                          <i className="bi bi-arrow-counterclockwise" />
                        </button>
                      )}
                      {r.has_expiry && f && (
                        <input
                          type="date"
                          value={expiry[r.id] || ""}
                          aria-label={t.expiry}
                          onChange={(e) =>
                            setExpiry((m) => ({ ...m, [r.id]: e.target.value }))
                          }
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {data && (
          <section className="card make">
            <h2>
              <i className="bi bi-4-circle-fill" /> {t.s4}
            </h2>
            <div className="meter">
              <div
                style={{
                  width:
                    (reqs.length ? (okCount / reqs.length) * 100 : 0) + "%",
                }}
              />
            </div>
            {blockers.length > 0 ? (
              <div className="why">
                <b>
                  <i className="bi bi-shield-exclamation" /> {t.blocked}
                </b>
                <ul>
                  {blockers.map((x) => (
                    <li key={x.r.id}>
                      {name(x.r)} -{" "}
                      <span className="chip bad">{t.st[x.s]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="okmsg">
                <i className="bi bi-patch-check-fill" />{" "}
                {pkg ? t.made : t.ready}
              </p>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={idx}
                onChange={(e) => setIdx(e.target.checked)}
              />{" "}
              {t.withIndex}
            </label>
            <div className="actions">
              <button
                className="btn"
                disabled={blockers.length > 0 || busy}
                onClick={generate}
              >
                <i
                  className={
                    "bi " +
                    (busy ? "bi-arrow-repeat spin" : "bi-gear-wide-connected")
                  }
                />{" "}
                {t.generate}
              </button>
              {pkg && (
                <a
                  className="btn green"
                  href={pkg}
                  download={`${data.tender.tender_id}_Package.pdf`}
                >
                  <i className="bi bi-download" /> {t.download}
                </a>
              )}
              <button className="btn ghost" onClick={exportCsv}>
                <i className="bi bi-filetype-csv" /> {t.csv}
              </button>
            </div>
          </section>
        )}
      </main>
    </>
  );
}