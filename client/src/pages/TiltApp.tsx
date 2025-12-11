import { useState } from "react";
import { TiltProvider, useTilt } from "@/context/TiltContext";
import { TiltLogoSimple } from "@/components/TiltLogo";
import { StatsPanel } from "@/components/StatsPanel";
import { WalletPanel } from "@/components/WalletPanel";
import { MintCard } from "@/components/MintCard";
import { BurnCard } from "@/components/BurnCard";
import { SwitchSidesCard } from "@/components/SwitchSidesCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Leaderboard } from "@/components/Leaderboard";
import { BondingCurve } from "@/components/BondingCurve";
import { ChatSection } from "@/components/ChatSection";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, TrendingUp, MessageCircle } from "lucide-react";

type Tab = 'trade' | 'chat';

function TiltAppContent() {
  const { error, clearError, isLoading, isFarcasterReady } = useTilt();
  const [activeTab, setActiveTab] = useState<Tab>('trade');

  if (!isFarcasterReady && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <TiltLogoSimple className="text-4xl text-primary" />
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-20">
            <header className="flex items-center justify-between gap-4 py-2">
              <TiltLogoSimple className="text-2xl text-primary" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
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

            {activeTab === 'trade' ? (
              <>
                <WalletPanel />

                <StatsPanel />

                <Card className="border-primary/10 bg-card/50">
                  <CardContent className="p-4 text-sm text-muted-foreground space-y-2 text-left">
                    <p className="font-medium text-foreground">$TILT is a Base ERC20 whose price is defined by a bonding curve. The curve determines the cost to mint new tokens and the refund for burning tokens.</p>
                    <p>Each token holder can set a preference for Up Only or Down Only.</p>
                    <p>If Up side holds ≥ 50% of supply → 🟩 Minting (buying) is enabled and 🟥 Burning (selling) is disabled</p>
                    <p>If Down side holds ≥ 50% of supply → 🟥 Minting (buying) is disabled and 🟩 Burning (selling) is enabled</p>
                    <p>This creates a social/PvP game where holders fight for control of the price direction using their tokens as both a financial asset and a vote.</p>
                    <p className="text-xs text-muted-foreground/70 mt-2">This contract is experimental and has not been formally audited. Use at your own risk. 1% mint/burn fee.</p>
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
              </>
            ) : (
              <>
                <WalletPanel />
                <ChatSection />
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <div className="max-w-lg mx-auto flex">
          <button
            onClick={() => setActiveTab('trade')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-4 transition-colors ${
              activeTab === 'trade' 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
            data-testid="tab-trade"
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-medium">Trade</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-4 transition-colors ${
              activeTab === 'chat' 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
            data-testid="tab-chat"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-medium">Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TiltApp() {
  return (
    <TiltProvider>
      <TiltAppContent />
    </TiltProvider>
  );
}
