import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { BrowserProvider, type Eip1193Provider } from "ethers";
import { useAccount } from "wagmi";
import { useModal } from "connectkit";
import type {
  ContractState,
  UserState,
  ActivityEvent,
  LeaderboardEntry,
} from "@shared/schema";
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
import { useEthersBrowserProvider } from "@/lib/ethersAdapter";

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
  getMintFees: (
    amount: string,
  ) => Promise<{ fees: string; amount: string } | null>;
  getBurnRefunds: (
    amount: string,
  ) => Promise<{ refund: string; amount: string } | null>;
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
  const [isFarcasterReady, setIsFarcasterReady] = useState(false);
  const [isContractReady, setIsContractReady] = useState(false);
  const [farcasterContext, setFarcasterContext] =
    useState<FarcasterContext | null>(null);
  const [contractState, setContractState] = useState<ContractState | null>(
    null,
  );
  const [userState, setUserState] = useState<UserState | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [upLeaderboard, setUpLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [downLeaderboard, setDownLeaderboard] = useState<LeaderboardEntry[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  // Farcaster-mode state
  const [farcasterProvider, setFarcasterProvider] =
    useState<Eip1193Provider | null>(null);
  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null);

  const isInFrame = isMiniApp();

  // Web-mode state from wagmi / ConnectKit
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const wagmiProvider = useEthersBrowserProvider();
  const { setOpen: openConnectModal } = useModal();

  // Unified derived state
  const isConnected = isInFrame
    ? Boolean(farcasterAddress)
    : wagmiConnected;

  const userAddress = isInFrame
    ? farcasterAddress
    : wagmiAddress ?? null;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchDataFromApi = useCallback(async () => {
    try {
      const [stateRes, activitiesRes, upRes, downRes] = await Promise.all([
        fetch("/api/contract/state"),
        fetch("/api/contract/activities?limit=20"),
        fetch("/api/contract/leaderboard/up?limit=10"),
        fetch("/api/contract/leaderboard/down?limit=10"),
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
      const response = await fetch(`/api/contract/user/${userAddress}`);
      if (response.ok) {
        const data = await response.json();
        setUserState({
          address: userAddress,
          balance: data.balance,
          side: data.side as Side,
        });
      } else {
        const provider = await getReadOnlyProvider();
        const state = await fetchUserState(provider, userAddress);
        setUserState(state);
      }
    } catch (err) {
      console.error("Failed to fetch user state:", err);
    }
  }, [userAddress]);

  // -- Connect wallet --
  const connect = useCallback(async () => {
    if (!isInFrame) {
      // Web mode: open ConnectKit modal
      openConnectModal(true);
      return;
    }

    // Farcaster mode: manual wallet flow
    setIsLoading(true);
    setError(null);

    try {
      const provider = await getEthereumProvider();
      if (!provider) {
        setError(
          "No wallet detected. Please install MetaMask or another Web3 wallet.",
        );
        return;
      }

      setFarcasterProvider(provider);

      const accounts = await requestAccounts();
      if (accounts.length === 0) {
        setError(
          "No accounts found. Please unlock your wallet and try again.",
        );
        return;
      }

      try {
        await switchToBase();
      } catch (switchErr) {
        console.warn("Could not switch to Base network:", switchErr);
      }

      setFarcasterAddress(accounts[0]);
    } catch (err) {
      console.error("Connection failed:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsLoading(false);
    }
  }, [isInFrame, openConnectModal]);

  // -- Get a BrowserProvider for write operations --
  const getWriteProvider = useCallback(async (): Promise<BrowserProvider | null> => {
    if (isInFrame) {
      if (!farcasterProvider) return null;
      return getProvider(farcasterProvider);
    }
    return wagmiProvider ?? null;
  }, [isInFrame, farcasterProvider, wagmiProvider]);

  // -- Fee calculations (client-side fallback) --
  const calculateMintFeesClientSide = useCallback(
    (amount: string) => {
      const amountNum = BigInt(amount);
      const totalSupply = BigInt(contractState?.totalSupply || "0");
      const newTotal = totalSupply + amountNum;

      const oldCost =
        (totalSupply * (totalSupply + BigInt(1)) * (BigInt(2) * totalSupply + BigInt(1))) /
        BigInt(6);
      const newCost =
        (newTotal * (newTotal + BigInt(1)) * (BigInt(2) * newTotal + BigInt(1))) /
        BigInt(6);
      const baseCost = newCost - oldCost;

      const fee =
        (baseCost * BigInt(100) + BigInt(9999)) / BigInt(10000);
      const totalCost = baseCost + fee;

      const totalCostStr = totalCost.toString();
      const ethValue = Number(totalCostStr) / 1e18;

      return { fees: ethValue.toFixed(18), amount };
    },
    [contractState?.totalSupply],
  );

  const calculateBurnRefundsClientSide = useCallback(
    (amount: string) => {
      const amountNum = BigInt(amount);
      const totalSupply = BigInt(contractState?.totalSupply || "0");
      if (totalSupply < amountNum) {
        return { refund: "0", amount };
      }
      const newTotal = totalSupply - amountNum;

      const oldCost =
        (totalSupply * (totalSupply + BigInt(1)) * (BigInt(2) * totalSupply + BigInt(1))) /
        BigInt(6);
      const newCost =
        (newTotal * (newTotal + BigInt(1)) * (BigInt(2) * newTotal + BigInt(1))) /
        BigInt(6);
      const grossRefund = oldCost - newCost;

      const fee =
        (grossRefund * BigInt(100) + BigInt(9999)) / BigInt(10000);
      const netRefund = grossRefund - fee;

      const refundStr = netRefund.toString();
      const ethValue = Number(refundStr) / 1e18;

      return { refund: ethValue.toFixed(18), amount };
    },
    [contractState?.totalSupply],
  );

  const getMintFees = useCallback(
    async (amount: string) => {
      if (isContractConfigured()) {
        try {
          const provider = await getReadOnlyProvider();
          return await fetchMintFees(provider, amount);
        } catch (err) {
          console.error(
            "Failed to get mint fees from contract, using fallback:",
            err,
          );
        }
      }
      return calculateMintFeesClientSide(amount);
    },
    [calculateMintFeesClientSide],
  );

  const getBurnRefunds = useCallback(
    async (amount: string) => {
      if (isContractConfigured()) {
        try {
          const provider = await getReadOnlyProvider();
          return await fetchBurnRefunds(provider, amount);
        } catch (err) {
          console.error(
            "Failed to get burn refunds from contract, using fallback:",
            err,
          );
        }
      }
      return calculateBurnRefundsClientSide(amount);
    },
    [calculateBurnRefundsClientSide],
  );

  // -- Post activity & update leaderboard --
  const postActivity = useCallback(
    async (
      type: "mint" | "burn" | "switch",
      amount: string,
      txHash?: string,
      newSide?: Side,
    ) => {
      if (!userAddress) return;

      try {
        await fetch("/api/contract/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            address: userAddress,
            amount,
            txHash,
            newSide,
          }),
        });

        const activitiesRes = await fetch(
          "/api/contract/activities?limit=20",
        );
        if (activitiesRes.ok) {
          const acts = await activitiesRes.json();
          setActivities(acts);
        }
      } catch (err) {
        console.error("Failed to post activity:", err);
      }
    },
    [userAddress],
  );

  const updateLeaderboardEntry = useCallback(async () => {
    if (!userAddress) return;

    try {
      const provider = await getReadOnlyProvider();
      const freshUserState = await fetchUserState(provider, userAddress);

      await fetch("/api/contract/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: userAddress,
          balance: freshUserState.balance,
          side: freshUserState.side,
        }),
      });

      const [upRes, downRes] = await Promise.all([
        fetch("/api/contract/leaderboard/up?limit=10"),
        fetch("/api/contract/leaderboard/down?limit=10"),
      ]);

      if (upRes.ok) {
        const up = await upRes.json();
        setUpLeaderboard(up);
      }
      if (downRes.ok) {
        const down = await downRes.json();
        setDownLeaderboard(down);
      }
    } catch (err) {
      console.error("Failed to update leaderboard:", err);
    }
  }, [userAddress]);

  // -- Contract write operations --
  const mint = useCallback(
    async (amount: string, fees: string): Promise<boolean> => {
      const provider = await getWriteProvider();
      if (!provider) {
        setError("Wallet not connected");
        return false;
      }

      if (!isContractConfigured()) {
        setError(
          "Contract address not configured. Please set VITE_CONTRACT_ADDRESS.",
        );
        return false;
      }

      try {
        setIsLoading(true);
        const result = await contractMint(provider, amount, fees);
        const txHash = result?.hash;

        await refreshContractState();
        await refreshUserState();

        await postActivity("mint", amount, txHash);
        setTimeout(() => updateLeaderboardEntry(), 2000);

        return true;
      } catch (err) {
        console.error("Mint failed:", err);
        setError(err instanceof Error ? err.message : "Mint failed");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      getWriteProvider,
      refreshContractState,
      refreshUserState,
      postActivity,
      updateLeaderboardEntry,
    ],
  );

  const burn = useCallback(
    async (amount: string): Promise<boolean> => {
      const provider = await getWriteProvider();
      if (!provider) {
        setError("Wallet not connected");
        return false;
      }

      if (!isContractConfigured()) {
        setError(
          "Contract address not configured. Please set VITE_CONTRACT_ADDRESS.",
        );
        return false;
      }

      try {
        setIsLoading(true);
        const result = await contractBurn(provider, amount);
        const txHash = result?.hash;

        await refreshContractState();
        await refreshUserState();

        await postActivity("burn", amount, txHash);
        setTimeout(() => updateLeaderboardEntry(), 2000);

        return true;
      } catch (err) {
        console.error("Burn failed:", err);
        setError(err instanceof Error ? err.message : "Burn failed");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      getWriteProvider,
      refreshContractState,
      refreshUserState,
      postActivity,
      updateLeaderboardEntry,
    ],
  );

  const switchSides = useCallback(async (): Promise<boolean> => {
    const provider = await getWriteProvider();
    if (!provider) {
      setError("Wallet not connected");
      return false;
    }

    if (!isContractConfigured()) {
      setError(
        "Contract address not configured. Please set VITE_CONTRACT_ADDRESS.",
      );
      return false;
    }

    try {
      setIsLoading(true);
      const result = await contractSwitchSides(provider);
      const txHash = result?.hash;

      await refreshContractState();
      await refreshUserState();

      const newSide =
        userState?.side === Side.Up ? Side.Down : Side.Up;
      await postActivity(
        "switch",
        userState?.balance || "0",
        txHash,
        newSide,
      );
      setTimeout(() => updateLeaderboardEntry(), 2000);

      return true;
    } catch (err) {
      console.error("Switch sides failed:", err);
      setError(
        err instanceof Error ? err.message : "Switch sides failed",
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [
    getWriteProvider,
    refreshContractState,
    refreshUserState,
    postActivity,
    updateLeaderboardEntry,
    userState,
  ]);

  // -- Initialization --
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

  // Refresh user state when address changes (either mode)
  useEffect(() => {
    if (userAddress) {
      refreshUserState();
    }
  }, [userAddress, refreshUserState]);

  // -- WebSocket real-time updates --
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const protocol =
        window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected");
          reconnectAttemptsRef.current = 0;
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttemptsRef.current),
              30000,
            );
            reconnectTimeoutRef.current = setTimeout(
              connectWebSocket,
              delay,
            );
          }
        };

        ws.onerror = (wsError) => {
          console.error("WebSocket error:", wsError);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case "contract_state":
                if (message.data) {
                  setContractState(message.data as ContractState);
                }
                break;
              case "activities":
                if (message.data) {
                  setActivities(message.data as ActivityEvent[]);
                }
                break;
              case "new_activity":
                if (message.data) {
                  setActivities((prev) => {
                    const newActivity = message.data as ActivityEvent;
                    if (prev.some((a) => a.id === newActivity.id)) {
                      return prev;
                    }
                    return [newActivity, ...prev].slice(0, 50);
                  });
                }
                break;
              case "leaderboard":
                if (message.data) {
                  const { up, down } = message.data as {
                    up: LeaderboardEntry[];
                    down: LeaderboardEntry[];
                  };
                  if (up) setUpLeaderboard(up);
                  if (down) setDownLeaderboard(down);
                }
                break;
            }
          } catch (parseError) {
            console.error(
              "Failed to parse WebSocket message:",
              parseError,
            );
          }
        };
      } catch (wsError) {
        console.error("Failed to create WebSocket:", wsError);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Fallback polling when WebSocket is unavailable
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN
      ) {
        fetchDataFromApi();
      }
      if (userAddress && isContractConfigured()) {
        refreshUserState();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshUserState, userAddress, fetchDataFromApi]);

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
