/**
 * Shared theme values for every Recharts surface in the app.
 *
 * Centralising these means the chart family stays consistent and any future
 * palette / dark-mode work only edits one file. Keep these in sync with the
 * CSS custom properties in `app/globals.css`.
 */

export const CHART_TICK_FILL = "hsl(25 12% 38%)";
export const CHART_GRID_STROKE = "hsl(38 18% 87%)";

export const CHART_TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid hsl(38 18% 87%)",
  background: "hsl(25 20% 14%)",
  color: "hsl(38 33% 96%)",
  padding: "8px 12px",
};

export const CHART_TOOLTIP_STYLE_COMPACT = {
  ...CHART_TOOLTIP_STYLE,
  fontSize: 11,
  borderRadius: 6,
};

export const CHART_CURSOR_FILL = "hsl(25 10% 38% / 0.06)";
