import { ethers } from "ethers";
import { TILT_ABI, BASE_RPC_URL } from "@shared/schema";

const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS || "0x2F803DD094E65b2fD3070941c9ce6eacf4fa87d1";
const RPC_URL = process.env.VITE_ALCHEMY_RPC_URL || BASE_RPC_URL;

let provider: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

function getContract(): ethers.Contract {
  return new ethers.Contract(CONTRACT_ADDRESS, TILT_ABI, getProvider());
}

export interface ContractState {
  totalSupply: string;
  ups: string;
  isUpOnly: boolean;
  tvl: string;
  currentPrice: string;
}

export async function fetchContractStateFromChain(): Promise<ContractState> {
  try {
    const contract = getContract();
    const rpcProvider = getProvider();
    
    const [totalSupply, ups, isUpOnly, balance] = await Promise.all([
      contract.totalSupply(),
      contract.ups(),
      contract.isUpOnly(),
      rpcProvider.getBalance(CONTRACT_ADDRESS),
    ]);

    const totalSupplyNum = BigInt(totalSupply.toString());
    const currentPrice = totalSupplyNum > BigInt(0) 
      ? (totalSupplyNum * totalSupplyNum) 
      : BigInt(1);

    return {
      totalSupply: totalSupply.toString(),
      ups: ups.toString(),
      isUpOnly: isUpOnly,
      tvl: ethers.formatEther(balance),
      currentPrice: ethers.formatEther(currentPrice),
    };
  } catch (error) {
    console.error("Failed to fetch contract state from chain:", error);
    return {
      totalSupply: "0",
      ups: "0",
      isUpOnly: true,
      tvl: "0",
      currentPrice: "0",
    };
  }
}

export async function fetchUserStateFromChain(address: string): Promise<{ balance: string; side: number }> {
  try {
    const contract = getContract();
    
    const [balance, side] = await Promise.all([
      contract.balanceOf(address),
      contract.sides(address),
    ]);

    return {
      balance: balance.toString(),
      side: Number(side),
    };
  } catch (error) {
    console.error("Failed to fetch user state from chain:", error);
    return {
      balance: "0",
      side: 0,
    };
  }
}
