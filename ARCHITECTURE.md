# Arena CLI — Architecture & Implementation Guide

## System Overview

The Arena is a self-competing pool of 10 AI trading agents that analyze XAUUSD and Forex markets via TradingView MCP, emit structured trade signals during the New York session, and face weekly elimination with auto-mutation.

## Project Structure

```
arena-cli/
├── src/
│   ├── cli.ts                      # CLI entry point (commander)
│   ├── shared/
│   │   ├── config.ts               # Config loader (settings.json + .env override)
│   │   ├── logger.ts               # Pino logger (file + console)
│   │   └── types.ts                # TypeScript types + Zod schemas
│   ├── orchestrator/
│   │   ├── orchestrator.ts         # Main scan cycle loop + cron scheduling
│   │   └── sessionManager.ts       # NY session time window checker
│   ├── mcp/
│   │   ├── client.ts               # TradingView MCP client (@modelcontextprotocol/sdk)
│   │   └── payloadBuilder.ts       # Packages chart data for agent input
│   ├── agents/
│   │   ├── agentPool.ts            # Manages all 10 agents, loads prompts
│   │   ├── agentRunner.ts          # Spawns qwen CLI child process per agent
│   │   └── prompts/                # 10 strategy prompt JSON files
│   │       ├── ict_concepts.json
│   │       ├── smc.json
│   │       ├── support_resistance.json
│   │       ├── rsi_price_action.json
│   │       ├── macd_momentum.json
│   │       ├── trend_following.json
│   │       ├── breakout_hunter.json
│   │       ├── mean_reversion.json
│   │       ├── volatility_squeeze.json
│   │       └── multi_confluence.json
│   ├── risk/
│   │   └── riskManager.ts          # Global risk filters (7 filters)
│   ├── signals/
│   │   ├── schema.ts               # Drizzle ORM SQLite schema
│   │   ├── db.ts                   # Database connection + migrations
│   │   ├── signalDb.ts             # Signal CRUD operations
│   │   └── priceMonitor.ts         # TP/SL monitoring loop via MCP polling
│   ├── telegram/
│   │   └── bot.ts                  # Telegraf bot (alerts, commands)
│   ├── elimination/
│   │   ├── weeklyEngine.ts         # Weekly scoring + elimination logic
│   │   └── mutationEngine.ts       # Qwen CLI prompt mutation for new agents
│   ├── dashboard/
│   │   └── server.ts               # Express API server for dashboard
│   └── scripts/
│       └── migrate.ts              # Database migration runner
├── dashboard/                       # Next.js web dashboard
│   └── src/app/
│       ├── layout.tsx              # Root layout
│       └── page.tsx                # Main dashboard (leaderboard + signal feed)
├── config/
│   └── settings.json               # Default configuration
├── .env                            # Environment variables
├── .env.example                    # Template
├── drizzle.config.ts               # Drizzle ORM config
├── package.json
├── tsconfig.json
└── README.md
```

## Data Flow Pipeline

```
[EVERY 5 MIN — NY SESSION]

0. Pre-Signal Chat Debate:
   a. System posts: "New scan cycle started for {asset}"
   b. Each agent reads recent chat messages for context
   c. Each agent posts their market analysis to chat room
   d. Top 3 agents debate and critique each other's analysis
   e. Chat messages saved to chat_messages table

1. Scheduler (node-cron) triggers scan cycle
2. Orchestrator loops through assets [XAUUSD, EURUSD, GBPUSD, USDJPY]
3. For each asset:
   a. MCP call → chart_set_symbol + chart_set_timeframe
   b. MCP call → capture_screenshot (base64 PNG)
   c. MCP call → data_get_ohlcv (last 100 candles)
   d. MCP call → data_get_study_values (RSI, MACD, EMA, ATR, BB)
   e. MCP call → quote_get (real-time price)
   f. Package into Agent Input Payload

4. Sequential agent loop (10 agents, one-by-one):
   a. Load strategy prompt from prompts/*.json
   b. Build agent payload (system prompt + user prompt + image)
   c. Spawn qwen CLI: qwen -p "{prompt}" --model qwen-vl-plus --approval-mode yolo
   d. Wait for response (30s timeout)
   e. Parse response: extract Signal JSON or detect NO_SIGNAL
   f. Validate against Zod SignalSchema

5. Collect agent responses

6. Global Risk Manager filters each signal:
   a. Daily global signal limit (20 max)
   b. Daily per-agent limit (5 max)
   c. Minimum R:R (1.5)
   d. Minimum confidence (55%)
   e. Duplicate guard (same asset+direction within 15 min)
   f. Volatility gate (ATR spike detection)
   g. Correlation limit (max 3 USD-correlated open signals)

7. Approved signals:
   a. Written to SQLite (signals table)
   b. Sent to Telegram bot (formatted alert)
   c. Status = OPEN

8. Price Monitor loop (every 1 min, continuous):
   a. Quote all assets with OPEN signals
   b. If price >= TP1 → status = TP_HIT, send Telegram
   c. If price <= SL → status = SL_HIT, send Telegram
   d. If signal age > 24h → status = EXPIRED

[EVERY SUNDAY 23:59 EST]

9. Elimination Ceremony:
   a. System announces eliminated agent
   b. Surviving agents react and discuss what went wrong
   c. Eliminated agent gives a farewell message
   d. System announces mutated replacement

10. Weekly Elimination Engine:
   a. Query all signals from past 7 days per agent
   b. Compute: win rate, profit factor, max drawdown
   c. Score and rank all agents (composite = 0.35*WR + 0.35*PF + 0.30*DD)
   d. If any agent breaches thresholds → flag worst performer
   e. Mutation Engine generates new prompt via qwen CLI
   f. New agent replaces eliminated slot (AGENT-XX-v2)
   g. Log elimination event
   h. Send Telegram notification
```

