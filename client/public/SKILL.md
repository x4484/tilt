# TILT Skill

TILT is a bonding curve prediction game on Base where players choose a side — Up or Down — and bet on the market direction with $TILT tokens.

## Overview

- Players **mint** $TILT tokens by sending ETH along a quadratic bonding curve
- Every player is on a **side**: Up or Down
- The game starts in **Up Only** mode — minting automatically puts you on the Up side
- Once the game unlocks, players can **switch sides** to flip the market
- Players can **burn** tokens to reclaim ETH from the bonding curve
- Price follows the formula: `price = totalSupply²`

## Getting Started

### 1. Check the Market State

Before doing anything, read the current game state:

```bash
curl https://tiltgame.fun/api/contract/state
```

Response:
```json
{
  "totalSupply": "1736000",
  "ups": "1200000",
  "isUpOnly": true,
  "tvl": "1500000000000000",
  "currentPrice": "3013696000000"
}
```

Key fields:
- `totalSupply` — total $TILT tokens in circulation
- `ups` — tokens held by Up-side players (downs = totalSupply - ups)
- `isUpOnly` — if `true`, only minting is allowed (burning and switching are locked)
- `tvl` — total ETH locked in the contract (in wei)
- `currentPrice` — current price per token in ETH (in wei)

### 2. Check Your Position

If you already have a wallet with tokens:

```bash
curl https://tiltgame.fun/api/contract/user/0xYourAddress
```

Response:
```json
{
  "address": "0xYourAddress",
  "balance": "500",
  "side": 1
}
```

Side values: `0` = None, `1` = Up, `2` = Down.

### 3. Mint Tokens (Buy In)

Calculate the ETH cost first, then send a `mint` transaction.

```typescript
import { ethers } from "ethers";

const CONTRACT = "0x2F803DD094E65b2fD3070941c9ce6eacf4fa87d1";
const ABI = [
  "function mint(uint256 amount) external payable",
  "function mintFeesWithFee(uint256 amount) view returns (uint256)",
];

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new ethers.Contract(CONTRACT, ABI, signer);

const amount = 100; // tokens to mint
const cost = await contract.mintFeesWithFee(amount);

const tx = await contract.mint(amount, {
  value: cost,
  gasLimit: 200000,
});
await tx.wait();
```

After minting, report the activity:

```bash
curl -X POST https://tiltgame.fun/api/contract/activity \
  -H "Content-Type: application/json" \
  -d '{
    "type": "mint",
    "address": "0xYourAddress",
    "amount": "100",
    "txHash": "0xTransactionHash"
  }'
```

### 4. Switch Sides

When the game is not in Up Only mode (`isUpOnly: false`), switch your entire position to the other side:

```typescript
const ABI = ["function switchSides() external"];
const contract = new ethers.Contract(CONTRACT, ABI, signer);

const tx = await contract.switchSides({ gasLimit: 100000 });
await tx.wait();
```

Report the switch:

```bash
curl -X POST https://tiltgame.fun/api/contract/activity \
  -H "Content-Type: application/json" \
  -d '{
    "type": "switch",
    "address": "0xYourAddress",
    "amount": "500",
    "txHash": "0xTransactionHash",
    "newSide": 2
  }'
```

### 5. Burn Tokens (Cash Out)

Burn tokens to reclaim ETH. Only available when `isUpOnly` is `false`.

```typescript
const ABI = [
  "function burn(uint256 amount) external",
  "function burnRefundsAfterFee(uint256 amount) view returns (uint256)",
];
const contract = new ethers.Contract(CONTRACT, ABI, signer);

const amount = 50;
const refund = await contract.burnRefundsAfterFee(amount);
// refund is the ETH you'll receive (in wei)

const tx = await contract.burn(amount, { gasLimit: 150000 });
await tx.wait();
```

### 6. Monitor the Game

Watch real-time updates via WebSocket:

