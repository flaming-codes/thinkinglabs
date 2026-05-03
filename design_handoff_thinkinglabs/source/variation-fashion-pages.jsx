// Variation B family — additional pages (Listing, Detail) using the same theme
// system as variation-fashion.jsx. Both render with whichever themeKey is passed.

const SAMPLE_CLAIMS = [
  {
    id: "frontier-evals-greenfield",
    title: "Frontier evals overstate coding ability outside greenfield repos.",
    conf: 0.62,
    prev: 0.74,
    status: "active",
    reviewed: "2026-04-19",
    evidence: 4,
    opposing: 2,
    tags: ["AI", "evals"],
  },
  {
    id: "proposal-confirmation",
    title: "Unattended agents should propose, never write.",
    conf: 0.82,
    prev: null,
    status: "active",
    reviewed: "2026-04-19",
    evidence: 6,
    opposing: 0,
    tags: ["agents", "trust"],
  },
  {
    id: "rag-default",
    title: "RAG over a vector store is the right default for most assistants.",
    conf: 0.31,
    prev: 0.66,
    status: "deprecated",
    reviewed: "2026-04-12",
    evidence: 3,
    opposing: 5,
    tags: ["AI", "infra"],
  },
  {
    id: "markdown-canonical",
    title: "Markdown + git is the right canonical store for personal knowledge.",
    conf: 0.91,
    prev: 0.84,
    status: "active",
    reviewed: "2026-03-30",
    evidence: 7,
    opposing: 1,
    tags: ["tooling", "personal"],
  },
  {
    id: "calibration-kept",
    title: "Stated confidence is only useful if you're scored against it later.",
    conf: 0.88,
    prev: null,
    status: "active",
    reviewed: "2026-04-01",
    evidence: 5,
    opposing: 0,
    tags: ["epistemics"],
  },
  {
    id: "writing-as-thinking",
    title: "Writing in public is the cheapest forcing function for clear thinking.",
    conf: 0.76,
    prev: 0.72,
    status: "active",
    reviewed: "2026-02-14",
    evidence: 4,
    opposing: 2,
    tags: ["writing"],
  },
  {
    id: "tool-use-discipline",
    title: "Most agentic failures are tool-use discipline failures, not reasoning failures.",
    conf: 0.58,
    prev: 0.5,
    status: "active",
    reviewed: "2026-04-22",
    evidence: 3,
    opposing: 3,
    tags: ["agents"],
  },
  {
    id: "static-typing-cost",
    title: "Static typing pays for itself in any codebase past ~5kloc.",
    conf: 0.69,
    prev: 0.69,
    status: "active",
    reviewed: "2026-01-10",
    evidence: 4,
    opposing: 4,
    tags: ["software"],
  },
  {
    id: "personal-mcp",
    title: "A personal MCP server is the right shape for an agentic personal site.",
    conf: 0.74,
    prev: null,
    status: "active",
    reviewed: "2026-04-25",
    evidence: 2,
    opposing: 1,
    tags: ["MCP", "agents"],
  },
  {
    id: "vector-store-overrated",
    title: "Vector stores are overrated for retrieval over <100k documents.",
    conf: 0.55,
    prev: 0.55,
    status: "superseded",
    reviewed: "2026-03-04",
    evidence: 3,
    opposing: 2,
    tags: ["AI", "infra"],
  },
];

