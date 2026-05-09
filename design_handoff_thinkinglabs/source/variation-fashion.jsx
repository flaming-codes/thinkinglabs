// Variation B family — Fashion-Quiet Lede
// Single component parameterized by a `theme` so we can stamp out variants
// (typography, color, accent) without forking the layout. Original B is the
// "forum" theme; B2 is "sans-stark"; B3 is "bone-accent".

const FASHION_THEMES = {
  forum: {
    bg: "#ffffff",
    ink: "#0a0a0a",
    muted: "#9b9b9b",
    soft: "#3a3a3a",
    line: "#ededed",
    footBg: "#0a0a0a",
    footInk: "#fafafa",
    footMuted: "#7a7a7a",
    accent: null,
    displayFamily: "'Forum', Georgia, serif",
    displayWeight: 400,
    displayLetter: "-0.022em",
    bodyFamily: "'Inter', system-ui, sans-serif",
    rowTitleSize: 56,
    ledeSize: 88,
    ledeLetter: "-0.022em",
    label: "B · Forum / warm white (original)",
  },
  "sans-stark": {
    bg: "#ffffff",
    ink: "#000000",
    muted: "#bdbdbd",
    soft: "#1a1a1a",
    line: "#000000",
    footBg: "#000000",
    footInk: "#ffffff",
    footMuted: "#7a7a7a",
    accent: null,
    displayFamily: "'Zalando Sans Expanded', 'Inter', sans-serif",
    displayWeight: 600,
    displayLetter: "-0.04em",
    bodyFamily: "'Inter', system-ui, sans-serif",
    rowTitleSize: 60,
    ledeSize: 92,
    ledeLetter: "-0.04em",
    label: "B2 · Sans-stark · Zalando Expanded, true black/white",
  },
  "bone-accent": {
    bg: "#f3efe6",
    ink: "#1a1a1a",
    muted: "#9a8f78",
    soft: "#3a3a3a",
    line: "#dcd5c4",
    footBg: "#1a1a1a",
    footInk: "#f3efe6",
    footMuted: "#9a8f78",
    accent: "#c44a2a",
    displayFamily: "'Instrument Serif', Georgia, serif",
    displayWeight: 400,
    displayLetter: "-0.018em",
    bodyFamily: "'Inter', system-ui, sans-serif",
    rowTitleSize: 56,
    ledeSize: 86,
    ledeLetter: "-0.018em",
    label: "B3 · Bone + accent · Instrument Serif, terracotta accent",
  },
};

function makeFashionStyles(t) {
  return {
    shell: {
      width: 1440,
      minHeight: 1024,
      background: t.bg,
      color: t.ink,
      fontFamily: t.bodyFamily,
      position: "relative",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "24px 40px",
      fontSize: 14,
    },
    brand: { display: "flex", alignItems: "baseline", gap: 10 },
    brandMark: {
      width: 22,
      height: 22,
      border: `1.5px solid ${t.ink}`,
      borderRadius: "50%",
      display: "inline-block",
      position: "relative",
    },
    brandMarkInner: {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: 6,
      height: 6,
      background: t.accent || t.ink,
      borderRadius: "50%",
      transform: "translate(-50%, -50%)",
    },
    brandText: { fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em" },
    nav: { display: "flex", gap: 28, fontSize: 14, fontWeight: 500 },
    navItem: { color: t.ink, textDecoration: "none" },
    navMuted: { color: t.muted, fontWeight: 400 },
    cta: {
      fontSize: 14,
      fontWeight: 500,
      padding: "8px 16px",
      border: `1px solid ${t.ink}`,
      borderRadius: 999,
      color: t.ink,
    },
    hero: {
      padding: "120px 40px 80px",
      display: "grid",
      gridTemplateColumns: "1fr 2fr",
      columnGap: 48,
    },
    heroLeft: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: 28,
      lineHeight: 1.25,
      color: t.muted,
      letterSpacing: "-0.005em",
      paddingTop: 8,
      textWrap: "pretty",
    },
    lede: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: t.ledeSize,
      lineHeight: 1.02,
      letterSpacing: t.ledeLetter,
      margin: 0,
      color: t.ink,
      textWrap: "pretty",
    },
    ledeMuted: { color: t.muted },
    ledeAccent: t.accent ? { color: t.accent, fontStyle: "italic" } : { color: t.muted },
    subRow: {
      display: "grid",
      gridTemplateColumns: "1fr 2fr",
      columnGap: 48,
      padding: "0 40px 100px",
      alignItems: "end",
    },
    subTag: {
      fontSize: 12,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: t.muted,
    },
    subBody: { fontSize: 16, lineHeight: 1.6, maxWidth: 540, color: t.soft },
    indexLabelRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      padding: "0 40px 12px",
      borderBottom: `1px solid ${t.line}`,
    },
    indexEyebrow: {
      fontSize: 12,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: t.muted,
    },
    indexCount: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11,
      letterSpacing: "0.12em",
      color: t.muted,
    },
    indexList: { padding: "0 40px" },
    indexRow: {
      display: "grid",
      gridTemplateColumns: "60px 1fr auto 80px",
      alignItems: "center",
      columnGap: 32,
      padding: "30px 0",
      borderBottom: `1px solid ${t.line}`,
      cursor: "pointer",
      transition: "padding-left 280ms cubic-bezier(.2,.7,.2,1), color 200ms",
    },
    rowNum: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 12,
      color: t.muted,
      letterSpacing: "0.05em",
    },
    rowTitle: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: t.rowTitleSize,
      lineHeight: 1,
      letterSpacing: t.displayLetter,
      color: t.ink,
    },
    rowMeta: {
      fontSize: 13,
      color: t.muted === t.ink ? "#7a7a7a" : t.muted,
      maxWidth: 320,
      lineHeight: 1.5,
      textAlign: "right",
    },
    rowCount: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 14,
      color: t.ink,
      textAlign: "right",
    },
    foot: {
      marginTop: 100,
      padding: "60px 40px 50px",
      background: t.footBg,
      color: t.footInk,
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr",
      columnGap: 32,
    },
    footLede: {
      fontFamily: t.displayFamily,
      fontWeight: t.displayWeight,
      fontSize: 36,
      lineHeight: 1.15,
      margin: 0,
      letterSpacing: t.ledeLetter,
      maxWidth: 480,
    },
    footLedeMuted: { color: t.footMuted },
    footCol: { fontSize: 13, lineHeight: 1.8 },
    footHead: {
      fontSize: 11,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: t.footMuted,
      marginBottom: 12,
    },
    footLink: { color: t.footInk, textDecoration: "none", display: "block" },
  };
}

