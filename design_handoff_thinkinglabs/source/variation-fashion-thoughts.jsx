// Variant B (Forum) — Thoughts listing, Thought detail, About.
// Refined for breathing room: dramatic vertical rhythm, fewer columns, generous whitespace.

const THOUGHTS_DATA = [
  {
    slug: "manual-review-step",
    title: "Why I keep a manual review step in agentic pipelines",
    excerpt:
      "The cost of a wrong autonomous action is rarely linear in the size of the action. A junior engineer with rm -rf access is more dangerous than the same engineer writing emails.",
    words: 1840,
    minutes: 9,
    state: "drafting",
    touched: "2026-05-02",
    backlinks: 7,
  },
  {
    slug: "1962-still-right",
    title: "What 1962 still gets right about agents",
    excerpt:
      "Engelbart's framing of augmentation is structural, not technical: it's about the loops a human is allowed to close, not the size of the model that closes them.",
    words: 920,
    minutes: 5,
    state: "settled",
    touched: "2026-04-19",
    backlinks: 4,
  },
  {
    slug: "calibration-habit",
    title: "Calibration as a small daily violence to the ego",
    excerpt:
      "You write down what you think will happen, you write down how sure you are, and then six months later the world tells you who you actually were.",
    words: 1260,
    minutes: 6,
    state: "settled",
    touched: "2026-03-30",
    backlinks: 11,
  },
  {
    slug: "markdown-canonical",
    title: "On keeping markdown as the canonical store",
    excerpt:
      "Every system that started 'database-first, render markdown later' has, in my experience, ended up renegotiating that decision under duress. The reverse rarely happens.",
    words: 740,
    minutes: 4,
    state: "settled",
    touched: "2026-03-02",
    backlinks: 6,
  },
  {
    slug: "second-brain-allergy",
    title: "Why I have an allergy to the phrase 'second brain'",
    excerpt:
      "The metaphor is wrong on both sides — the system isn't a brain, and you don't have a first one to be supplemented.",
    words: 510,
    minutes: 3,
    state: "still-thinking",
    touched: "2026-04-11",
    backlinks: 2,
  },
  {
    slug: "boredom-is-data",
    title: "Boredom as a signal you're past the interesting part",
    excerpt:
      "Most of my best decisions to drop a project came from a quiet, unspectacular feeling that the next month would teach me less than the last one had.",
    words: 1090,
    minutes: 5,
    state: "settled",
    touched: "2026-01-04",
    backlinks: 5,
  },
  {
    slug: "verifiable-edits",
    title: "Cheap to verify, expensive to corrupt",
    excerpt:
      "A useful design heuristic for agentic systems, borrowed sideways from cryptography: optimize the asymmetry between checking the work and breaking it.",
    words: 670,
    minutes: 3,
    state: "still-thinking",
    touched: "2026-05-01",
    backlinks: 1,
  },
];

const THOUGHT_DETAIL = {
  title: "Why I keep a manual review step in agentic pipelines",
  slug: "manual-review-step",
  state: "drafting",
  started: "2026-04-22",
  touched: "2026-05-02",
  words: 1840,
  minutes: 9,
  paragraphs: [
    "The cost of a wrong autonomous action is rarely linear in the size of the action. A junior engineer with rm -rf access is more dangerous than the same engineer writing emails, even if the emails are longer. The blast radius of a single confident mistake is what determines whether a system can be safely automated, and that radius is almost never proportional to how impressive the action looks on a demo.",
    "I've been running variants of the same workflow for about eighteen months now: an agent does the work, a human reviews it, the review is itself logged as structured data so the next iteration can learn from where I disagreed. The friction this adds is real. It is also, so far, the thing that has kept me trusting the output enough to keep using it.",
    "The instinct in this corner of the field is to treat the human as a bottleneck to be eliminated. I think that's the wrong frame. The human in the loop is not a bottleneck — they are the verifier, and a verifier who is faster than the work being verified is exactly the asymmetry you want.",
    "Two things make this work in practice. First, the reviewer's job has to be cheaper than the agent's job, by a real margin. If reviewing a pull request takes as long as writing it, you've gained nothing. Second, the review interface has to make disagreement easy and structured — a thumbs-down with no payload teaches no one anything.",
  ],
  questions: [
    "Does this generalise past code? My instinct says yes for prose, no for trades.",
    "What's the right shape of a 'reviewer's interface' as a primitive?",
  ],
  related: [
    {
      kind: "claim",
      title: "Frontier evals overstate coding ability outside greenfield repos",
      conf: 0.62,
    },
    { kind: "thought", title: "Cheap to verify, expensive to corrupt" },
    { kind: "input", title: "Engelbart, Augmenting Human Intellect (1962, re-read)" },
  ],
  history: [
    { date: "2026-05-02", note: "tightened opening, cut a paragraph on tooling specifics" },
    { date: "2026-04-30", note: "added the 'verifier asymmetry' framing" },
    { date: "2026-04-26", note: "started a section on review-as-structured-data" },
    { date: "2026-04-22", note: "began" },
  ],
};

