import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTilt } from "@/context/TiltContext";
import { formatTokenAmount } from "@/lib/contract";
import { useFarcasterUsers, formatDisplayName } from "@/hooks/useFarcasterUsers";
import type { ActivityEvent } from "@shared/schema";
import { Side } from "@shared/schema";
import { Activity } from "lucide-react";

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return "NOW";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}M`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}H`;
  return `${Math.floor(seconds / 86400)}D`;
}

function ActivityItem({ 
  event, 
  users 
}: { 
  event: ActivityEvent;
  users: Record<string, { username: string; pfpUrl?: string }> | undefined;
}) {
  const displayName = formatDisplayName(event.address, users);
  const isUsername = displayName.startsWith('@');
  const userAddress = event.address.toLowerCase();
  const user = users?.[userAddress];
  const pfpUrl = user?.pfpUrl;

  const getActionText = () => {
    switch (event.type) {
      case "mint":
        return "minted";
      case "burn":
        return "burned";
      case "switch":
        return `tilted ${formatTokenAmount(event.amount)} ${event.newSide === Side.Down ? "Down" : "Up"}`;
      default:
        return "";
    }
  };

  const getAvatarBorderColor = () => {
    switch (event.type) {
      case "mint":
        return "ring-primary";
      case "burn":
        return "ring-destructive";
      case "switch":
        return event.newSide === Side.Down ? "ring-destructive" : "ring-primary";
      default:
        return "ring-primary";
    }
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <Avatar className={`w-6 h-6 ring-2 ${getAvatarBorderColor()}`}>
        {pfpUrl && <AvatarImage src={pfpUrl} alt={displayName} />}
        <AvatarFallback className="bg-muted text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${isUsername ? 'text-primary' : 'font-mono'}`}>{displayName}</span>
        <span className="text-muted-foreground text-sm ml-2">
          {getActionText()}
          {event.type !== "switch" && ` ${formatTokenAmount(event.amount)}`}
        </span>
      </div>
      <span className="text-xs text-muted-foreground font-mono">
        {formatTimeAgo(event.timestamp)}
      </span>
    </div>
  );
}

interface ActivityFeedProps {
  className?: string;
}

export function ActivityFeed({ className }: ActivityFeedProps) {
  const { activities, isLoading } = useTilt();
  
  // Collect all addresses to resolve
  const allAddresses = activities.map(e => e.address);
  const { data: users } = useFarcasterUsers(allAddresses);

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-4 h-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={`px-4 ${className ?? "h-[200px]"}`}>
          {isLoading && activities.length === 0 ? (
            <div className="space-y-2 py-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No recent activity
            </div>
          ) : (
            <div className="py-2">
              {activities.map((event) => (
                <ActivityItem key={event.id} event={event} users={users} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
