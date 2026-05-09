// Variant B (Forum) — Posts listing + Posts detail.
// Magazine-feature register: editorial typography, drop cap, pull quotes,
// footnotes, image plate, and a quiet colophon rail along the side.

const POSTS_DATA = [
  {
    slug: "verifier-asymmetry",
    title: "The verifier's asymmetry",
    deck: "On why the most useful person in an agentic system is the one who can say 'no, that's wrong' faster than the model can say it again.",
    date: "2026-04-30",
    minutes: 14,
    words: 3420,
    topic: "Agents",
    featured: true,
  },
  {
    slug: "markdown-as-truth",
    title: "Markdown as the truth, everything else as a derivation",
    deck: "Why the boring file format keeps winning, and what you give up when you forget that.",
    date: "2026-03-12",
    minutes: 9,
    words: 2180,
    topic: "Systems",
  },
  {
    slug: "small-consultancies",
    title: "Notes on running a one-person consultancy in 2026",
    deck: "Three engagements a year, a reading habit, and the discipline of saying no to the rest.",
    date: "2026-02-04",
    minutes: 11,
    words: 2640,
    topic: "Work",
  },
  {
    slug: "calibration-as-practice",
    title: "Calibration as a practice, not a benchmark",
    deck: "Brier scores are a tool. The real instrument is the daily habit of writing down how sure you are.",
    date: "2025-12-18",
    minutes: 8,
    words: 1980,
    topic: "Epistemics",
  },
  {
    slug: "ai-and-craftsmanship",
    title: "AI and craftsmanship",
    deck: "What changes about doing good work when the work itself can be partially automated, and what stubbornly does not.",
    date: "2025-10-22",
    minutes: 12,
    words: 2820,
    topic: "Work",
  },
  {
    slug: "second-brain-mistake",
    title: "The 'second brain' mistake",
    deck: "Note-taking systems built on the wrong metaphor about the first one.",
    date: "2025-09-08",
    minutes: 7,
    words: 1640,
    topic: "Systems",
  },
  {
    slug: "year-in-reading",
    title: "A year in reading, 2025",
    deck: "Twenty-six books and the four ideas they kept circling.",
    date: "2025-12-29",
    minutes: 10,
    words: 2310,
    topic: "Reading",
  },
  {
    slug: "engelbart-revisited",
    title: "Engelbart, revisited",
    deck: "What 1962 still gets right about augmentation, and where the field quietly stopped listening.",
    date: "2025-08-14",
    minutes: 13,
    words: 3060,
    topic: "Agents",
  },
  {
    slug: "boring-tools",
    title: "In praise of boring tools",
    deck: "SQLite, Make, plain text. A short defense of the things that don't get conference talks.",
    date: "2025-06-02",
    minutes: 6,
    words: 1420,
    topic: "Systems",
  },
  {
    slug: "wrong-in-public",
    title: "On being wrong in public",
    deck: "The case for keeping the bad take, dated and signed, instead of quietly editing it away.",
    date: "2025-04-19",
    minutes: 9,
    words: 2080,
    topic: "Epistemics",
  },
  {
    slug: "the-shape-of-attention",
    title: "The shape of attention",
    deck: "On the rhythms of focus over a year of solo work.",
    date: "2025-02-10",
    minutes: 11,
    words: 2520,
    topic: "Work",
  },
  {
    slug: "starting-thinkinglabs",
    title: "Starting thinkinglabs",
    deck: "The opening note. What this site is, and what it isn't.",
    date: "2024-11-03",
    minutes: 5,
    words: 1180,
    topic: "Meta",
  },
];

