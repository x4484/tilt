import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTilt } from "@/context/TiltContext";
import { formatTokenAmount } from "@/lib/contract";
import { composeCast, triggerHaptic } from "@/lib/farcaster";
import { Side } from "@shared/schema";
import { RefreshCw, User, Bot, Loader2, Share2 } from "lucide-react";

export function SwitchSidesCard() {
  const { userState, isConnected, isLoading, switchSides } = useTilt();
  const [isSwitching, setIsSwitching] = useState(false);

  const currentSide = userState?.side ?? Side.None;
  const balance = userState?.balance || "0";
  const canSwitch = isConnected && !isLoading && !isSwitching && currentSide !== Side.None;

  const handleSwitch = async () => {
    triggerHaptic('rigid');
    setIsSwitching(true);
    try {
      await switchSides();
    } finally {
      setIsSwitching(false);
    }
  };

  const handleShare = async () => {
    const sideText = currentSide === Side.Human ? "Humans" : "Agents";
    const formattedBalance = formatTokenAmount(balance);
    const castText = `I am tilting ${sideText} with ${formattedBalance} $TILT\n\nhttps://tiltgame.fun`;
    await composeCast(castText);
  };

  const targetSide = currentSide === Side.Human ? "Agents" : "Humans";
  const buttonVariant = currentSide === Side.Human ? "destructive" : "default";

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Switch Sides
          </div>
          {isConnected && currentSide !== Side.None && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShare}
              data-testid="button-share-position"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && currentSide !== Side.None ? (
          <>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground">You are tilting</span>
              <Badge
                variant={currentSide === Side.Human ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {currentSide === Side.Human ? (
                  <User className="w-3 h-3" />
                ) : (
                  <Bot className="w-3 h-3" />
                )}
                {currentSide === Side.Human ? "Humans" : "Agents"}
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
