# 🏛️ The Arena — AI Multi-Agent Trading Signal System

> A self-competing pool of 5 AI trading agents, each using a distinct strategy, that analyze XAUUSD and Forex markets via TradingView MCP, emit structured trade signals during the New York session, and are subject to weekly elimination if they underperform — with the weakest agent auto-mutated and replaced.

**⚠️ Disclaimer:** This system is for educational and signal-generation purposes only. All signals are not financial advice. Trading involves significant risk.

---

## Quick Start

```bash
cd arena-cli

# 1. Install dependencies
npm install

# 2. Setup database
npm run db:migrate
npm run db:seed

# 3. Run tests
npm test

# 4. Start in dry-run mode
npm run dev -- start --dry-run

# 5. Start dashboard (separate terminal)
cd dashboard && npm install && npm run dev
```

---

## Project Status

| Phase | Status | Details |
|-------|--------|---------|
| Phase 0: Project Setup | ✅ Complete | TypeScript monorepo, config, env |
| Phase 1: Data Layer | ✅ Complete | SQLite, Drizzle ORM, MCP client, payload builder |
| Phase 2: Agent System | ✅ Complete | 5 agents, Gemini API runner, risk manager, scheduler |
| Phase 3: Signal Pipeline | ✅ Complete | Orchestrator, price monitor, Telegram bot |
| Phase 4: Elimination | ✅ Complete | Weekly scoring, mutation engine |
| Phase 5: Dashboard | ✅ Complete | Next.js web app (5 pages), REST API |
| Phase 6: Testing & Docs | ✅ Complete | 22 tests, migration/seed scripts, full docs |

---

## System Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Scheduler  │────▶│  TradingView MCP │────▶│  Agent Pool  │
│  (node-cron)│     │  (chart + data)  │     │  (5 agents)  │
└─────────────┘     └──────────────────┘     └──────┬───────┘
                                                     │
                                    ┌────────────────┼────────────────┐
                                    ▼                ▼                ▼
                           ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
                           │ Risk Manager│  │ Signal DB   │  │ Telegram Bot │
                           └─────────────┘  └─────────────┘  └──────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────┐
                                         │ Performance │
                                         │  Tracker    │
                                         └──────┬──────┘
                                                │
                                                ▼
                                       ┌──────────────┐
                                       │ Elimination  │
                                       │   Engine     │
                                       └──────────────┘
```

## Agents (5 Strategies)

| Agent | Strategy | Core Logic |
|-------|----------|------------|
| AGENT-01 | ICT Concepts | Order blocks, FVG, liquidity sweeps, CISD |
| AGENT-02 | SMC | BOS, CHoCH, demand/supply zones |
| AGENT-03 | Support & Resistance | Key S/R levels, round numbers |
| AGENT-04 | RSI + Price Action | RSI divergence, OB/OS + candlesticks |
| AGENT-05 | MACD Momentum | MACD crossover, histogram divergence |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Inference | Gemini API (`qwen -p` with `gemini-2.0-flash`) |
| Orchestrator | Node.js + TypeScript |
| TradingView | tradingview-mcp (local MCP server) |
| Database | SQLite (better-sqlite3 + Drizzle ORM) |
| Telegram | Telegraf |
| Scheduler | node-cron |
| Dashboard | Next.js |
| Logging | Pino |

---

## Project Structure

```
arena-cli/
├── src/
│   ├── orchestrator/       # Main scheduler and session manager
│   ├── mcp/                # TradingView MCP client
│   ├── agents/             # Agent pool, runner, prompts
│   ├── risk/               # Global risk manager
│   ├── signals/            # Signal DB and price monitor
│   ├── telegram/           # Telegram bot
│   ├── elimination/        # Weekly elimination + mutation
│   ├── shared/             # Config, logger, types
│   └── dashboard/          # Next.js dashboard server
├── dashboard/              # Next.js web dashboard
├── config/                 # settings.json
├── data/                   # arena.db (auto-created)
└── scripts/                # Utility scripts
```

---

## Commands

```bash
arena start                  # Start the orchestrator
arena start --dry-run        # Start without sending signals
arena session:status         # Check NY session status
arena config:show            # Show current configuration
arena dashboard              # Start web dashboard

# NPM scripts
npm run dev -- start         # Start with hot reload
npm run db:migrate           # Run database migrations
npm run db:seed              # Seed initial 5 agents
npm test                     # Run 22 tests
npm run typecheck            # TypeScript validation
npm run build                # Compile to dist/
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full system architecture, data flow, agent-CLI integration |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production setup, troubleshooting, operations guide |
| [PRD](../PRD_AI_Trading_Signal_Agent_System.md) | Original product requirements document |

---

## Environment Variables

See `.env.example` for all configuration options. Key variables:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for alerts |
| `TELEGRAM_CHAT_ID` | Channel/group ID for alerts |
| `AI_CLI_MODEL` | Qwen model for agent inference |
| `MCP_SERVER_DIR` | Path to TradingView MCP server |
| `ASSETS` | Comma-separated list of assets to scan |

---

## License

MIT
