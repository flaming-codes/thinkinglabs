// Variant B (Forum) — additional pages: Now, Calibration, Brain-diff.
// Single theme committed: themeKey="forum". Re-uses makeFashionStyles for chrome.

const NOW_DATA = {
  season: "May 2026 — late spring",
  thesis: "Trying to make agentic edits cheap to verify and expensive to corrupt.",
  active: [
    {
      title: "thinkinglabs",
      kind: "this site",
      currentQ:
        "Can a markdown-canonical knowledge graph stay coherent under daily agent activity for a year without a human review burning out?",
      since: "2024-11",
      pulse: 0.82,
    },
    {
      title: "Calibration as a habit",
      kind: "personal practice",
      currentQ: "What confidence floor makes me actually update versus quietly drifting?",
      since: "2025-08",
      pulse: 0.6,
    },
    {
      title: "wild.as",
      kind: "consultancy",
      currentQ: "What does the right shape of an AI-and-systems consultancy look like in 2026?",
      since: "2024-01",
      pulse: 0.74,
    },
    {
      title: "Personal MCP server",
      kind: "tool",
      currentQ: "Which resources are worth exposing as MCP vs. plain JSON feeds?",
      since: "2026-02",
      pulse: 0.5,
    },
  ],
  reading: [
    "Engelbart, Augmenting Human Intellect (1962, re-read)",
    "Kahneman & Klein, Conditions for Intuitive Expertise",
    "Stafford Beer, Brain of the Firm",
    "Anthropic, Sleeper Agents (2024)",
  ],
  notReading: ["Anything pitched as a 'second brain'", "Founder advice on Twitter"],
};

const CALIB_DATA = {
  brier: 0.18,
  log: -0.42,
  count: 38,
  resolved: 26,
  pending: 12,
  // each bucket: stated confidence, count, fraction-correct
  bins: [
    { stated: 0.1, n: 4, hit: 0.25 },
    { stated: 0.2, n: 3, hit: 0.33 },
    { stated: 0.3, n: 2, hit: 0.5 },
    { stated: 0.4, n: 0, hit: null },
    { stated: 0.5, n: 3, hit: 0.33 },
    { stated: 0.6, n: 5, hit: 0.6 },
    { stated: 0.7, n: 4, hit: 0.75 },
    { stated: 0.8, n: 3, hit: 0.66 },
    { stated: 0.9, n: 2, hit: 1.0 },
  ],
  recent: [
    {
      title: "An open-weight model will match GPT-4o on MMLU by EOY 2025",
      stated: 0.7,
      outcome: true,
      resolved: "2026-04-28",
    },
    {
      title: "I'll publish ≥ 8 long-form posts in 2026",
      stated: 0.45,
      outcome: null,
      due: "2026-12-31",
    },
    {
      title:
        "Apple ships an on-device assistant that beats Siri 2024 on intent F1 by 2x at WWDC 2026",
      stated: 0.55,
      outcome: null,
      due: "2026-06-15",
    },
    {
      title: "Vector DB sales will cool measurably by 2026",
      stated: 0.6,
      outcome: true,
      resolved: "2026-03-10",
    },
    {
      title: "I'll keep weekly review streak through Q1",
      stated: 0.85,
      outcome: false,
      resolved: "2026-04-01",
    },
  ],
};

const DIFF_DATA = [
  {
    day: "Today",
    entries: [
      {
        kind: "claim",
        action: "revised",
        title: "Frontier evals overstate coding ability outside greenfield repos",
        from: 0.74,
        to: 0.62,
        why: "Three weeks of attempted refactor work in a 200kloc TS codebase. Models still get lost in the imports.",
      },
    ],
  },
  {
    day: "Yesterday",
    entries: [
      {
        kind: "thought",
        action: "added",
        title: "Why I keep a manual review step in agentic pipelines",
        words: 1840,
      },
      {
        kind: "prediction",
        action: "updated",
        title:
          "Apple ships an on-device assistant that beats Siri 2024 on intent F1 by 2x at WWDC 2026",
        from: 0.55,
        to: 0.55,
        why: "No movement, but bumped freshness.",
      },
    ],
  },
  {
    day: "Apr 28",
    entries: [
      {
        kind: "prediction",
        action: "resolved",
        title: "An open-weight model will match GPT-4o on MMLU by EOY 2025",
        from: 0.7,
        outcome: "true",
        why: "Llama 3.3 405B crossed 86 in March. Counts.",
      },
      {
        kind: "claim",
        action: "added",
        title: "Calibration is the only honest measure of an opinion economy",
        conf: 0.78,
      },
    ],
  },
  {
    day: "Apr 22",
    entries: [
      {
        kind: "decision",
        action: "reversed",
        title: "Use SQLite as the canonical store",
        why: "Markdown wins for git-trackability. SQLite is now derived only.",
      },
      {
        kind: "claim",
        action: "deprecated",
        title: "RAG over a vector store is the right default for most assistants",
        from: 0.66,
        to: 0.31,
      },
    ],
  },
  {
    day: "Apr 18",
    entries: [
      {
        kind: "input",
        action: "added",
        title: "Engelbart, Augmenting Human Intellect (1962, re-read)",
      },
      {
        kind: "thought",
        action: "added",
        title: "What 1962 still gets right about agents",
        words: 920,
      },
    ],
  },
];

