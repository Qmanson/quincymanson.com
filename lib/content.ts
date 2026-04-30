/**
 * ════════════════════════════════════════════════════════════════
 *   ALL USER-FACING COPY FOR THE SITE
 *   Edit any string here to change what shows on the public pages.
 *   No code changes needed — just edit and save.
 * ════════════════════════════════════════════════════════════════
 */

export const SITE = {
  // Tab title (browser tab)
  title: "QM2",
  // <meta description>
  description: "Personal site",
  // Top-left logo / "back to home" anchor in nav
  navHomeLabel: "HOME",
  // Window title bar text shown at top of every page in the nav window
  navWindowTitle: "QM2 - home page",
} as const;

// ── Home page ──────────────────────────────────────────────────────

export const HOME = {
  windowTitle: "WELCOME",

  // The big red headline at the top
  headline: "QUINCY'S WEBSITE",
  // Small label under the headline (the {year} placeholder is replaced with the current year)
  established: "───── est. {year} ─────",
  // Italic tagline
  tagline: "place on the internet for my things",
  // Hazard-stripe banner (set to '' to hide)
  hazardBanner: "⚠ UNDER CONSTRUCTION ⚠",

  // Navigation table
  navWindowTitle: "navigation",
  // The four entries in the home-page nav grid
  navItems: [
    { href: "/blog", icon: "✎", label: "BLOG", desc: "tbd" },
    { href: "/art", icon: "✦", label: "ART", desc: "tbd" },
    { href: "/trackers", icon: "▦", label: "TRACKERS", desc: "habit heatmaps" },
    {
      href: "/links",
      icon: "⚓",
      label: "LINKS",
      desc: "things i found on internet",
    },
  ],

  // "What's new" section
  recentWindowTitle: "★ what's new ★",
  recentSectionLabel: "░░░ LATEST POSTS ░░░",

  // Visitor counter — set to '' to hide entirely
  visitorCounterLabel: "VISITORS",
} as const;

// ── Top nav (also used by AdminBar context links) ─────────────────

export const NAV = {
  blog: "BLOG",
  art: "ART",
  trackers: "TRACKERS",
  links: "LINKS",
  login: "[LOGIN]",
  logout: "[LOGOUT]",
} as const;

// ── Footer ────────────────────────────────────────────────────────

export const FOOTER = {
  // First line — set to '' to hide
  line1: "★ best viewed in netscape navigator @ 800×600 ★",
  // Second line — {year} is replaced with current year
  line2: "© {year} QM — all rights reserved",
} as const;

// ── Login page ────────────────────────────────────────────────────

export const LOGIN = {
  windowTitle: "🔒 SIGN IN",
  ribbon: "░░░ AUTHORIZED PERSONNEL ONLY ░░░",
  emailLabel: "EMAIL:",
  passwordLabel: "PASSWD:",
  submitLabel: "SUBMIT",
  submitWaiting: "WAIT...",
  errorPrefix: "! ERROR:",
} as const;

// ── 404 page ──────────────────────────────────────────────────────

export const NOT_FOUND = {
  windowTitle: "⚠ ERROR.exe",
  bigCode: "404",
  primary: "FILE NOT FOUND",
  secondary: "this page has been lost to the digital dark age",
  homeLink: "← return to home",
} as const;

// ── Blog ──────────────────────────────────────────────────────────

export const BLOG = {
  windowTitle: "📚 blog.htm",
  pageHeading: "✎ The Blog",
  emptyAll: "no posts yet — check back soon!",
  emptyCluster: "no posts yet",
  emptyClusterShort: "no posts yet",
  uncategorizedLabel: "UNCATEGORIZED",
  draftBadge: "DRAFT",
  // Admin buttons
  newPostButton: "[+ NEW POST]",
  newClusterButton: "[+ NEW CLUSTER]",
  newPostInline: "+ POST",
  delClusterButton: "[DEL CLUSTER]",
  // New cluster dialog
  newClusterDialogTitle: "new_cluster.dlg",
  newClusterNameLabel: "NAME:",
  newClusterDescLabel: "DESC:",
  newClusterDescPlaceholder: "(optional)",
  okLabel: "OK",
  cancelLabel: "CANCEL",
  // Quick post form
  postTitlePlaceholder: "Post title",
  noClusterOption: "— no cluster —",
  createLabel: "CREATE",
  // Confirmations
  confirmDeleteCluster: "Delete this cluster? Posts will become uncategorized.",
  confirmDeletePost: "Delete this post?",
  // Post draft warning
  draftWarning: "⚠ DRAFT — not visible to public",
  // Post admin panel
  adminPanelTitle: "⚙ ADMIN PANEL",
  showEditor: "[ ▸ EDIT POST ]",
  hideEditor: "[ ▾ HIDE EDITOR ]",
  publishButton: "[PUBLISH]",
  unpublishButton: "[UNPUBLISH]",
  deleteButton: "[DELETE]",
  saveLabel: "💾 SAVE CHANGES",
  savingLabel: "SAVING...",
  fieldTitle: "TITLE:",
  fieldCover: "COVER URL:",
  fieldTags: "TAGS:",
  tagsPlaceholder: "food, travel",
  coverPlaceholder: "https://…",
  writeTab: "WRITE",
  previewTab: "PREVIEW",
  emptyPostBody: "*This post has no content yet.*",
} as const;

