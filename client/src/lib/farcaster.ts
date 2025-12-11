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
let detectedAsMiniApp = false;

export function isMiniApp(): boolean {
  return detectedAsMiniApp;
}

function checkMiniAppEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  
  const hasReactNativeWebView = !!(window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
  if (hasReactNativeWebView) return true;
  
  const isInIframe = window.parent !== window;
  if (!isInIframe) return false;
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fc') || urlParams.has('farcaster')) return true;
    
    if (document.referrer.includes('warpcast.com') || 
        document.referrer.includes('farcaster.xyz')) return true;
  } catch {
  }
  
  return false;
}

export async function initializeFarcaster(): Promise<FarcasterContext | null> {
  if (isInitialized) {
    return cachedContext;
  }

  detectedAsMiniApp = checkMiniAppEnvironment();

  if (!detectedAsMiniApp) {
    isInitialized = true;
    return null;
  }

  try {
    const contextPromise = sdk.context;
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 3000);
    });

    const context = await Promise.race([contextPromise, timeoutPromise]);
    
    if (context) {
      detectedAsMiniApp = true;
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
    } else {
      detectedAsMiniApp = false;
    }

    isInitialized = true;
    return cachedContext;
  } catch (error) {
    console.error("Failed to initialize Farcaster SDK:", error);
    detectedAsMiniApp = false;
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

export async function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'): Promise<void> {
  try {
    if (isMiniApp() && sdk.haptics?.impactOccurred) {
      await sdk.haptics.impactOccurred(type);
    }
  } catch (error) {
    console.error("Failed to trigger haptic:", error);
  }
}
