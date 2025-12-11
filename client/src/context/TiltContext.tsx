import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { BrowserProvider, type Eip1193Provider } from "ethers";
import type { ContractState, UserState, ActivityEvent, LeaderboardEntry } from "@shared/schema";
import { Side } from "@shared/schema";
import {
  initializeFarcaster,
  signalReady,
  getEthereumProvider,
  requestAccounts,
  switchToBase,
  isMiniApp,
  type FarcasterContext,
} from "@/lib/farcaster";
import {
  getReadOnlyProvider,
  getProvider,
  fetchContractState,
  fetchUserState,
  fetchMintFees,
  fetchBurnRefunds,
  mint as contractMint,
  burn as contractBurn,
  switchSides as contractSwitchSides,
  isContractConfigured,
} from "@/lib/contract";

interface TiltContextType {
  isLoading: boolean;
  isConnected: boolean;
  isInFrame: boolean;
  isFarcasterReady: boolean;
  isContractReady: boolean;
  farcasterContext: FarcasterContext | null;
  contractState: ContractState | null;
  userState: UserState | null;
  activities: ActivityEvent[];
  upLeaderboard: LeaderboardEntry[];
  downLeaderboard: LeaderboardEntry[];
  error: string | null;
  connect: () => Promise<void>;
  refreshContractState: () => Promise<void>;
  refreshUserState: () => Promise<void>;
  getMintFees: (amount: string) => Promise<{ fees: string; amount: string } | null>;
  getBurnRefunds: (amount: string) => Promise<{ refund: string; amount: string } | null>;
  mint: (amount: string, fees: string) => Promise<boolean>;
  burn: (amount: string) => Promise<boolean>;
  switchSides: () => Promise<boolean>;
  clearError: () => void;
}

const TiltContext = createContext<TiltContextType | null>(null);

const DEMO_CONTRACT_STATE: ContractState = {
  totalSupply: "1736000",
  ups: "1700320",
  isUpOnly: true,
  tvl: "1.736",
  currentPrice: "0.00000300",
};

const DEMO_ACTIVITIES: ActivityEvent[] = [
  { id: "1", type: "switch", address: "nbaronia.eth", amount: "7000", timestamp: Date.now() - 60000, newSide: Side.Down },
  { id: "2", type: "mint", address: "nbaronia.eth", amount: "7000", timestamp: Date.now() - 240000 },
  { id: "3", type: "mint", address: "olotus.eth", amount: "25000", timestamp: Date.now() - 420000 },
  { id: "4", type: "mint", address: "donosaur.eth", amount: "42100", timestamp: Date.now() - 3600000 },
  { id: "5", type: "switch", address: "codyb.eth", amount: "5000", timestamp: Date.now() - 3600000, newSide: Side.Down },
  { id: "6", type: "mint", address: "codyb.eth", amount: "5000", timestamp: Date.now() - 3600000 },
  { id: "7", type: "mint", address: "chd.eth", amount: "69", timestamp: Date.now() - 3600000 },
  { id: "8", type: "mint", address: "hot.sdv.eth", amount: "50000", timestamp: Date.now() - 64800000 },
];

