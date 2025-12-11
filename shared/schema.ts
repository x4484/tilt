import { z } from "zod";
import { pgTable, serial, text, integer, boolean, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export enum Side {
  None = 0,
  Up = 1,
  Down = 2,
}

// Database tables
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull(),
  type: text("type").notNull(), // 'mint' | 'burn' | 'switch'
  address: text("address").notNull(),
  amount: text("amount").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  txHash: text("tx_hash"),
  newSide: integer("new_side"),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  balance: text("balance").notNull(),
  side: integer("side").notNull(),
});

export const contractStateCache = pgTable("contract_state_cache", {
  id: serial("id").primaryKey(),
  totalSupply: text("total_supply").notNull().default("0"),
  ups: text("ups").notNull().default("0"),
  isUpOnly: boolean("is_up_only").notNull().default(true),
  tvl: text("tvl").notNull().default("0"),
  currentPrice: text("current_price").notNull().default("0"),
});

export const farcasterUsers = pgTable("farcaster_users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  username: text("username").notNull(),
  pfpUrl: text("pfp_url"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  message: text("message").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessageDb = typeof chatMessages.$inferSelect;

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true });
export const insertLeaderboardSchema = createInsertSchema(leaderboardEntries).omit({ id: true });

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardDb = typeof leaderboardEntries.$inferSelect;

export const contractStateSchema = z.object({
  totalSupply: z.string(),
  ups: z.string(),
  isUpOnly: z.boolean(),
  tvl: z.string(),
  currentPrice: z.string(),
});

export type ContractState = z.infer<typeof contractStateSchema>;

export const userStateSchema = z.object({
  address: z.string(),
  balance: z.string(),
  side: z.nativeEnum(Side),
});

export type UserState = z.infer<typeof userStateSchema>;

export const activityEventSchema = z.object({
  id: z.string(),
  type: z.enum(["mint", "burn", "switch"]),
  address: z.string(),
  amount: z.string(),
  timestamp: z.number(),
  txHash: z.string().optional(),
  newSide: z.nativeEnum(Side).optional(),
});

export type ActivityEvent = z.infer<typeof activityEventSchema>;

export const leaderboardEntrySchema = z.object({
  address: z.string(),
  balance: z.string(),
  side: z.nativeEnum(Side),
  rank: z.number(),
});

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const mintFeesResponseSchema = z.object({
  fees: z.string(),
  amount: z.string(),
});

export type MintFeesResponse = z.infer<typeof mintFeesResponseSchema>;

export const burnRefundsResponseSchema = z.object({
  refund: z.string(),
  amount: z.string(),
});

export type BurnRefundsResponse = z.infer<typeof burnRefundsResponseSchema>;

export const chatMessageSchema = z.object({
  id: z.number(),
  address: z.string(),
  message: z.string(),
  timestamp: z.number(),
  username: z.string().optional(),
  pfpUrl: z.string().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const TILT_ABI = [
  "function mint(uint256 amount) external payable",
  "function burn(uint256 amount) external",
  "function switchSides() external",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function ups() external view returns (uint256)",
  "function sides(address account) external view returns (uint8)",
  "function isUpOnly() external view returns (bool)",
  "function mintFees(uint256 amount) external view returns (uint256)",
  "function mintFeesWithFee(uint256 amount) external view returns (uint256)",
  "function burnRefunds(uint256 amount) external view returns (uint256)",
  "function burnRefundsAfterFee(uint256 amount) external view returns (uint256)",
  "event Mint(address indexed addr, uint256 amount, uint256 totalSupply)",
  "event Burn(address indexed addr, uint256 amount, uint256 totalSupply)",
  "event SwitchSides(address indexed addr, uint8 side, uint256 amount)",
] as const;

export const BASE_CHAIN_ID = 8453;
// Official Base mainnet RPC
export const BASE_RPC_URL = "https://mainnet.base.org";
export const PLACEHOLDER_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";
