import { ethers, BrowserProvider, Contract, formatEther, parseEther, type Eip1193Provider } from "ethers";
import { TILT_ABI, BASE_CHAIN_ID, BASE_RPC_URL, Side } from "@shared/schema";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const RPC_URL = import.meta.env.VITE_ALCHEMY_RPC_URL || BASE_RPC_URL;

export function getContractAddress(): string {
  return CONTRACT_ADDRESS;
}

export function isContractConfigured(): boolean {
  return CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
}

export async function getReadOnlyProvider(): Promise<ethers.JsonRpcProvider> {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export async function getProvider(ethereumProvider: Eip1193Provider): Promise<BrowserProvider> {
  const provider = new BrowserProvider(ethereumProvider);
  return provider;
}

export async function getContract(provider: ethers.Provider): Promise<Contract> {
  return new Contract(CONTRACT_ADDRESS, TILT_ABI, provider);
}

export async function getSignerContract(provider: BrowserProvider): Promise<Contract> {
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, TILT_ABI, signer);
}

export async function fetchContractState(provider: ethers.Provider) {
  const contract = await getContract(provider);
  
  const [totalSupply, ups, isUpOnly] = await Promise.all([
    contract.totalSupply(),
    contract.ups(),
    contract.isUpOnly(),
  ]);

  const balance = await provider.getBalance(CONTRACT_ADDRESS);
  
  const totalSupplyNum = BigInt(totalSupply.toString());
  const currentPrice = totalSupplyNum > BigInt(0) 
    ? (totalSupplyNum * totalSupplyNum) 
    : BigInt(1);

  return {
    totalSupply: totalSupply.toString(),
    ups: ups.toString(),
    isUpOnly: isUpOnly,
    tvl: formatEther(balance),
    currentPrice: formatEther(currentPrice),
  };
}

export async function fetchUserState(provider: ethers.Provider, address: string) {
  const contract = await getContract(provider);
  
  console.log("Fetching user state for:", address);
  
  const [balance, side] = await Promise.all([
    contract.balanceOf(address),
    contract.sides(address),
  ]);

  console.log("User state from RPC:", { address, balance: balance.toString(), side: Number(side) });

  return {
    address,
    balance: balance.toString(),
    side: Number(side) as Side,
  };
}

export async function fetchMintFees(provider: ethers.Provider, amount: string) {
  const contract = await getContract(provider);
  // Use mintFeesWithFee to get total cost including 1% fee
  const fees = await contract.mintFeesWithFee(amount);
  return {
    fees: formatEther(fees),
    amount,
  };
}

export async function fetchBurnRefunds(provider: ethers.Provider, amount: string) {
  const contract = await getContract(provider);
  // Use burnRefundsAfterFee to get net refund after 1% fee
  const refund = await contract.burnRefundsAfterFee(amount);
  return {
    refund: formatEther(refund),
    amount,
  };
}

export async function mint(provider: BrowserProvider, amount: string, fees: string) {
  const contract = await getSignerContract(provider);
  // Add 2% buffer to fees to account for any rounding differences
  const feesWei = parseEther(fees);
  const buffer = feesWei / BigInt(50); // 2% buffer
  const valueWithBuffer = feesWei + buffer;
  
  console.log("Minting:", { amount, fees, feesWei: feesWei.toString(), valueWithBuffer: valueWithBuffer.toString() });
  
  // Set explicit gas limit to avoid gas estimation issues
  const tx = await contract.mint(amount, { 
    value: valueWithBuffer,
    gasLimit: 200000n // Explicit gas limit to skip estimation
  });
  
  // Try to wait for receipt, but handle providers that don't support it
  try {
    return await tx.wait();
  } catch (err: unknown) {
    // Some wallets (like Farcaster) don't support eth_getTransactionReceipt
    const error = err as { code?: number };
    if (error.code === 4200 || (err instanceof Error && err.message.includes('unsupported'))) {
      console.log("Transaction submitted:", tx.hash);
      return { hash: tx.hash, status: 1 }; // Return success with hash
    }
    throw err;
  }
}

export async function burn(provider: BrowserProvider, amount: string) {
  const contract = await getSignerContract(provider);
  const tx = await contract.burn(amount, { gasLimit: 150000n });
  
  try {
    return await tx.wait();
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error.code === 4200 || (err instanceof Error && err.message.includes('unsupported'))) {
      console.log("Transaction submitted:", tx.hash);
      return { hash: tx.hash, status: 1 };
    }
    throw err;
  }
}

export async function switchSides(provider: BrowserProvider) {
  const contract = await getSignerContract(provider);
  const tx = await contract.switchSides({ gasLimit: 100000n });
  
  try {
    return await tx.wait();
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error.code === 4200 || (err instanceof Error && err.message.includes('unsupported'))) {
      console.log("Transaction submitted:", tx.hash);
      return { hash: tx.hash, status: 1 };
    }
    throw err;
  }
}

export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(amount: string): string {
  const num = parseInt(amount, 10);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}k`;
  }
  return num.toString();
}

export function formatEthAmount(amount: string): string {
  const num = parseFloat(amount);
  if (num < 0.000001) {
    return "< 0.000001";
  }
  if (num < 0.01) {
    return num.toFixed(8);
  }
  if (num < 1) {
    return num.toFixed(6);
  }
  return num.toFixed(4);
}
