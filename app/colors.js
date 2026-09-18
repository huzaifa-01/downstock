// Polaris semantic color tokens with hardcoded fallbacks, plus MatrixInn's
// brand accent (lime primary / blue secondary) layered on top of the
// interactive + button roles. Background/text stay Polaris-native so the
// app still feels at home inside Shopify admin — see matrixinn-brand-theme
// notes: don't force the dark site theme into embedded admin UI.

export const C = {
  // Success (green)
  textSuccess:    "var(--p-color-text-success, #1a7a1e)",
  bgSuccess:      "var(--p-color-bg-surface-success, #d4edda)",
  borderSuccess:  "var(--p-color-border-success, #a5c7a9)",

  // Critical / Error (red)
  textCritical:   "var(--p-color-text-critical, #d72c0d)",
  bgCritical:     "var(--p-color-bg-surface-critical, #ffd6d2)",
  borderCritical: "var(--p-color-border-critical, #fc9090)",

  // Caution / Warning (amber)
  textCaution:    "var(--p-color-text-caution, #b98900)",
  bgCaution:      "var(--p-color-bg-surface-caution, #fff5cc)",
  borderCaution:  "var(--p-color-border-caution, #ffd361)",

  // Neutral
  text:           "var(--p-color-text, #202223)",
  textSecondary:  "var(--p-color-text-secondary, #6d7175)",
  bg:             "var(--p-color-bg-surface, #ffffff)",
  bgSecondary:    "var(--p-color-bg-surface-secondary, #f6f6f7)",
  border:         "var(--p-color-border, #e1e3e5)",
  borderStrong:   "var(--p-color-border-strong, #8c9196)",

  // MatrixInn brand accent — lime primary, blue secondary
  lime:              "#c9f24e",
  limeDeep:          "#a9d62f",
  blue:              "#3a6bff",
  blueDeep:          "#274ed6",
  textInteractive:   "#274ed6",
  borderInteractive: "#3a6bff",

  // Buttons — lime fill with dark ink text (lime is too light for white text)
  btnBg:          "#c9f24e",
  btnBgHover:     "#a9d62f",
  btnText:        "#0a0c12",
};

// MatrixInn typefaces (matrixinnsolutions.com): Bricolage Grotesque for
// display/headings, Hanken Grotesk for body copy.
export const FONTS = {
  display: "'Bricolage Grotesque', Georgia, serif",
  body: "'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif",
  googleFontsHref:
    "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap",
};
