/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Read top-to-bottom. Each `at` value is ms after mount/in-view.
 *
 *    0ms   card visible, chart area empty
 *  200ms   axes and grid lines fade in
 *  500ms   current-price area sweeps in left → right (clip-path)
 *  800ms   future-price dashed area fades in
 * 1000ms   "you are here" marker pops in with scale 0 → 1
 * ∞       hover: tooltip + tracking dot follow cursor along curve
 * ───────────────────────────────────────────────────────── */

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTilt } from "@/context/TiltContext";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip,
  ReferenceDot,
  type TooltipProps,
} from "recharts";
import { motion, useInView } from "framer-motion";
import { TrendingUp } from "lucide-react";

/* ── Timing ─────────────────────────────────────────────── */

const TIMING = {
  axes: 0.2, // s — axes fade in
  currentArea: 0.5, // s — current price area sweeps in
  futureArea: 0.8, // s — future price area fades in
  marker: 1.0, // s — "you are here" pops in
};

/* ── Chart colors ───────────────────────────────────────── */

const COLORS = {
  green: "hsl(120 60% 40%)", // fill gradient (dimmer)
  stroke: "hsl(120 100% 50%)", // line stroke (neon)
  axis: "hsl(120 10% 45%)", // tick labels
  grid: "hsl(120 20% 15%)", // axis lines
  marker: "hsl(120 100% 50%)", // current-supply dot
  tooltipBg: "hsl(120 10% 8%)", // tooltip background
  tooltipBorder: "hsl(120 20% 20%)", // tooltip border
};

/* ── Spring configs ─────────────────────────────────────── */

const SPRING = {
  reveal: { type: "spring" as const, stiffness: 80, damping: 20 },
  marker: { type: "spring" as const, stiffness: 400, damping: 22 },
  fade: { duration: 0.4, ease: "easeOut" as const },
};

/* ── Marker ─────────────────────────────────────────────── */

const MARKER = {
  initialScale: 0, // before pop-in
  finalScale: 1, // resting scale
  ringSize: 10, // outer ring px
  dotSize: 5, // inner dot px
  pulseSize: 20, // pulse ring px
};

/* ── Custom tooltip ─────────────────────────────────────── */

function ChartTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as {
    supply: number;
    price: number;
  } | undefined;
  if (!data) return null;

  const supply = data.supply;
  const price = data.price;

  const fmtSupply =
    supply >= 1_000_000
      ? `${(supply / 1_000_000).toFixed(2)}M`
      : supply >= 1_000
        ? `${(supply / 1_000).toFixed(1)}k`
        : supply.toString();

  const fmtPrice =
    price < 0.000001
      ? price.toExponential(2)
      : price < 0.01
        ? price.toFixed(8)
        : price.toFixed(4);

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        background: COLORS.tooltipBg,
        borderColor: COLORS.tooltipBorder,
      }}
    >
      <div className="flex items-center gap-3">
        <div>
          <div className="text-muted-foreground">Supply</div>
          <div className="font-mono font-bold">{fmtSupply}</div>
        </div>
        <div className="h-6 w-px bg-border" />
        <div>
          <div className="text-muted-foreground">Price</div>
          <div className="font-mono font-bold text-primary">
            {fmtPrice} ETH
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Current supply marker (pulsing dot on the curve) ──── */