const POST_DETAIL = {
  slug: "verifier-asymmetry",
  title: "The verifier's asymmetry",
  deck: "On why the most useful person in an agentic system is the one who can say 'no, that's wrong' faster than the model can say it again.",
  epigraph: {
    text: "“The most precious commodity I know of is the new information.”",
    by: "Charlie Munger",
  },
  date: "2026-04-30",
  updated: "2026-05-02",
  minutes: 14,
  words: 3420,
  topic: "Agents",
  license: "CC BY 4.0",
  citation: "Tom, “The verifier's asymmetry,” thinkinglabs, 30 Apr 2026.",
  backlinks: 9,
  related: [
    {
      kind: "claim",
      title: "Frontier evals overstate coding ability outside greenfield repos",
      conf: 0.62,
    },
    { kind: "thought", title: "Why I keep a manual review step in agentic pipelines" },
    {
      kind: "prediction",
      title:
        "Apple ships an on-device assistant that beats Siri 2024 on intent F1 by 2x at WWDC 2026",
      conf: 0.55,
    },
    { kind: "input", title: "Engelbart, Augmenting Human Intellect (1962)" },
  ],
  // Section blocks. Types: "p" | "pull" | "h" | "fig" | "list"
  sections: [
    {
      number: "01",
      title: "The asymmetry",
      blocks: [
        {
          type: "p",
          drop: true,
          text: "There is a particular kind of mistake that only confident systems make. The system finishes the work, presents it tidily, and only on inspection does the wrongness reveal itself — and even then, often not to the person who asked. This is the dominant failure mode of the agentic systems I've been spending my year inside, and the one most under-served by current product design.",
        },
        {
          type: "p",
          text: "The standard answer is to make the system more careful. Better evaluations, better training, better self-checks. These help, at the margin. They do not solve the underlying problem, which is that for any system that produces work faster than a human can produce it from scratch, the question 'is this right?' is always going to be a separate, smaller, but irreducible labour.",
        },
        {
          type: "p",
          text: "I want to argue that this smaller labour is the most important thing in the system. That the asymmetry between producing work and verifying it — when it is engineered well — is the single largest factor in whether an agentic workflow produces value or just produces output. And that almost everything else flows from getting that asymmetry right.",
        },
        {
          type: "pull",
          text: "The verifier's job has to be cheaper than the agent's job, by a real margin. If reviewing a pull request takes as long as writing it, you've gained nothing.",
          attrib: null,
        },
      ],
    },
    {
      number: "02",
      title: "Why the bottleneck is upstream",
      blocks: [
        {
          type: "p",
          text: "The instinct, when an agent produces output that needs reviewing, is to treat the reviewer as a bottleneck to be eliminated.{fn1} The system runs slowly, the reasoning goes, because the human in the middle is slow. Therefore the path to faster, better systems is more autonomy, fewer interruptions, longer leashes.",
        },
        {
          type: "p",
          text: "This is exactly backwards. The reviewer is not the bottleneck — the reviewer is the verifier, and the verifier's speed is the only thing that puts an upper bound on how much output the system can produce that is worth keeping. Eliminate the verifier and you have not removed the bottleneck. You have removed the part of the system that distinguishes useful output from confident-looking noise.",
        },
        {
          type: "fig",
          caption:
            "Throughput against trust, for three configurations of an agentic pipeline I've run over the last year. The pure-autonomous run produced the most output and the least keepable work.",
          source: "thinkinglabs internal logs · 2025–26",
        },
        {
          type: "p",
          text: "What this looks like in practice is a system where the agent's job is to do the work and the reviewer's job is to do something different and faster — to spot the wrongness, not to redo the work. The two jobs have to be designed against each other. The agent's output has to be shaped so that wrongness is cheap to detect. The reviewer's interface has to make disagreement structured, not just emotional.",
        },
      ],
    },
    {
      number: "03",
      title: "What good verification interfaces look like",
      blocks: [
        {
          type: "p",
          text: "I'll be honest: this is the part I'm least sure about. Most of the verifier interfaces I've seen are either too thin (a thumbs-up / thumbs-down) or too thick (a full edit pass, which collapses the asymmetry). The right shape sits somewhere I don't quite know how to articulate yet.",
        },
        {
          type: "list",
          items: [
            "It has to make the wrongness visible without making the verifier rewrite the work.",
            "It has to capture why something is wrong, not just that it is — otherwise the system never improves.",
            "It has to be fast enough that a human can review at the rate the system produces.",
            "It has to be honest about the cases the verifier doesn't know how to judge.",
          ],
        },
        {
          type: "pull",
          text: "The reviewer is not the bottleneck — the reviewer is the verifier, and the verifier's speed is the only thing that puts an upper bound on how much output the system can produce that is worth keeping.",
        },
        {
          type: "p",
          text: "I have built versions of this for myself, mostly badly. The version I keep coming back to looks less like a code review and more like an editor's marginalia: short, targeted, structured against a small set of categories that I refine month over month. It is the most useful thing I've made, and almost certainly not the right shape.",
        },
      ],
    },
    {
      number: "04",
      title: "Where this goes",
      blocks: [
        {
          type: "p",
          text: "I think we are about to spend a lot of effort building agents that can do more on their own. I think comparatively little effort, at least visibly, is going into building the tools that let humans verify those agents at speed. That feels like a mistake — not for safety reasons, although those exist, but for the much more boring reason that without good verification, the autonomous output mostly is not worth using.",
        },
        {
          type: "p",
          text: "The bet I'd make: in five years, the most useful piece of an agentic stack will not be the model. It will be the verifier's interface that sits on top of it.{fn2} It will be a relatively quiet product, the kind that doesn't generate demos. And it will, by being faster than the work it reviews, make the rest of the stack worth keeping.",
        },
      ],
    },
  ],
  footnotes: [
    {
      id: "fn1",
      text: "I include myself in this. My first six months of building agentic pipelines were spent, embarrassingly, optimising for fewer review steps. The cost was hidden because I wasn't tracking which output I was actually keeping.",
    },
    {
      id: "fn2",
      text: "I don't have a five-year prediction here that resolves cleanly enough to put on the calibration page. But the shorter version — that within 18 months the most-discussed product in this space will be a verification tool, not a more capable agent — is one I'd put at 0.45.",
    },
  ],
};

