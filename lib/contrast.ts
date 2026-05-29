/**
 * Tiny luminance helper for picking readable foreground colours on tinted
 * backgrounds. The product uses lots of `{ backgroundColor: hex+"1f",
 * color: hex }` patterns; for lighter hues (yellow, pink) the text-on-tint
 * combination drops well below 4.5:1. This helper picks a darker version of
 * the same hue when needed, so chips stay on-brand without becoming illegible.
 */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").toLowerCase();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Returns a readable foreground hex against a 12%-tinted version of the same
 * hue. For dark / mid hues we return the colour itself; for light hues
 * (yellow, light pink) we return a deeper sibling so contrast hits at least
 * ~4.5:1 on a cream-tinted background.
 */
export function readableOnTint(hex: string): string {
  const lum = relativeLuminance(hex);
  if (lum < 0.45) return hex;
  // Light hue — synthesise a darker companion by halving each channel,
  // which keeps the hue and drops the luminance below 0.18.
  const [r, g, b] = hexToRgb(hex);
  const dark = (n: number) => Math.max(0, Math.round(n * 0.4));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(dark(r))}${toHex(dark(g))}${toHex(dark(b))}`;
}

/**
 * Returns a softer background hex (12% opacity equivalent) to pair with the
 * `readableOnTint` foreground. Caller can splice the two together:
 *
 *   const fg = readableOnTint(hex);
 *   const bg = tintedBg(hex);
 *   <span style={{ backgroundColor: bg, color: fg }}>{label}</span>
 */
export function tintedBg(hex: string, alphaHex: string = "1f"): string {
  return `${hex}${alphaHex}`;
}
