# HackoBot - Autonomous Smart Money Intelligence Agent

> **Your AI-powered crypto research assistant that gives you smart money alpha**

Built for the **#NansenCLI Hackathon** | Powered by [Nansen CLI](https://agents.nansen.ai)

---

## What is HackoBot?

HackoBot is an **autonomous AI agent** that uses Nansen's powerful CLI as its "onchain lens" to:

- **Scan for alpha** - Automatically detect smart money accumulation patterns across Ethereum, Solana, and Base
- **Track whales** - Discover and profile top-performing smart money wallets
- **Research anything** - Ask the AI agent natural language questions about any token or wallet
- **Copy trade signals** - Get notified when tracked wallets make moves
- **Execute trades** - Quote and execute swaps directly from the terminal

## Features

### 1. Alpha Scanner
Scans multiple chains simultaneously to detect:
- Smart money accumulation patterns
- Volume breakouts with institutional interest
- DCA conviction signals
- Concentrated buying activity

### 2. Whale Tracker
- Discover top-performing smart money wallets
- Deep profile any address (PnL, holdings, trading style)
- Track wallets for real-time activity monitoring
- Identify related wallets and counterparties

### 3. AI Research Agent
- Natural language interface to Nansen's AI
- Deep token analysis with quantitative data
- Wallet profiling and strategy identification
- Market condition analysis and recommendations

### 4. Copy Trading Engine
- Follow smart money wallets
- Get trade recommendations based on whale holdings
- Quote and execute trades directly
- Risk-adjusted position sizing

## Installation

```bash
# Clone the repo
git clone https://github.com/Pradeeppilotdev/HackoBot.git
cd hackobot

# Install dependencies
npm install

# Make sure Nansen CLI is installed and logged in
npm install -g nansen-cli
nansen login --api-key YOUR_API_KEY
```

## Usage

### Run the Demo
```bash
npm run demo
# or
node src/index.js demo
```

### Scan for Alpha
```bash
# Scan all chains
node src/index.js scan

# Scan specific chain
node src/index.js scan --chain solana
```

### Discover Whales
```bash
# Find smart money on Ethereum
node src/index.js whales --chain ethereum --limit 10
```

### Research a Token
```bash
node src/index.js research PEPE --chain ethereum
```

### Ask the AI Agent
```bash
node src/index.js ask "What are the biggest smart money moves today?"

# Use expert mode for deeper analysis
node src/index.js ask "Analyze the current market conditions" --expert
```

### Profile a Wallet
```bash
node src/index.js profile 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain ethereum
```

### Get Swap Quotes
```bash
node src/index.js quote --chain base --from ETH --to USDC --amount 1000000000000000000
```

### Check Status
```bash
node src/index.js status
```

### Run GhostNet Dashboard
```bash
# Start web dashboard server
npm run dashboard

# Open in browser
# http://localhost:3000
```

### Run GhostNet CLI
```bash
node src/index.js ghostnet --chain ethereum
node src/index.js ghostnet --chain solana
```

## Architecture

```
hackobot/
├── src/
│   ├── index.js           # CLI interface
│   ├── server.js          # Dashboard backend (Express + SSE)
│   ├── core/
│   │   └── hackobot.js    # Main orchestrator
│   ├── modules/
│   │   ├── alpha-scanner.js   # Alpha signal detection
│   │   ├── whale-tracker.js   # Whale discovery & profiling
│   │   ├── ai-researcher.js   # AI-powered research
│   │   ├── copy-trader.js     # Copy trading engine
│   │   └── ghostnet.js        # Cross-market coordination intelligence
│   └── utils/
│       └── nansen.js      # Nansen CLI wrapper
├── dashboard/
│   ├── index.html         # GhostNet dashboard UI
│   ├── style.css          # Dashboard theme/styles
│   └── app.js             # Live SSE rendering logic
└── test/
    └── demo.js            # Demo test script
```

## Nansen CLI Commands Used

HackoBot leverages the full power of Nansen CLI:

| Command | Usage |
|---------|-------|
| `nansen research smart-money netflow` | Track smart money token flows |
| `nansen research smart-money dex-trades` | Monitor DEX trading activity |
| `nansen research smart-money holdings` | Analyze whale portfolios |
| `nansen research smart-money dcas` | Detect DCA patterns |
| `nansen research token screener` | Find trending tokens |
| `nansen research token flows` | Analyze token capital flows |
| `nansen research token holders` | Get top token holders |
| `nansen research profiler balance` | Check wallet balances |
| `nansen research profiler pnl-summary` | Analyze wallet PnL |
| `nansen research profiler labels` | Get wallet labels |
| `nansen research perp leaderboard` | Find top perp traders |
| `nansen agent` | AI-powered research assistant |
| `nansen trade quote` | Get swap quotes |
| `nansen account` | Check API status |

## Example Output

```
╔═══════════════════════════════════════════════════════════════════╗
║  ██╗  ██╗ █████╗  ██████╗██╗  ██╗ ██████╗ ██████╗  ██████╗ ████████╗ ║
║  ██║  ██║██╔══██╗██╔════╝██║ ██╔╝██╔═══██╗██╔══██╗██╔═══██╗╚══██╔══╝ ║
║  ███████║███████║██║     █████╔╝ ██║   ██║██████╔╝██║   ██║   ██║    ║
║  ██╔══██║██╔══██║██║     ██╔═██╗ ██║   ██║██╔══██╗██║   ██║   ██║    ║
║  ██║  ██║██║  ██║╚██████╗██║  ██╗╚██████╔╝██████╔╝╚██████╔╝   ██║    ║
║  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝    ╚═╝    ║
╠═══════════════════════════════════════════════════════════════════╣
║        Autonomous Smart Money Intelligence Agent                    ║
║        Powered by Nansen CLI • Built for #NansenCLI Hackathon      ║
╚═══════════════════════════════════════════════════════════════════╝

🎯 Top Alpha Signals (5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#1 ACCUMULATION
   Token: PEPE on ethereum
   Score: 87/100 🔥
   netInflow: $2.5M | smartMoneyBuyers: 7

#2 SMART_MONEY_BUYING
   Token: WIF on solana
   Score: 75/100 ⚡
   totalVolume: $890.2K | tradeCount: 12
```

## Why HackoBot?

1. **Comprehensive** - Uses ALL major Nansen CLI features in one cohesive agent
2. **Intelligent** - AI-powered analysis, not just raw data dumps
3. **Actionable** - Generates clear alpha signals with confidence scores
4. **Beautiful** - Rich terminal UI with colorful, easy-to-read output
5. **Extensible** - Modular architecture makes it easy to add features

## Hackathon Requirements Checklist

- [x] Install Nansen CLI ✅
- [x] Make 10+ API calls ✅ (demo makes 15+ calls)
- [x] Build something creative ✅
- [x] Share on X with @nansen_ai and #NansenCLI

## Future Improvements

- TUI dashboard with real-time updates
- Telegram/Discord alert integration
- Backtesting engine for strategies
- Multi-wallet portfolio tracking
- Automated copy trading execution

## License

MIT

## Repository

GitHub: https://github.com/Pradeeppilotdev/HackoBot
Site: https://ghostnetai.xyz

---

**Built with by the HackoBot Team for #NansenCLI Hackathon**

[@nansen_ai](https://twitter.com/nansen_ai) | [Nansen CLI Docs](https://docs.nansen.ai)
