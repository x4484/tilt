import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTilt } from "@/context/TiltContext";
import { formatEthAmount } from "@/lib/contract";
import { triggerHaptic } from "@/lib/farcaster";
import { Flame, Lock, Loader2 } from "lucide-react";

export function BurnCard() {
  const { contractState, userState, isConnected, isLoading, getBurnRefunds, burn } = useTilt();
  const [amount, setAmount] = useState("1");
  const [refund, setRefund] = useState<string | null>(null);
  const [isBurning, setIsBurning] = useState(false);

  const isUpOnly = contractState?.isUpOnly ?? true;
  const userBalance = parseInt(userState?.balance || "0", 10);
  const amountNum = parseInt(amount, 10) || 0;
  const canBurn = !isUpOnly && isConnected && !isLoading && !isBurning && amountNum > 0 && amountNum <= userBalance;

  useEffect(() => {
    const fetchRefunds = async () => {
      if (!amount || parseInt(amount, 10) <= 0) {
        setRefund(null);
        return;
      }

      const result = await getBurnRefunds(amount);
      if (result) {
        setRefund(result.refund);
      }
    };

    const debounce = setTimeout(fetchRefunds, 300);
    return () => clearTimeout(debounce);
  }, [amount, getBurnRefunds]);

  const handleBurn = async () => {
    if (!amount) return;

    triggerHaptic('medium');
    setIsBurning(true);
    try {
      await burn(amount);
      setAmount("1");
    } finally {
      setIsBurning(false);
    }
  };

  return (
    <Card className="border-destructive/30 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="w-5 h-5 text-destructive" />
          Burn $TILT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="number"
            min="1"
            max={userBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount to burn"
            className="font-mono text-center text-lg"
            disabled={isUpOnly || isBurning}
            data-testid="input-burn-amount"
          />
          {refund && (
            <div className="text-center text-sm text-muted-foreground">
              refund: <span className="font-mono text-foreground">{formatEthAmount(refund)}</span> ETH
            </div>
          )}
        </div>

        {isUpOnly ? (
          <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">BURNING LOCKED!</span>
          </div>
        ) : null}

        <Button
          onClick={handleBurn}
          disabled={!canBurn}
          variant="destructive"
          className="w-full"
          data-testid="button-burn"
        >
          {isBurning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Burning...
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : isUpOnly ? (
            "Burning Disabled"
          ) : amountNum > userBalance ? (
            "Insufficient Balance"
          ) : (
            "Burn"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
