import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTilt } from "@/context/TiltContext";
import { formatTokenAmount } from "@/lib/contract";
import { Side } from "@shared/schema";
import { RefreshCw, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

export function SwitchSidesCard() {
  const { userState, isConnected, isLoading, switchSides } = useTilt();
  const [isSwitching, setIsSwitching] = useState(false);

  const currentSide = userState?.side ?? Side.None;
  const balance = userState?.balance || "0";
  const canSwitch = isConnected && !isLoading && !isSwitching && currentSide !== Side.None;

  const handleSwitch = async () => {
    setIsSwitching(true);
    try {
      await switchSides();
    } finally {
      setIsSwitching(false);
    }
  };

  const targetSide = currentSide === Side.Up ? "Down" : "Up";
  const buttonVariant = currentSide === Side.Up ? "destructive" : "default";

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="w-5 h-5" />
          Switch Sides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && currentSide !== Side.None ? (
          <>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground">You are tilting</span>
              <Badge 
                variant={currentSide === Side.Up ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {currentSide === Side.Up ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {currentSide === Side.Up ? "Up" : "Down"}
              </Badge>
              <span className="text-sm text-muted-foreground">with</span>
              <span className="font-mono font-bold">{formatTokenAmount(balance)} $TILT</span>
            </div>

            <Button
              onClick={handleSwitch}
              disabled={!canSwitch}
              variant={buttonVariant}
              className="w-full"
              data-testid="button-switch-sides"
            >
              {isSwitching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  Switch to {targetSide}
                </>
              )}
            </Button>
          </>
        ) : !isConnected ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            Connect wallet to switch sides
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            Mint tokens first to choose a side
          </div>
        )}
      </CardContent>
    </Card>
  );
}