```typescript
const ws = new WebSocket("wss://tiltgame.fun/ws");

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case "contract_state":
      // Updated market state every 10 seconds
      console.log("State:", msg.data);
      break;
    case "leaderboard":
      // Top players on each side, every 15 seconds
      console.log("Up:", msg.data.up, "Down:", msg.data.down);
      break;
    case "new_activity":
      // Real-time mint/burn/switch events
      console.log("Activity:", msg.data);
      break;
  }
};

// Request data on demand
ws.send(JSON.stringify({ type: "get_contract_state" }));
ws.send(JSON.stringify({ type: "get_activities" }));
ws.send(JSON.stringify({ type: "get_leaderboard" }));
```

## Contract Details

| Field | Value |
|-------|-------|
| Network | Base (Chain ID 8453) |
| Contract | `0x2F803DD094E65b2fD3070941c9ce6eacf4fa87d1` |
| Token | $TILT |
| Curve | Quadratic (`price = supply²`) |
| Mint fee | 1% |
| Burn fee | 1% |

### Contract Functions

**Write (require transactions):**

| Function | Parameters | Purpose |
|----------|-----------|---------|
| `mint(uint256)` | amount of tokens | Buy tokens, sends ETH |
| `burn(uint256)` | amount of tokens | Sell tokens, receive ETH |
| `switchSides()` | none | Flip from Up to Down or vice versa |

**Read (free calls):**

| Function | Returns | Purpose |
|----------|---------|---------|
| `totalSupply()` | uint256 | Total tokens minted |
| `ups()` | uint256 | Tokens held by Up-side players |
| `isUpOnly()` | bool | Whether Down side is locked |
| `balanceOf(address)` | uint256 | Token balance for an address |
| `sides(address)` | uint8 | Side of an address (0/1/2) |
| `mintFees(uint256)` | uint256 | ETH cost before fee |
| `mintFeesWithFee(uint256)` | uint256 | ETH cost including 1% fee |
| `burnRefunds(uint256)` | uint256 | ETH refund before fee |
| `burnRefundsAfterFee(uint256)` | uint256 | ETH refund after 1% fee |

## API Reference

Base URL: `https://tiltgame.fun`

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contract/state` | GET | Current market state |
| `/api/contract/user/:address` | GET | User balance and side |
| `/api/contract/activities?limit=20` | GET | Recent activity feed |
| `/api/contract/leaderboard/up?limit=10` | GET | Top Up-side holders |
| `/api/contract/leaderboard/down?limit=10` | GET | Top Down-side holders |
| `/api/contract/activity` | POST | Report a mint/burn/switch |
| `/api/contract/leaderboard` | POST | Update leaderboard entry |
| `/api/health` | GET | Health check |

### WebSocket

Connect to `wss://tiltgame.fun/ws` for real-time updates.

**Server messages:**
- `contract_state` — market state (every 10s)
- `leaderboard` — top holders by side (every 15s)
- `activities` — full activity list
- `new_activity` — single new event

**Client requests:**
- `{ "type": "get_contract_state" }`
- `{ "type": "get_activities" }`
- `{ "type": "get_leaderboard" }`

## Strategy Tips

1. **Check `isUpOnly` first** — if `true`, you can only mint (joining Up). Burning and switching are locked
2. **Watch the supply split** — if 80% of tokens are on Up, a coordinated switch to Down could shift the game
3. **Bonding curve math** — price grows quadratically with supply. Early minters get cheaper tokens
4. **Monitor activity** — watch for large mints or side switches that signal market moves
5. **Gas limits** — use 200k for mint, 150k for burn, 100k for switch to avoid failed transactions

## Preflight Checklist

Before any transaction:

- [ ] Fetched `/api/contract/state` to check current game mode
- [ ] Checked your position via `/api/contract/user/:address`
- [ ] Verified `isUpOnly` status matches your intended action
- [ ] Calculated costs via `mintFeesWithFee()` or `burnRefundsAfterFee()`
- [ ] Confirmed wallet is connected to Base (Chain ID 8453)
- [ ] Reported activity to `/api/contract/activity` after successful tx
