# TILT Farcaster Mini App - Design Guidelines

## Design Approach

**Reference-Based Design**: Use the provided reference image as the primary visual foundation. This is a crypto/gaming application requiring bold, engaging visuals that communicate excitement and real-time action.

**Farcaster Mini App Constraints**:
- Mobile-first vertical modal (424x695px web, device dimensions mobile)
- Minimal chrome - maximize content area
- Splash screen with 200x200px icon required
- Must call `sdk.actions.ready()` after load

## Typography System

**Font Stack**: Inter for UI, SF Pro for iOS native feel
- Display/Headers: 24-32px, Bold (600-700 weight)
- Section Titles: 18-20px, Semibold (600 weight)
- Body/Stats: 14-16px, Medium (500 weight)
- Captions/Labels: 12-14px, Regular (400 weight)
- Monospace for addresses/numbers: SF Mono or Roboto Mono

**Hierarchy**:
- Hero stats (total supply, ups count): Largest, bold
- Action buttons: 16px, medium weight
- Data labels: 12px, uppercase, spaced tracking
- Live feed items: 14px regular

## Layout & Spacing System

**Tailwind Spacing Primitives**: Use units of 2, 4, 6, 8, 12, 16
- Section padding: p-4 to p-6 (mobile), p-6 to p-8 (desktop)
- Card padding: p-4
- Component gaps: gap-4 to gap-6
- Button padding: px-6 py-3
- Tight groupings: gap-2

**Grid Structure**:
- Single column for mobile (w-full)
- Stats grid: 2 columns for key metrics (grid-cols-2 gap-4)
- Activity feed: Single column list
- Leaderboard: Single column with rank-based rows

## Component Library

### Core Stats Dashboard
**Position**: Top of app, immediately visible
- Large display cards for Total Supply, Ups Count, isUpOnly status
- 2-column grid layout
- Each stat: Icon/emoji + label + large number + trend indicator
- Height: auto, content-based (avoid forced viewport heights)

### Bonding Curve Visualization
- Interactive price chart showing token price progression
- X-axis: Supply, Y-axis: Price
- Current position marker
- Minimal, clean chart with gridlines
- Height: ~200-250px

### Action Cards
**Mint Card**:
- ETH input field with dynamic fee calculation displayed below
- Real-time update of fees as user types
- Large primary button "Mint Tokens"
- Disabled state when Down Only active with clear messaging

**Burn Card**:
- Token amount input with refund calculation
- Shows expected ETH return
- Large destructive-styled button "Burn for Refund"
- Disabled state when Up Only active

**Switch Sides Card**:
- Current side indicator (Up/Down badge)
- Toggle/button to switch
- Explanation of what switching does
- Show impact on global Up count

### Live Activity Feed
- Scrollable list of recent events
- Each item: Address (truncated) + Action (Mint/Burn/Switch) + Amount + Timestamp
- Compact rows with clear visual separation
- Auto-updating in real-time using contract events
- Max height: ~250px with scroll

### Leaderboard
- Two sections: "Top Up Holders" and "Top Down Holders"
- Rank number + Address (truncated) + Token Amount
- Top 5-10 per category
- Condensed rows, clear ranking

### User Wallet Panel
**Position**: Sticky or prominent near top
- Connected address (truncated with copy button)
- Personal balance display
- Current side badge (UP/DOWN with visual distinction)
- Quick stats: "Your Tokens" + "Your Side"

### Navigation/Header
- Minimal: App title "TILT" + wallet connection status
- Optional info icon linking to rules/explanation
- Farcaster's native header will show app name

## Mobile Optimization

**Touch Targets**: Minimum 44x44px for all interactive elements
**Input Fields**: Large, easy to tap, clear focus states
**Buttons**: Full-width or near full-width (with side margins)
**Spacing**: Generous tap zones, avoid cramped layouts
**Scrolling**: Natural, smooth scrolling for activity feed and leaderboard
**Fixed Elements**: Consider sticky user stats panel at top

## Component Patterns

**Cards**: Rounded corners (rounded-lg or rounded-xl), subtle borders, clear content grouping
**Inputs**: Clear labels above, helper text below, validation messages inline
**Buttons**: 
- Primary actions: Bold, prominent
- Secondary actions: Outlined or ghost style
- Disabled states: Reduced opacity with clear messaging why
**Badges**: Pill-shaped for side indicators (UP/DOWN)
**Status Indicators**: Use icons + text for isUpOnly/isDownOnly state

## Information Architecture

**Vertical Flow** (top to bottom):
1. User wallet panel (personal stats)
2. Global stats dashboard (total supply, ups count, isUpOnly)
3. Bonding curve visualization
4. Action cards (Mint, Burn, Switch Sides)
5. Live activity feed
6. Leaderboards

**Sectioning**: Clear visual breaks between major sections using spacing (my-6 to my-8)

## Images

**Splash Screen**: 200x200px TILT logo/icon on appropriate background
**Embed Image**: 3:2 aspect ratio image showing app preview/branding for social feeds
**No hero image needed** - This is a functional app, not a marketing page. Lead with data and actions.

## Critical Constraints

- Call `sdk.actions.ready()` after initial render to hide splash
- All contract interactions through Farcaster Ethereum provider
- Handle loading states for blockchain calls
- Clear error messaging for failed transactions
- Real-time updates using contract event listeners
- Responsive down to 320px width minimum