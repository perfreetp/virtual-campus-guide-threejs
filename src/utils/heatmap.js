export const heatLevels = [
  { min: 0, max: 0.25, label: '稀疏', color: '#2fe6a6', glow: 0.16 },
  { min: 0.25, max: 0.45, label: '正常', color: '#57d6ff', glow: 0.24 },
  { min: 0.45, max: 0.62, label: '较密', color: '#ffd34d', glow: 0.34 },
  { min: 0.62, max: 0.78, label: '拥挤', color: '#ff9440', glow: 0.46 },
  { min: 0.78, max: 1.01, label: '预警', color: '#ff4d6d', glow: 0.6 }
];

export function getHeatLevel(density) {
  return heatLevels.find((level) => density >= level.min && density < level.max) || heatLevels[0];
}

export function getWarningText(entry) {
  if (!entry) {
    return '';
  }

  if (entry.warning === 'red') {
    return '人流过载，建议错峰或绕行';
  }

  if (entry.warning === 'yellow') {
    return '人流较密，请注意通行秩序';
  }

  return '人流正常，无需预警';
}