function CurrentSupplyDot({
  cx,
  cy,
  stage,
}: {
  cx: number;
  cy: number;
  stage: number;
}) {
  return (
    <motion.g
      initial={{ scale: MARKER.initialScale, opacity: 0 }}
      animate={{
        scale: stage >= 4 ? MARKER.finalScale : MARKER.initialScale,
        opacity: stage >= 4 ? 1 : 0,
      }}
      transition={SPRING.marker}
      style={{ originX: `${cx}px`, originY: `${cy}px` }}
    >
      {/* Pulse ring */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={MARKER.pulseSize}
        fill="none"
        stroke={COLORS.marker}
        strokeWidth={1}
        initial={{ opacity: 0.6, r: MARKER.ringSize }}
        animate={{
          opacity: [0.6, 0],
          r: [MARKER.ringSize, MARKER.pulseSize],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
      {/* Outer ring */}
      <circle
        cx={cx}
        cy={cy}
        r={MARKER.ringSize}
        fill={`${COLORS.marker.replace(")", " / 0.15)")}`}
        stroke={COLORS.marker}
        strokeWidth={1.5}
      />
      {/* Inner dot */}
      <circle
        cx={cx}
        cy={cy}
        r={MARKER.dotSize}
        fill={COLORS.marker}
      />
    </motion.g>
  );
}

/* ── Main component ─────────────────────────────────────── */

interface BondingCurveProps {
  className?: string;
}

export function BondingCurve({ className }: BondingCurveProps) {
  const { contractState } = useTilt();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [stage, setStage] = useState(0);

  const totalSupply = parseInt(
    contractState?.totalSupply || "1736000",
    10,
  );

  useEffect(() => {
    if (!isInView) {
      setStage(0);
      return;
    }

    setStage(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setStage(1), TIMING.axes * 1000));
    timers.push(
      setTimeout(() => setStage(2), TIMING.currentArea * 1000),
    );
    timers.push(
      setTimeout(() => setStage(3), TIMING.futureArea * 1000),
    );
    timers.push(setTimeout(() => setStage(4), TIMING.marker * 1000));

    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  const chartData = useMemo(() => {
    const points = 60;
    const maxSupply = Math.max(totalSupply * 1.3, 2_000_000);
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

  const currentSupplyPrice = useMemo(
    () => (totalSupply * totalSupply) / 1e18,
    [totalSupply],
  );

  const [hoveredSupply, setHoveredSupply] = useState<number | null>(
    null,
  );
  const handleMouseMove = useCallback(
    (state: { activePayload?: Array<{ payload: { supply: number } }> }) => {
      if (state?.activePayload?.[0]) {
        setHoveredSupply(state.activePayload[0].payload.supply);
      }
    },
    [],
  );
  const handleMouseLeave = useCallback(() => {
    setHoveredSupply(null);
  }, []);

  return (
    <Card className="card-tertiary" ref={ref}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-[hsl(var(--primary-muted))]" />
          Bonding Curve
          {hoveredSupply !== null && (
            <motion.span
              className="ml-auto font-mono text-xs text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={SPRING.fade}
            >
              {hoveredSupply >= 1_000_000
                ? `${(hoveredSupply / 1_000_000).toFixed(2)}M`
                : hoveredSupply >= 1_000
                  ? `${(hoveredSupply / 1_000).toFixed(1)}k`
                  : hoveredSupply}{" "}
              tokens
            </motion.span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pr-4">
        <motion.div
          className={`w-full ${className ?? "h-[200px]"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 1 ? 1 : 0 }}
          transition={SPRING.fade}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
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
                    stopColor={COLORS.green}
                    stopOpacity={stage >= 2 ? 0.4 : 0}
                  />
                  <stop
                    offset="95%"
                    stopColor={COLORS.green}
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
                    stopColor={COLORS.green}
                    stopOpacity={stage >= 3 ? 0.15 : 0}
                  />
                  <stop
                    offset="95%"
                    stopColor={COLORS.green}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="supply"
                tick={{ fill: COLORS.axis, fontSize: 11 }}
                tickFormatter={(v) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}k`
                      : v
                }
                axisLine={{ stroke: COLORS.grid }}
                tickLine={{ stroke: COLORS.grid }}
              />
              <YAxis
                tick={{ fill: COLORS.axis, fontSize: 11 }}
                tickFormatter={(v) => v.toExponential(0)}
                axisLine={{ stroke: COLORS.grid }}
                tickLine={{ stroke: COLORS.grid }}
                width={50}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: COLORS.stroke,
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                  strokeOpacity: 0.4,
                }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="currentPrice"
                stroke={COLORS.stroke}
                strokeWidth={2}
                fill="url(#colorPrice)"
                dot={false}
                connectNulls={false}
                isAnimationActive={stage >= 2}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="futurePrice"
                stroke={COLORS.stroke}
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#colorFuture)"
                dot={false}
                connectNulls={false}
                isAnimationActive={stage >= 3}
                animationDuration={600}
                animationEasing="ease-out"
                strokeOpacity={stage >= 3 ? 0.6 : 0}
              />
              {stage >= 4 && (
                <ReferenceDot
                  x={totalSupply}
                  y={currentSupplyPrice}
                  shape={(props) => (
                    <CurrentSupplyDot
                      cx={props.cx ?? 0}
                      cy={props.cy ?? 0}
                      stage={stage}
                    />
                  )}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
}
