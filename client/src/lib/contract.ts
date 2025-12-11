import { ethers, BrowserProvider, Contract, formatEther, parseEther, type Eip1193Provider } from "ethers";
import { TILT_ABI, BASE_CHAIN_ID, BASE_RPC_URL, Side } from "@shared/schema";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

export function getContractAddress(): string {
  return CONTRACT_ADDRESS;
}

export function isContractConfigured(): boolean {
  return CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
}

export async function getReadOnlyProvider(): Promise<ethers.JsonRpcProvider> {
  return new ethers.JsonRpcProvider(BASE_RPC_URL);
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
  
  const [balance, side] = await Promise.all([
    contract.balanceOf(address),
    contract.sides(address),
  ]);

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
  const tx = await contract.mint(amount, { value: parseEther(fees) });
  return tx.wait();
}

export async function burn(provider: BrowserProvider, amount: string) {
  const contract = await getSignerContract(provider);
  const tx = await contract.burn(amount);
  return tx.wait();
}

export async function switchSides(provider: BrowserProvider) {
  const contract = await getSignerContract(provider);
  const tx = await contract.switchSides();
  return tx.wait();
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