const DEMO_UP_LEADERBOARD: LeaderboardEntry[] = [
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

const DEMO_DOWN_LEADERBOARD: LeaderboardEntry[] = [
  { address: "0xa16e...2348", balance: "20000", side: Side.Down, rank: 1 },
  { address: "nbaronia.eth", balance: "6970", side: Side.Down, rank: 2 },
  { address: "codyb.eth", balance: "5000", side: Side.Down, rank: 3 },
];

export function TiltProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isFarcasterReady, setIsFarcasterReady] = useState(false);
  const [isContractReady, setIsContractReady] = useState(false);
  const [farcasterContext, setFarcasterContext] = useState<FarcasterContext | null>(null);
  const [contractState, setContractState] = useState<ContractState | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [upLeaderboard, setUpLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [downLeaderboard, setDownLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ethereumProvider, setEthereumProvider] = useState<Eip1193Provider | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  const isInFrame = isMiniApp();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchDataFromApi = useCallback(async () => {
    try {
      const [stateRes, activitiesRes, upRes, downRes] = await Promise.all([
        fetch('/api/contract/state'),
        fetch('/api/contract/activities?limit=20'),
        fetch('/api/contract/leaderboard/up?limit=10'),
        fetch('/api/contract/leaderboard/down?limit=10'),
      ]);

      if (stateRes.ok) {
        const state = await stateRes.json();
        setContractState(state);
      }
      if (activitiesRes.ok) {
        const acts = await activitiesRes.json();
        setActivities(acts);
      }
      if (upRes.ok) {
        const up = await upRes.json();
        setUpLeaderboard(up);
      }
      if (downRes.ok) {
        const down = await downRes.json();
        setDownLeaderboard(down);
      }
    } catch (err) {
      console.error("Failed to fetch data from API:", err);
    }
  }, []);

  const refreshContractState = useCallback(async () => {
    if (!isContractConfigured()) {
      setContractState(DEMO_CONTRACT_STATE);
      setActivities(DEMO_ACTIVITIES);
      setUpLeaderboard(DEMO_UP_LEADERBOARD);
      setDownLeaderboard(DEMO_DOWN_LEADERBOARD);
      return;
    }

    try {
      const provider = await getReadOnlyProvider();
      const state = await fetchContractState(provider);
      setContractState(state);
      setIsContractReady(true);
    } catch (err) {
      console.error("Failed to fetch contract state:", err);
      setContractState(DEMO_CONTRACT_STATE);
    }
  }, []);

  const refreshUserState = useCallback(async () => {
    if (!userAddress) return;

    if (!isContractConfigured()) {
      setUserState({
        address: userAddress,
        balance: "30000",
        side: Side.Up,
      });
      return;
    }

    try {
      const provider = await getReadOnlyProvider();
      const state = await fetchUserState(provider, userAddress);
      setUserState(state);
    } catch (err) {
      console.error("Failed to fetch user state:", err);
    }
  }, [userAddress]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = await getEthereumProvider();
      if (!provider) {
        if (!isInFrame) {
          const demoAddress = "0x" + "a".repeat(40);
          setUserAddress(demoAddress);
          setIsConnected(true);
          setUserState({
            address: demoAddress,
            balance: "30000",
            side: Side.Up,
          });
        } else {
          setError("Wallet not available in frame");
        }
        return;
      }

      setEthereumProvider(provider);

      const accounts = await requestAccounts();
      if (accounts.length === 0) {
        setError("No accounts found");
        return;
      }

      await switchToBase();

      setUserAddress(accounts[0]);
      setIsConnected(true);
    } catch (err) {
      console.error("Connection failed:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsLoading(false);
    }
  }, [isInFrame]);

  const getMintFees = useCallback(async (amount: string) => {
    if (!isContractConfigured()) {
      const amountNum = parseInt(amount, 10);
      const totalSupply = parseInt(contractState?.totalSupply || "1736000", 10);
      const newTotal = totalSupply + amountNum;
      const oldCost = (totalSupply * (totalSupply + 1) * (2 * totalSupply + 1)) / 6;
      const newCost = (newTotal * (newTotal + 1) * (2 * newTotal + 1)) / 6;
      const fee = newCost - oldCost;
      return { fees: (fee / 1e18).toFixed(8), amount };
    }

    try {
      const provider = await getReadOnlyProvider();
      return await fetchMintFees(provider, amount);
    } catch (err) {
      console.error("Failed to get mint fees:", err);
      return null;
    }
  }, [contractState?.totalSupply]);

  const getBurnRefunds = useCallback(async (amount: string) => {
    if (!isContractConfigured()) {
      const amountNum = parseInt(amount, 10);
      const totalSupply = parseInt(contractState?.totalSupply || "1736000", 10);
      const newTotal = totalSupply - amountNum;
      const oldCost = (totalSupply * (totalSupply + 1) * (2 * totalSupply + 1)) / 6;
      const newCost = (newTotal * (newTotal + 1) * (2 * newTotal + 1)) / 6;
      const refund = oldCost - newCost;
      return { refund: (refund / 1e18).toFixed(8), amount };
    }

    try {
      const provider = await getReadOnlyProvider();
      return await fetchBurnRefunds(provider, amount);
    } catch (err) {
      console.error("Failed to get burn refunds:", err);
      return null;
    }
  }, [contractState?.totalSupply]);

  const mint = useCallback(async (amount: string, fees: string): Promise<boolean> => {
    if (!ethereumProvider) {
      setError("Wallet not connected");
      return false;
    }

    if (!isContractConfigured()) {
      setError("Contract address not configured. Please set VITE_CONTRACT_ADDRESS.");
      return false;
    }

    try {
      setIsLoading(true);
      const provider = await getProvider(ethereumProvider);
      await contractMint(provider, amount, fees);
      await refreshContractState();
      await refreshUserState();
      return true;
    } catch (err) {
      console.error("Mint failed:", err);
      setError(err instanceof Error ? err.message : "Mint failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ethereumProvider, refreshContractState, refreshUserState]);

  const burn = useCallback(async (amount: string): Promise<boolean> => {
    if (!ethereumProvider) {
      setError("Wallet not connected");
      return false;
    }

    if (!isContractConfigured()) {
      setError("Contract address not configured. Please set VITE_CONTRACT_ADDRESS.");
      return false;
    }

    try {
      setIsLoading(true);
      const provider = await getProvider(ethereumProvider);
      await contractBurn(provider, amount);
      await refreshContractState();
      await refreshUserState();
      return true;
    } catch (err) {
      console.error("Burn failed:", err);
      setError(err instanceof Error ? err.message : "Burn failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ethereumProvider, refreshContractState, refreshUserState]);

  const switchSides = useCallback(async (): Promise<boolean> => {
    if (!ethereumProvider) {
      setError("Wallet not connected");
      return false;
    }

    if (!isContractConfigured()) {
      setError("Contract address not configured. Please set VITE_CONTRACT_ADDRESS.");
      return false;
    }

    try {
      setIsLoading(true);
      const provider = await getProvider(ethereumProvider);
      await contractSwitchSides(provider);
      await refreshContractState();
      await refreshUserState();
      return true;
    } catch (err) {
      console.error("Switch sides failed:", err);
      setError(err instanceof Error ? err.message : "Switch sides failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ethereumProvider, refreshContractState, refreshUserState]);

  useEffect(() => {
    const init = async () => {
      const context = await initializeFarcaster();
      setFarcasterContext(context);
      setIsFarcasterReady(true);

      await fetchDataFromApi();
      await refreshContractState();

      await signalReady();
      setIsLoading(false);
    };

    init();
  }, [refreshContractState, fetchDataFromApi]);

  useEffect(() => {
    if (userAddress) {
      refreshUserState();
    }
  }, [userAddress, refreshUserState]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDataFromApi();
      if (isContractConfigured()) {
        refreshContractState();
      }
      if (userAddress) {
        refreshUserState();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshContractState, refreshUserState, userAddress, fetchDataFromApi]);

  return (
    <TiltContext.Provider
      value={{
        isLoading,
        isConnected,
        isInFrame,
        isFarcasterReady,
        isContractReady,
        farcasterContext,
        contractState,
        userState,
        activities,
        upLeaderboard,
        downLeaderboard,
        error,
        connect,
        refreshContractState,
        refreshUserState,
        getMintFees,
        getBurnRefunds,
        mint,
        burn,
        switchSides,
        clearError,
      }}
    >
      {children}
    </TiltContext.Provider>
  );
}

export function useTilt() {
  const context = useContext(TiltContext);
  if (!context) {
    throw new Error("useTilt must be used within a TiltProvider");
  }
  return context;
}
