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

const EMPTY_CONTRACT_STATE: ContractState = {
  totalSupply: "0",
  ups: "0",
  isUpOnly: true,
  tvl: "0",
  currentPrice: "0",
};

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
      setContractState(EMPTY_CONTRACT_STATE);
      setActivities([]);
      setUpLeaderboard([]);
      setDownLeaderboard([]);
      return;
    }

    try {
      const provider = await getReadOnlyProvider();
      const state = await fetchContractState(provider);
      setContractState(state);
      setIsContractReady(true);
    } catch (err) {
      console.error("Failed to fetch contract state:", err);
      setContractState(EMPTY_CONTRACT_STATE);
    }
  }, []);

  const refreshUserState = useCallback(async () => {
    if (!userAddress) return;

    if (!isContractConfigured()) {
      setUserState({
        address: userAddress,
        balance: "0",
        side: Side.None,
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
        setError("No wallet detected. Please install MetaMask or another Web3 wallet.");
        return;
      }

      setEthereumProvider(provider);

      const accounts = await requestAccounts();
      if (accounts.length === 0) {
        setError("No accounts found. Please unlock your wallet and try again.");
        return;
      }

      try {
        await switchToBase();
      } catch (switchErr) {
        console.warn("Could not switch to Base network:", switchErr);
      }

      setUserAddress(accounts[0]);
      setIsConnected(true);
    } catch (err) {
      console.error("Connection failed:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
