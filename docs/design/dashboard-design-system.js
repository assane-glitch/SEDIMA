/**
 * Dashboard Portefeuille — design system
 * Extrait de « Dashboard Portefeuille Epure v12 ».
 * Système épuré, dense, orienté données : fond gris clair, cartes blanches,
 * bordures 1px, encre gris anthracite, un seul accent rouge de marque.
 *
 * Usage :
 *   import { color, font, radius, space, style, semantic } from './dashboard-design-system.js';
 */

/* ─────────────────────────── Couleurs ─────────────────────────── */

export const color = {
  // Encre (texte) — 4 niveaux, jamais plus
  ink:        "#1F2937", // titres, valeurs, boutons primaires
  inkBody:    "#374151", // texte courant, labels de boutons secondaires
  inkMuted:   "#6B7280", // légendes, texte secondaire, liens discrets
  inkFaint:   "#9CA3AF", // en-têtes de colonnes, unités, aides
  inkGhost:   "#C9CCD1", // méta ultra-discrète (sources, horodatages)

  // Surfaces
  canvas:     "#F1F2F4", // fond d'application
  surface:    "#FFFFFF", // cartes, panneaux, champs actifs
  surfaceAlt: "#FCFCFD", // sous-panneaux, lignes sélectionnées
  surfaceMut: "#FAFAFB", // champs en lecture seule
  surfaceSub: "#F7F7F7", // boutons de fermeture, puces neutres
  zebra:      "#F4F5F7", // lignes alternées de tableau
  header:     "#EFF0F2", // en-têtes de tableau
  topbar:     "#1F2937", // barre de navigation sombre

  // Bordures — du plus visible au plus discret
  border:      "#D8DADE", // contour de contrôle (boutons, champs)
  borderSoft:  "#E3E4E7", // contour de bouton inactif
  borderHair:  "#E7E7E7", // séparateur de carte, filet de grille
  borderLight: "#F0F0F0", // graduation, filet interne très léger
  borderLock:  "#ECECEC", // contour de champ verrouillé

  // Accent de marque — réservé aux marqueurs (jalons, aujourd'hui, alerte forte).
  // Jamais utilisé comme fond de bouton ni comme couleur de texte courant.
  brand:      "#D71920",
  brandDark:  "#B3141A",

  // États
  success:    "#008000", success_bg: "#F2F8F2", success_bd: "#CDE3CD",
  warning:    "#B07A00", warning_bg: "#FEF9EC", warning_bd: "#F4E2B8",
  warningDot: "#F9B710",
  danger:     "#D71920", danger_bg:  "#FDF3F3", danger_bd:  "#F3C6C8",
  neutralDot: "#BFBFBF",
};

/* ─────────────────────────── Typographie ─────────────────────────── */

export const font = {
  // Pas de police web : la pile système garde le rendu dense et net à petite taille.
  sans: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
  mono: "ui-monospace,SFMono-Regular,Menlo,monospace",

  // Échelle réelle du dashboard — délibérément compacte (interface de travail,
  // pas une page marketing). Ne pas monter en taille pour « aérer » : c'est la
  // densité qui fait la valeur de l'écran.
  size: {
    micro:  "9px",    // en-têtes de colonnes en capitales, graduations d'axe
    tiny:   "9.5px",  // boutons compacts, méta
    small:  "10px",   // libellés de commandes, légendes de graphique
    base:   "10.5px", // TAILLE PAR DÉFAUT des cellules et du texte d'interface
    body:   "11px",   // texte explicatif, guides
    input:  "11.5px", // champs de saisie, boutons de formulaire
    label:  "12px",   // libellés de section
    strong: "12.5px", // titres de sous-section
    lead:   "13.5px", // titres de carte
    title:  "16px",   // valeur mise en avant, titre d'écran
    hero:   "21px",   // KPI unique
  },

  weight: { normal: 400, medium: 600, bold: 700 },

  line: { tight: 1.35, snug: 1.45, normal: 1.55, loose: 1.7 },

  // Rendu des nombres : toujours tabulaire dans les colonnes chiffrées.
  numeric: { fontVariantNumeric: "tabular-nums" },

  // En-tête de colonne / de section
  eyebrow: {
    fontSize: "9px", fontWeight: 700, color: color.inkFaint,
    textTransform: "uppercase", letterSpacing: ".06em",
  },
};

