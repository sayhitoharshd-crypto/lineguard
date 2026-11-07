export const C = {
  purple: '#7c3aed', purple2: '#a855f7', pink: '#ec4899', orange: '#f97316',
  white: '#ffffff', off: '#f8f5ff', border: '#e9d5ff',
  text: '#1a1a2e', muted: '#6b7280', light: '#9ca3af', xlight: '#c4b5fd',
  green: '#16a34a', greenBg: '#f0fdf4', red: '#dc2626', redBg: '#fef2f2',
  amber: '#d97706', amberBg: '#fef3c7',
};
export const G = {
  main: ['#7c3aed', '#ec4899', '#f97316'],
  purplePink: ['#a855f7', '#ec4899'],
  deep: ['#4c1d95', '#7c3aed'],
  green: ['#10b981', '#06b6d4'],
  dark: ['#7c3aed', '#db2777'],
};
export const MIN_REP = 50;
export const START_REP = 100;
export function repLevel(rep) {
  if (rep >= 150) return { label: 'Guardian', color: '#7c3aed' };
  if (rep >= 100) return { label: 'Trusted', color: '#16a34a' };
  if (rep >= 75) return { label: 'Active', color: '#2563eb' };
  if (rep >= MIN_REP) return { label: 'Caution', color: '#d97706' };
  return { label: 'Suspended', color: '#dc2626' };
}
