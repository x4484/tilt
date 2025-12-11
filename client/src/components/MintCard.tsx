import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTilt } from "@/context/TiltContext";
import { formatEthAmount } from "@/lib/contract";
import { Plus, Lock, Loader2 } from "lucide-react";

export function MintCard() {
  const { contractState, isConnected, isLoading, getMintFees, mint } = useTilt();
  const [amount, setAmount] = useState("1");
  const [fees, setFees] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  const isUpOnly = contractState?.isUpOnly ?? true;
  const canMint = isUpOnly && isConnected && !isLoading && !isMinting;

  useEffect(() => {
    const fetchFees = async () => {
      if (!amount || parseInt(amount, 10) <= 0) {
        setFees(null);
        return;
      }

      const result = await getMintFees(amount);
      if (result) {
        setFees(result.fees);
      }
    };

    const debounce = setTimeout(fetchFees, 300);
    return () => clearTimeout(debounce);
  }, [amount, getMintFees]);

  const handleMint = async () => {
    if (!fees || !amount) return;

    setIsMinting(true);
    try {
      await mint(amount, fees);
      setAmount("1");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="w-5 h-5 text-primary" />
          Mint $TILT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount to mint"
            className="font-mono text-center text-lg"
            disabled={!isUpOnly || isMinting}
            data-testid="input-mint-amount"
          />
          {fees && (
            <div className="text-center text-sm text-muted-foreground">
              for <span className="font-mono text-foreground">{formatEthAmount(fees)}</span> ETH
            </div>
          )}
        </div>

        {!isUpOnly ? (
          <div className="flex items-center justify-center gap-2 py-3 text-destructive">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">MINTING LOCKED!</span>
          </div>
        ) : null}

        <Button
          onClick={handleMint}
          disabled={!canMint || !fees}
          className="w-full"
          data-testid="button-mint"
        >
          {isMinting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Minting...
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : !isUpOnly ? (
            "Minting Disabled"
          ) : (
            "Mint"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