function FashionVariation({ themeKey = "forum" }) {
  const t = FASHION_THEMES[themeKey];
  const s = makeFashionStyles(t);
  const { KINDS } = window.TL_DATA;
  const total = KINDS.reduce((a, k) => a + k.count, 0);
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
          <a style={s.navItem}>Index</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Now</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Calibration</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>Brain-diff</a>
          <a style={{ ...s.navItem, ...s.navMuted }}>About</a>
        </nav>
        <a style={s.cta}>Get in touch ↗</a>
      </div>

      <section style={s.hero}>
        <div style={s.heroLeft}>
          From a markdown
          <br />
          tree
          <br />
          to a public
          <br />
          thinking surface.
        </div>
        <h1 style={s.lede}>
          One mind, kept in plain text — with{" "}
          <span style={s.ledeAccent}>
            stated confidence, dated predictions, and a public record of every reversal.
          </span>
        </h1>
      </section>

      <div style={s.subRow}>
        <div style={s.subTag}>↳ The thesis</div>
        <p style={s.subBody}>
          Most personal sites are static essays. This one is a queryable corpus: each claim has a
          confidence in [0,1], each prediction is graded against reality, and reversals are kept
          rather than quietly edited. Agents read the same JSON you do. The repo is canonical;
          everything else is a rendering.
        </p>
      </div>

      <div style={s.indexLabelRow}>
        <div style={s.indexEyebrow}>Index of kinds</div>
        <div style={s.indexCount}>{total} entries · last build 2026-05-03</div>
      </div>
      <div style={s.indexList}>
        {KINDS.map((k, i) => (
          <div
            key={k.slug}
            style={s.indexRow}
            onMouseEnter={(e) => {
              e.currentTarget.style.paddingLeft = "16px";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.paddingLeft = "0px";
            }}
          >
            <div style={s.rowNum}>0{i + 1}</div>
            <div style={s.rowTitle}>{k.title}</div>
            <div style={s.rowMeta}>{k.desc}</div>
            <div style={s.rowCount}>{k.count}</div>
          </div>
        ))}
      </div>

      <div style={s.foot}>
        <p style={s.footLede}>
          A project in mind?{" "}
          <span style={s.footLedeMuted}>
            I keep score in public — feel free to send something I should read.
          </span>
        </p>
        <div style={s.footCol}>
          <div style={s.footHead}>Surfaces</div>
          <a style={s.footLink}>llms.txt</a>
          <a style={s.footLink}>JSON feeds</a>
          <a style={s.footLink}>MCP server</a>
        </div>
        <div style={s.footCol}>
          <div style={s.footHead}>Discover</div>
          <a style={s.footLink}>Now</a>
          <a style={s.footLink}>Calibration</a>
          <a style={s.footLink}>Brain-diff</a>
        </div>
        <div style={s.footCol}>
          <div style={s.footHead}>Contact</div>
          <a style={s.footLink}>tom@flaming.codes</a>
          <a style={s.footLink}>github</a>
          <span style={{ color: t.footMuted, fontSize: 11, display: "block", marginTop: 16 }}>
            2026 © thinkinglabs
          </span>
        </div>
      </div>
    </div>
  );
}

window.FashionVariation = FashionVariation;
window.FASHION_THEMES = FASHION_THEMES;
window.makeFashionStyles = makeFashionStyles;
