import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
        const state = await storage.getContractState();
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
        const [up, down] = await Promise.all([
          storage.getLeaderboard('up'),
          storage.getLeaderboard('down'),
        ]);
        ws.send(JSON.stringify({
          type: 'leaderboard',
          data: { up, down },
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
    const state = await storage.getContractState();
    broadcast({
      type: 'contract_state',
      data: state,
    });
  }, 10000);

  app.get('/api/contract/state', async (req, res) => {
    const state = await storage.getContractState();
    res.json(state);
  });

  app.get('/api/contract/activities', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const acts = await storage.getActivities(limit);
    res.json(acts);
  });

  app.get('/api/contract/leaderboard/:side', async (req, res) => {
    const side = req.params.side as 'up' | 'down';
    if (side !== 'up' && side !== 'down') {
      return res.status(400).json({ error: 'Invalid side parameter' });
    }
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await storage.getLeaderboard(side, limit);
    res.json(leaderboard);
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
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
      
      // Update entry directly
      await storage.updateLeaderboard([{
        address,
        balance: balance.toString(),
        side,
        rank: 0,
      }]);
      
      // Broadcast updated leaderboard
      const [up, down] = await Promise.all([
        storage.getLeaderboard('up'),
        storage.getLeaderboard('down'),
      ]);
      
      broadcast({
        type: 'leaderboard',
        data: { up, down },
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update leaderboard:', error);
      res.status(500).json({ error: 'Failed to update leaderboard' });
    }
  });

  // Update contract state
  app.post('/api/contract/state', async (req, res) => {
    try {
      const { totalSupply, ups, isUpOnly, tvl, currentPrice } = req.body;
      
      await storage.setContractState({
        totalSupply: totalSupply?.toString() || '0',
        ups: ups?.toString() || '0',
        isUpOnly: isUpOnly ?? true,
        tvl: tvl?.toString() || '0',
        currentPrice: currentPrice?.toString() || '0',
      });
      
      const state = await storage.getContractState();
      broadcast({
        type: 'contract_state',
        data: state,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update contract state:', error);
      res.status(500).json({ error: 'Failed to update contract state' });
    }
  });

  return httpServer;
}
