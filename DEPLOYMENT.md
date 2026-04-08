# Arena CLI — Deployment & Operations Guide

## Quick Start (5 minutes)

```bash
cd /Users/khong/ai-cli/arena-cli

# 1. Install dependencies
npm install

# 2. Run database migrations
npm run db:migrate

# 3. Seed initial 10 agents
npm run db:seed

# 4. Verify everything works
npm run typecheck && npm test && npm run build

# 5. Start in dry-run mode (no signals sent)
npm run dev -- start --dry-run

# 6. In a separate terminal, start the dashboard
cd dashboard && npm install && npm run dev
# Open http://localhost:3100
```

## Production Setup

### Step 1: Configure Environment Variables

Edit `.env` with your real values:

```bash
# Telegram (create via @BotFather on Telegram)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_channel_id_here

# Qwen CLI (ensure qwen is installed and authenticated)
AI_CLI_PATH=qwen
AI_CLI_MODEL=qwen-vl-plus
AI_CLI_APPROVAL_MODE=yolo
AI_CLI_TIMEOUT=30

# TradingView MCP (verify path)
MCP_SERVER_DIR=/Users/khong/ai-cli/tradingview-mcp
```

### Step 2: Verify TradingView MCP

```bash
# Ensure TradingView Desktop is running with CDP enabled
# Test MCP connection
cd /Users/khong/ai-cli/tradingview-mcp
node src/server.js
```

### Step 3: Start Production Mode

```bash
# Remove --dry-run to enable real signal generation
npm run dev -- start

# Or use the built version
npm run build
node dist/cli.js start
```

### Step 4: Monitor via Dashboard

```bash
cd dashboard
npm run build
npm start
# Open http://localhost:3100
```

## Command Reference

| Command | Description |
|---------|-------------|
| `npm run dev -- start` | Start orchestrator (live mode) |
| `npm run dev -- start --dry-run` | Start without sending signals/Telegram |
| `npm run dev -- session:status` | Check if NY session is currently active |
| `npm run dev -- config:show` | Show loaded configuration |
| `npm run db:migrate` | Create/update database tables |
| `npm run db:seed` | Populate initial 10 agents |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |
| `npm test` | Run all tests |
| `npm run typecheck` | TypeScript type check |
| `npm run build` | Compile to JavaScript |

## Architecture Summary

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  node-cron   │───▶│ TradingView   │───▶│ 10 AI Agents │
│  Scheduler   │    │ MCP Server    │    │ (qwen CLI)   │
└──────────────┘    └───────────────┘    └──────┬───────┘
                                                 │
                                    ┌────────────┼────────────┐
                                    ▼            ▼            ▼
                              ┌──────────┐ ┌─────────┐ ┌──────────┐
                              │ Risk     │ │ SQLite  │ │ Telegram │
                              │ Manager  │ │ DB      │ │ Bot      │
                              └──────────┘ └────┬────┘ └──────────┘
                                                │
                                         ┌──────┴──────┐
                                         │  Price      │
                                         │  Monitor    │
                                         └──────┬──────┘
                                                │
                                         ┌──────┴──────┐
                                         │  Weekly     │
                                         │  Elimination│
                                         └─────────────┘
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `agents` | Agent definitions, status, version |
| `signals` | All generated signals with entry/SL/TP |
| `signal_outcomes` | TP/SL hit records with PnL |
| `weekly_performance` | Per-agent weekly performance metrics |
| `elimination_records` | Elimination + mutation history |
| `scan_cycles` | Audit log of all scan cycles |
| `system_events` | System health event log |

## Troubleshooting

### "TradingView MCP not connected"
- Ensure TradingView Desktop is running
- Verify `MCP_SERVER_DIR` path in `.env`
- Check that Chrome CDP is enabled (`--remote-debugging-port=9222`)

### "qwen CLI not found"
- Install Qwen Code: `npm install -g qwen`
- Or set `AI_CLI_PATH` to the full path of your qwen binary
- Verify: `qwen --version`

### "Database locked"
- Ensure only one instance is running
- Check: `lsof data/arena.db`
- Kill existing processes and restart

### "Telegram bot not sending alerts"
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`
- Test: `curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe`
- Check logs: `cat data/arena.log | grep -i telegram`

### Agents timing out
- Increase `AI_CLI_TIMEOUT` in `.env` (default: 30s)
- Check Qwen API rate limits
- Monitor response times in system health dashboard

## Next Steps

1. **Paper Trading**: Run in dry-run mode for 1-2 weeks to validate signal quality
2. **Tune Risk Manager**: Adjust thresholds based on observed signal quality
3. **First Elimination**: Let the system run through its first weekly elimination cycle
4. **Add Assets**: Extend `ASSETS` in `.env` to include GBPJPY, EURJPY, etc.
5. **Dashboard Enhancement**: Add real-time charts via Recharts, agent equity curves
