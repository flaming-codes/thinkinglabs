/** One top-level navigation entry shared by the home page and compact site nav. */
export interface SiteNavLink {
  href: string;
  label: string;
}

/** Primary public sections, ordered as shown on the landing page. */
export const PRIMARY_SITE_LINKS: readonly SiteNavLink[] = [
  { href: "/now", label: "now" },
  { href: "/thoughts", label: "thoughts" },
  { href: "/claims", label: "claims" },
  { href: "/predictions", label: "predictions" },
  { href: "/decisions", label: "decisions" },
  { href: "/observations", label: "observations" },
  { href: "/changed-my-mind", label: "changed my mind" },
  { href: "/questions", label: "questions" },
  { href: "/projects", label: "projects" },
  { href: "/posts", label: "posts" },
  { href: "/about", label: "about" },
  { href: "/contact", label: "contact" },
];
