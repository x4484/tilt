import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { fetchContractStateFromChain } from "./blockchain";
import { db } from "./db";
import { farcasterUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Farcaster manifest redirect
  app.get('/.well-known/farcaster.json', (req, res) => {
    res.redirect(307, 'https://api.farcaster.xyz/miniapps/hosted-manifest/019b0cac-de5f-ddfe-2c05-638a060c4f07');
  });

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WebSocket client connected');

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to TILT WebSocket server',
    }));

    const sendContractState = async () => {
      if (ws.readyState === WebSocket.OPEN) {
        const state = await fetchContractStateFromChain();
        ws.send(JSON.stringify({
          type: 'contract_state',
          data: state,
        }));
      }
    };

    const sendActivities = async () => {
      if (ws.readyState === WebSocket.OPEN) {
        const acts = await storage.getActivities();
        ws.send(JSON.stringify({
          type: 'activities',
          data: acts,
        }));
      }
    };

    const sendLeaderboard = async () => {
      if (ws.readyState === WebSocket.OPEN) {
        const [humans, agents] = await Promise.all([
          storage.getLeaderboard('humans'),
          storage.getLeaderboard('agents'),
        ]);
        ws.send(JSON.stringify({
          type: 'leaderboard',
          data: { humans, agents },
        }));
      }
    };

    sendContractState();
    sendActivities();
    sendLeaderboard();

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'get_contract_state':
            sendContractState();
            break;
          case 'get_activities':
            sendActivities();
            break;
          case 'get_leaderboard':
            sendLeaderboard();
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  const broadcast = (message: unknown) => {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  };

  setInterval(async () => {
    const state = await fetchContractStateFromChain();
    broadcast({
      type: 'contract_state',
      data: state,
    });
  }, 10000);

  // Broadcast leaderboard every 15 seconds
  setInterval(async () => {
    const [humans, agents] = await Promise.all([
      storage.getLeaderboard('humans'),
      storage.getLeaderboard('agents'),
    ]);
    broadcast({
      type: 'leaderboard',
      data: { humans, agents },
    });
  }, 15000);

  app.get('/api/contract/state', async (req, res) => {
    const state = await fetchContractStateFromChain();
    res.json(state);
  });

  app.get('/api/contract/activities', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const acts = await storage.getActivities(limit);
    res.json(acts);
  });

  app.get('/api/contract/leaderboard/:side', async (req, res) => {
    const side = req.params.side as 'humans' | 'agents';
    if (side !== 'humans' && side !== 'agents') {
      return res.status(400).json({ error: 'Invalid side parameter' });
    }
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await storage.getLeaderboard(side, limit);
    res.json(leaderboard);
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Get user state from blockchain (production-ready endpoint)
  app.get('/api/contract/user/:address', async (req, res) => {
    const { address } = req.params;
    try {
      const { fetchUserStateFromChain } = await import('./blockchain');
      const state = await fetchUserStateFromChain(address);
      res.json({ address, ...state });
    } catch (error) {
      console.error('Failed to fetch user state:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

  // Resolve addresses to Farcaster usernames via Neynar API
  app.get('/api/farcaster/users', async (req, res) => {
    try {
      const addresses = req.query.addresses as string;
      if (!addresses) {
        return res.status(400).json({ error: 'addresses parameter required' });
      }

      const addressList = addresses.split(',').map(a => a.toLowerCase().trim());
      const result: Record<string, { username: string; pfpUrl?: string }> = {};
      const uncachedAddresses: string[] = [];

      // Check database cache first
      const now = Date.now();
      for (const addr of addressList) {
        try {
          const [cached] = await db.select().from(farcasterUsers).where(eq(farcasterUsers.address, addr));
          if (cached && now - cached.updatedAt < CACHE_TTL) {
            result[addr] = { username: cached.username, pfpUrl: cached.pfpUrl || undefined };
          } else {
            uncachedAddresses.push(addr);
          }
        } catch {
          uncachedAddresses.push(addr);
        }
      }

      // Fetch uncached addresses from Neynar
      if (uncachedAddresses.length > 0 && process.env.NEYNAR_API_KEY) {
        try {
          const neynarResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${uncachedAddresses.join(',')}`,
            {
              headers: {
                'x-api-key': process.env.NEYNAR_API_KEY,
              },
            }
          );

          if (neynarResponse.ok) {
            const data = await neynarResponse.json();
            // Response is keyed by address
            for (const [addr, users] of Object.entries(data)) {
              const userArray = users as Array<{ username: string; pfp_url?: string }>;
              if (userArray && userArray.length > 0) {
                const user = userArray[0];
                const lowerAddr = addr.toLowerCase();
                result[lowerAddr] = { 
                  username: user.username, 
                  pfpUrl: user.pfp_url 
                };
                
                // Save to database
                try {
                  const existing = await db.select().from(farcasterUsers).where(eq(farcasterUsers.address, lowerAddr));
                  if (existing.length > 0) {
                    await db.update(farcasterUsers)
                      .set({ username: user.username, pfpUrl: user.pfp_url, updatedAt: now })
                      .where(eq(farcasterUsers.address, lowerAddr));
                  } else {
                    await db.insert(farcasterUsers).values({
                      address: lowerAddr,
                      username: user.username,
                      pfpUrl: user.pfp_url,
                      updatedAt: now,
                    });
                  }
                } catch (dbError) {
                  console.error('Failed to cache username:', dbError);
                }
              }
            }
          }
        } catch (neynarError) {
          console.error('Neynar API error:', neynarError);
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Failed to resolve addresses:', error);
      res.status(500).json({ error: 'Failed to resolve addresses' });
    }
  });

  // Post a new activity (called after successful transactions)
  app.post('/api/contract/activity', async (req, res) => {
    try {
      const { type, address, amount, txHash, newSide } = req.body;
      
      if (!type || !address || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const activity = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: type as 'mint' | 'burn' | 'switch',
        address,
        amount: amount.toString(),
        timestamp: Date.now(),
        txHash,
        newSide,
      };
      
      await storage.addActivity(activity);
      
      // Broadcast to all WebSocket clients
      broadcast({
        type: 'new_activity',
        data: activity,
      });
      
      res.json({ success: true, activity });
    } catch (error) {
      console.error('Failed to add activity:', error);
      res.status(500).json({ error: 'Failed to add activity' });
    }
  });

  // Update leaderboard entry
  app.post('/api/contract/leaderboard', async (req, res) => {
    try {
      const { address, balance, side } = req.body;
      
      if (!address || balance === undefined || side === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Update leaderboard entry in database (for fast leaderboard queries)
      await storage.updateLeaderboard([{
        address,
        balance: balance.toString(),
        side,
        rank: 0,
      }]);
      
      // Broadcast updated leaderboard and fresh contract state from chain
      const [humans, agents, state] = await Promise.all([
        storage.getLeaderboard('humans'),
        storage.getLeaderboard('agents'),
        fetchContractStateFromChain(),
      ]);

      broadcast({
        type: 'leaderboard',
        data: { humans, agents },
      });
      
      broadcast({
        type: 'contract_state',
        data: state,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update leaderboard:', error);
      res.status(500).json({ error: 'Failed to update leaderboard' });
    }
  });

  return httpServer;
}
