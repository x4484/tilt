import { z } from "zod";

export enum Side {
  None = 0,
  Up = 1,
  Down = 2,
}

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
// Use Ankr's public Base RPC which has better rate limits
export const BASE_RPC_URL = "https://rpc.ankr.com/base";
export const PLACEHOLDER_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";
