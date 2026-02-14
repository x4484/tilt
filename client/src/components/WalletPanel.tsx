import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTilt } from "@/context/TiltContext";
import { truncateAddress, formatTokenAmount } from "@/lib/contract";
import { Side } from "@shared/schema";
import { Wallet, Copy, Check, User, Bot, AlertCircle, X } from "lucide-react";
import { useState } from "react";

export function WalletPanel() {
  const { isConnected, isLoading, userState, connect, error, clearError } = useTilt();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (userState?.address) {
      await navigator.clipboard.writeText(userState.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-primary/30 bg-card/80">
        <CardContent className="p-4 space-y-3">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span className="flex-1 text-destructive">{error}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={clearError}
                className="h-5 w-5 shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          <Button
            onClick={connect}
            disabled={isLoading}
            className="w-full"
            data-testid="button-connect-wallet"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sideLabel = userState?.side === Side.Human ? "HUMAN" : userState?.side === Side.Agent ? "AGENT" : "NONE";
  const sideVariant = userState?.side === Side.Human ? "default" : userState?.side === Side.Agent ? "destructive" : "secondary";

  return (
    <Card className="border-primary/30 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm" data-testid="text-wallet-address">
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
                    <Check className="w-3 h-3 text-primary" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">Connected</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Your Balance</div>
              <div className="font-mono font-bold" data-testid="text-user-balance">
                {formatTokenAmount(userState?.balance || "0")} TILT
              </div>
            </div>

            <Badge variant={sideVariant} className="flex items-center gap-1" data-testid="badge-user-side">
              {userState?.side === Side.Human ? (
                <User className="w-3 h-3" />
              ) : userState?.side === Side.Agent ? (
                <Bot className="w-3 h-3" />
              ) : null}
              {sideLabel}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