// ---------- Thoughts listing ----------
function ThoughtsListing() {
  const t = window.FASHION_THEMES.forum;
  const s = window.makeFashionStyles(t);

  const styles = {
    eyebrow: {
      padding: "48px 80px 0",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    head: { padding: "24px 80px 140px" },
    title: {
      fontFamily: t.displayFamily,
      fontSize: 280,
      lineHeight: 0.88,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },
    sub: {
      marginTop: 56,
      fontFamily: t.displayFamily,
      fontSize: 36,
      lineHeight: 1.25,
      letterSpacing: "-0.012em",
      color: t.soft,
      maxWidth: 880,
      textWrap: "pretty",
      fontStyle: "italic",
    },

    filterBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "32px 80px",
      borderTop: `1px solid ${t.line}`,
      borderBottom: `1px solid ${t.line}`,
    },
    filters: { display: "flex", gap: 36 },
    filterItem: (active) => ({
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: active ? t.ink : t.muted,
      borderBottom: active ? `1px solid ${t.ink}` : "1px solid transparent",
      paddingBottom: 6,
      cursor: "pointer",
    }),
    count: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      color: t.muted,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
    },

    row: {
      display: "grid",
      gridTemplateColumns: "120px 1fr 220px",
      columnGap: 64,
      padding: "72px 80px",
      borderBottom: `1px solid ${t.line}`,
      alignItems: "baseline",
    },
    num: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.muted,
      letterSpacing: "0.12em",
    },
    rowTitle: {
      fontFamily: t.displayFamily,
      fontSize: 64,
      lineHeight: 1.02,
      letterSpacing: "-0.018em",
      margin: 0,
      color: t.ink,
      textWrap: "pretty",
      maxWidth: 880,
    },
    rowExcerpt: {
      marginTop: 24,
      fontSize: 17,
      lineHeight: 1.6,
      color: t.soft,
      fontStyle: "italic",
      maxWidth: 720,
      textWrap: "pretty",
    },
    rowMetaGroup: {
      marginTop: 28,
      display: "flex",
      gap: 32,
      flexWrap: "wrap",
    },
    metaItem: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: t.muted,
    },
    metaItemInk: { color: t.ink },

    rightCol: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 20 },
    state: (st) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: st === "still-thinking" ? t.muted : t.ink,
    }),
    stateDot: (st) => ({
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: st === "settled" ? t.ink : "transparent",
      border: `1px solid ${st === "still-thinking" ? t.muted : t.ink}`,
    }),
    wordCount: {
      fontFamily: t.displayFamily,
      fontSize: 44,
      lineHeight: 1,
      color: t.ink,
      letterSpacing: t.ledeLetter,
    },
    wordLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: t.muted,
      marginTop: 6,
    },

    foot: {
      padding: "120px 80px 100px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    footLeft: {
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 24,
      color: t.muted,
      lineHeight: 1.4,
      maxWidth: 540,
    },
    footRight: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: t.muted,
    },
  };

  const stateLabel = (st) =>
    st === "still-thinking" ? "still thinking" : st === "drafting" ? "drafting" : "settled";

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

      <div style={styles.eyebrow}>§ /thoughts · {THOUGHTS_DATA.length} entries</div>
      <div style={styles.head}>
        <h1 style={styles.title}>Thoughts.</h1>
        <p style={styles.sub}>
          Short-form essays. Some settled, some drafting, some I will likely never finish — kept
          anyway, because finishing was never the point.
        </p>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.filters}>
          <span style={styles.filterItem(true)}>All</span>
          <span style={styles.filterItem(false)}>Settled</span>
          <span style={styles.filterItem(false)}>Drafting</span>
          <span style={styles.filterItem(false)}>Still thinking</span>
        </div>
        <span style={styles.count}>sorted by last touched</span>
      </div>

      {THOUGHTS_DATA.map((th, i) => (
        <div key={th.slug} style={styles.row}>
          <div style={styles.num}>{String(THOUGHTS_DATA.length - i).padStart(3, "0")}</div>
          <div>
            <h3 style={styles.rowTitle}>{th.title}</h3>
            <div style={styles.rowExcerpt}>“{th.excerpt}”</div>
            <div style={styles.rowMetaGroup}>
              <span style={styles.metaItem}>
                touched <span style={styles.metaItemInk}>{th.touched}</span>
              </span>
              <span style={styles.metaItem}>{th.minutes} min read</span>
              <span style={styles.metaItem}>{th.backlinks} backlinks</span>
            </div>
          </div>
          <div style={styles.rightCol}>
            <span style={styles.state(th.state)}>
              <span style={styles.stateDot(th.state)}></span>
              {stateLabel(th.state)}
            </span>
            <div style={{ textAlign: "right" }}>
              <div style={styles.wordCount}>{th.words.toLocaleString()}</div>
              <div style={styles.wordLabel}>words</div>
            </div>
          </div>
        </div>
      ))}

      <div style={styles.foot}>
        <div style={styles.footLeft}>
          “Most of these are wrong somewhere. The point is to write them down so I find out which.”
        </div>
        <div style={styles.footRight}>/feed/thoughts.xml</div>
      </div>
    </div>
  );
}

