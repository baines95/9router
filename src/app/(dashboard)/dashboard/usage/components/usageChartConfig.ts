export const USAGE_PERIOD_PRESETS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "60d", label: "60d" },
] as const;

export function getUsageChartXAxisInterval(pointCount: number): number {
  if (pointCount <= 8) return 0;
  if (pointCount <= 16) return 1;
  if (pointCount <= 32) return 3;
  return 7;
}
