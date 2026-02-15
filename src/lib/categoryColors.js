/**
 * Shared category color system.
 * Users can customize per-category hex colors in Settings.
 * All components derive their styles from these hex values.
 */

export const DEFAULT_CATEGORY_COLORS = {
  work: '#3b82f6',
  personal: '#a855f7',
  health: '#22c55e',
  social: '#f97316',
  travel: '#06b6d4',
  other: '#6b7280',
};

/**
 * Merge user's custom colors with defaults.
 * @param {Object} userColors - e.g. { work: '#ff0000', personal: '#00ff00' }
 * @returns {Object} Complete color map with all 6 categories
 */
export function getCategoryColors(userColors) {
  return { ...DEFAULT_CATEGORY_COLORS, ...(userColors || {}) };
}

/**
 * Hex to RGB helper
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 107, g: 114, b: 128 }; // gray fallback
}

/**
 * Get inline styles for a category dot (calendar view dots).
 * @returns {{ backgroundColor: string }}
 */
export function getDotStyle(category, userColors) {
  const colors = getCategoryColors(userColors);
  return { backgroundColor: colors[category] || colors.other };
}

/**
 * Get inline styles for a category badge.
 * @returns {{ backgroundColor: string, color: string, borderColor: string }}
 */
export function getBadgeStyle(category, userColors) {
  const colors = getCategoryColors(userColors);
  const hex = colors[category] || colors.other;
  const { r, g, b } = hexToRgb(hex);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
    color: hex,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
  };
}

/**
 * Get inline styles for a card/event border-left + background.
 * @returns {{ borderLeftColor: string, backgroundColor: string }}
 */
export function getCardStyle(category, userColors) {
  const colors = getCategoryColors(userColors);
  const hex = colors[category] || colors.other;
  const { r, g, b } = hexToRgb(hex);
  return {
    borderLeftColor: hex,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.06)`,
  };
}

/**
 * Get the raw hex color for a category (for charts).
 * @returns {string}
 */
export function getChartColor(category, userColors) {
  const colors = getCategoryColors(userColors);
  return colors[category] || colors.other;
}