/* ─────────────────────────── Formes & espace ─────────────────────────── */

export const radius = {
  xs: "3px",   // puce, micro-badge
  sm: "4px",   // cellule éditable
  md: "5px",   // bouton, champ
  lg: "6px",   // bouton large, textarea
  xl: "8px",   // carte, panneau  ← le rayon dominant
  pill: "999px",
  dot: "50%",
};

// Grille de 4px. Les paddings de carte sont les seules valeurs « larges ».
export const space = {
  0.5: "2px", 1: "4px", 1.5: "6px", 2: "8px", 2.5: "10px",
  3: "12px", 3.5: "14px", 4: "16px", 5: "20px", 6: "24px", 7: "28px", 8: "34px",
  cardPad: "13px 15px 15px",
  screenPad: "26px 28px 34px",
};

/* ─────────────────────────── Règles graphiques ─────────────────────────── */

export const rules = {
  // 1. Aucune ombre. La profondeur vient d'une bordure 1px et d'un décalage de fond.
  shadow: "none",

  // 2. Une bordure, jamais deux : `1px solid` + un rayon de la liste ci-dessus.
  hairline: `1px solid ${color.borderHair}`,
  control: `1px solid ${color.border}`,

  // 3. Aucun dégradé, aucun aplat de couleur saturé en fond de zone.
  //    Le rouge de marque ne sert qu'à des traits, points et marqueurs de 1 à 6px.

  // 4. Le bouton primaire est ANTHRACITE (#1F2937), pas rouge.

  // 5. Les icônes sont des caractères (◀ ▶ − + × ▸ ▾ ·), pas des SVG.

  // 6. Hiérarchie par le poids et la couleur d'encre, pas par la taille :
  //    la plupart du texte reste à 10.5px.

  // 7. Tout tableau : en-tête #EFF0F2, zébrures #F4F5F7, filets #F0F0F0,
  //    nombres alignés à droite et tabulaires.

  // 8. Les états n'utilisent jamais que le trio fond très pâle / bordure pâle /
  //    texte saturé — jamais de pastille de couleur pleine derrière du texte.

  // 9. Le curseur `pointer` sur tout ce qui est cliquable ; `not-allowed` +
  //    opacity .5 sur le désactivé (jamais un gris différent).

  // 10. Lecture seule = fond #FAFAFB + bordure #ECECEC, la valeur reste lisible.
};

/* ─────────────────────────── Recettes de composants ─────────────────────────── */

