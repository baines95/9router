"use client";

import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const fmtTokens = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
};

const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;

export default function UsageChart({ period = "7d" }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("tokens");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage/chart?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch chart data:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasData = data.some((d) => d.tokens > 0 || d.cost > 0);

  return (
    <Card className="shadow-sm border-border/50 bg-background/50">
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 border-b border-border/50">
        <CardTitle className="text-sm font-medium text-foreground capitalize">
          Usage History
        </CardTitle>
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(v) => v && setViewMode(v)}
          size="sm"
          className="border border-border/50 p-0.5 rounded-lg bg-background"
        >
          <ToggleGroupItem value="tokens" className="px-3 rounded-md text-xs font-medium">Tokens</ToggleGroupItem>
          <ToggleGroupItem value="cost" className="px-3 rounded-md text-xs font-medium">Cost</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>

      <CardContent className="p-3 pt-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-xs font-medium">Đang tải...</div>
        ) : !hasData ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-xs font-medium">Không có dữ liệu trong khoảng thời gian này</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={viewMode === "tokens" ? fmtTokens : fmtCost}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "none",
                }}
                itemStyle={{ padding: "0" }}
                formatter={(value, name) =>
                  name === "tokens" ? [fmtTokens(value), "Tokens"] : [fmtCost(value), "Cost"]
                }
              />
              {viewMode === "tokens" ? (
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradTokens)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradCost)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

UsageChart.propTypes = {
  period: PropTypes.string,
};
