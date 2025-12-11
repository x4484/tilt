import { sdk } from "@farcaster/miniapp-sdk";
import type { Eip1193Provider } from "ethers";

export interface FarcasterContext {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  client?: {
    clientFid: number;
    added: boolean;
  };
}

let isInitialized = false;
let cachedContext: FarcasterContext | null = null;

export function isMiniApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.parent !== window || !!(window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
}

export async function initializeFarcaster(): Promise<FarcasterContext | null> {
  if (isInitialized) {
    return cachedContext;
  }

  try {
    if (!isMiniApp()) {
      isInitialized = true;
      return null;
    }

    const context = await sdk.context;
    
    if (context) {
      cachedContext = {
        user: context.user ? {
          fid: context.user.fid,
          username: context.user.username,
          displayName: context.user.displayName,
          pfpUrl: context.user.pfpUrl,
        } : undefined,
        client: context.client ? {
          clientFid: context.client.clientFid,
          added: context.client.added,
        } : undefined,
      };
    }

    isInitialized = true;
    return cachedContext;
  } catch (error) {
    console.error("Failed to initialize Farcaster SDK:", error);
    isInitialized = true;
    return null;
  }
}

export async function signalReady(): Promise<void> {
  try {
    if (isMiniApp()) {
      await sdk.actions.ready();
    }
  } catch (error) {
    console.error("Failed to signal ready:", error);
  }
}

export async function getEthereumProvider(): Promise<Eip1193Provider | null> {
  try {
    if (isMiniApp()) {
      const provider = await sdk.wallet.ethProvider;
      return provider as Eip1193Provider;
    }
    
    if (typeof window !== "undefined" && (window as unknown as { ethereum?: Eip1193Provider }).ethereum) {
      return (window as unknown as { ethereum: Eip1193Provider }).ethereum;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to get Ethereum provider:", error);
    return null;
  }
}

export async function requestAccounts(): Promise<string[]> {
  try {
    const provider = await getEthereumProvider();
    if (!provider) {
      return [];
    }
    const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
    return accounts;
  } catch (error) {
    console.error("Failed to request accounts:", error);
    return [];
  }
}

export async function getConnectedAddress(): Promise<string | null> {
  try {
    const provider = await getEthereumProvider();
    if (!provider) {
      return null;
    }
    const accounts = await provider.request({ method: "eth_accounts" }) as string[];
    return accounts[0] || null;
  } catch (error) {
    console.error("Failed to get connected address:", error);
    return null;
  }
}

export async function switchToBase(): Promise<boolean> {
  try {
    const provider = await getEthereumProvider();
    if (!provider) {
      return false;
    }

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
      return true;
    } catch (switchError: unknown) {
      const error = switchError as { code?: number };
      if (error.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x2105",
            chainName: "Base",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          }],
        });
        return true;
      }
      throw switchError;
    }
  } catch (error) {
    console.error("Failed to switch to Base:", error);
    return false;
  }
}

export async function composeCast(text: string): Promise<void> {
  try {
    if (isMiniApp()) {
      await sdk.actions.composeCast({ text });
    }
  } catch (error) {
    console.error("Failed to compose cast:", error);
  }
}
