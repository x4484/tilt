# TILT Farcaster Mini App

A Farcaster mini app for the TILT bonding-curve game on Base blockchain.

## Overview

TILT is a bonding curve token game where players can:
- **Mint** tokens at the current bonding curve price
- **Burn** tokens to reclaim ETH from the curve
- **Switch Sides** between Humans and Agents factions
- View real-time activity feed and leaderboards

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js with WebSocket support
- **Blockchain**: Base (L2) via ethers.js/viem
- **Farcaster**: @farcaster/miniapp-sdk for frame integration
- **Styling**: Tailwind CSS with dark theme + neon green accents

## Project Structure

```
client/
  src/
    components/      # UI components (StatsPanel, MintCard, etc.)
    context/         # TiltContext for global state management
    lib/             # Farcaster SDK and contract utilities
    pages/           # Page components (TiltApp)
server/
  routes.ts          # API endpoints for contract data
  storage.ts         # In-memory storage (demo data)
shared/
  schema.ts          # Shared TypeScript types/schemas
```

## Configuration

### Environment Variables

- `VITE_CONTRACT_ADDRESS`: TILT contract address on Base (required for live contract interaction)
- `SESSION_SECRET`: Express session secret

### Contract Integration

When `VITE_CONTRACT_ADDRESS` is not set, the app uses demo data for visualization. Once set, it will:
1. Connect to Base RPC for contract reads
2. Use Farcaster's wallet provider for transactions
3. Fetch live state from the bonding curve contract

### Wallet Connection

The app supports two wallet connection modes:

1. **Farcaster Mini App**: When running inside a Farcaster frame, uses `sdk.wallet.ethProvider` from the Farcaster SDK
2. **Web Browser**: When running in a regular browser, uses `window.ethereum` (MetaMask, Coinbase Wallet, etc.)

If no wallet is detected in the browser, an error message prompts the user to install MetaMask or another Web3 wallet.

## API Endpoints

- `GET /api/contract/state` - Current contract state (supply, ups, TVL, price)
- `GET /api/contract/activities` - Recent activity feed
- `GET /api/contract/leaderboard/humans` - Top Humans-side holders
- `GET /api/contract/leaderboard/agents` - Top Agents-side holders
- `POST /api/contract/user` - Get user balance and side

## WebSocket

Connect to `/ws` for real-time updates on:
- Contract state changes (`contract_state`)
- New activity events (`new_activity` for individual events, `activities` for full list)
- Leaderboard updates (`leaderboard`)

The frontend TiltContext automatically connects to WebSocket and handles:
- Real-time contract state updates
- Incremental activity updates (prepends new activities with deduplication)
- Leaderboard updates for both Humans and Agents factions
- Automatic reconnection with exponential backoff

## Farcaster Mini App

The app follows Farcaster mini app specifications:
- Uses `@farcaster/miniapp-sdk` for context and wallet integration
- Signals ready via `sdk.actions.ready()` after initialization
- Accesses user wallet via `sdk.wallet.ethProvider`
- Supports frame embed with proper meta tags

## Design

- Dark theme with pure black background (`#0a0a0a`)
- Neon green accent color (`#39ff14`)
- Mobile-first responsive layout (424x695px web, device dimensions mobile)
- Consistent spacing and typography per design_guidelines.md

## Running

```bash
npm run dev
```

The app serves on port 5000 with both frontend and backend.
