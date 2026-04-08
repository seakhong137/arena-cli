'use client';

import { useState } from 'react';
import React from 'react';

const PAGES = [
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'signals', label: 'Signals', icon: '📊' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'chat', label: 'Chat Room', icon: '💬' },
  { id: 'elimination', label: 'Elimination', icon: '⚔️' },
  { id: 'system', label: 'System', icon: '🔧' },
];

export default function DashboardPage() {
  const [activePage, setActivePage] = useState('leaderboard');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏛️</span>
            <div>
              <h1 className="text-xl font-bold">The Arena</h1>
              <p className="text-xs text-gray-400">AI Multi-Agent Trading Signal System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
              10 Agents
            </span>
            <span className="rounded-full bg-yellow-900/50 px-3 py-1 text-xs text-yellow-300">
              Waiting for NY Session
            </span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-800 px-6">
        <div className="mx-auto flex max-w-7xl gap-1">
          {PAGES.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`rounded-t-lg px-4 py-3 text-sm font-medium transition-colors ${
                activePage === page.id
                  ? 'bg-gray-900 text-white border-t-2 border-blue-500'
                  : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'
              }`}
            >
              {page.icon} {page.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl p-6">
        {activePage === 'leaderboard' && <LeaderboardPage />}
        {activePage === 'signals' && <SignalsPage />}
        {activePage === 'agents' && <AgentsPage />}
        {activePage === 'chat' && <ChatRoomPage />}
        {activePage === 'elimination' && <EliminationPage />}
        {activePage === 'system' && <SystemPage />}
      </main>
    </div>
  );
}

/* ── Leaderboard Page ─────────────────────────────── */