// ---------- Posts listing ----------
function PostsListing() {
  const t = window.FASHION_THEMES.forum;
  const s = window.makeFashionStyles(t);

  const featured = POSTS_DATA.find((p) => p.featured);
  const archive = POSTS_DATA.filter((p) => !p.featured);

  const styles = {
    eyebrow: {
      padding: "48px 80px 0",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    head: { padding: "24px 80px 120px" },
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
      fontStyle: "italic",
      fontSize: 32,
      lineHeight: 1.3,
      letterSpacing: "-0.01em",
      color: t.soft,
      maxWidth: 880,
      textWrap: "pretty",
    },

    featuredBlock: {
      padding: "100px 80px 120px",
      borderTop: `1px solid ${t.line}`,
      borderBottom: `1px solid ${t.line}`,
      display: "grid",
      gridTemplateColumns: "240px 1fr",
      columnGap: 64,
      alignItems: "start",
    },
    featuredLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
      marginTop: 18,
    },
    featuredTitle: {
      fontFamily: t.displayFamily,
      fontSize: 144,
      lineHeight: 0.96,
      letterSpacing: t.ledeLetter,
      margin: 0,
      color: t.ink,
      maxWidth: 1180,
      textWrap: "balance",
    },
    featuredDeck: {
      marginTop: 40,
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 28,
      lineHeight: 1.4,
      color: t.soft,
      maxWidth: 880,
      textWrap: "pretty",
    },
    featuredMeta: {
      marginTop: 56,
      display: "flex",
      gap: 48,
      flexWrap: "wrap",
      alignItems: "baseline",
    },
    metaItem: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    metaItemInk: { color: t.ink },
    readLink: {
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 22,
      color: t.ink,
      letterSpacing: "-0.005em",
      borderBottom: `1px solid ${t.ink}`,
      paddingBottom: 4,
    },

    archiveHead: {
      padding: "120px 80px 32px",
      display: "grid",
      gridTemplateColumns: "240px 1fr",
      columnGap: 64,
      alignItems: "baseline",
    },
    archiveLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    archiveTitle: {
      fontFamily: t.displayFamily,
      fontSize: 88,
      margin: 0,
      letterSpacing: t.ledeLetter,
      color: t.ink,
      lineHeight: 0.98,
    },

    row: {
      display: "grid",
      gridTemplateColumns: "120px 1fr 200px 100px",
      columnGap: 48,
      padding: "56px 80px",
      borderTop: `1px solid ${t.line}`,
      alignItems: "baseline",
    },
    rowDate: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.muted,
      letterSpacing: "0.1em",
    },
    rowTitle: {
      fontFamily: t.displayFamily,
      fontSize: 52,
      lineHeight: 1.05,
      letterSpacing: "-0.018em",
      margin: 0,
      color: t.ink,
      textWrap: "pretty",
      maxWidth: 760,
    },
    rowDeck: {
      marginTop: 18,
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 18,
      lineHeight: 1.5,
      color: t.soft,
      maxWidth: 720,
      textWrap: "pretty",
    },
    rowTopic: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    rowRead: {
      fontFamily: t.displayFamily,
      fontSize: 28,
      color: t.ink,
      letterSpacing: t.ledeLetter,
      textAlign: "right",
    },
    rowReadLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: t.muted,
      marginTop: 6,
      textAlign: "right",
    },

    foot: {
      padding: "120px 80px 100px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      borderTop: `1px solid ${t.line}`,
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

      <div style={styles.eyebrow}>§ /posts · {POSTS_DATA.length} essays</div>
      <div style={styles.head}>
        <h1 style={styles.title}>Posts.</h1>
        <p style={styles.sub}>
          Long-form pieces. The polished layer of the system — fewer of these than thoughts,
          finished enough to live under their own URL.
        </p>
      </div>

      <div style={styles.featuredBlock}>
        <div style={styles.featuredLabel}>§ latest</div>
        <div>
          <h2 style={styles.featuredTitle}>{featured.title}</h2>
          <p style={styles.featuredDeck}>{featured.deck}</p>
          <div style={styles.featuredMeta}>
            <span style={styles.metaItem}>
              <span style={styles.metaItemInk}>{featured.date}</span>
            </span>
            <span style={styles.metaItem}>{featured.minutes} min read</span>
            <span style={styles.metaItem}>{featured.words.toLocaleString()} words</span>
            <span style={styles.metaItem}>
              filed under <span style={styles.metaItemInk}>{featured.topic}</span>
            </span>
            <span style={styles.readLink}>Read essay →</span>
          </div>
        </div>
      </div>

      <div style={styles.archiveHead}>
        <div style={styles.archiveLabel}>§ archive</div>
        <h2 style={styles.archiveTitle}>{archive.length} earlier pieces.</h2>
      </div>

      {archive.map((p) => (
        <div key={p.slug} style={styles.row}>
          <div style={styles.rowDate}>{p.date}</div>
          <div>
            <h3 style={styles.rowTitle}>{p.title}</h3>
            <p style={styles.rowDeck}>{p.deck}</p>
          </div>
          <div style={styles.rowTopic}>{p.topic}</div>
          <div>
            <div style={styles.rowRead}>{p.minutes}</div>
            <div style={styles.rowReadLabel}>min read</div>
          </div>
        </div>
      ))}

      <div style={styles.foot}>
        <div style={styles.footLeft}>
          “If a piece is here, it's because I'd be willing to defend it. The thoughts are where the
          unfinished things live.”
        </div>
        <div style={styles.footRight}>/feed/posts.xml</div>
      </div>
    </div>
  );
}

