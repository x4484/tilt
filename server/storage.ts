import { db } from "./db";
import { activities, leaderboardEntries, contractStateCache, chatMessages, farcasterUsers } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export enum Side {
  None = 0,
  Up = 1,
  Down = 2,
}

export interface ContractState {
  totalSupply: string;
  ups: string;
  isUpOnly: boolean;
  tvl: string;
  currentPrice: string;
}

export interface ActivityEvent {
  id: string;
  type: "mint" | "burn" | "switch";
  address: string;
  amount: string;
  timestamp: number;
  txHash?: string;
  newSide?: Side;
}

export interface LeaderboardEntry {
  address: string;
  balance: string;
  side: Side;
  rank: number;
}

export interface ChatMessage {
  id: number;
  address: string;
  message: string;
  timestamp: number;
  username?: string;
  pfpUrl?: string;
}

export interface IStorage {
  getContractState(): Promise<ContractState>;
  setContractState(state: ContractState): Promise<void>;
  getActivities(limit?: number): Promise<ActivityEvent[]>;
  addActivity(activity: ActivityEvent): Promise<void>;
  getLeaderboard(side: 'up' | 'down', limit?: number): Promise<LeaderboardEntry[]>;
  updateLeaderboard(entries: LeaderboardEntry[]): Promise<void>;
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  addChatMessage(address: string, message: string): Promise<ChatMessage>;
  getFarcasterUser(address: string): Promise<{ username: string; pfpUrl?: string } | null>;
  setFarcasterUser(address: string, username: string, pfpUrl?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private defaultState: ContractState = {
    totalSupply: "0",
    ups: "0",
    isUpOnly: true,
    tvl: "0",
    currentPrice: "0",
  };

  async getContractState(): Promise<ContractState> {
    try {
      const [state] = await db.select().from(contractStateCache).limit(1);
      if (!state) {
        return this.defaultState;
      }
      return {
        totalSupply: state.totalSupply,
        ups: state.ups,
        isUpOnly: state.isUpOnly,
        tvl: state.tvl,
        currentPrice: state.currentPrice,
      };
    } catch (err) {
      console.error("Failed to get contract state:", err);
      return this.defaultState;
    }
  }

  async setContractState(state: ContractState): Promise<void> {
    try {
      const existing = await db.select().from(contractStateCache).limit(1);
      if (existing.length > 0) {
        await db.update(contractStateCache)
          .set({
            totalSupply: state.totalSupply,
            ups: state.ups,
            isUpOnly: state.isUpOnly,
            tvl: state.tvl,
            currentPrice: state.currentPrice,
          })
          .where(eq(contractStateCache.id, existing[0].id));
      } else {
        await db.insert(contractStateCache).values({
          totalSupply: state.totalSupply,
          ups: state.ups,
          isUpOnly: state.isUpOnly,
          tvl: state.tvl,
          currentPrice: state.currentPrice,
        });
      }
    } catch (err) {
      console.error("Failed to set contract state:", err);
    }
  }

  async getActivities(limit: number = 20): Promise<ActivityEvent[]> {
    try {
      const rows = await db.select()
        .from(activities)
        .orderBy(desc(activities.timestamp))
        .limit(limit);
      
      return rows.map(row => ({
        id: row.eventId,
        type: row.type as "mint" | "burn" | "switch",
        address: row.address,
        amount: row.amount,
        timestamp: row.timestamp,
        txHash: row.txHash || undefined,
        newSide: row.newSide !== null ? row.newSide as Side : undefined,
      }));
    } catch (err) {
      console.error("Failed to get activities:", err);
      return [];
    }
  }

  async addActivity(activity: ActivityEvent): Promise<void> {
    try {
      await db.insert(activities).values({
        eventId: activity.id,
        type: activity.type,
        address: activity.address,
        amount: activity.amount,
        timestamp: activity.timestamp,
        txHash: activity.txHash || null,
        newSide: activity.newSide !== undefined ? activity.newSide : null,
      });
    } catch (err) {
      console.error("Failed to add activity:", err);
    }
  }

  async getLeaderboard(side: 'up' | 'down', limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const sideValue = side === 'up' ? Side.Up : Side.Down;
      const rows = await db.select()
        .from(leaderboardEntries)
        .where(eq(leaderboardEntries.side, sideValue));
      
      // Sort by balance descending
      const sorted = rows.sort((a, b) => 
        parseInt(b.balance) - parseInt(a.balance)
      ).slice(0, limit);
      
      return sorted.map((row, index) => ({
        address: row.address,
        balance: row.balance,
        side: row.side as Side,
        rank: index + 1,
      }));
    } catch (err) {
      console.error("Failed to get leaderboard:", err);
      return [];
    }
  }

