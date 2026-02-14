import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTilt } from "@/context/TiltContext";
import { truncateAddress, formatTokenAmount } from "@/lib/contract";
import { composeCast, triggerHaptic } from "@/lib/farcaster";
import { Side } from "@shared/schema";
import {
  Wallet,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Share2,
} from "lucide-react";

export function PositionCard() {
  const { isConnected, isLoading, userState, connect, switchSides, isInFrame } =
    useTilt();
  const [copied, setCopied] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const currentSide = userState?.side ?? Side.None;
  const balance = userState?.balance || "0";
  const canSwitch =
    isConnected && !isLoading && !isSwitching && currentSide !== Side.None;

  const copyAddress = async () => {
    if (userState?.address) {
      await navigator.clipboard.writeText(userState.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwitch = async () => {
    triggerHaptic("rigid");
    setIsSwitching(true);
    try {
      await switchSides();
    } finally {
      setIsSwitching(false);
    }
  };

  const handleShare = async () => {
    const sideText = currentSide === Side.Up ? "Up" : "Down";
    const formattedBalance = formatTokenAmount(balance);
    const castText = `I am tilting ${sideText} with ${formattedBalance} $TILT\n\nhttps://tiltgame.fun`;
    await composeCast(castText);
  };

  if (!isConnected) {
    return (
      <Card className="border-primary/30 bg-card/80">
        <CardContent className="p-6 text-center">
          <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="mb-4 text-sm text-muted-foreground">
            Connect your wallet to view your position
          </p>
          <Button onClick={connect} disabled={isLoading} className="w-full">
            <Wallet className="mr-2 h-4 w-4" />
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sideLabel =
    currentSide === Side.Up
      ? "UP"
      : currentSide === Side.Down
        ? "DOWN"
        : "NONE";
  const sideVariant =
    currentSide === Side.Up
      ? "default"
      : currentSide === Side.Down
        ? "destructive"
        : "secondary";
  const targetSide = currentSide === Side.Up ? "Down" : "Up";
  const switchVariant =
    currentSide === Side.Up ? "destructive" : "default";

  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Your Position</span>
          {isInFrame && currentSide !== Side.None && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShare}
              className="h-7 w-7"
              data-testid="button-share-position"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-sm"
                  data-testid="text-wallet-address"
                >
                  {truncateAddress(userState?.address || "")}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={copyAddress}
                  className="h-6 w-6"
                  data-testid="button-copy-address"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">Connected</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Balance</div>
              <div
                className="font-mono font-bold"
                data-testid="text-user-balance"
              >
                {formatTokenAmount(balance)} TILT
              </div>
            </div>
            <Badge
              variant={sideVariant}
              className="flex items-center gap-1"
              data-testid="badge-user-side"
            >
              {currentSide === Side.Up ? (
                <TrendingUp className="h-3 w-3" />
              ) : currentSide === Side.Down ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              {sideLabel}
            </Badge>
          </div>
        </div>

        {currentSide !== Side.None && (
          <Button
            onClick={handleSwitch}
            disabled={!canSwitch}
            variant={switchVariant}
            className="w-full"
            data-testid="button-switch-sides"
          >
            {isSwitching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Switch to {targetSide}
              </>
            )}
          </Button>
        )}

        {currentSide === Side.None && (
          <p className="text-center text-sm text-muted-foreground">
            Mint tokens first to choose a side
          </p>
        )}
      </CardContent>
    </Card>
  );
}
