import { StatsPanel } from "@/components/StatsPanel";
import { WalletPanel } from "@/components/WalletPanel";
import { MintCard } from "@/components/MintCard";
import { BurnCard } from "@/components/BurnCard";
import { SwitchSidesCard } from "@/components/SwitchSidesCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Leaderboard } from "@/components/Leaderboard";
import { BondingCurve } from "@/components/BondingCurve";
import { TiltLogoSimple } from "@/components/TiltLogo";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { useTilt } from "@/context/TiltContext";

export function FarcasterLayout() {
  const { error, clearError } = useTilt();

  return (
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-20">
          <header className="flex items-center justify-between gap-4 py-2">
            <TiltLogoSimple className="text-2xl text-primary" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Base Mainnet
            </div>
          </header>

          {error && (
            <Alert variant="destructive" className="relative">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="pr-8">{error}</AlertDescription>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2 h-6 w-6"
                onClick={clearError}
                data-testid="button-clear-error"
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          <WalletPanel />
          <StatsPanel />

          <Card className="border-primary/10 bg-card/50">
            <CardContent className="space-y-2 p-4 text-left text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                $TILT is a Base ERC20 whose price is defined by a bonding
                curve. The curve determines the cost to mint new tokens and
                the refund for burning tokens.
              </p>
              <p>
                Each token holder can set a preference for Humans Only or Agents
                Only.
              </p>
              <p>
                If Humans side holds &ge; 50% of supply &rarr; Minting (buying)
                is enabled and Burning (selling) is disabled
              </p>
              <p>
                If Agents side holds &ge; 50% of supply &rarr; Minting
                (buying) is disabled and Burning (selling) is enabled
              </p>
              <p>
                This creates a social/PvP game where holders fight for
                control of the price direction using their tokens as both a
                financial asset and a vote.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                This contract is experimental and has not been formally
                audited. Use at your own risk. 1% mint/burn fee.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <MintCard />
            <BurnCard />
          </div>

          <SwitchSidesCard />
          <BondingCurve />
          <ActivityFeed />
          <Leaderboard />
        </div>
      </ScrollArea>
    </div>
  );
}
