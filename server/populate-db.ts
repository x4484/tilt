import { ethers } from "ethers";
import { db } from "./db";
import { activities, leaderboardEntries } from "@shared/schema";
import { fetchUserStateFromChain } from "./blockchain";
import { eq } from "drizzle-orm";

const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS || "0x2F803DD094E65b2fD3070941c9ce6eacf4fa87d1";
const RPC_URL = "https://mainnet.base.org";

const TILT_FULL_ABI = [
  "event Mint(address indexed addr, uint256 amount, uint256 totalSupply)",
  "event Burn(address indexed addr, uint256 amount, uint256 totalSupply)",
  "event SwitchSides(address indexed addr, uint8 side, uint256 amount)",
];

async function fetchLogsFromRPC(): Promise<ethers.Log[]> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const iface = new ethers.Interface(TILT_FULL_ABI);
  
  const mintTopic = iface.getEvent("Mint")?.topicHash;
  const burnTopic = iface.getEvent("Burn")?.topicHash;
  const switchTopic = iface.getEvent("SwitchSides")?.topicHash;

  console.log("Fetching logs from RPC...");
  console.log(`RPC URL: ${RPC_URL}`);
  
  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);
  
  const allLogs: ethers.Log[] = [];

  for (const topic of [mintTopic, burnTopic, switchTopic]) {
    if (!topic) continue;
    
    console.log(`Fetching logs for topic ${topic}...`);
    
    try {
      const logs = await provider.getLogs({
        address: CONTRACT_ADDRESS,
        topics: [topic],
        fromBlock: 0,
        toBlock: "latest",
      });
      
      allLogs.push(...logs);
      console.log(`Found ${logs.length} logs`);
    } catch (err) {
      console.error(`Failed to fetch logs for topic ${topic}:`, err);
    }
  }

  return allLogs.sort((a, b) => a.blockNumber - b.blockNumber);
}

async function getBlockTimestamp(provider: ethers.JsonRpcProvider, blockNumber: number): Promise<number> {
  const block = await provider.getBlock(blockNumber);
  return block ? block.timestamp * 1000 : Date.now();
}

async function parseAndStoreEvents(logs: ethers.Log[]) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const iface = new ethers.Interface(TILT_FULL_ABI);
  const uniqueAddresses = new Set<string>();
  let activitiesCount = 0;

  console.log(`Processing ${logs.length} logs...`);

  const blockTimestamps = new Map<number, number>();

  for (const log of logs) {
    try {
      const parsed = iface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (!parsed) continue;

      const address = parsed.args[0] as string;
      uniqueAddresses.add(address.toLowerCase());

      const eventId = `tx-${log.transactionHash}`;
      
      let timestamp = blockTimestamps.get(log.blockNumber);
      if (!timestamp) {
        timestamp = await getBlockTimestamp(provider, log.blockNumber);
        blockTimestamps.set(log.blockNumber, timestamp);
      }

      const existing = await db.select().from(activities).where(eq(activities.eventId, eventId)).limit(1);
      if (existing.length > 0) {
        console.log(`Skipping duplicate: ${eventId}`);
        continue;
      }

      if (parsed.name === "Mint") {
        await db.insert(activities).values({
          eventId,
          type: "mint",
          address: address,
          amount: parsed.args[1].toString(),
          timestamp,
          txHash: log.transactionHash,
          newSide: 1,
        });
        activitiesCount++;
        console.log(`Added mint: ${address} - ${parsed.args[1].toString()}`);
      } else if (parsed.name === "Burn") {
        await db.insert(activities).values({
          eventId,
          type: "burn",
          address: address,
          amount: parsed.args[1].toString(),
          timestamp,
          txHash: log.transactionHash,
        });
        activitiesCount++;
        console.log(`Added burn: ${address} - ${parsed.args[1].toString()}`);
      } else if (parsed.name === "SwitchSides") {
        await db.insert(activities).values({
          eventId,
          type: "switch",
          address: address,
          amount: parsed.args[2].toString(),
          timestamp,
          txHash: log.transactionHash,
          newSide: Number(parsed.args[1]),
        });
        activitiesCount++;
        console.log(`Added switch: ${address} - side ${parsed.args[1]}`);
      }
    } catch (err) {
      console.error(`Failed to parse log:`, err);
    }
  }

  console.log(`\nAdded ${activitiesCount} activities`);
  console.log(`Found ${uniqueAddresses.size} unique addresses`);

  console.log(`\nUpdating leaderboard entries...`);
  for (const address of Array.from(uniqueAddresses)) {
    try {
      const userState = await fetchUserStateFromChain(address);
      
      if (parseInt(userState.balance) > 0) {
        const existing = await db.select()
          .from(leaderboardEntries)
          .where(eq(leaderboardEntries.address, address.toLowerCase()))
          .limit(1);

        if (existing.length > 0) {
          await db.update(leaderboardEntries)
            .set({
              balance: userState.balance,
              side: userState.side,
            })
            .where(eq(leaderboardEntries.address, address.toLowerCase()));
        } else {
          await db.insert(leaderboardEntries).values({
            address: address.toLowerCase(),
            balance: userState.balance,
            side: userState.side,
          });
        }
        console.log(`Leaderboard: ${address} - ${userState.balance} tokens, side ${userState.side}`);
      } else {
        console.log(`Skipping ${address} - zero balance`);
      }
    } catch (err) {
      console.error(`Failed to update leaderboard for ${address}:`, err);
    }
  }

  console.log(`\nDatabase population complete!`);
}

async function main() {
  console.log("Starting database population from contract events...");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  
  try {
    const logs = await fetchLogsFromRPC();
    await parseAndStoreEvents(logs);
  } catch (err) {
    console.error("Failed to populate database:", err);
    process.exit(1);
  }
}

main();
