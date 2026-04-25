import { describe, it, expect } from "vitest";
import {
  USAGE_PERIOD_PRESETS,
  getUsageChartXAxisInterval,
} from "../../src/app/(dashboard)/dashboard/usage/components/usageChartConfig";

describe("usageChartConfig", () => {
  it("exposes fixed preset tabs", () => {
    expect(USAGE_PERIOD_PRESETS).toEqual([
      { value: "24h", label: "24h" },
      { value: "7d", label: "7d" },
      { value: "30d", label: "30d" },
      { value: "60d", label: "60d" },
    ]);
  });

  it("keeps 7d as default selectable preset in UI state", () => {
    const defaultPeriod = USAGE_PERIOD_PRESETS[1]?.value;
    expect(defaultPeriod).toBe("7d");
  });

  it("keeps dense datasets readable by increasing x-axis interval", () => {
    expect(getUsageChartXAxisInterval(6)).toBe(0);
    expect(getUsageChartXAxisInterval(12)).toBe(1);
    expect(getUsageChartXAxisInterval(24)).toBe(3);
    expect(getUsageChartXAxisInterval(48)).toBe(7);
  });

  it("returns 0 interval for empty/small datasets", () => {
    expect(getUsageChartXAxisInterval(0)).toBe(0);
    expect(getUsageChartXAxisInterval(1)).toBe(0);
  });
});
