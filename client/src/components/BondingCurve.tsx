import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTilt } from "@/context/TiltContext";
import { XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp } from "lucide-react";

const CHART_GREEN = "hsl(120 60% 40%)";
const CHART_AXIS = "hsl(120 10% 45%)";
const CHART_GRID = "hsl(120 20% 15%)";
const CHART_STROKE = "hsl(120 100% 50%)";

interface BondingCurveProps {
  className?: string;
}

export function BondingCurve({ className }: BondingCurveProps) {
  const { contractState } = useTilt();

  const totalSupply = parseInt(contractState?.totalSupply || "1736000", 10);

  const chartData = useMemo(() => {
    const points = 50;
    const maxSupply = Math.max(totalSupply * 1.2, 2000000);
    const step = maxSupply / points;

    return Array.from({ length: points + 1 }, (_, i) => {
      const supply = Math.floor(i * step);
      const price = (supply * supply) / 1e18;

      return {
        supply,
        price,
        currentPrice: supply <= totalSupply ? price : null,
        futurePrice: supply >= totalSupply ? price : null,
      };
    });
  }, [totalSupply]);

  return (
    <Card className="card-tertiary">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-[hsl(var(--primary-muted))]" />
          Bonding Curve
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pr-4">
        <div className={`w-full ${className ?? "h-[200px]"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="colorPrice"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART_GREEN}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_GREEN}
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient
                  id="colorFuture"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART_GREEN}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_GREEN}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="supply"
                tick={{ fill: CHART_AXIS, fontSize: 11 }}
                tickFormatter={(v) =>
                  v >= 1000000
                    ? `${(v / 1000000).toFixed(1)}M`
                    : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : v
                }
                axisLine={{ stroke: CHART_GRID }}
                tickLine={{ stroke: CHART_GRID }}
              />
              <YAxis
                tick={{ fill: CHART_AXIS, fontSize: 11 }}
                tickFormatter={(v) => v.toExponential(0)}
                axisLine={{ stroke: CHART_GRID }}
                tickLine={{ stroke: CHART_GRID }}
                width={50}
              />
              <Area
                type="monotone"
                dataKey="currentPrice"
                stroke={CHART_STROKE}
                strokeWidth={2}
                fill="url(#colorPrice)"
                dot={false}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="futurePrice"
                stroke={CHART_STROKE}
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#colorFuture)"
                dot={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