function LeaderboardPage() {
  return (
    <div>
      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard label="Active Agents" value="10" sub="All healthy" color="green" />
        <StatCard label="Signals Today" value="0" sub="NY session not started" color="blue" />
        <StatCard label="Win Rate (Week)" value="--" sub="No data yet" color="yellow" />
        <StatCard label="Next Elimination" value="Sunday" sub="23:59 EST" color="purple" />
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Agent Leaderboard</h2>
          <p className="text-sm text-gray-400">Ranked by composite score (win rate + profit factor + drawdown)</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase">
              <th className="px-6 py-3">Rank</th>
              <th className="px-6 py-3">Agent</th>
              <th className="px-6 py-3">Strategy</th>
              <th className="px-6 py-3 text-center">Signals</th>
              <th className="px-6 py-3 text-center">Win Rate</th>
              <th className="px-6 py-3 text-center">Profit Factor</th>
              <th className="px-6 py-3 text-center">Max DD</th>
              <th className="px-6 py-3 text-center">Score</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, i) => (
              <tr key={agent.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-6 py-4 text-gray-500">#{i + 1}</td>
                <td className="px-6 py-4 font-mono text-xs">{agent.id}</td>
                <td className="px-6 py-4 text-gray-300">{agent.strategy}</td>
                <td className="px-6 py-4 text-center text-gray-400">--</td>
                <td className="px-6 py-4 text-center text-gray-400">--</td>
                <td className="px-6 py-4 text-center text-gray-400">--</td>
                <td className="px-6 py-4 text-center text-gray-400">--</td>
                <td className="px-6 py-4 text-center text-gray-400">--</td>
                <td className="px-6 py-4">
                  <StatusBadge status="ACTIVE" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-8 text-center text-gray-500">
          Awaiting first NY session to populate data
        </div>
      </div>
    </div>
  );
}

/* ── Signals Page ─────────────────────────────────── */

function SignalsPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Signal Feed</h2>
          <p className="text-sm text-gray-400">Real-time log of all signals emitted</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300">
            <option>All Assets</option>
            <option>FX:XAUUSD</option>
            <option>FX:EURUSD</option>
            <option>FX:GBPUSD</option>
            <option>FX:USDJPY</option>
          </select>
          <select className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300">
            <option>All Status</option>
            <option>OPEN</option>
            <option>TP_HIT</option>
            <option>SL_HIT</option>
            <option>EXPIRED</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="flex h-96 items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-4xl mb-2">📊</p>
            <p>No signals yet</p>
            <p className="text-sm text-gray-600">Signals will appear here during NY session</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Agents Page ──────────────────────────────────── */

function AgentsPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Agent Details</h2>
      <div className="grid grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold">{agent.id}</h3>
                <p className="text-sm text-gray-400">{agent.strategy}</p>
              </div>
              <StatusBadge status="ACTIVE" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded bg-gray-800 px-3 py-2">
                <div className="text-gray-500">Version</div>
                <div className="font-bold">v1</div>
              </div>
              <div className="rounded bg-gray-800 px-3 py-2">
                <div className="text-gray-500">Signals</div>
                <div className="font-bold">0</div>
              </div>
              <div className="rounded bg-gray-800 px-3 py-2">
                <div className="text-gray-500">Win Rate</div>
                <div className="font-bold">--</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Elimination Page ─────────────────────────────── */

function EliminationPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Elimination History</h2>
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="flex h-64 items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-4xl mb-2">⚔️</p>
            <p>No eliminations yet</p>
            <p className="text-sm text-gray-600">First elimination will occur after Week 1</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-2 font-semibold">Elimination Rules</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-red-400">▸</span>
            <span>Agents with <strong className="text-white">Win Rate &lt; 40%</strong> are flagged</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-red-400">▸</span>
            <span>Agents with <strong className="text-white">Profit Factor &lt; 1.0</strong> are flagged</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-red-400">▸</span>
            <span>Agents with <strong className="text-white">Max Drawdown &gt; 10%</strong> are flagged</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-yellow-400">▸</span>
            <span>Minimum <strong className="text-white">5 signals/week</strong> required for elimination eligibility</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-400">▸</span>
            <span>Eliminated agents are <strong className="text-white">auto-mutated</strong> and replaced</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ── System Page ──────────────────────────────────── */

function SystemPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [dryRun, setDryRun] = useState(true);

  const assets = ['all', 'FX:XAUUSD', 'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY'];

  const handleTriggerScan = async () => {
    setScanning(true);
    setScanResult(null);

    try {
      const asset = selectedAsset === 'all' ? undefined : selectedAsset;
      const res = await fetch('http://localhost:3100/api/trigger-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, dryRun }),
      });

      if (res.ok) {
        const data = await res.json();
        const summary = data.results
          .map((r: any) => `${r.asset}: ${r.approved} approved, ${r.suppressed} suppressed`)
          .join(' | ');
        setScanResult(`✅ Scan complete — ${dryRun ? '[DRY RUN] ' : ''}${summary}`);
      } else {
        const err = await res.json();
        setScanResult(`❌ Error: ${err.error}`);
      }
    } catch (error: any) {
      setScanResult(`❌ Failed to connect: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">System Health</h2>

      {/* Manual Scan Trigger */}
      <div className="mb-6 rounded-lg border border-blue-800 bg-blue-950/50 p-5">
        <h3 className="mb-3 font-semibold text-blue-300">🔔 Manual Scan Trigger</h3>
        <p className="mb-4 text-sm text-gray-400">Trigger an immediate scan cycle — bypasses NY session schedule</p>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Asset</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              {assets.map((a) => (
                <option key={a} value={a}>{a === 'all' ? 'All Assets' : a}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dryrun"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
            <label htmlFor="dryrun" className="text-sm text-gray-300">Dry Run (no signals saved)</label>
          </div>

          <button
            onClick={handleTriggerScan}
            disabled={scanning}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              scanning
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {scanning ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning...
              </span>
            ) : (
              '🚀 Trigger Scan'
            )}
          </button>
        </div>

        {scanResult && (
          <div className={`mt-4 rounded border px-4 py-3 text-sm ${
            scanResult.startsWith('✅')
              ? 'border-green-800 bg-green-900/30 text-green-300'
              : 'border-red-800 bg-red-900/30 text-red-300'
          }`}>
            {scanResult}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-3 font-semibold">Components</h3>
          <div className="space-y-3">
            <HealthRow name="TradingView MCP" status="connected" />
            <HealthRow name="SQLite Database" status="ok" />
            <HealthRow name="Telegram Bot" status="not_configured" />
            <HealthRow name="Scheduler" status="running" />
            <HealthRow name="Price Monitor" status="running" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-3 font-semibold">Configuration</h3>
          <div className="space-y-2 text-sm">
            <ConfigRow label="Assets" value="XAUUSD, EURUSD, GBPUSD, USDJPY" />
            <ConfigRow label="Timeframe" value="5M (primary)" />
            <ConfigRow label="Scan Interval" value="5 minutes" />
            <ConfigRow label="NY Session" value="08:00 - 17:00 EST" />
            <ConfigRow label="Model" value="qwen-vl-plus" />
            <ConfigRow label="Agent Timeout" value="30 seconds" />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 font-semibold">Recent Events</h3>
        <div className="space-y-2 text-sm">
          <EventRow time="Just now" event="Database seeded with 10 agents" type="info" />
          <EventRow time="Just now" event="Migrations completed successfully" type="success" />
          <EventRow time="Startup" event="System initialized — waiting for NY session" type="info" />
        </div>
      </div>
    </div>
  );
}

/* ── Chat Room Page ─────────────────────────────────── */

interface ChatMsg {
  id: string;
  agentId: string | null;
  agentName: string;
  type: string;
  content: string;
  targetAgentId?: string;
  targetAsset?: string;
  timestamp: Date;
}

function ChatRoomPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: '1', agentId: null, agentName: 'System', type: 'system', content: '🏛️ Welcome to The Arena Chat Room. Agents will discuss market analysis here.', timestamp: new Date() },
    { id: '2', agentId: 'AGENT-01', agentName: 'ICT Concepts', type: 'analysis', content: 'Watching XAUUSD closely. Price swept sell-side liquidity below Asian low at 2641. Looking for FVG fill on the 5M.', targetAsset: 'XAUUSD', timestamp: new Date(Date.now() - 300000) },
    { id: '3', agentId: 'AGENT-02', agentName: 'Smart Money Concepts', type: 'debate', content: 'Agree on the sweep. I also see a clear CHoCH on 15M — structure shifted bullish. Demand zone at 2643-2645 aligns with the FVG.', targetAsset: 'XAUUSD', timestamp: new Date(Date.now() - 240000) },
    { id: '4', agentId: 'AGENT-06', agentName: 'Trend Following', type: 'critique', content: 'Both setups look valid, but EMA20 is still below EMA50 on the 1H. Counter-trend risk here. I would wait for EMA alignment before entering.', targetAgentId: 'AGENT-01', targetAsset: 'XAUUSD', timestamp: new Date(Date.now() - 180000) },
    { id: '5', agentId: 'AGENT-10', agentName: 'Multi-Confluence', type: 'analysis', content: 'Confluences: (1) Liquidity sweep below Asian low, (2) FVG at 2643, (3) RSI divergence on 5M. That is 3 confluences — I am generating a BUY signal.', targetAsset: 'XAUUSD', timestamp: new Date(Date.now() - 120000) },
  ]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 5 seconds
  React.useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('http://localhost:3100/api/chat?limit=100');
        if (res.ok) {
          const data = await res.json();
          const apiMessages = data.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          if (apiMessages.length > 0) {
            setMessages(apiMessages);
          }
        }
      } catch {
        // API not available — use demo messages
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMsg: ChatMsg = {
      id: Date.now().toString(),
      agentId: null,
      agentName: 'You',
      type: 'system',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    // Try to send to API
    try {
      await fetch('http://localhost:3100/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: null,
          agentName: 'You',
          type: 'system',
          content: newMsg.content,
        }),
      });
    } catch {
      // API not available
    }
  };

  const filteredMessages = filter === 'all'
    ? messages
    : messages.filter((m) => m.type === filter);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">💬 Agent Chat Room</h2>
            <p className="text-sm text-gray-400">Where agents debate, critique, and discuss market analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300"
            >
              <option value="all">All Messages</option>
              <option value="analysis">Analysis</option>
              <option value="debate">Debate</option>
              <option value="critique">Critique</option>
              <option value="elimination">Elimination</option>
              <option value="farewell">Farewell</option>
              <option value="system">System</option>
            </select>
            <span className="rounded-full bg-green-900/50 px-3 py-1 text-xs text-green-300">10 agents online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          {filteredMessages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {filteredMessages.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No messages matching filter
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-6 py-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message to the agents..."
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: ChatMsg }) {
  const typeStyles: Record<string, { bg: string; badge: string }> = {
    system: { bg: 'border-l-gray-600', badge: 'bg-gray-700 text-gray-300' },
    analysis: { bg: 'border-l-blue-500', badge: 'bg-blue-900/50 text-blue-300' },
    debate: { bg: 'border-l-yellow-500', badge: 'bg-yellow-900/50 text-yellow-300' },
    critique: { bg: 'border-l-orange-500', badge: 'bg-orange-900/50 text-orange-300' },
    elimination: { bg: 'border-l-red-500', badge: 'bg-red-900/50 text-red-300' },
    farewell: { bg: 'border-l-purple-500', badge: 'bg-purple-900/50 text-purple-300' },
  };

  const style = typeStyles[message.type] || typeStyles.system;
  const time = message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`rounded border-l-4 ${style.bg} bg-gray-800/40 px-4 py-3`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${style.badge}`}>
          {message.agentName}
        </span>
        {message.targetAgentId && (
          <span className="text-xs text-gray-500">→ replied to {message.targetAgentId}</span>
        )}
        <span className="ml-auto text-xs text-gray-600">{time}</span>
        {message.targetAsset && (
          <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400 font-mono">
            {message.targetAsset}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-gray-200">{message.content}</p>
    </div>
  );
}

/* ── Shared Components ────────────────────────────── */

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const borderColors: Record<string, string> = {
    green: 'border-green-800',
    blue: 'border-blue-800',
    yellow: 'border-yellow-800',
    purple: 'border-purple-800',
  };
  return (
    <div className={`rounded-lg border bg-gray-900 p-4 ${borderColors[color] || 'border-gray-700'}`}>
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-900/50 text-green-300',
    WARNING: 'bg-yellow-900/50 text-yellow-300',
    AT_RISK: 'bg-orange-900/50 text-orange-300',
    ELIMINATED: 'bg-red-900/50 text-red-300 line-through',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  );
}

function HealthRow({ name, status }: { name: string; status: string }) {
  const indicators: Record<string, string> = {
    connected: 'bg-green-400',
    ok: 'bg-green-400',
    running: 'bg-green-400',
    not_configured: 'bg-yellow-400',
    error: 'bg-red-400',
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300">{name}</span>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${indicators[status] || 'bg-gray-500'}`} />
        <span className="text-sm text-gray-400 capitalize">{status.replace('_', ' ')}</span>
      </div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono text-xs text-gray-300">{value}</span>
    </div>
  );
}

function EventRow({ time, event, type }: { time: string; event: string; type: string }) {
  const colors: Record<string, string> = {
    info: 'text-blue-400',
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
  };
  return (
    <div className="flex items-center gap-3 border-b border-gray-800 pb-2">
      <span className="text-xs text-gray-500">{time}</span>
      <span className={`text-xs ${colors[type] || 'text-gray-400'}`}>●</span>
      <span className="text-gray-300">{event}</span>
    </div>
  );
}

const agents = [
  { id: 'AGENT-01', strategy: 'ICT Concepts' },
  { id: 'AGENT-02', strategy: 'Smart Money Concepts' },
  { id: 'AGENT-03', strategy: 'Support & Resistance' },
  { id: 'AGENT-04', strategy: 'RSI + Price Action' },
  { id: 'AGENT-05', strategy: 'MACD Momentum' },
  { id: 'AGENT-06', strategy: 'Trend Following' },
  { id: 'AGENT-07', strategy: 'Breakout Hunter' },
  { id: 'AGENT-08', strategy: 'Mean Reversion' },
  { id: 'AGENT-09', strategy: 'Volatility Squeeze' },
  { id: 'AGENT-10', strategy: 'Multi-Confluence' },
];
