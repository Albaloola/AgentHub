/**
 * Theme-aware status color utilities.
 *
 * Returns CSS variable references that resolve to the correct color
 * for whichever theme is active, instead of hardcoded Tailwind colors.
 */

export const STATUS_COLORS: Record<string, { bg: string; glow: string }> = {
  online: {
    bg: "var(--status-online)",
    glow: "color-mix(in srgb, var(--status-online) 40%, transparent)",
  },
  busy: {
    bg: "var(--status-warning)",
    glow: "color-mix(in srgb, var(--status-warning) 40%, transparent)",
  },
  error: {
    bg: "var(--status-danger)",
    glow: "color-mix(in srgb, var(--status-danger) 40%, transparent)",
  },
  offline: {
    bg: "var(--status-offline)",
    glow: "color-mix(in srgb, var(--status-offline) 30%, transparent)",
  },
};

/**
 * Get the CSS variable for a status dot background.
 */
export function getStatusBg(status: string): string {
  return STATUS_COLORS[status]?.bg ?? STATUS_COLORS.offline.bg;
}

/**
 * Get the CSS variable for a status dot glow shadow.
 */
export function getStatusGlow(status: string): string {
  return STATUS_COLORS[status]?.glow ?? STATUS_COLORS.offline.glow;
}

/**
 * Inline style for a status dot (background + glow).
 */
export function getStatusStyle(status: string): React.CSSProperties {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.offline;
  return {
    background: colors.bg,
    boxShadow: `0 0 6px ${colors.glow}`,
  };
}
