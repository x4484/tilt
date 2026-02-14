import { useMemo } from "react";
import { BrowserProvider } from "ethers";
import { useWalletClient } from "wagmi";
import type { WalletClient } from "viem";

/**
 * Converts a viem WalletClient into an ethers.js v6 BrowserProvider.
 * This lets contract.ts stay unchanged since all its write functions
 * accept BrowserProvider.
 */
export function walletClientToBrowserProvider(
  walletClient: WalletClient,
): BrowserProvider {
  const { transport } = walletClient;
  return new BrowserProvider(transport, {
    chainId: walletClient.chain?.id,
    name: walletClient.chain?.name ?? "Base",
  });
}

/**
 * Hook returning an ethers BrowserProvider derived from the wagmi
 * wallet client. Returns undefined when no wallet is connected.
 */
export function useEthersBrowserProvider(): BrowserProvider | undefined {
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    if (!walletClient) return undefined;
    return walletClientToBrowserProvider(walletClient);
  }, [walletClient]);
}
