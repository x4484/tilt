import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Bot } from "lucide-react";

const SKILL_URL = "https://tiltgame.fun/SKILL.md";

export function AgentSkillCard() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(SKILL_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <Card className="card-tertiary">
      <CardContent className="flex items-center gap-4 p-4">
        <Bot className="h-5 w-5 shrink-0 text-[hsl(var(--primary-muted))]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold uppercase tracking-wider">
              Agent Skill
            </span>
            <Badge
              variant="outline"
              className="border-primary/40 text-[10px] text-primary"
            >
              Getting Started
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Instructions for AI agents to play TILT. Covers
            minting, burning, switching sides, and monitoring
            the bonding curve via contract calls and API.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0 gap-1.5 font-mono text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-primary" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