  async updateLeaderboard(entries: LeaderboardEntry[]): Promise<void> {
    try {
      for (const entry of entries) {
        const existing = await db.select()
          .from(leaderboardEntries)
          .where(eq(leaderboardEntries.address, entry.address.toLowerCase()));
        
        if (existing.length > 0) {
          await db.update(leaderboardEntries)
            .set({
              balance: entry.balance,
              side: entry.side,
            })
            .where(eq(leaderboardEntries.address, entry.address.toLowerCase()));
        } else {
          await db.insert(leaderboardEntries).values({
            address: entry.address.toLowerCase(),
            balance: entry.balance,
            side: entry.side,
          });
        }
      }
    } catch (err) {
      console.error("Failed to update leaderboard:", err);
    }
  }

  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    try {
      const rows = await db.select()
        .from(chatMessages)
        .orderBy(desc(chatMessages.timestamp))
        .limit(limit);
      
      // Enrich with Farcaster user data
      const enriched = await Promise.all(rows.map(async (row) => {
        const user = await this.getFarcasterUser(row.address);
        return {
          id: row.id,
          address: row.address,
          message: row.message,
          timestamp: row.timestamp,
          username: user?.username,
          pfpUrl: user?.pfpUrl,
        };
      }));
      
      return enriched.reverse(); // Oldest first for chat display
    } catch (err) {
      console.error("Failed to get chat messages:", err);
      return [];
    }
  }

  async addChatMessage(address: string, message: string): Promise<ChatMessage> {
    const timestamp = Date.now();
    const [inserted] = await db.insert(chatMessages).values({
      address: address.toLowerCase(),
      message,
      timestamp,
    }).returning();
    
    const user = await this.getFarcasterUser(address);
    return {
      id: inserted.id,
      address: inserted.address,
      message: inserted.message,
      timestamp: inserted.timestamp,
      username: user?.username,
      pfpUrl: user?.pfpUrl,
    };
  }

  async getFarcasterUser(address: string): Promise<{ username: string; pfpUrl?: string } | null> {
    try {
      const [user] = await db.select()
        .from(farcasterUsers)
        .where(eq(farcasterUsers.address, address.toLowerCase()))
        .limit(1);
      
      if (!user) return null;
      
      return {
        username: user.username,
        pfpUrl: user.pfpUrl || undefined,
      };
    } catch (err) {
      console.error("Failed to get Farcaster user:", err);
      return null;
    }
  }

  async setFarcasterUser(address: string, username: string, pfpUrl?: string): Promise<void> {
    try {
      const existing = await db.select()
        .from(farcasterUsers)
        .where(eq(farcasterUsers.address, address.toLowerCase()));
      
      if (existing.length > 0) {
        await db.update(farcasterUsers)
          .set({
            username,
            pfpUrl: pfpUrl || null,
            updatedAt: Date.now(),
          })
          .where(eq(farcasterUsers.address, address.toLowerCase()));
      } else {
        await db.insert(farcasterUsers).values({
          address: address.toLowerCase(),
          username,
          pfpUrl: pfpUrl || null,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("Failed to set Farcaster user:", err);
    }
  }
}

export const storage = new DatabaseStorage();
