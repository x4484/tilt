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

  return httpServer;
}
