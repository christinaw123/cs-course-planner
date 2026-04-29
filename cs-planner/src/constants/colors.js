export const BLOCK_COLORS = [
  { bg: '#cde0f5', text: '#0f2e60', border: '#9ec4ec' },
  { bg: '#ceeadc', text: '#0f5228', border: '#9dd4bc' },
  { bg: '#ddd4f0', text: '#36186a', border: '#b8a8e0' },
  { bg: '#fad4d8', text: '#7a1020', border: '#eeaab0' },
  { bg: '#fce4c0', text: '#5c3800', border: '#f0c080' },
  { bg: '#ceeacc', text: '#0f4820', border: '#9cd898' },
];

export function nextColor(usedColors) {
  for (let i = 0; i < BLOCK_COLORS.length; i++) {
    if (!usedColors.includes(i)) return i;
  }
  return 0;
}