// ── Art ───────────────────────────────────────────────────────────

export const ART = {
  windowTitle: "🎨 art.htm",
  pageHeading: "✦ The Gallery",
  emptyMediums: "no mediums yet",
  emptyArtworks: "no artworks yet",
  emptyMediumShort: "nothing yet",
  newMediumButton: "[+ NEW MEDIUM]",
  newArtworkButton: "+ ARTWORK",
  newMediumPlaceholder: "Medium (e.g. poetry)",
  newArtworkPlaceholder: "New artwork title",
  delMediumButton: "[DEL MEDIUM]",
  // Artwork detail
  editButton: "[EDIT]",
  deleteButton: "[DELETE]",
  removeFileButton: "[REMOVE]",
  uploadButton: "📁 + UPLOAD FILE",
  uploadingLabel: "UPLOADING...",
  saveButton: "💾 SAVE",
  cancelButton: "CANCEL",
  savingLabel: "SAVING...",
  fieldTitle: "TITLE:",
  fieldYear: "YEAR:",
  fieldMedium: "MEDIUM:",
  fieldDesc: "DESC:",
  noMediumOption: "— none —",
  // Confirmations
  confirmDeleteMedium: "Delete this medium? Artworks will be unassigned.",
  confirmDeleteArtwork: "Delete this artwork?",
  confirmRemoveFile: "Remove this file?",
  createLabel: "CREATE",
  okLabel: "OK",
  cancelLabel: "CANCEL",
} as const;

// ── Trackers ──────────────────────────────────────────────────────

export const TRACKERS = {
  windowTitle: "▦ trackers.htm",
  pageHeading: "▦ The Trackers",
  empty: "no trackers yet",
  hint: "▸ click any cell to log/edit a day (with optional notes)",
  daysLoggedSuffix: "days logged",
  newTrackerButton: "[+ NEW TRACKER]",
  quickLogButton: "[+ QUICK LOG]",
  // Quick log form
  trackerSelectPlaceholder: "— tracker —",
  notePlaceholder: "note (optional)",
  logLabel: "LOG",
  // New tracker dialog
  newTrackerDialogTitle: "new_tracker.dlg",
  fieldName: "NAME:",
  fieldIcon: "ICON:",
  colorLabel: "COLOR:",
  namePlaceholder: "workout",
  iconPlaceholder: "🏋️ (emoji, optional)",
  okLabel: "OK",
  cancelLabel: "CANCEL",
  // Popover
  popoverUpdate: "UPDATE",
  popoverLog: "LOG",
  popoverRemove: "REMOVE",
  // Hover tooltip
  tooltipLogged: "✓ logged",
} as const;

// ── Links ─────────────────────────────────────────────────────────

export const LINKS = {
  windowTitle: "⚓ links.htm",
  pageHeading: "⚓ Links of Note",
  emptyAll: "no links yet",
  emptyFiltered: (tag: string) => `no links tagged "#${tag}" yet`,
  filterLabel: "FILTER:",
  filterAll: "ALL",
  newLinkButton: "[+ NEW LINK]",
  newLinkDialogTitle: "new_link.dlg",
  fieldUrl: "URL:",
  fieldTitle: "TITLE:",
  fieldDesc: "DESC:",
  fieldTags: "TAGS:",
  urlPlaceholder: "https://…",
  descPlaceholder: "(optional)",
  tagsPlaceholder: "comma, separated",
  saveLabel: "SAVE",
  savingLabel: "SAVING...",
  cancelLabel: "CANCEL",
  editButton: "EDIT",
  delButton: "DEL",
  confirmDelete: "Delete this link?",
} as const;

// ── Admin bar ─────────────────────────────────────────────────────

export const ADMIN_BAR = {
  badge: "● ADMIN",
  user: "logged in as ROOT",
  blogActions: [
    { href: "/blog", label: "+ POST" },
    { href: "/blog", label: "+ CLUSTER" },
  ],
  artActions: [
    { href: "/art", label: "+ ARTWORK" },
    { href: "/art", label: "+ MEDIUM" },
  ],
  trackerActions: [{ href: "/trackers", label: "+ TRACKER" }],
  linkActions: [{ href: "/links", label: "+ LINK" }],
} as const;