## Agent-CLI Integration

Each agent is invoked via:
```bash
qwen -p "{user_payload}" \
  --model qwen-vl-plus \
  --approval-mode yolo
```

**User Payload** includes:
- Asset name (e.g., FX:XAUUSD)
- Current timestamp (EST)
- Session name (New York)
- Chart image (base64-encoded PNG from MCP screenshot)
- OHLCV data (last 10 candles summarized)
- Indicator values (RSI, MACD, EMA, ATR, Bollinger Bands)
- Current quote (price, change, change%)

**System Prompt** (per strategy) includes:
- Agent identity and specialization
- Strategy-specific rules and entry criteria
- Signal JSON schema requirements
- NO_SIGNAL fallback instruction

**Response Parsing:**
1. Detect "NO_SIGNAL" string → no trade
2. Extract JSON from output (handles markdown code blocks)
3. Validate against Zod SignalSchema
4. Return Signal object or NO_SIGNAL

## Risk Manager Filters

| Filter | Condition | Action |
|--------|-----------|--------|
| Daily Global | Signals today >= 20 | Suppress |
| Daily Agent | Agent signals today >= 5 | Suppress |
| Min R:R | R:R < 1.5 | Suppress |
| Min Confidence | Confidence < 55% | Flag (still approved) |
| Duplicate | Same asset+direction within 15 min | Suppress |
| Volatility Gate | ATR spike > 2x average | Suppress |
| Correlation | Open USD signals >= 3 | Suppress |

## Elimination Thresholds

| Metric | Threshold | Weight |
|--------|-----------|--------|
| Win Rate | < 40% | 35% |
| Profit Factor | < 1.0 | 35% |
| Max Drawdown | > 10% | 30% |

Minimum 5 signals/week required for elimination eligibility.

## Commands

```bash
# Start orchestrator (NY session mode)
npm run dev -- start

# Dry run (no signals sent, no Telegram)
npm run dev -- start --dry-run

# Check session status
npm run dev -- session:status

# Start dashboard
npm run dev -- dashboard

# Show configuration
npm run dev -- config:show

# Run database migrations
npm run db:migrate

# Type check
npm run typecheck
```

## Next Steps (Phase 6)

1. **Integration Testing**: Mock MCP server, test full pipeline
2. **Dashboard Enhancement**: Add agent detail view, elimination history, system health
3. **Paper Trading**: Run system for 2 weeks during NY sessions
4. **Performance Tuning**: Optimize qwen CLI call latency, consider parallel agent execution
5. **News Filter**: Add economic calendar integration (FOMC, NFP, CPI suppression)

## Chat Room System

The Arena includes a full agent chat room where agents discuss market analysis, debate signals, and handle elimination ceremonies.

### Chat Message Types

| Type | Description | Color |
|------|-------------|-------|
| `system` | System announcements, session open/close | Gray |
| `analysis` | Agent sharing market analysis | Blue |
| `debate` | Agent responding to/critiquing another agent | Yellow |
| `critique` | Agent pointing out flaws in another's setup | Orange |
| `elimination` | Agent reacting to an elimination | Red |
| `farewell` | Eliminated agent's final message | Purple |

### Chat Lifecycle

1. **Pre-Signal Debate** (every scan cycle):
   - System announces the asset being scanned
   - Each agent posts their analysis based on chart data
   - Top 3 agents debate each other's setups
   - All messages saved with scan_cycle_id for context

2. **Post-Signal Review** (optional, Phase 2):
   - Agents review approved signals from the cycle
   - Critique or validate each other's entries

3. **Elimination Ceremony** (weekly):
   - System announces the eliminated agent
   - 5 surviving agents react and discuss
   - Eliminated agent gives a dramatic farewell
   - System announces the mutated replacement

### Chat API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | GET | Fetch recent messages (limit param) |
| `/api/chat` | POST | Save a new message |

### Dashboard Chat Features

- **Real-time polling**: Fetches new messages every 5 seconds
- **Message filtering**: Filter by type (analysis, debate, critique, etc.)
- **Color-coded messages**: Left border color indicates message type
- **Agent badges**: Shows agent name, target agent, asset, and timestamp
- **User input**: Send messages to the agents directly
- **Auto-scroll**: Scrolls to latest message on update
