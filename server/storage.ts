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

export interface IStorage {
  getContractState(): ContractState;
  setContractState(state: ContractState): void;
  getActivities(limit?: number): ActivityEvent[];
  addActivity(activity: ActivityEvent): void;
  getLeaderboard(side: 'up' | 'down', limit?: number): LeaderboardEntry[];
  updateLeaderboard(entries: LeaderboardEntry[]): void;
}

export class MemStorage implements IStorage {
  private contractState: ContractState;
  private activities: ActivityEvent[];
  private upLeaderboard: LeaderboardEntry[];
  private downLeaderboard: LeaderboardEntry[];

  constructor() {
    this.contractState = {
      totalSupply: "0",
      ups: "0",
      isUpOnly: true,
      tvl: "0",
      currentPrice: "0",
    };

    this.activities = [];

    this.upLeaderboard = [];

    this.downLeaderboard = [];
  }

  getContractState(): ContractState {
    return { ...this.contractState };
  }

  setContractState(state: ContractState): void {
    this.contractState = { ...state };
  }

  getActivities(limit: number = 20): ActivityEvent[] {
    return this.activities.slice(0, limit).map(a => ({ ...a }));
  }

  addActivity(activity: ActivityEvent): void {
    this.activities.unshift(activity);
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(0, 100);
    }
  }

  getLeaderboard(side: 'up' | 'down', limit: number = 10): LeaderboardEntry[] {
    const leaderboard = side === 'up' ? this.upLeaderboard : this.downLeaderboard;
    return leaderboard.slice(0, limit).map(e => ({ ...e }));
  }

  updateLeaderboard(entries: LeaderboardEntry[]): void {
    const upEntries = entries.filter(e => e.side === Side.Up);
    const downEntries = entries.filter(e => e.side === Side.Down);

    if (upEntries.length > 0) {
      this.upLeaderboard = upEntries.sort((a, b) => 
        parseInt(b.balance, 10) - parseInt(a.balance, 10)
      ).map((e, i) => ({ ...e, rank: i + 1 }));
    }

    if (downEntries.length > 0) {
      this.downLeaderboard = downEntries.sort((a, b) => 
        parseInt(b.balance, 10) - parseInt(a.balance, 10)
      ).map((e, i) => ({ ...e, rank: i + 1 }));
    }
  }
}

export const storage = new MemStorage();
