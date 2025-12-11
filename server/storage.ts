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
      totalSupply: "1736000",
      ups: "1700320",
      isUpOnly: true,
      tvl: "1.736",
      currentPrice: "0.00000300",
    };

    this.activities = [
      { id: "1", type: "switch", address: "nbaronia.eth", amount: "7000", timestamp: Date.now() - 60000, newSide: Side.Down },
      { id: "2", type: "mint", address: "nbaronia.eth", amount: "7000", timestamp: Date.now() - 240000 },
      { id: "3", type: "mint", address: "olotus.eth", amount: "25000", timestamp: Date.now() - 420000 },
      { id: "4", type: "mint", address: "donosaur.eth", amount: "42100", timestamp: Date.now() - 3600000 },
      { id: "5", type: "switch", address: "codyb.eth", amount: "5000", timestamp: Date.now() - 3600000, newSide: Side.Down },
      { id: "6", type: "mint", address: "codyb.eth", amount: "5000", timestamp: Date.now() - 3600000 },
      { id: "7", type: "mint", address: "chd.eth", amount: "69", timestamp: Date.now() - 3600000 },
      { id: "8", type: "mint", address: "hot.sdv.eth", amount: "50000", timestamp: Date.now() - 64800000 },
    ];

    this.upLeaderboard = [
      { address: "0x4888c0030b743c...eth", balance: "500000", side: Side.Up, rank: 1 },
      { address: "javamonn.eth", balance: "500000", side: Side.Up, rank: 2 },
      { address: "0x6dca...8a58", balance: "300000", side: Side.Up, rank: 3 },
      { address: "chd.eth", balance: "100070", side: Side.Up, rank: 4 },
      { address: "sh101.eth", balance: "50000", side: Side.Up, rank: 5 },
      { address: "hot.sdv.eth", balance: "50000", side: Side.Up, rank: 6 },
      { address: "donosaur.eth", balance: "42070", side: Side.Up, rank: 7 },
      { address: "4484.eth", balance: "30000", side: Side.Up, rank: 8 },
      { address: "olotus.eth", balance: "25000", side: Side.Up, rank: 9 },
      { address: "immanual.eth", balance: "25000", side: Side.Up, rank: 10 },
    ];

    this.downLeaderboard = [
      { address: "0xa16e...2348", balance: "20000", side: Side.Down, rank: 1 },
      { address: "nbaronia.eth", balance: "6970", side: Side.Down, rank: 2 },
      { address: "codyb.eth", balance: "5000", side: Side.Down, rank: 3 },
    ];
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