// ---------- Thought detail ----------
function ThoughtDetail() {
  const t = window.FASHION_THEMES.forum;
  const s = window.makeFashionStyles(t);
  const th = THOUGHT_DETAIL;

  const styles = {
    eyebrow: {
      padding: "48px 80px 0",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    crumb: {
      padding: "24px 80px 0",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    head: { padding: "32px 80px 120px" },
    title: {
      fontFamily: t.displayFamily,
      fontSize: 144,
      lineHeight: 0.96,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
      maxWidth: 1180,
      textWrap: "balance",
    },
    metaRow: {
      marginTop: 64,
      display: "flex",
      gap: 56,
      alignItems: "baseline",
      flexWrap: "wrap",
    },
    metaItem: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      color: t.muted,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
    },
    metaItemInk: { color: t.ink },
    statePill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.ink,
    },
    statePillDot: {
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: t.ink,
    },

    proseWrap: {
      padding: "80px 80px 100px",
      borderTop: `1px solid ${t.line}`,
      display: "flex",
      justifyContent: "center",
    },
    prose: {
      maxWidth: 760,
      width: "100%",
      fontFamily: t.displayFamily,
      fontSize: 26,
      lineHeight: 1.5,
      color: t.ink,
      letterSpacing: "-0.005em",
    },
    p: { margin: "0 0 36px", textWrap: "pretty" },

    asideBlock: {
      padding: "80px 80px",
      borderTop: `1px solid ${t.line}`,
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      columnGap: 64,
      alignItems: "start",
    },
    asideLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    qList: { display: "flex", flexDirection: "column", gap: 28, maxWidth: 880 },
    qItem: {
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 32,
      lineHeight: 1.3,
      color: t.soft,
      letterSpacing: "-0.008em",
      margin: 0,
      textWrap: "pretty",
    },

    relList: { display: "flex", flexDirection: "column", gap: 24, maxWidth: 880 },
    relRow: {
      display: "grid",
      gridTemplateColumns: "100px 1fr 80px",
      columnGap: 32,
      alignItems: "baseline",
      paddingBottom: 24,
      borderBottom: `1px solid ${t.line}`,
    },
    relRowLast: { borderBottom: "none", paddingBottom: 0 },
    relKind: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    relTitle: {
      fontFamily: t.displayFamily,
      fontSize: 24,
      lineHeight: 1.25,
      color: t.ink,
      letterSpacing: "-0.008em",
      textWrap: "pretty",
    },
    relConf: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 13,
      color: t.muted,
      textAlign: "right",
    },

    histRow: {
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      columnGap: 64,
      padding: "24px 0",
      borderTop: `1px solid ${t.line}`,
      alignItems: "baseline",
    },
    histDate: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.muted,
      letterSpacing: "0.08em",
    },
    histNote: { fontSize: 18, color: t.soft, lineHeight: 1.5, fontStyle: "italic" },
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

      <div style={styles.eyebrow}>§ /thoughts/{th.slug}</div>
      <div style={styles.crumb}>
        Thought · {th.minutes} min · {th.words.toLocaleString()} words
      </div>
      <div style={styles.head}>
        <h1 style={styles.title}>{th.title}</h1>
        <div style={styles.metaRow}>
          <span style={styles.statePill}>
            <span style={styles.statePillDot}></span>
            {th.state}
          </span>
          <span style={styles.metaItem}>
            started <span style={styles.metaItemInk}>{th.started}</span>
          </span>
          <span style={styles.metaItem}>
            last touched <span style={styles.metaItemInk}>{th.touched}</span>
          </span>
          <span style={styles.metaItem}>{th.history.length} revisions</span>
        </div>
      </div>

      <div style={styles.proseWrap}>
        <div style={styles.prose}>
          {th.paragraphs.map((p, i) => (
            <p key={i} style={styles.p}>
              {p}
            </p>
          ))}
        </div>
      </div>

      <div style={styles.asideBlock}>
        <div style={styles.asideLabel}>Open questions</div>
        <div style={styles.qList}>
          {th.questions.map((q, i) => (
            <p key={i} style={styles.qItem}>
              “{q}”
            </p>
          ))}
        </div>
      </div>

      <div style={styles.asideBlock}>
        <div style={styles.asideLabel}>Connects to</div>
        <div style={styles.relList}>
          {th.related.map((r, i) => (
            <div
              key={i}
              style={{
                ...styles.relRow,
                ...(i === th.related.length - 1 ? styles.relRowLast : {}),
              }}
            >
              <span style={styles.relKind}>{r.kind}</span>
              <span style={styles.relTitle}>{r.title}</span>
              <span style={styles.relConf}>{r.conf !== undefined ? r.conf.toFixed(2) : ""}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.asideBlock}>
        <div style={styles.asideLabel}>How it got here</div>
        <div style={{ maxWidth: 880 }}>
          {th.history.map((h, i) => (
            <div key={i} style={styles.histRow}>
              <span style={styles.histDate}>{h.date}</span>
              <span style={styles.histNote}>{h.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- About ----------
function AboutPage() {
  const t = window.FASHION_THEMES.forum;
  const s = window.makeFashionStyles(t);

  const styles = {
    eyebrow: {
      padding: "48px 80px 0",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    head: { padding: "24px 80px 160px" },
    title: {
      fontFamily: t.displayFamily,
      fontSize: 280,
      lineHeight: 0.88,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
    },

    lede: {
      padding: "0 80px 160px",
      borderBottom: `1px solid ${t.line}`,
    },
    ledeText: {
      fontFamily: t.displayFamily,
      fontSize: 64,
      lineHeight: 1.15,
      letterSpacing: "-0.018em",
      color: t.ink,
      margin: 0,
      maxWidth: 1180,
      textWrap: "balance",
    },
    ledeQual: {
      marginTop: 56,
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 28,
      lineHeight: 1.4,
      color: t.muted,
      letterSpacing: "-0.008em",
      maxWidth: 760,
      textWrap: "pretty",
    },

    sectionHead: {
      display: "grid",
      gridTemplateColumns: "240px 1fr",
      columnGap: 64,
      padding: "120px 80px 64px",
      alignItems: "baseline",
    },
    sectionLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    sectionTitle: {
      fontFamily: t.displayFamily,
      fontSize: 88,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
      textWrap: "balance",
      lineHeight: 0.98,
    },

    kindList: {
      padding: "0 80px 40px",
    },
    kindRow: {
      display: "grid",
      gridTemplateColumns: "60px 1fr 120px",
      columnGap: 48,
      padding: "48px 0",
      borderTop: `1px solid ${t.line}`,
      alignItems: "baseline",
    },
    kindNum: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.muted,
      letterSpacing: "0.14em",
    },
    kindBody: { display: "flex", gap: 64, alignItems: "baseline" },
    kindName: {
      fontFamily: t.displayFamily,
      fontSize: 56,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
      lineHeight: 1,
      flexShrink: 0,
      width: 320,
    },
    kindGloss: {
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 22,
      lineHeight: 1.45,
      color: t.soft,
      margin: 0,
      maxWidth: 560,
      textWrap: "pretty",
    },
    kindCount: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.muted,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      textAlign: "right",
    },

    proseWrap: {
      padding: "0 80px 40px",
    },
    proseRow: {
      display: "grid",
      gridTemplateColumns: "240px 1fr",
      columnGap: 64,
      padding: "56px 0",
      borderTop: `1px solid ${t.line}`,
      alignItems: "start",
    },
    proseLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
      marginTop: 8,
    },
    proseHead: {
      fontFamily: t.displayFamily,
      fontSize: 44,
      margin: "0 0 28px",
      letterSpacing: t.ledeLetter,
      color: t.ink,
      lineHeight: 1.05,
      textWrap: "balance",
    },
    proseBody: {
      fontFamily: t.displayFamily,
      fontSize: 22,
      lineHeight: 1.55,
      color: t.soft,
      maxWidth: 760,
    },
    proseP: { margin: "0 0 22px", textWrap: "pretty" },

    colophon: {
      padding: "120px 80px 100px",
      borderTop: `1px solid ${t.line}`,
      display: "grid",
      gridTemplateColumns: "240px 1fr 1fr 1fr",
      columnGap: 64,
      alignItems: "start",
    },
    colKey: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    colCellHead: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: t.muted,
      marginBottom: 20,
    },
    colItem: {
      fontFamily: t.displayFamily,
      fontSize: 22,
      lineHeight: 1.5,
      color: t.soft,
      letterSpacing: "-0.005em",
    },
    colItemInk: { color: t.ink, fontStyle: "italic" },
  };

  const kinds = [
    { name: "Thoughts", gloss: "Short-form essays. Some settled, many still moving.", count: 48 },
    {
      name: "Claims",
      gloss: "Things I believe, with a confidence number and the evidence I'd point to.",
      count: 132,
    },
    {
      name: "Predictions",
      gloss: "Falsifiable forecasts with a stated probability and a resolution date.",
      count: 38,
    },
    {
      name: "Decisions",
      gloss: "Choices made — and the reasoning at the time, kept honest by being read later.",
      count: 21,
    },
    {
      name: "Changed my mind",
      gloss: "Where a claim or decision flipped, and what specifically caused the flip.",
      count: 14,
    },
    { name: "Questions", gloss: "Open ones. Tracked rather than answered.", count: 27 },
    {
      name: "Posts",
      gloss: "Long-form pieces, polished enough to publish under their own URL.",
      count: 19,
    },
    {
      name: "Projects",
      gloss: "Active threads — the things I'm currently spending real attention on.",
      count: 4,
    },
    {
      name: "Inputs",
      gloss: "Books, papers, talks. The references the rest of the system points back at.",
      count: 86,
    },
  ];

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
          <a style={s.navItem}>About</a>
        </nav>
        <a style={s.cta}>Get in touch ↗</a>
      </div>

      <div style={styles.eyebrow}>§ /about</div>
      <div style={styles.head}>
        <h1 style={styles.title}>About.</h1>
      </div>

      <div style={styles.lede}>
        <p style={styles.ledeText}>
          thinkinglabs is a single person's working surface, made public.
        </p>
        <p style={styles.ledeQual}>
          I'm Tom. I run a small consultancy at wild.as, mostly on AI systems and the boring parts
          of getting them to behave. This site is the room I think in — a filtered view of a
          markdown repository I edit every day.
        </p>
      </div>

      <div style={styles.sectionHead}>
        <div style={styles.sectionLabel}>§ 01 / structure</div>
        <h2 style={styles.sectionTitle}>
          Nine kinds of entry,
          <br />
          one graph.
        </h2>
      </div>
      <div style={styles.kindList}>
        {kinds.map((k, i) => (
          <div key={k.name} style={styles.kindRow}>
            <div style={styles.kindNum}>{String(i + 1).padStart(2, "0")}</div>
            <div style={styles.kindBody}>
              <h3 style={styles.kindName}>{k.name}</h3>
              <p style={styles.kindGloss}>{k.gloss}</p>
            </div>
            <div style={styles.kindCount}>{k.count} entries</div>
          </div>
        ))}
      </div>

      <div style={styles.sectionHead}>
        <div style={styles.sectionLabel}>§ 02 / how it works</div>
        <h2 style={styles.sectionTitle}>
          The site is the by-product,
          <br />
          not the point.
        </h2>
      </div>
      <div style={styles.proseWrap}>
        <div style={styles.proseRow}>
          <div style={styles.proseLabel}>
            Markdown
            <br />
            is canonical
          </div>
          <div>
            <h3 style={styles.proseHead}>Every entry is a file in a git repository.</h3>
            <div style={styles.proseBody}>
              <p style={styles.proseP}>
                The site you're reading is rebuilt from those files several times a day. If the
                rendering layer disappeared tomorrow I would lose nothing.
              </p>
              <p style={styles.proseP}>
                Front-matter carries the structured fields — confidence, status, dates, links to
                other entries. The graph is recomputed at build time; nothing about the
                relationships lives outside the files.
              </p>
            </div>
          </div>
        </div>
        <div style={styles.proseRow}>
          <div style={styles.proseLabel}>
            Calibration
            <br />
            over rhetoric
          </div>
          <div>
            <h3 style={styles.proseHead}>The numbers are not a performance.</h3>
            <div style={styles.proseBody}>
              <p style={styles.proseP}>
                Claims carry confidence values. Predictions resolve. Both are tracked over time and
                graded honestly on the calibration page — it's how I keep myself from drifting
                without noticing.
              </p>
              <p style={styles.proseP}>
                When I change my mind, the old position stays. A “changed my mind” entry links the
                before and after, and the brain-diff feed picks it up automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.sectionHead}>
        <div style={styles.sectionLabel}>§ 03 / the person</div>
        <h2 style={styles.sectionTitle}>Tom, briefly.</h2>
      </div>
      <div style={styles.proseWrap}>
        <div style={styles.proseRow}>
          <div style={styles.proseLabel}>Work</div>
          <div style={styles.proseBody}>
            <p style={styles.proseP}>
              Engineer turned generalist. Currently spending most of my time on agentic systems —
              small enough to inspect, large enough to be useful. Before that: distributed systems,
              a stretch in product, and a long quiet period of building things for one user.
            </p>
            <p style={styles.proseP}>
              I work via wild.as. Three or four engagements a year, each long enough to be honest
              about what's actually happening.
            </p>
          </div>
        </div>
        <div style={styles.proseRow}>
          <div style={styles.proseLabel}>Reach</div>
          <div style={styles.proseBody}>
            <p style={styles.proseP}>
              Based in Amsterdam. Reachable by email at the obvious address. I write back, usually
              within a day or two.
            </p>
            <p style={styles.proseP}>
              If you found me through a specific claim, prediction, or post — mentioning which one
              helps. It tells me what version of me you've been reading.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.colophon}>
        <div style={styles.colKey}>§ colophon</div>
        <div>
          <div style={styles.colCellHead}>Type</div>
          <div style={styles.colItem}>
            <span style={styles.colItemInk}>Forum</span>
          </div>
          <div style={styles.colItem}>
            <span style={styles.colItemInk}>Inter</span>
          </div>
          <div style={styles.colItem}>
            <span style={styles.colItemInk}>JetBrains Mono</span>
          </div>
        </div>
        <div>
          <div style={styles.colCellHead}>Stack</div>
          <div style={styles.colItem}>Markdown, git-tracked</div>
          <div style={styles.colItem}>Static build</div>
          <div style={styles.colItem}>SQLite as a derived index</div>
          <div style={styles.colItem}>MCP for agent access</div>
        </div>
        <div>
          <div style={styles.colCellHead}>Feeds</div>
          <div style={styles.colItem}>brain-diff.xml</div>
          <div style={styles.colItem}>posts.xml</div>
          <div style={styles.colItem}>predictions.json</div>
        </div>
      </div>
    </div>
  );
}

window.ThoughtsListing = ThoughtsListing;
window.ThoughtDetail = ThoughtDetail;
window.AboutPage = AboutPage;
