import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTilt } from "@/context/TiltContext";
import { useFarcasterUsers, formatDisplayName } from "@/hooks/useFarcasterUsers";
import type { ChatMessage } from "@shared/schema";
import { MessageCircle, Send } from "lucide-react";

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return "NOW";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function ChatMessageItem({ 
  message, 
  users,
  isOwnMessage
}: { 
  message: ChatMessage;
  users: Record<string, { username: string; pfpUrl?: string }> | undefined;
  isOwnMessage: boolean;
}) {
  const displayName = message.username 
    ? `@${message.username}` 
    : formatDisplayName(message.address, users);
  const isUsername = displayName.startsWith('@');
  const pfpUrl = message.pfpUrl || users?.[message.address.toLowerCase()]?.pfpUrl;

  return (
    <div className={`flex gap-2 py-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Avatar className="w-6 h-6 ring-1 ring-border shrink-0">
        {pfpUrl && <AvatarImage src={pfpUrl} alt={displayName} />}
        <AvatarFallback className="bg-muted text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isUsername ? 'text-primary' : 'font-mono text-muted-foreground'}`}>
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {formatTimeAgo(message.timestamp)}
          </span>
        </div>
        <div className={`mt-1 px-3 py-2 rounded-md text-sm ${
          isOwnMessage 
            ? 'bg-primary/20 text-foreground' 
            : 'bg-muted/50 text-foreground'
        }`}>
          {message.message}
        </div>
      </div>
    </div>
  );
}

export function ChatSection() {
  const { chatMessages, sendChatMessage, isConnected, userState } = useTilt();
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const allAddresses = chatMessages.map(m => m.address);
  const { data: users } = useFarcasterUsers(allAddresses);

  const currentUserAddress = userState?.address?.toLowerCase();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    
    setIsSending(true);
    const success = await sendChatMessage(inputValue.trim());
    if (success) {
      setInputValue("");
    }
    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="border-primary/20 bg-card/80 flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2 shrink-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-4 h-4 text-primary" />
            Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            {chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="py-2">
                {chatMessages.map((msg) => (
                  <ChatMessageItem 
                    key={msg.id} 
                    message={msg} 
                    users={users}
                    isOwnMessage={currentUserAddress === msg.address.toLowerCase()}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="p-3 border-t border-border/50 shrink-0">
            {isConnected ? (
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  maxLength={500}
                  disabled={isSending}
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                <Button 
                  size="icon" 
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isSending}
                  data-testid="button-send-chat"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-2">
                Connect wallet to chat
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
