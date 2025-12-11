import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTilt } from "@/context/TiltContext";
import { formatTokenAmount } from "@/lib/contract";
import { Side } from "@shared/schema";
import type { LeaderboardEntry } from "@shared/schema";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";

function LeaderboardItem({ entry, side }: { entry: LeaderboardEntry; side: Side }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <div 
        className={`w-3 h-3 rounded-sm ${side === Side.Up ? "bg-primary" : "bg-destructive"}`}
      />
      <span className="font-mono text-sm flex-1 truncate">{entry.address}</span>
      <span className="font-mono text-sm font-bold">
        {formatTokenAmount(entry.balance)}
      </span>
    </div>
  );
}

export function Leaderboard() {
  const { upLeaderboard, downLeaderboard, contractState, isLoading } = useTilt();

  const totalSupply = parseInt(contractState?.totalSupply || "0", 10);
  const ups = parseInt(contractState?.ups || "0", 10);
  const downs = totalSupply - ups;

  const upPercentage = totalSupply > 0 ? Math.round((ups / totalSupply) * 100) : 0;
  const downPercentage = totalSupply > 0 ? Math.round((downs / totalSupply) * 100) : 0;

  const upStats = {
    percentage: upPercentage,
    total: formatTokenAmount(ups.toString()),
    players: upLeaderboard.length,
  };

  const downStats = {
    percentage: downPercentage,
    total: formatTokenAmount(downs.toString()),
    players: downLeaderboard.length,
  };

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-4 h-4 text-primary" />
          Top Tilters
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="up" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent h-auto p-0">
            <TabsTrigger 
              value="up" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
              data-testid="tab-up-tilters"
            >
              <TrendingUp className="w-4 h-4 mr-2 text-primary" />
              Up Tilters
            </TabsTrigger>
            <TabsTrigger 
              value="down" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-destructive data-[state=active]:bg-transparent py-3"
              data-testid="tab-down-tilters"
            >
              <TrendingDown className="w-4 h-4 mr-2 text-destructive" />
              Down Tilters
            </TabsTrigger>
          </TabsList>

          <TabsContent value="up" className="m-0">
            <div className="px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
              {upStats.percentage}% : {upStats.total} TILT : {upStats.players} players
            </div>
            <ScrollArea className="h-[250px] px-4">
              {isLoading && upLeaderboard.length === 0 ? (
                <div className="space-y-2 py-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : upLeaderboard.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
                  No up tilters yet
                </div>
              ) : (
                <div className="py-2">
                  {upLeaderboard.map((entry) => (
                    <LeaderboardItem key={entry.rank} entry={entry} side={Side.Up} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="down" className="m-0">
            <div className="px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
              {downStats.percentage}% : {downStats.total} TILT : {downStats.players} players
            </div>
            <ScrollArea className="h-[250px] px-4">
              {isLoading && downLeaderboard.length === 0 ? (
                <div className="space-y-2 py-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : downLeaderboard.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
                  No down tilters yet
                </div>
              ) : (
                <div className="py-2">
                  {downLeaderboard.map((entry) => (
                    <LeaderboardItem key={entry.rank} entry={entry} side={Side.Down} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