const FEATURED_CLAIM_FULL = {
  id: "claims/proposal-confirmation",
  title: "Unattended agents should propose, never write.",
  conf: 0.82,
  reviewed: "2026-04-19",
  status: "active",
  tags: ["agents", "trust", "ADR-009"],
  body: [
    "Five background agents scan the repo daily — `dormant-flip`, `review-decisions`, `resolve-predictions`, `freshness-review`, `triage-questions`. None of them write to `content/`. They enqueue typed proposals into a local queue, and a human drains it with `pnpm review-proposals`.",
    "The cost of the extra step is small: one keystroke per accepted change, a few seconds per rejected one. The cost of a quiet hallucination becoming canon is not. A canonical knowledge store has to be cheaper to verify than to corrupt; the only way I've found to make that true is to keep the verification step a human one.",
    "I expect this to remain true even as the underlying models get noticeably better. The asymmetry isn't between humans and current models — it's between irreversible writes to a knowledge graph and the value of any single proposed edit.",
  ],
  evidence: [
    {
      kind: "thought",
      title: "Why I keep a manual review step in agentic pipelines",
      id: "thoughts/manual-review-step",
    },
    {
      kind: "decision",
      title: "Use proposal-queue.json as the only agent → source bridge",
      id: "decisions/proposal-queue",
    },
    {
      kind: "input",
      title: 'Anthropic, "Sleeper agents" (2024)',
      id: "inputs/anthropic-sleeper-agents",
    },
    {
      kind: "claim",
      title: "Markdown + git is the right canonical store for personal knowledge.",
      id: "claims/markdown-canonical",
    },
    {
      kind: "input",
      title: 'Engelbart, "Augmenting Human Intellect" (1962)',
      id: "inputs/engelbart-augmenting",
    },
    { kind: "thought", title: "Trust budgets in agentic systems", id: "thoughts/trust-budgets" },
  ],
  opposing: [],
  history: [
    {
      date: "2026-04-19",
      conf: 0.82,
      note: "Reviewed after first quarter of running all five agents in production.",
    },
    {
      date: "2026-02-02",
      conf: 0.78,
      note: "Bumped after `freshness-review` caught two stale claims I'd have missed.",
    },
    { date: "2025-11-14", conf: 0.7, note: "Initial confidence at time of writing." },
  ],
};

