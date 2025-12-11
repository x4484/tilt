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

    const sendContractState = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'contract_state',
          data: storage.getContractState(),
        }));
      }
    };

    const sendActivities = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'activities',
          data: storage.getActivities(),
        }));
      }
    };

    const sendLeaderboard = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leaderboard',
          data: {
            up: storage.getLeaderboard('up'),
            down: storage.getLeaderboard('down'),
          },
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

  setInterval(() => {
    broadcast({
      type: 'contract_state',
      data: storage.getContractState(),
    });
  }, 10000);

  app.get('/api/contract/state', (req, res) => {
    res.json(storage.getContractState());
  });

  app.get('/api/contract/activities', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    res.json(storage.getActivities(limit));
  });

  app.get('/api/contract/leaderboard/:side', (req, res) => {
    const side = req.params.side as 'up' | 'down';
    if (side !== 'up' && side !== 'down') {
      return res.status(400).json({ error: 'Invalid side parameter' });
    }
    const limit = parseInt(req.query.limit as string) || 10;
    res.json(storage.getLeaderboard(side, limit));
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Post a new activity (called after successful transactions)
  app.post('/api/contract/activity', (req, res) => {
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
      
      storage.addActivity(activity);
      
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
  app.post('/api/contract/leaderboard', (req, res) => {
    try {
      const { address, balance, side } = req.body;
      
      if (!address || balance === undefined || side === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Get current leaderboards and update
      const targetSide = side === 1 ? 'up' : 'down';
      const currentLeaderboard = storage.getLeaderboard(targetSide, 100);
      
      // Find and update or add entry
      const existingIndex = currentLeaderboard.findIndex(e => e.address.toLowerCase() === address.toLowerCase());
      
      if (existingIndex >= 0) {
        currentLeaderboard[existingIndex].balance = balance.toString();
        currentLeaderboard[existingIndex].side = side;
      } else {
        currentLeaderboard.push({
          address,
          balance: balance.toString(),
          side,
          rank: currentLeaderboard.length + 1,
        });
      }
      
      // Re-sort and update ranks
      currentLeaderboard.sort((a, b) => parseInt(b.balance) - parseInt(a.balance));
      currentLeaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });
      
      storage.updateLeaderboard(currentLeaderboard);
      
      // Broadcast updated leaderboard
      broadcast({
        type: 'leaderboard',
        data: {
          up: storage.getLeaderboard('up'),
          down: storage.getLeaderboard('down'),
        },
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update leaderboard:', error);
      res.status(500).json({ error: 'Failed to update leaderboard' });
    }
  });

  // Update contract state
  app.post('/api/contract/state', (req, res) => {
    try {
      const { totalSupply, ups, isUpOnly, tvl, currentPrice } = req.body;
      
      storage.setContractState({
        totalSupply: totalSupply?.toString() || '0',
        ups: ups?.toString() || '0',
        isUpOnly: isUpOnly ?? true,
        tvl: tvl?.toString() || '0',
        currentPrice: currentPrice?.toString() || '0',
      });
      
      broadcast({
        type: 'contract_state',
        data: storage.getContractState(),
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update contract state:', error);
      res.status(500).json({ error: 'Failed to update contract state' });
    }
  });

  return httpServer;
}
