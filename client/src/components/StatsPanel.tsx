import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTilt } from "@/context/TiltContext";
import { formatTokenAmount, formatEthAmount } from "@/lib/contract";
import { TrendingUp, TrendingDown, Coins, Lock } from "lucide-react";

export function StatsPanel() {
  const { contractState, isLoading } = useTilt();

  if (isLoading && !contractState) {
    return (
      <div className="space-y-3">
        <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const totalSupply = contractState?.totalSupply || "0";
  const ups = contractState?.ups || "0";
  const isUpOnly = contractState?.isUpOnly ?? true;
  const tvl = contractState?.tvl || "0";

  const upsNum = parseInt(ups, 10);
  const totalNum = parseInt(totalSupply, 10);
  // When totalSupply is 0, use isUpOnly to determine percentage (100% if up, 0% if down)
  const upPercentage = totalNum > 0 ? Math.round((upsNum / totalNum) * 100) : (isUpOnly ? 100 : 0);

  return (
    <div className="space-y-3">
      <Card className="border-primary/30 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <Badge 
              variant={isUpOnly ? "default" : "destructive"}
              className="px-4 py-2 text-sm font-bold"
              data-testid="badge-market-state"
            >
              {isUpOnly ? (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {upPercentage}% UP ONLY
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 mr-2" />
                  {100 - upPercentage}% DOWN ONLY
                </>
              )}
            </Badge>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">TVL</div>
              <div className="text-lg font-bold font-mono text-primary" data-testid="text-tvl">
                {formatEthAmount(tvl)} ETH
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-primary/20 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Supply</span>
            </div>
            <div className="text-xl font-bold font-mono" data-testid="text-total-supply">
              {formatTokenAmount(totalSupply)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Current Price</span>
            </div>
            <div className="text-xl font-bold font-mono" data-testid="text-current-price">
              {formatEthAmount(contractState?.currentPrice || "0")}
            </div>
            <div className="text-xs text-muted-foreground">ETH per token</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
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
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>UP: {formatTokenAmount(ups)}</span>
        <span>DOWN: {formatTokenAmount((totalNum - upsNum).toString())}</span>
      </div>
    </div>
  );
}
