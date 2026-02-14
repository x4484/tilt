import { TiltProvider, useTilt } from "@/context/TiltContext";
import { TiltLogoSimple } from "@/components/TiltLogo";
import { FarcasterLayout } from "@/components/FarcasterLayout";
import { AppHeader } from "@/components/AppHeader";
import { MarketOverview } from "@/components/MarketOverview";
import { ActionPanel } from "@/components/ActionPanel";
import { PositionCard } from "@/components/PositionCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Leaderboard } from "@/components/Leaderboard";
import { BondingCurve } from "@/components/BondingCurve";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

function DesktopLayout() {
  const { error, clearError } = useTilt();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        {error && (
          <Alert variant="destructive" className="relative mb-6">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left column: 3/5 */}
          <div className="space-y-6 lg:col-span-3">
            <MarketOverview />
            <BondingCurve className="h-[300px]" />
            <ActivityFeed className="h-[350px]" />
          </div>

          {/* Right column: 2/5 */}
          <div className="space-y-6 lg:col-span-2">
            <PositionCard />
            <ActionPanel />
            <Leaderboard className="h-[350px]" />
          </div>
        </div>
      </main>
    </div>
  );
}

function TiltAppContent() {
  const { isLoading, isFarcasterReady, isInFrame } = useTilt();

  if (!isFarcasterReady && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <TiltLogoSimple className="text-4xl text-primary" />
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (isInFrame) {
    return <FarcasterLayout />;
  }

  return <DesktopLayout />;
}

export default function TiltApp() {
  return (
    <TiltProvider>
      <TiltAppContent />
    </TiltProvider>
  );
}