// ---------- Now ----------
function NowPage() {
  const t = window.FASHION_THEMES.forum;
  const s = window.makeFashionStyles(t);
  const n = NOW_DATA;

  const now = {
    eyebrow: {
      padding: "32px 40px 0",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: t.muted,
    },
    head: { padding: "8px 40px 64px", borderBottom: `1px solid ${t.line}` },
    title: {
      fontFamily: t.displayFamily,
      fontSize: 200,
      lineHeight: 0.92,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },
    season: {
      marginTop: 16,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    thesis: {
      marginTop: 28,
      fontFamily: t.displayFamily,
      fontSize: 44,
      lineHeight: 1.15,
      letterSpacing: "-0.012em",
      color: t.ink,
      maxWidth: 1100,
      textWrap: "pretty",
    },

    sectHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      padding: "48px 40px 16px",
      borderBottom: `1px solid ${t.line}`,
    },
    sectLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: t.muted,
    },
    sectCount: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.muted,
    },

    projGrid: { padding: "0 40px 32px" },
    projRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1.4fr 200px",
      columnGap: 32,
      padding: "32px 0",
      borderBottom: `1px solid ${t.line}`,
      alignItems: "baseline",
    },
    projTitle: {
      fontFamily: t.displayFamily,
      fontSize: 56,
      lineHeight: 1,
      letterSpacing: t.ledeLetter,
      margin: 0,
      color: t.ink,
    },
    projKind: {
      marginTop: 6,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: t.muted,
    },
    projQ: { fontSize: 17, lineHeight: 1.55, color: t.soft, fontStyle: "italic", maxWidth: 540 },
    pulseWrap: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 },
    pulseTrack: { width: 160, height: 1, background: t.line, position: "relative" },
    pulseFill: (v) => ({
      position: "absolute",
      left: 0,
      top: -1,
      height: 3,
      background: t.ink,
      width: `${v * 100}%`,
    }),
    pulseMeta: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      color: t.muted,
      letterSpacing: "0.05em",
    },

    twoCol: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      padding: "48px 40px 60px",
      borderTop: `1px solid ${t.line}`,
    },
    listHead: {
      fontFamily: t.displayFamily,
      fontSize: 36,
      margin: "0 0 16px",
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },
    li: {
      padding: "14px 0",
      borderTop: `1px solid ${t.line}`,
      fontSize: 16,
      lineHeight: 1.45,
      color: t.soft,
    },
    notLi: {
      padding: "14px 0",
      borderTop: `1px solid ${t.line}`,
      fontSize: 16,
      lineHeight: 1.45,
      color: t.muted,
      textDecoration: "line-through",
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
          <a style={s.navItem}>Now</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Calibration</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Brain-diff</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>About</a>
        </nav>
        <a style={s.cta}>Get in touch ↗</a>
      </div>

      <div style={now.eyebrow}>§ /now</div>
      <div style={now.head}>
        <h1 style={now.title}>Now.</h1>
        <div style={now.season}>{n.season} · last touched 2026-05-03</div>
        <p style={now.thesis}>{n.thesis}</p>
      </div>

      <div style={now.sectHead}>
        <div style={now.sectLabel}>Active threads</div>
        <div style={now.sectCount}>{n.active.length} alive</div>
      </div>
      <div style={now.projGrid}>
        {n.active.map((p) => (
          <div key={p.title} style={now.projRow}>
            <div>
              <h3 style={now.projTitle}>{p.title}</h3>
              <div style={now.projKind}>
                {p.kind} · since {p.since}
              </div>
            </div>
            <div style={now.projQ}>“{p.currentQ}”</div>
            <div style={now.pulseWrap}>
              <div style={now.pulseMeta}>pulse</div>
              <div style={now.pulseTrack}>
                <div style={now.pulseFill(p.pulse)}></div>
              </div>
              <div style={now.pulseMeta}>{Math.round(p.pulse * 100)}%</div>
            </div>
          </div>
        ))}
      </div>

      <div style={now.twoCol}>
        <div style={{ paddingRight: 32, borderRight: `1px solid ${t.line}` }}>
          <h2 style={now.listHead}>Reading</h2>
          {n.reading.map((r) => (
            <div key={r} style={now.li}>
              {r}
            </div>
          ))}
        </div>
        <div style={{ paddingLeft: 32 }}>
          <h2 style={now.listHead}>Not reading</h2>
          {n.notReading.map((r) => (
            <div key={r} style={now.notLi}>
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Calibration ----------
function CalibrationPage() {
  const t = window.FASHION_THEMES.forum;
  const s = window.makeFashionStyles(t);
  const c = CALIB_DATA;

  const cal = {
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
      gridTemplateColumns: "1fr 360px",
      columnGap: 64,
      padding: "8px 40px 48px",
      borderBottom: `1px solid ${t.line}`,
      alignItems: "end",
    },
    title: {
      fontFamily: t.displayFamily,
      fontSize: 140,
      lineHeight: 0.92,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },
    sub: { fontSize: 16, lineHeight: 1.55, color: t.soft, maxWidth: 360, marginBottom: 18 },

    statRow: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      borderBottom: `1px solid ${t.line}`,
    },
    stat: { padding: "32px 40px", borderRight: `1px solid ${t.line}` },
    statKey: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
      marginBottom: 8,
    },
    statVal: {
      fontFamily: t.displayFamily,
      fontSize: 64,
      lineHeight: 0.95,
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },
    statHint: { fontSize: 13, color: t.muted, marginTop: 6 },

    chartWrap: { padding: "48px 40px 60px", borderBottom: `1px solid ${t.line}` },
    chartHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 32,
    },
    chartTitle: {
      fontFamily: t.displayFamily,
      fontSize: 36,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },
    chartLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },

    listHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      padding: "32px 40px 16px",
    },
    listTitle: {
      fontFamily: t.displayFamily,
      fontSize: 36,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },
    pred: {
      display: "grid",
      gridTemplateColumns: "100px 1fr 120px 140px",
      columnGap: 24,
      padding: "20px 40px",
      borderTop: `1px solid ${t.line}`,
      alignItems: "baseline",
    },
    predConf: {
      fontFamily: t.displayFamily,
      fontSize: 32,
      color: t.ink,
      letterSpacing: t.ledeLetter,
    },
    predTitle: {
      fontFamily: t.displayFamily,
      fontSize: 22,
      lineHeight: 1.2,
      color: t.ink,
      letterSpacing: "-0.01em",
      textWrap: "pretty",
    },
    predDate: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      color: t.muted,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
    },
    badge: (kind) => ({
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: kind === true ? "#2f6b3a" : kind === false ? "#a8362a" : t.muted,
      textAlign: "right",
    }),
  };

  // Chart geometry — 1360 wide, 360 tall
  const W = 1360,
    H = 360,
    pad = 40;
  const innerW = W - pad * 2,
    innerH = H - pad * 2;
  const x = (v) => pad + v * innerW;
  const y = (v) => pad + (1 - v) * innerH;

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
          <a style={s.navItem}>Calibration</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Brain-diff</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>About</a>
        </nav>
        <a style={s.cta}>Get in touch ↗</a>
      </div>

      <div style={cal.eyebrow}>§ /predictions/calibration</div>
      <div style={cal.head}>
        <h1 style={cal.title}>Kept score.</h1>
        <p style={cal.sub}>
          Stated confidence on the x-axis, realised accuracy on the y. The 45° line is perfect
          calibration. Bubble size = number of predictions in that bucket.
        </p>
      </div>

      <div style={cal.statRow}>
        <div style={cal.stat}>
          <div style={cal.statKey}>Brier</div>
          <div style={cal.statVal}>{c.brier.toFixed(2)}</div>
          <div style={cal.statHint}>lower is better</div>
        </div>
        <div style={cal.stat}>
          <div style={cal.statKey}>Log loss</div>
          <div style={cal.statVal}>{c.log.toFixed(2)}</div>
          <div style={cal.statHint}>natural log</div>
        </div>
        <div style={cal.stat}>
          <div style={cal.statKey}>Resolved</div>
          <div style={cal.statVal}>{c.resolved}</div>
          <div style={cal.statHint}>of {c.count} total</div>
        </div>
        <div style={{ ...cal.stat, borderRight: "none" }}>
          <div style={cal.statKey}>Pending</div>
          <div style={cal.statVal}>{c.pending}</div>
          <div style={cal.statHint}>not yet due</div>
        </div>
      </div>

      <div style={cal.chartWrap}>
        <div style={cal.chartHead}>
          <h2 style={cal.chartTitle}>Stated vs. realised.</h2>
          <span style={cal.chartLabel}>n = {c.resolved} resolved</span>
        </div>
        <svg width={W} height={H} style={{ display: "block", maxWidth: "100%", height: "auto" }}>
          {/* gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <g key={g}>
              <line x1={x(g)} y1={pad} x2={x(g)} y2={H - pad} stroke={t.line} strokeWidth="1" />
              <line x1={pad} y1={y(g)} x2={W - pad} y2={y(g)} stroke={t.line} strokeWidth="1" />
              <text
                x={x(g)}
                y={H - pad + 18}
                fontFamily="'JetBrains Mono', monospace"
                fontSize="10"
                fill={t.muted}
                textAnchor="middle"
              >
                {g.toFixed(2)}
              </text>
              <text
                x={pad - 10}
                y={y(g) + 4}
                fontFamily="'JetBrains Mono', monospace"
                fontSize="10"
                fill={t.muted}
                textAnchor="end"
              >
                {g.toFixed(2)}
              </text>
            </g>
          ))}
          {/* perfect calibration */}
          <line
            x1={x(0)}
            y1={y(0)}
            x2={x(1)}
            y2={y(1)}
            stroke={t.ink}
            strokeWidth="1"
            strokeDasharray="3,4"
          />
          {/* actual line through bins (where hit !== null) */}
          <polyline
            fill="none"
            stroke={t.ink}
            strokeWidth="1.5"
            points={c.bins
              .filter((b) => b.hit !== null)
              .map((b) => `${x(b.stated)},${y(b.hit)}`)
              .join(" ")}
          />
          {/* bubbles */}
          {c.bins
            .filter((b) => b.hit !== null)
            .map((b, i) => (
              <g key={i}>
                <circle
                  cx={x(b.stated)}
                  cy={y(b.hit)}
                  r={6 + b.n * 2.4}
                  fill="#fff"
                  stroke={t.ink}
                  strokeWidth="1.5"
                />
                <circle cx={x(b.stated)} cy={y(b.hit)} r={2.5} fill={t.ink} />
              </g>
            ))}
          {/* axis labels */}
          <text
            x={W / 2}
            y={H - 4}
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            fill={t.muted}
            textAnchor="middle"
            letterSpacing="0.1em"
          >
            STATED CONFIDENCE →
          </text>
          <text
            x={14}
            y={H / 2}
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            fill={t.muted}
            textAnchor="middle"
            letterSpacing="0.1em"
            transform={`rotate(-90, 14, ${H / 2})`}
          >
            ← REALISED ACCURACY
          </text>
        </svg>
      </div>

      <div style={cal.listHead}>
        <h2 style={cal.listTitle}>Recent predictions.</h2>
        <span style={cal.chartLabel}>
          {c.recent.length} of {c.count}
        </span>
      </div>
      {c.recent.map((p, i) => (
        <div key={i} style={cal.pred}>
          <div style={cal.predConf}>{p.stated.toFixed(2)}</div>
          <div style={cal.predTitle}>{p.title}</div>
          <div style={cal.predDate}>
            {p.outcome === null ? `due ${p.due}` : `resolved ${p.resolved}`}
          </div>
          <div style={cal.badge(p.outcome)}>
            {p.outcome === true ? "✓ true" : p.outcome === false ? "✗ false" : "○ pending"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Brain-diff ----------
function BrainDiffPage() {
  const t = window.FASHION_THEMES.forum;
  const s = window.makeFashionStyles(t);

  const d = {
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
      gridTemplateColumns: "1fr 380px",
      columnGap: 64,
      padding: "8px 40px 48px",
      borderBottom: `1px solid ${t.line}`,
      alignItems: "end",
    },
    title: {
      fontFamily: t.displayFamily,
      fontSize: 140,
      lineHeight: 0.92,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },
    sub: { fontSize: 16, lineHeight: 1.55, color: t.soft, maxWidth: 380, marginBottom: 18 },

    daySection: { padding: "0 40px 0", borderBottom: `1px solid ${t.line}` },
    dayHead: {
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      columnGap: 32,
      alignItems: "baseline",
      padding: "32px 0 16px",
    },
    dayLabel: {
      fontFamily: t.displayFamily,
      fontSize: 44,
      lineHeight: 1,
      letterSpacing: t.ledeLetter,
      color: t.ink,
      margin: 0,
    },
    daySpacer: { borderTop: `1px solid ${t.line}` },

    entry: {
      display: "grid",
      gridTemplateColumns: "200px 1fr 200px",
      columnGap: 32,
      padding: "20px 0",
      borderTop: `1px solid ${t.line}`,
      alignItems: "baseline",
    },
    kind: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    action: { color: t.ink, marginLeft: 8 },
    titleText: {
      fontFamily: t.displayFamily,
      fontSize: 28,
      lineHeight: 1.18,
      letterSpacing: "-0.012em",
      color: t.ink,
      margin: 0,
      textWrap: "pretty",
    },
    why: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 1.5,
      color: t.soft,
      fontStyle: "italic",
      maxWidth: 720,
    },
    delta: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.muted,
      textAlign: "right",
      letterSpacing: "0.04em",
    },
    deltaUp: { color: "#2f6b3a" },
    deltaDown: { color: "#a8362a" },

    foot: {
      padding: "40px 40px 60px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      color: t.muted,
      fontSize: 12,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    },
  };

  const renderDelta = (e) => {
    if (e.outcome) return <span style={{ ...d.delta, ...d.deltaUp }}>resolved · {e.outcome}</span>;
    if (e.from !== undefined && e.to !== undefined) {
      const up = e.to > e.from;
      const same = e.to === e.from;
      return (
        <span style={{ ...d.delta, ...(same ? {} : up ? d.deltaUp : d.deltaDown) }}>
          conf {e.from.toFixed(2)} → {e.to.toFixed(2)}
        </span>
      );
    }
    if (e.conf !== undefined) return <span style={d.delta}>conf {e.conf.toFixed(2)}</span>;
    if (e.words) return <span style={d.delta}>{e.words.toLocaleString()} words</span>;
    return <span style={d.delta}>—</span>;
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
          <a style={s.navItem}>Brain-diff</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>About</a>
        </nav>
        <a style={s.cta}>Get in touch ↗</a>
      </div>

      <div style={d.eyebrow}>§ /feed/brain-diff</div>
      <div style={d.head}>
        <h1 style={d.title}>Diff.</h1>
        <p style={d.sub}>
          Substantive changes across all kinds, generated from git history. Subscribable as Atom or
          JSON. The boring entries — typo fixes, formatting — are filtered out.
        </p>
      </div>

      {DIFF_DATA.map((day) => (
        <div key={day.day} style={d.daySection}>
          <div style={d.dayHead}>
            <h2 style={d.dayLabel}>{day.day}</h2>
            <div style={d.daySpacer}></div>
          </div>
          {day.entries.map((e, i) => (
            <div key={i} style={d.entry}>
              <div style={d.kind}>
                <span>{e.kind}</span>
                <span style={d.action}>{e.action}</span>
              </div>
              <div>
                <h3 style={d.titleText}>{e.title}</h3>
                {e.why && <p style={d.why}>“{e.why}”</p>}
              </div>
              {renderDelta(e)}
            </div>
          ))}
        </div>
      ))}

      <div style={d.foot}>
        <span>/feed/brain-diff.xml · /feed/brain-diff.json</span>
        <span>last build 2026-05-03 14:22 UTC</span>
      </div>
    </div>
  );
}

window.NowPage = NowPage;
window.CalibrationPage = CalibrationPage;
window.BrainDiffPage = BrainDiffPage;
