import { Card, CardContent } from "@/components/ui/card";
import { useTilt } from "@/context/TiltContext";
import { formatTokenAmount, formatEthAmount } from "@/lib/contract";
import { User, Bot } from "lucide-react";

export function MarketOverview() {
  const { contractState, isLoading } = useTilt();

  if (isLoading && !contractState) {
    return (
      <Card className="card-primary">
        <CardContent className="p-6">
          <div className="h-32 animate-pulse rounded-lg bg-muted/50" />
        </CardContent>
      </Card>
    );
  }

  const totalSupply = contractState?.totalSupply || "0";
  const ups = contractState?.ups || "0";
  const isUpOnly = contractState?.isUpOnly ?? true;
  const tvl = contractState?.tvl || "0";
  const currentPrice = contractState?.currentPrice || "0";

  const upsNum = parseInt(ups, 10);
  const totalNum = parseInt(totalSupply, 10);
  const downsNum = totalNum - upsNum;
  const upPct =
    totalNum > 0
      ? Math.round((upsNum / totalNum) * 100)
      : isUpOnly
        ? 100
        : 0;
  const downPct = 100 - upPct;

  return (
    <Card className="card-primary">
      <CardContent className="space-y-6 p-6">
        {/* Headline stats row */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-[hsl(var(--primary-muted))]">
              Total Value Locked
            </div>
            <div className="font-mono text-3xl font-bold tabular-nums text-primary lg:text-4xl">
              {formatEthAmount(tvl)}
              <span className="ml-1 text-lg text-[hsl(var(--primary-muted))]">
                ETH
              </span>
            </div>
          </div>

          <div className="flex items-end gap-8">
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Supply
              </div>
              <div className="font-mono text-xl font-bold tabular-nums">
                {formatTokenAmount(totalSupply)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Price
              </div>
              <div className="font-mono text-xl font-bold tabular-nums">
                {formatEthAmount(currentPrice)}
              </div>
            </div>
          </div>
        </div>

        {/* The main event: up/down bar */}
        <div>
          <div className="relative h-7 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute left-0 top-0 flex h-full items-center justify-center transition-all duration-700 ease-out"
              style={{
                width: `${Math.max(upPct, 8)}%`,
                background:
                  "linear-gradient(90deg, hsl(120 100% 50% / 0.7), hsl(120 100% 50% / 0.9))",
              }}
            >
              {upPct >= 15 && (
                <span className="flex items-center gap-1 text-xs font-bold text-black">
                  <User className="h-3 w-3" />
                  {upPct}%
                </span>
              )}
            </div>
            <div
              className="absolute right-0 top-0 flex h-full items-center justify-center transition-all duration-700 ease-out"
              style={{
                width: `${Math.max(downPct, 8)}%`,
                background:
                  "linear-gradient(90deg, hsl(0 84% 45% / 0.7), hsl(0 84% 45% / 0.9))",
              }}
            >
              {downPct >= 15 && (
                <span className="flex items-center gap-1 text-xs font-bold text-white">
                  <Bot className="h-3 w-3" />
                  {downPct}%
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>
              HUMANS: {formatTokenAmount(ups)} ({upPct}%)
            </span>
            <span>
              AGENTS: {formatTokenAmount(downsNum.toString())} ({downPct}%)
            </span>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Mint $TILT on a bonding curve and pick a side — Humans or Agents.
          When Humans hold the majority, minting is enabled and burning is
          locked. When Agents take over, burning unlocks and minting is
          locked. Switch sides to shift control and change what&apos;s possible.
        </p>
      </CardContent>
    </Card>
  );
}