// ---------- Listing page ----------
function FashionListingPage({ themeKey = "forum" }) {
  const t = window.FASHION_THEMES[themeKey];
  const s = window.makeFashionStyles(t);

  const listingStyles = {
    eyebrow: {
      padding: "32px 40px 0",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: t.muted,
    },
    head: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "end",
      padding: "8px 40px 32px",
      borderBottom: `1px solid ${t.line}`,
    },
    title: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: 120,
      lineHeight: 0.95,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },
    sub: {
      fontFamily: t.bodyFamily,
      fontSize: 16,
      lineHeight: 1.55,
      maxWidth: 460,
      color: t.soft,
      textAlign: "right",
      marginBottom: 18,
    },
    filterRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "20px 40px",
      borderBottom: `1px solid ${t.line}`,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: t.muted,
    },
    filters: { display: "flex", gap: 18 },
    chip: { color: t.ink, borderBottom: `1px solid ${t.ink}`, paddingBottom: 2 },
    chipMuted: { color: t.muted },
    row: {
      display: "grid",
      gridTemplateColumns: "60px minmax(0, 2fr) 200px 140px 80px",
      alignItems: "center",
      columnGap: 24,
      padding: "26px 40px",
      borderBottom: `1px solid ${t.line}`,
      cursor: "pointer",
      transition: "background 200ms",
    },
    rowIdx: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.muted,
      letterSpacing: "0.05em",
    },
    rowTitle: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: 28,
      lineHeight: 1.1,
      letterSpacing: "-0.012em",
      color: t.ink,
      textWrap: "pretty",
    },
    rowConf: { display: "flex", alignItems: "center", gap: 10 },
    confTrack: {
      flex: 1,
      height: 1,
      background: t.line,
      position: "relative",
    },
    confFill: (v) => ({
      position: "absolute",
      left: 0,
      top: -1,
      height: 3,
      background: t.accent || t.ink,
      width: `${Math.round(v * 100)}%`,
    }),
    confNum: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 13,
      color: t.ink,
      minWidth: 38,
      textAlign: "right",
    },
    delta: (up) => ({
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      color: up ? "#2f6b3a" : "#a8362a",
    }),
    meta: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      color: t.muted,
      letterSpacing: "0.05em",
    },
    statusPill: (status) => ({
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color:
        status === "active"
          ? t.ink
          : status === "deprecated"
            ? "#a8362a"
            : status === "superseded"
              ? t.muted
              : t.muted,
    }),
  };

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <div style={s.brand}>
          <span style={s.brandMark}>
            <span style={s.brandMarkInner}></span>
          </span>
          <span style={s.brandText}>thinkinglabs</span>
        </div>
        <nav style={s.nav}>
          <a style={{ ...s.navItem, ...s.navMuted }}>Index</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Now</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Calibration</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Brain-diff</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>About</a>
        </nav>
        <a style={s.cta}>Get in touch ↗</a>
      </div>

      <div style={listingStyles.eyebrow}>§ Claims · /claims</div>
      <div style={listingStyles.head}>
        <h1 style={listingStyles.title}>Claims.</h1>
        <p style={listingStyles.sub}>
          Atomic structured assertions. Each carries a confidence in [0,1], evidence, opposing
          views, and a last-reviewed date. Sorted by recency.
        </p>
      </div>

      <div style={listingStyles.filterRow}>
        <div style={listingStyles.filters}>
          <span style={listingStyles.chip}>All</span>
          <span style={listingStyles.chipMuted}>Active</span>
          <span style={listingStyles.chipMuted}>Deprecated</span>
          <span style={listingStyles.chipMuted}>Superseded</span>
        </div>
        <div style={listingStyles.filters}>
          <span style={listingStyles.chipMuted}>Sort: reviewed</span>
          <span style={listingStyles.chipMuted}>{SAMPLE_CLAIMS.length} of 47</span>
        </div>
      </div>

      {SAMPLE_CLAIMS.map((c, i) => {
        const delta = c.prev === null ? null : c.conf - c.prev;
        return (
          <div
            key={c.id}
            style={listingStyles.row}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = t.accent
                ? "#ece6d6"
                : themeKey === "sans-stark"
                  ? "#fafafa"
                  : "#fafafa")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={listingStyles.rowIdx}>{String(i + 1).padStart(3, "0")}</div>
            <div>
              <div style={listingStyles.rowTitle}>{c.title}</div>
              <div style={{ marginTop: 6, display: "flex", gap: 12 }}>
                <span style={listingStyles.statusPill(c.status)}>{c.status}</span>
                <span style={listingStyles.meta}>reviewed {c.reviewed}</span>
                <span style={listingStyles.meta}>
                  {c.evidence} ev · {c.opposing} opp
                </span>
              </div>
            </div>
            <div style={listingStyles.rowConf}>
              <div style={listingStyles.confTrack}>
                <div style={listingStyles.confFill(c.conf)}></div>
              </div>
              <span style={listingStyles.confNum}>{c.conf.toFixed(2)}</span>
            </div>
            <div style={listingStyles.meta}>
              {delta === null ? (
                <span>new</span>
              ) : delta === 0 ? (
                <span>—</span>
              ) : (
                <span style={listingStyles.delta(delta > 0)}>
                  {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}
                </span>
              )}
            </div>
            <div style={{ ...listingStyles.meta, textAlign: "right" }}>↗</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Detail page ----------
function FashionDetailPage({ themeKey = "forum" }) {
  const t = window.FASHION_THEMES[themeKey];
  const s = window.makeFashionStyles(t);
  const c = FEATURED_CLAIM_FULL;

  const detail = {
    crumbs: {
      padding: "32px 40px 0",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    crumbActive: { color: t.ink },
    head: {
      display: "grid",
      gridTemplateColumns: "1fr 320px",
      columnGap: 64,
      padding: "32px 40px 48px",
      borderBottom: `1px solid ${t.line}`,
    },
    title: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: 76,
      lineHeight: 1.02,
      letterSpacing: t.ledeLetter,
      margin: 0,
      color: t.ink,
      textWrap: "balance",
    },
    metaCol: { paddingTop: 8 },
    metaLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: t.muted,
      marginBottom: 6,
    },
    confBig: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: 96,
      lineHeight: 0.9,
      letterSpacing: t.ledeLetter,
      color: t.accent || t.ink,
      margin: "0 0 4px",
    },
    confTrack: {
      width: "100%",
      height: 2,
      background: t.line,
      position: "relative",
      margin: "12px 0 20px",
    },
    confFill: {
      position: "absolute",
      left: 0,
      top: -1,
      height: 4,
      background: t.accent || t.ink,
      width: `${Math.round(c.conf * 100)}%`,
    },
    metaList: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.soft,
      lineHeight: 1.9,
    },
    metaKey: { color: t.muted, marginRight: 8 },
    body: {
      display: "grid",
      gridTemplateColumns: "1fr 320px",
      columnGap: 64,
      padding: "48px 40px 60px",
      borderBottom: `1px solid ${t.line}`,
    },
    bodyText: {
      fontFamily: t.bodyFamily,
      fontSize: 19,
      lineHeight: 1.6,
      color: t.ink,
      maxWidth: 640,
    },
    drop: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: 76,
      lineHeight: 0.85,
      float: "left",
      paddingRight: 14,
      paddingTop: 6,
      color: t.accent || t.ink,
    },
    sideHead: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: t.muted,
      paddingBottom: 10,
      borderBottom: `1px solid ${t.line}`,
      marginBottom: 12,
    },
    histRow: {
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      columnGap: 12,
      padding: "10px 0",
      borderBottom: `1px solid ${t.line}`,
      fontSize: 13,
      color: t.soft,
      lineHeight: 1.45,
    },
    histDate: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      color: t.muted,
      letterSpacing: "0.05em",
    },
    histConf: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.ink,
    },
    evHead: {
      padding: "32px 40px 12px",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: t.muted,
    },
    evGrid: {
      padding: "0 40px 60px",
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      columnGap: 24,
    },
    evRow: {
      display: "grid",
      gridTemplateColumns: "100px 1fr",
      alignItems: "baseline",
      columnGap: 16,
      padding: "20px 0",
      borderBottom: `1px solid ${t.line}`,
    },
    evKind: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      color: t.muted,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
    },
    evTitle: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: 22,
      lineHeight: 1.2,
      color: t.ink,
      letterSpacing: "-0.01em",
      textWrap: "pretty",
    },
  };

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <div style={s.brand}>
          <span style={s.brandMark}>
            <span style={s.brandMarkInner}></span>
          </span>
          <span style={s.brandText}>thinkinglabs</span>
        </div>
        <nav style={s.nav}>
          <a style={{ ...s.navItem, ...s.navMuted }}>Index</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Now</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Calibration</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Brain-diff</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>About</a>
        </nav>
        <a style={s.cta}>Get in touch ↗</a>
      </div>

      <div style={detail.crumbs}>
        <span>Index</span> &nbsp;/&nbsp;
        <span>Claims</span> &nbsp;/&nbsp;
        <span style={detail.crumbActive}>{c.id.split("/")[1]}</span>
      </div>

      <div style={detail.head}>
        <h1 style={detail.title}>{c.title}</h1>
        <div style={detail.metaCol}>
          <div style={detail.metaLabel}>Confidence</div>
          <div style={detail.confBig}>{c.conf.toFixed(2)}</div>
          <div style={detail.confTrack}>
            <div style={detail.confFill}></div>
          </div>
          <div style={detail.metaList}>
            <div>
              <span style={detail.metaKey}>status</span>
              {c.status}
            </div>
            <div>
              <span style={detail.metaKey}>reviewed</span>
              {c.reviewed}
            </div>
            <div>
              <span style={detail.metaKey}>evidence</span>
              {c.evidence.length}
            </div>
            <div>
              <span style={detail.metaKey}>opposing</span>
              {c.opposing.length}
            </div>
            <div>
              <span style={detail.metaKey}>tags</span>
              {c.tags.join(", ")}
            </div>
          </div>
        </div>
      </div>

      <div style={detail.body}>
        <div style={detail.bodyText}>
          <p style={{ margin: 0 }}>
            <span style={detail.drop}>F</span>
            {c.body[0].slice(1)}
          </p>
          {c.body.slice(1).map((p, i) => (
            <p key={i} style={{ margin: "1.2em 0 0" }}>
              {p}
            </p>
          ))}
        </div>
        <div>
          <div style={detail.sideHead}>Confidence over time</div>
          {c.history.map((h, i) => (
            <div key={i} style={detail.histRow}>
              <span style={detail.histDate}>{h.date}</span>
              <span style={{ color: t.soft, fontSize: 12 }}>{h.note}</span>
              <span style={detail.histConf}>{h.conf.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={detail.evHead}>§ Evidence — {c.evidence.length} linked</div>
      <div style={detail.evGrid}>
        {c.evidence.map((e, i) => (
          <div key={i} style={detail.evRow}>
            <span style={detail.evKind}>{e.kind}</span>
            <span style={detail.evTitle}>{e.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.FashionListingPage = FashionListingPage;
window.FashionDetailPage = FashionDetailPage;
