import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTilt } from "@/context/TiltContext";
import { formatEthAmount } from "@/lib/contract";
import { triggerHaptic } from "@/lib/farcaster";
import { Plus, Flame, Lock, Loader2 } from "lucide-react";

function MintForm() {
  const { contractState, isConnected, isLoading, getMintFees, mint } =
    useTilt();
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
    triggerHaptic("light");
    setIsMinting(true);
    try {
      await mint(amount, fees);
      setAmount("1");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-4">
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
            for{" "}
            <span className="font-mono text-foreground">
              {formatEthAmount(fees)}
            </span>{" "}
            ETH
          </div>
        )}
      </div>

      {!isUpOnly && (
        <div className="flex items-center justify-center gap-2 py-3 text-destructive">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium">MINTING LOCKED!</span>
        </div>
      )}

      <Button
        onClick={handleMint}
        disabled={!canMint || !fees}
        className="w-full"
        data-testid="button-mint"
      >
        {isMinting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
    </div>
  );
}

function BurnForm() {
  const {
    contractState,
    userState,
    isConnected,
    isLoading,
    getBurnRefunds,
    burn,
  } = useTilt();
  const [amount, setAmount] = useState("1");
  const [refund, setRefund] = useState<string | null>(null);
  const [isBurning, setIsBurning] = useState(false);

  const isUpOnly = contractState?.isUpOnly ?? true;
  const userBalance = parseInt(userState?.balance || "0", 10);
  const amountNum = parseInt(amount, 10) || 0;
  const canBurn =
    !isUpOnly &&
    isConnected &&
    !isLoading &&
    !isBurning &&
    amountNum > 0 &&
    amountNum <= userBalance;

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
    triggerHaptic("medium");
    setIsBurning(true);
    try {
      await burn(amount);
      setAmount("1");
    } finally {
      setIsBurning(false);
    }
  };

  return (
    <div className="space-y-4">
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
            refund:{" "}
            <span className="font-mono text-foreground">
              {formatEthAmount(refund)}
            </span>{" "}
            ETH
          </div>
        )}
      </div>

      {isUpOnly && (
        <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium">BURNING LOCKED!</span>
        </div>
      )}

      <Button
        onClick={handleBurn}
        disabled={!canBurn}
        variant="destructive"
        className="w-full"
        data-testid="button-burn"
      >
        {isBurning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
    </div>
  );
}

export function ActionPanel() {
  return (
    <Card className="border-primary/20 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Trade</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="mint" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent p-0">
            <TabsTrigger
              value="mint"
              className="flex-1 gap-2 rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Plus className="h-4 w-4 text-primary" />
              Mint
            </TabsTrigger>
            <TabsTrigger
              value="burn"
              className="flex-1 gap-2 rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-destructive data-[state=active]:bg-transparent"
            >
              <Flame className="h-4 w-4 text-destructive" />
              Burn
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mint" className="m-0 p-4">
            <MintForm />
          </TabsContent>
          <TabsContent value="burn" className="m-0 p-4">
            <BurnForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