export const style = {
  app: {
    minHeight: "100vh", width: "100%", background: color.canvas,
    fontFamily: font.sans, color: color.ink, fontSize: "13px",
  },

  card: {
    position: "relative", border: rules.hairline, borderRadius: radius.xl,
    background: color.surface, padding: space.cardPad,
    display: "flex", flexDirection: "column", gap: space[2], minWidth: 0,
  },

  cardTitle: {
    fontSize: font.size.lead, fontWeight: 700, color: color.ink,
    letterSpacing: "-0.01em",
  },

  sectionTitle: { ...font.eyebrow },

  hint: { fontSize: font.size.small, color: color.inkFaint, lineHeight: font.line.snug },

  btnPrimary: {
    padding: "5px 11px", borderRadius: radius.md, border: `1px solid ${color.ink}`,
    background: color.ink, color: color.surface, fontSize: font.size.base,
    fontWeight: 700, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
  },

  btnSecondary: {
    padding: "5px 10px", borderRadius: radius.md, border: rules.control,
    background: color.surface, color: color.inkBody, fontSize: font.size.base,
    fontWeight: 600, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
  },

  btnGhost: {
    border: "none", background: "transparent", padding: 0, fontFamily: "inherit",
    fontSize: font.size.base, fontWeight: 600, color: color.inkMuted, cursor: "pointer",
  },

  // Bouton d'icône carré des barres de commande (nav Gantt, zoom, fermeture)
  btnIcon: {
    width: "22px", height: "20px", padding: 0, display: "grid", placeItems: "center",
    borderRadius: radius.md, border: rules.control, background: color.surface,
    color: color.inkBody, fontSize: font.size.tiny, fontFamily: "inherit", cursor: "pointer",
  },

  input: (opts = {}) => ({
    width: "100%", boxSizing: "border-box", padding: "6px 9px",
    borderRadius: radius.md, fontFamily: "inherit", fontSize: font.size.input,
    lineHeight: font.line.snug, color: color.ink,
    border: `1px solid ${opts.alert ? color.danger_bd : opts.readOnly ? color.borderLock : color.border}`,
    background: opts.readOnly ? color.surfaceMut : color.surface,
  }),

  // Cellule de tableau éditable (la brique la plus fréquente de l'app)
  cell: (opts = {}) => ({
    width: "100%", minWidth: 0, padding: "4px 6px", borderRadius: radius.sm,
    fontFamily: "inherit", fontSize: font.size.base, lineHeight: font.line.tight,
    border: `1px solid ${opts.locked ? color.borderLock : opts.alert ? color.danger_bd : color.border}`,
    background: opts.locked ? color.surfaceMut : color.surface,
    color: color.ink, textAlign: opts.numeric ? "right" : "left",
    ...(opts.numeric ? font.numeric : null),
  }),

  tableHead: {
    background: color.header, ...font.eyebrow,
    padding: "6px 8px", borderBottom: `1px solid ${color.borderHair}`,
  },

  rowZebra: (i) => ({ background: i % 2 ? color.zebra : color.surface }),

  // Puce d'état : point de 6px + libellé, jamais un fond coloré
  dot: (c) => ({ width: "6px", height: "6px", borderRadius: radius.dot, background: c, flexShrink: 0 }),

  chip: (tone = "neutral") => {
    const t = semantic[tone];
    return {
      display: "inline-flex", alignItems: "center", gap: space[1.5],
      padding: "2px 8px", borderRadius: radius.pill,
      border: `1px solid ${t.border}`, background: t.bg, color: t.fg,
      fontSize: font.size.tiny, fontWeight: 700, whiteSpace: "nowrap",
    };
  },

  // Barre de Gantt / de progression : aplat anthracite, vert à 100 %
  bar: (pct) => ({
    position: "absolute", left: 0, top: 0, bottom: 0,
    width: Math.max(pct, 2) + "%", background: pct >= 100 ? color.success : color.ink,
  }),

  // Marqueur « aujourd'hui » : le seul filet rouge de l'écran
  todayMarker: { position: "absolute", top: 0, bottom: 0, width: "1px", background: color.brand },
};

/* ─────────────────────────── Tons sémantiques ─────────────────────────── */

export const semantic = {
  neutral: { fg: color.inkMuted, bg: color.surfaceSub, border: color.borderSoft, dot: color.neutralDot },
  info:    { fg: color.inkBody,  bg: color.surfaceAlt, border: color.borderHair, dot: color.inkFaint },
  ok:      { fg: color.success,  bg: color.success_bg, border: color.success_bd, dot: color.success },
  warn:    { fg: color.warning,  bg: color.warning_bg, border: color.warning_bd, dot: color.warningDot },
  alert:   { fg: color.danger,   bg: color.danger_bg,  border: color.danger_bd,  dot: color.danger },
};

/* ─────────────────────── Variables CSS (option) ─────────────────────── */

export const cssVars = () =>
  ":root{" +
  Object.entries(color).map(([k, v]) => `--c-${k.replace(/_/g, "-")}:${v}`).join(";") + ";" +
  Object.entries(font.size).map(([k, v]) => `--fs-${k}:${v}`).join(";") + ";" +
  Object.entries(radius).map(([k, v]) => `--r-${k}:${v}`).join(";") +
  "}";

export default { color, font, radius, space, rules, style, semantic, cssVars };
