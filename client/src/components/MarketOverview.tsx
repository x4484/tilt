import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTilt } from "@/context/TiltContext";
import { formatTokenAmount, formatEthAmount } from "@/lib/contract";
import { TrendingUp, TrendingDown, Coins, Lock } from "lucide-react";

export function MarketOverview() {
  const { contractState, isLoading } = useTilt();

  if (isLoading && !contractState) {
    return (
      <Card className="border-primary/20 bg-card/80">
        <CardContent className="p-6">
          <div className="h-24 animate-pulse rounded-lg bg-muted/50" />
        </CardContent>
      </Card>
    );
  }

  const totalSupply = contractState?.totalSupply || "0";
  const ups = contractState?.ups || "0";
  const isUpOnly = contractState?.isUpOnly ?? true;
  const tvl = contractState?.tvl || "0";

  const upsNum = parseInt(ups, 10);
  const totalNum = parseInt(totalSupply, 10);
  const upPercentage =
    totalNum > 0
      ? Math.round((upsNum / totalNum) * 100)
      : isUpOnly
        ? 100
        : 0;

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Badge
            variant={isUpOnly ? "default" : "destructive"}
            className="px-4 py-2 text-sm font-bold"
            data-testid="badge-market-state"
          >
            {isUpOnly ? (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                {upPercentage}% UP ONLY
              </>
            ) : (
              <>
                <TrendingDown className="mr-2 h-4 w-4" />
                {100 - upPercentage}% DOWN ONLY
              </>
            )}
          </Badge>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                TVL
              </div>
              <div
                className="font-mono text-lg font-bold text-primary"
                data-testid="text-tvl"
              >
                {formatEthAmount(tvl)} ETH
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Coins className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Supply
                </span>
              </div>
              <div
                className="font-mono text-lg font-bold"
                data-testid="text-total-supply"
              >
                {formatTokenAmount(totalSupply)}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Price
                </span>
              </div>
              <div
                className="font-mono text-lg font-bold"
                data-testid="text-current-price"
              >
                {formatEthAmount(contractState?.currentPrice || "0")}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-500"
              style={{ width: `${upPercentage}%` }}
              data-testid="progress-up-percentage"
            />
            <div
              className="absolute right-0 top-0 h-full bg-destructive transition-all duration-500"
              style={{ width: `${100 - upPercentage}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>UP: {formatTokenAmount(ups)}</span>
            <span>
              DOWN: {formatTokenAmount((totalNum - upsNum).toString())}
            </span>
          </div>
        </div>

        <div className="text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">
            $TILT is a Base ERC20 whose price is defined by a bonding
            curve. Each holder sets a preference for Up Only or Down Only.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Up &ge; 50% &rarr; minting enabled, burning disabled. Down
            &ge; 50% &rarr; burning enabled, minting disabled. 1%
            mint/burn fee.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
