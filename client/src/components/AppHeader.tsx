import { ConnectKitButton } from "connectkit";
import { Badge } from "@/components/ui/badge";
import { TiltLogoSimple } from "@/components/TiltLogo";
import { useTilt } from "@/context/TiltContext";
import { formatEthAmount } from "@/lib/contract";
import { TrendingUp, TrendingDown } from "lucide-react";

export function AppHeader() {
  const { contractState, isInFrame } = useTilt();

  const isUpOnly = contractState?.isUpOnly ?? true;
  const tvl = contractState?.tvl || "0";

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
        <TiltLogoSimple className="text-xl text-primary" />

        <div className="hidden items-center gap-4 md:flex">
          <Badge
            variant={isUpOnly ? "default" : "destructive"}
            className={`px-3 py-1 text-xs font-bold ${isUpOnly ? "animate-glow-pulse" : "animate-glow-pulse-red"}`}
          >
            {isUpOnly ? (
              <>
                <TrendingUp className="mr-1 h-3 w-3" />
                UP ONLY
              </>
            ) : (
              <>
                <TrendingDown className="mr-1 h-3 w-3" />
                DOWN ONLY
              </>
            )}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>TVL</span>
            <span className="font-mono font-bold text-foreground">
              {formatEthAmount(tvl)} ETH
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Base
          </div>
        </div>

        {!isInFrame && <ConnectKitButton />}
      </div>
    </header>
  );
}