// ---------- Posts detail ----------
function PostDetail() {
  const t = window.FASHION_THEMES.forum;
  const s = window.makeFashionStyles(t);
  const post = POST_DETAIL;

  const styles = {
    page: { display: "grid", gridTemplateColumns: "1fr 220px", alignItems: "start" },
    main: { minWidth: 0 },
    rail: {
      padding: "120px 32px 80px 0",
      borderLeft: `1px solid ${t.line}`,
      paddingLeft: 32,
      position: "sticky",
      top: 0,
      alignSelf: "start",
      display: "flex",
      flexDirection: "column",
      gap: 40,
    },
    railBlock: {},
    railLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
      marginBottom: 10,
    },
    railValue: {
      fontFamily: t.displayFamily,
      fontSize: 18,
      lineHeight: 1.3,
      color: t.ink,
      letterSpacing: "-0.005em",
    },
    railSmall: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      lineHeight: 1.55,
      color: t.soft,
    },
    railMono: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      lineHeight: 1.6,
      color: t.muted,
      letterSpacing: "0.04em",
    },

    eyebrow: {
      padding: "48px 0 0 80px",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    crumb: {
      padding: "24px 0 0 80px",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    head: { padding: "32px 80px 100px" },
    epigraph: {
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 22,
      lineHeight: 1.45,
      color: t.muted,
      maxWidth: 720,
      margin: 0,
      textWrap: "pretty",
    },
    epigraphBy: {
      marginTop: 12,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: t.muted,
    },
    title: {
      marginTop: 64,
      fontFamily: t.displayFamily,
      fontSize: 168,
      lineHeight: 0.94,
      margin: "64px 0 0",
      letterSpacing: t.ledeLetter,
      color: t.ink,
      maxWidth: 1100,
      textWrap: "balance",
    },
    deck: {
      marginTop: 48,
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 32,
      lineHeight: 1.35,
      letterSpacing: "-0.01em",
      color: t.soft,
      maxWidth: 880,
      textWrap: "pretty",
    },
    metaRow: {
      marginTop: 64,
      paddingTop: 32,
      borderTop: `1px solid ${t.line}`,
      display: "flex",
      gap: 48,
      flexWrap: "wrap",
      alignItems: "baseline",
    },
    metaItem: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    metaItemInk: { color: t.ink },

    sectionWrap: { padding: "0 80px" },
    sectionHead: {
      display: "grid",
      gridTemplateColumns: "100px 1fr",
      columnGap: 48,
      padding: "100px 0 48px",
      borderTop: `1px solid ${t.line}`,
      alignItems: "baseline",
    },
    sectionNum: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    sectionTitle: {
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 64,
      margin: 0,
      letterSpacing: "-0.012em",
      color: t.ink,
      lineHeight: 1,
    },

    proseRow: {
      display: "grid",
      gridTemplateColumns: "100px 1fr",
      columnGap: 48,
      paddingBottom: 48,
    },
    proseInner: { maxWidth: 720 },
    p: {
      fontFamily: t.displayFamily,
      fontSize: 24,
      lineHeight: 1.55,
      color: t.ink,
      letterSpacing: "-0.003em",
      margin: "0 0 28px",
      textWrap: "pretty",
    },
    drop: {
      float: "left",
      fontFamily: t.displayFamily,
      fontSize: 124,
      lineHeight: 0.86,
      paddingRight: 16,
      paddingTop: 6,
      color: t.ink,
      letterSpacing: "-0.04em",
    },

    pull: {
      gridColumn: "1 / -1",
      padding: "48px 0",
      margin: "16px 0 32px",
      borderTop: `1px solid ${t.line}`,
      borderBottom: `1px solid ${t.line}`,
    },
    pullText: {
      fontFamily: t.displayFamily,
      fontSize: 56,
      lineHeight: 1.1,
      letterSpacing: "-0.018em",
      color: t.ink,
      margin: 0,
      textWrap: "balance",
      maxWidth: 1100,
    },

    fig: {
      gridColumn: "1 / -1",
      margin: "16px 0 40px",
    },
    figPlate: {
      width: "100%",
      height: 420,
      background: "#f4f1ea",
      border: `1px solid ${t.line}`,
      position: "relative",
      overflow: "hidden",
    },
    figCaption: {
      marginTop: 18,
      display: "grid",
      gridTemplateColumns: "100px 1fr 200px",
      columnGap: 48,
      alignItems: "baseline",
    },
    figLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    figText: {
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 18,
      lineHeight: 1.45,
      color: t.soft,
      maxWidth: 720,
    },
    figSource: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: t.muted,
      textAlign: "right",
    },

    list: {
      margin: "0 0 32px",
      padding: 0,
      listStyle: "none",
      counterReset: "li",
    },
    listItem: {
      fontFamily: t.displayFamily,
      fontSize: 22,
      lineHeight: 1.5,
      color: t.ink,
      padding: "16px 0",
      borderTop: `1px solid ${t.line}`,
      display: "grid",
      gridTemplateColumns: "60px 1fr",
      columnGap: 24,
      alignItems: "baseline",
    },
    listNum: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      color: t.muted,
    },
    fnMark: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      verticalAlign: "super",
      color: t.ink,
      letterSpacing: "0.05em",
      marginLeft: 2,
    },

    fnSection: {
      padding: "100px 80px 60px",
      borderTop: `1px solid ${t.line}`,
      display: "grid",
      gridTemplateColumns: "100px 1fr",
      columnGap: 48,
      alignItems: "start",
    },
    fnLabel: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: t.muted,
    },
    fnList: { display: "flex", flexDirection: "column", gap: 28, maxWidth: 760 },
    fnRow: {
      display: "grid",
      gridTemplateColumns: "60px 1fr",
      columnGap: 24,
      alignItems: "baseline",
    },
    fnNum: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.16em",
      color: t.ink,
    },
    fnText: {
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 18,
      lineHeight: 1.55,
      color: t.soft,
      margin: 0,
    },

    related: {
      padding: "100px 80px",
      borderTop: `1px solid ${t.line}`,
      display: "grid",
      gridTemplateColumns: "100px 1fr",
      columnGap: 48,
      alignItems: "start",
    },
    relatedHead: {
      fontFamily: t.displayFamily,
      fontSize: 56,
      letterSpacing: t.ledeLetter,
      color: t.ink,
      margin: "0 0 40px",
      lineHeight: 1,
    },
    relList: { display: "flex", flexDirection: "column", gap: 0 },
    relRow: {
      display: "grid",
      gridTemplateColumns: "120px 1fr 100px",
      columnGap: 32,
      alignItems: "baseline",
      padding: "24px 0",
      borderTop: `1px solid ${t.line}`,
    },
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

    end: {
      padding: "80px 80px 120px",
      borderTop: `1px solid ${t.line}`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    endQuote: {
      fontFamily: t.displayFamily,
      fontStyle: "italic",
      fontSize: 22,
      color: t.muted,
      lineHeight: 1.4,
      maxWidth: 680,
    },
    endMono: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: t.muted,
      textAlign: "right",
    },
  };

  // Render a paragraph supporting {fn1} markers.
  const renderText = (text) => {
    const parts = text.split(/(\{fn\d+\})/g);
    return parts.map((part, i) => {
      const m = part.match(/^\{fn(\d+)\}$/);
      if (m)
        return (
          <sup key={i} style={styles.fnMark}>
            {m[1]}
          </sup>
        );
      return <span key={i}>{part}</span>;
    });
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

      <div style={styles.page}>
        <div style={styles.main}>
          <div style={styles.eyebrow}>§ /posts/{post.slug}</div>
          <div style={styles.crumb}>
            Essay · {post.topic} · {post.minutes} min
          </div>
          <div style={styles.head}>
            <p style={styles.epigraph}>{post.epigraph.text}</p>
            <p style={styles.epigraphBy}>— {post.epigraph.by}</p>
            <h1 style={styles.title}>{post.title}</h1>
            <p style={styles.deck}>{post.deck}</p>
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                published <span style={styles.metaItemInk}>{post.date}</span>
              </span>
              <span style={styles.metaItem}>
                updated <span style={styles.metaItemInk}>{post.updated}</span>
              </span>
              <span style={styles.metaItem}>
                {post.minutes} min · {post.words.toLocaleString()} words
              </span>
              <span style={styles.metaItem}>
                filed <span style={styles.metaItemInk}>{post.topic}</span>
              </span>
            </div>
          </div>

          {post.sections.map((sec, si) => (
            <div key={si} style={styles.sectionWrap}>
              <div style={styles.sectionHead}>
                <div style={styles.sectionNum}>§ {sec.number}</div>
                <h2 style={styles.sectionTitle}>{sec.title}</h2>
              </div>
              <div style={styles.proseRow}>
                <div></div>
                <div style={styles.proseInner}>
                  {sec.blocks.map((b, bi) => {
                    if (b.type === "p") {
                      return (
                        <p key={bi} style={styles.p}>
                          {b.drop && <span style={styles.drop}>{b.text.charAt(0)}</span>}
                          {renderText(b.drop ? b.text.slice(1) : b.text)}
                        </p>
                      );
                    }
                    if (b.type === "pull") {
                      return (
                        <div key={bi} style={styles.pull}>
                          <p style={styles.pullText}>“{b.text}”</p>
                        </div>
                      );
                    }
                    if (b.type === "fig") {
                      return (
                        <figure key={bi} style={styles.fig}>
                          <div style={styles.figPlate}>
                            <ChartPlate t={t} />
                          </div>
                          <div style={styles.figCaption}>
                            <span style={styles.figLabel}>Fig. 01</span>
                            <span style={styles.figText}>{b.caption}</span>
                            <span style={styles.figSource}>{b.source}</span>
                          </div>
                        </figure>
                      );
                    }
                    if (b.type === "list") {
                      return (
                        <ol key={bi} style={styles.list}>
                          {b.items.map((it, ii) => (
                            <li key={ii} style={styles.listItem}>
                              <span style={styles.listNum}>{String(ii + 1).padStart(2, "0")}</span>
                              <span>{it}</span>
                            </li>
                          ))}
                        </ol>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          ))}

          <div style={styles.fnSection}>
            <div style={styles.fnLabel}>§ Footnotes</div>
            <div style={styles.fnList}>
              {post.footnotes.map((fn, i) => (
                <div key={fn.id} style={styles.fnRow}>
                  <span style={styles.fnNum}>{String(i + 1).padStart(2, "0")}</span>
                  <p style={styles.fnText}>{fn.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.related}>
            <div style={styles.fnLabel}>§ Connects to</div>
            <div>
              <h2 style={styles.relatedHead}>Where this sits in the graph.</h2>
              <div style={styles.relList}>
                {post.related.map((r, i) => (
                  <div key={i} style={styles.relRow}>
                    <span style={styles.relKind}>{r.kind}</span>
                    <span style={styles.relTitle}>{r.title}</span>
                    <span style={styles.relConf}>
                      {r.conf !== undefined ? r.conf.toFixed(2) : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.end}>
            <p style={styles.endQuote}>
              “If a piece is here, it's because I'd be willing to defend it.”
            </p>
            <div style={styles.endMono}>
              {post.license}
              <br />
              {post.citation}
            </div>
          </div>
        </div>

        <aside style={styles.rail}>
          <div style={styles.railBlock}>
            <div style={styles.railLabel}>§ Essay</div>
            <div style={styles.railValue}>{post.title}</div>
          </div>
          <div style={styles.railBlock}>
            <div style={styles.railLabel}>Published</div>
            <div style={styles.railSmall}>
              {post.date}
              <br />
              updated {post.updated}
            </div>
          </div>
          <div style={styles.railBlock}>
            <div style={styles.railLabel}>Length</div>
            <div style={styles.railSmall}>
              {post.minutes} min read
              <br />
              {post.words.toLocaleString()} words
            </div>
          </div>
          <div style={styles.railBlock}>
            <div style={styles.railLabel}>Filed</div>
            <div style={styles.railSmall}>{post.topic}</div>
          </div>
          <div style={styles.railBlock}>
            <div style={styles.railLabel}>Backlinks</div>
            <div style={styles.railSmall}>{post.backlinks} entries</div>
          </div>
          <div style={styles.railBlock}>
            <div style={styles.railLabel}>License</div>
            <div style={styles.railSmall}>{post.license}</div>
          </div>
          <div style={styles.railBlock}>
            <div style={styles.railLabel}>Cite</div>
            <div style={styles.railMono}>{post.citation}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Simple inline figure — a small bar/line chart in the same Forum vocabulary.
function ChartPlate({ t }) {
  const W = 1200,
    H = 420,
    pad = 56;
  const series = [
    {
      label: "autonomous",
      values: [0.22, 0.31, 0.28, 0.35, 0.33, 0.3, 0.28, 0.26],
      color: t.muted,
      dash: "4,4",
    },
    {
      label: "review-after",
      values: [0.4, 0.48, 0.55, 0.62, 0.66, 0.69, 0.71, 0.72],
      color: "#7a7a7a",
      dash: "",
    },
    {
      label: "verify-fast",
      values: [0.42, 0.55, 0.66, 0.74, 0.8, 0.84, 0.86, 0.87],
      color: t.ink,
      dash: "",
    },
  ];
  const xs = (i, n) => pad + (i / (n - 1)) * (W - pad * 2);
  const ys = (v) => H - pad - v * (H - pad * 2);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={pad} y1={ys(g)} x2={W - pad} y2={ys(g)} stroke={t.line} strokeWidth="1" />
      ))}
      {series.map((s, si) => (
        <polyline
          key={si}
          fill="none"
          stroke={s.color}
          strokeWidth={si === 2 ? 2.4 : 1.6}
          strokeDasharray={s.dash}
          points={s.values.map((v, i) => `${xs(i, s.values.length)},${ys(v)}`).join(" ")}
        />
      ))}
      {series.map((s, si) => (
        <g key={`t-${si}`}>
          <text
            x={W - pad - 8}
            y={ys(s.values[s.values.length - 1]) - 8}
            fontFamily="'JetBrains Mono', monospace"
            fontSize="12"
            fill={s.color}
            textAnchor="end"
            letterSpacing="0.08em"
          >
            {s.label}
          </text>
        </g>
      ))}
      <text
        x={pad}
        y={H - 18}
        fontFamily="'JetBrains Mono', monospace"
        fontSize="11"
        fill={t.muted}
        letterSpacing="0.14em"
      >
        QUARTER →
      </text>
      <text
        x={20}
        y={pad + 4}
        fontFamily="'JetBrains Mono', monospace"
        fontSize="11"
        fill={t.muted}
        letterSpacing="0.14em"
      >
        ↑ KEEPABLE OUTPUT
      </text>
    </svg>
  );
}

window.PostsListing = PostsListing;
window.PostDetail = PostDetail;
