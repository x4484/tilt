import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTilt } from "@/context/TiltContext";
import { formatTokenAmount } from "@/lib/contract";
import { useFarcasterUsers, formatDisplayName } from "@/hooks/useFarcasterUsers";
import { Side } from "@shared/schema";
import type { LeaderboardEntry } from "@shared/schema";
import { Trophy, User, Bot } from "lucide-react";

function LeaderboardItem({ 
  entry, 
  side,
  users 
}: { 
  entry: LeaderboardEntry; 
  side: Side;
  users: Record<string, { username: string; pfpUrl?: string }> | undefined;
}) {
  const displayName = formatDisplayName(entry.address, users);
  const isUsername = displayName.startsWith('@');
  const userAddress = entry.address.toLowerCase();
  const user = users?.[userAddress];
  const pfpUrl = user?.pfpUrl;
  
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <Avatar className={`w-6 h-6 ring-2 ${side === Side.Human ? "ring-primary" : "ring-destructive"}`}>
        {pfpUrl && <AvatarImage src={pfpUrl} alt={displayName} />}
        <AvatarFallback className="bg-muted text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className={`text-sm flex-1 ${isUsername ? 'text-primary' : 'font-mono'}`}>
        {displayName}
      </span>
      <span className="font-mono text-sm font-bold">
        {formatTokenAmount(entry.balance)}
      </span>
    </div>
  );
}

interface LeaderboardProps {
  className?: string;
}

export function Leaderboard({ className }: LeaderboardProps) {
  const { humanLeaderboard, agentLeaderboard, contractState, isLoading } = useTilt();

  // Collect all addresses to resolve
  const allAddresses = [...humanLeaderboard, ...agentLeaderboard].map(e => e.address);
  const { data: users } = useFarcasterUsers(allAddresses);

  const totalSupply = parseInt(contractState?.totalSupply || "0", 10);
  const ups = parseInt(contractState?.ups || "0", 10);
  const downs = totalSupply - ups;

  const upPercentage = totalSupply > 0 ? Math.round((ups / totalSupply) * 100) : 0;
  const downPercentage = totalSupply > 0 ? Math.round((downs / totalSupply) * 100) : 0;

  const humanStats = {
    percentage: upPercentage,
    total: formatTokenAmount(ups.toString()),
    players: humanLeaderboard.length,
  };

  const agentStats = {
    percentage: downPercentage,
    total: formatTokenAmount(downs.toString()),
    players: agentLeaderboard.length,
  };

  return (
    <Card className="card-tertiary">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          <Trophy className="w-4 h-4 text-[hsl(var(--primary-muted))]" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="humans" className="w-full">
          <TabsList className="mx-4 mt-2 grid w-auto grid-cols-2 bg-muted/50">
            <TabsTrigger
              value="humans"
              className="gap-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              data-testid="tab-humans"
            >
              <User className="h-3 w-3" />
              Humans
            </TabsTrigger>
            <TabsTrigger
              value="agents"
              className="gap-1.5 text-xs data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive"
              data-testid="tab-agents"
            >
              <Bot className="h-3 w-3" />
              Agents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="humans" className="m-0">
            <div className="px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
              {humanStats.percentage}% : {humanStats.total} TILT : {humanStats.players} players
            </div>
            <ScrollArea className={`px-4 ${className ?? "h-[250px]"}`}>
              {isLoading && humanLeaderboard.length === 0 ? (
                <div className="space-y-2 py-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : humanLeaderboard.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
                  No humans yet
                </div>
              ) : (
                <div className="py-2">
                  {humanLeaderboard.map((entry) => (
                    <LeaderboardItem key={entry.rank} entry={entry} side={Side.Human} users={users} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="agents" className="m-0">
            <div className="px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
              {agentStats.percentage}% : {agentStats.total} TILT : {agentStats.players} players
            </div>
            <ScrollArea className={`px-4 ${className ?? "h-[250px]"}`}>
              {isLoading && agentLeaderboard.length === 0 ? (
                <div className="space-y-2 py-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : agentLeaderboard.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
                  No agents yet
                </div>
              ) : (
                <div className="py-2">
                  {agentLeaderboard.map((entry) => (
                    <LeaderboardItem key={entry.rank} entry={entry} side={Side.Agent} users={users} />
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
