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
            <span className="rounded-full bg-blue-900/50 px-3 py-1 text-xs text-blue-300">
              Threshold: 3
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

interface ScanResult {
  id: string;
  agentId: string;
  agentName: string;
  asset: string;
  response: string;
  isSignal: boolean;
  direction: string | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  riskRewardRatio: number | null;
  confidence: number | null;
  rationale: string | null;
  responseTimeMs: number;
  riskApproved: boolean;
  timestamp: string;
}

interface AgentDetail {
  id: string;
  strategy: string;
  promptFile: string;
  model: string;
  status: string;
  version: number;
  performance: {
    totalScans: number;
    totalSignals: number;
    approvedSignals: number;
    suppressedSignals: number;
    avgResponseTime: number;
    lastScanAt: string | null;
    lastSignalAt: string | null;
  };
  scanResults: ScanResult[];
  recentAnalysis: ChatMsg[];
  latestResult: ScanResult | null;
}

function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentTab, setAgentTab] = useState<'analysis' | 'signals' | 'history'>('analysis');
  const [agentData, setAgentData] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAgentData = async (agentId: string) => {
    setLoading(true);
    setSelectedAgent(agentId);
    setAgentTab('analysis');
    try {
      const agentInfo = agents.find(a => a.id === agentId);

      // Fetch stats
      const statsRes = await fetch(`http://localhost:3101/api/agent/${agentId}/stats`);
      const stats = statsRes.ok ? (await statsRes.json()).stats : { totalScans: 0, totalSignals: 0, approvedSignals: 0, suppressedSignals: 0, avgResponseTime: 0, lastScanAt: null, lastSignalAt: null };

      // Fetch scan results
      const resultsRes = await fetch(`http://localhost:3101/api/agent/${agentId}/scan-results?limit=20`);
      const results = resultsRes.ok ? (await resultsRes.json()).results : [];

      // Fetch latest result
      const latestRes = await fetch(`http://localhost:3101/api/agent/${agentId}/latest-result?asset=FX:XAUUSD`);
      const latestResult = latestRes.ok ? (await latestRes.json()).result : null;

      // Fetch chat messages
      const chatRes = await fetch(`http://localhost:3101/api/chat?limit=50`);
      const chatData = chatRes.ok ? await chatRes.json() : { messages: [] };
      const agentMessages = chatData.messages
        .filter((m: any) => m.agentId === agentId)
        .slice(-10)
        .map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));

      setAgentData({
        id: agentId,
        strategy: agentInfo?.strategy || agentId,
        promptFile: agentInfo?.promptFile || '',
        model: 'qwen3.6-plus',
        status: 'ACTIVE',
        version: 1,
        performance: stats,
        scanResults: results,
        recentAnalysis: agentMessages,
        latestResult,
      });
    } catch (error) {
      console.error('Failed to fetch agent data:', error);
    }
    setLoading(false);
  };

  const currentAgent = selectedAgent && agentData ? agentData : null;

  if (!selectedAgent || !currentAgent) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold">Agent Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => fetchAgentData(agent.id)}
              className="cursor-pointer rounded-lg border border-gray-800 bg-gray-900 p-5 hover:border-blue-600 hover:bg-gray-800/50 transition-colors"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-sm font-bold">{agent.id}</h3>
                  <p className="text-sm text-gray-400">{agent.strategy}</p>
                </div>
                <StatusBadge status="ACTIVE" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setSelectedAgent(null)} className="mb-4 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
        ← Back to all agents
      </button>

      {/* Agent Header */}
      <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-6 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-mono">{currentAgent.id}</h2>
            <StatusBadge status={currentAgent.status} />
          </div>
          <p className="text-sm text-gray-400 mt-1">{currentAgent.strategy} • {currentAgent.model}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-right">
            <div className="text-gray-500 text-xs">Total Scans</div>
            <div className="font-bold">{currentAgent.performance.totalScans}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">Signals</div>
            <div className="font-bold text-green-400">{currentAgent.performance.totalSignals}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">Approved</div>
            <div className="font-bold text-blue-400">{currentAgent.performance.approvedSignals}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">Avg Time</div>
            <div className="font-bold">{currentAgent.performance.avgResponseTime}ms</div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="mb-4 flex gap-1">
        {[
          { id: 'analysis' as const, label: '💬 Analysis', count: currentAgent.recentAnalysis.length },
          { id: 'signals' as const, label: '📈 Signals', count: currentAgent.scanResults.filter(r => r.isSignal).length },
          { id: 'history' as const, label: '📋 Scan History', count: currentAgent.scanResults.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAgentTab(tab.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              agentTab === tab.id
                ? 'bg-gray-900 text-white border-t-2 border-blue-500'
                : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'
            }`}
          >
            {tab.label} <span className="text-xs text-gray-500">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        {loading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : agentTab === 'analysis' ? (
          <div className="p-6">
            <h3 className="mb-3 font-semibold">Recent Analysis (Chat Room)</h3>
            {currentAgent.recentAnalysis.length > 0 ? (
              <div className="space-y-3">
                {currentAgent.recentAnalysis.map((msg, i) => (
                  <div key={i} className="rounded bg-gray-800/50 p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                      <span className="rounded px-1.5 py-0.5 bg-blue-900/50 text-blue-300">{msg.type}</span>
                      <span>{msg.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-300">{msg.content}</p>
                    {msg.targetAsset && (
                      <span className="mt-1 inline-block rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">{msg.targetAsset}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p>No analysis yet — waiting for scan cycles</p>
              </div>
            )}
          </div>
        ) : agentTab === 'signals' ? (
          <div className="p-6">
            <h3 className="mb-3 font-semibold">Approved Signals</h3>
            {currentAgent.scanResults.filter(r => r.riskApproved).length > 0 ? (
              <div className="space-y-3">
                {currentAgent.scanResults.filter(r => r.riskApproved).map((sig, i) => (
                  <div key={i} className="rounded bg-gray-800/50 p-4 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{sig.asset}</span>
                        <span className={`rounded px-1.5 py-0.5 text-xs ${sig.direction === 'BUY' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                          {sig.direction}
                        </span>
                        <span className="rounded bg-green-700 px-1.5 py-0.5 text-xs text-white">Approved</span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(sig.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
                      <div>Entry: <span className="text-white">{sig.entry}</span></div>
                      <div>SL: <span className="text-red-300">{sig.stopLoss}</span></div>
                      <div>TP: <span className="text-green-300">{sig.takeProfit1}</span></div>
                      <div>R:R: <span className="text-yellow-300">{sig.riskRewardRatio}</span></div>
                    </div>
                    {sig.confidence && (
                      <div className="mt-2 text-xs text-gray-500">Confidence: {sig.confidence}%</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p className="text-2xl mb-2">📊</p>
                <p>No signals generated yet</p>
                <p className="text-xs mt-1">Signals appear when setups meet criteria</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <h3 className="mb-3 font-semibold">Scan History (All Responses)</h3>
            {currentAgent.scanResults.length > 0 ? (
              <div className="space-y-2">
                {currentAgent.scanResults.map((r, i) => (
                  <div key={i} className={`rounded p-3 text-sm ${r.riskApproved ? 'bg-green-900/20 border border-green-800/30' : r.isSignal ? 'bg-yellow-900/20 border border-yellow-800/30' : 'bg-gray-800/30'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{r.asset}</span>
                        <span className={`rounded px-1.5 py-0.5 text-xs ${r.isSignal ? (r.riskApproved ? 'bg-green-700 text-white' : 'bg-yellow-700 text-white') : 'bg-gray-700 text-gray-300'}`}>
                          {r.isSignal ? (r.riskApproved ? '✅ Signal' : '⚠️ Suppressed') : '❌ NO_SIGNAL'}
                        </span>
                        {r.direction && (
                          <span className={`rounded px-1.5 py-0.5 text-xs ${r.direction === 'BUY' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                            {r.direction}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{r.responseTimeMs}ms</span>
                        <span>{new Date(r.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    {r.rationale && (
                      <p className="text-gray-400 text-xs mt-1">{r.rationale}</p>
                    )}
                    {r.isSignal && r.entry && (
                      <div className="mt-1 flex gap-3 text-xs text-gray-400">
                        <span>Entry: {r.entry}</span>
                        <span>SL: {r.stopLoss}</span>
                        <span>TP: {r.takeProfit1}</span>
                        <span>R:R: {r.riskRewardRatio}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p>No scan results yet — trigger a scan first</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Strategy Description */}
      <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-3 font-semibold">📋 Strategy: {currentAgent.strategy}</h3>
        <p className="text-sm text-gray-400">{strategyDescriptions[currentAgent.id] || 'Trading strategy using technical analysis to identify high-probability setups.'}</p>
      </div>
    </div>
  );
}

const strategyDescriptions: Record<string, string> = {
  'AGENT-01': '🐱 NyamPip — ICT specialist using Order Blocks, Fair Value Gaps, Liquidity Sweeps, CHoCH/BOS, and Kill Zone entries. Requires 5+ of 7 ICT checklist items including liquidity sweep, structure break, and OTE confluence with OB/FVG.',
  'AGENT-02': '📊 DekTrade — Smart Money Concepts tracking BOS, CHoCH, supply/demand zones, and institutional order flow. Validates zones with displacement, tracks accumulation/manipulation/distribution phases, and trades fresh zone retests.',
  'AGENT-03': '📈 LengFX — Support & Resistance using key horizontal levels (3+ touches), prior day highs/lows, session extremes, psychological round numbers, and role reversal patterns. Requires rejection candle confirmation.',
  'AGENT-04': '😴 LazyTrader — RSI divergence detection with candlestick confirmation. Only trades when divergence + OB/OS + reversal pattern all align. Lazy but effective — waits for obvious setups.',
  'AGENT-05': '📉 SaorchSell 😂 — MACD momentum using crossovers, histogram divergence, zero-line proximity, and trend alignment. Loves to short but respects data. Requires 5+ of 7 checklist items.',
  'AGENT-06': '🚀 LoyLong — Trend following via EMA 20/50/200 alignment with higher timeframe confirmation. Prefers pullback entries over crossovers for better R:R. Always loyal to the trend.',
  'AGENT-07': '💀 OtLuyShort 💀 — Breakout detection with consolidation range mapping, volume spike validation, re-test entries, and measured move targets. Ot Luy = stop loss — always running stops 💀',
  'AGENT-08': '💰 HotMargin — Mean reversion using Bollinger Band extremes, VWAP deviation, and reversal candle patterns. Critical: avoids trading during strong trends. Fades overextended price back to mean.',
  'AGENT-09': '🏃 RotSL — Volatility squeeze detection via TTM Squeeze patterns and ATR compression. Rot = run in Khmer. Anticipates expansion moves after low-volatility periods. The stop loss runner 😆',
  'AGENT-10': '💎 ChnganhProfit — Multi-confluence requiring 3+ independent confirmations from different categories (structure, levels, momentum, trend, volume, pattern). Chnganh = skillful. Only trades when everything aligns.',
};

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

interface SystemStatus {
  paused: boolean;
  pausedAt?: string;
  activeScan: boolean;
  lastScanAt?: string;
}

function SystemPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [dryRun, setDryRun] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ paused: false, activeScan: false });
  const [confluenceThreshold, setConfluenceThreshold] = useState(3);

  const assets = ['all', 'FX:XAUUSD', 'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY'];

  // Poll system status
  React.useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('http://localhost:3101/api/status');
        if (res.ok) {
          setSystemStatus(await res.json());
        }
      } catch {
        // API not available
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerScan = async () => {
    setScanning(true);
    setScanResult(null);

    try {
      const asset = selectedAsset === 'all' ? undefined : selectedAsset;
      const res = await fetch('http://localhost:3101/api/trigger-scan', {
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

  const handleStopSystem = async () => {
    try {
      await fetch('http://localhost:3101/api/stop', { method: 'POST' });
      setSystemStatus(prev => ({ ...prev, paused: true, pausedAt: new Date().toISOString() }));
    } catch (error: any) {
      console.error('Failed to stop system:', error);
    }
  };

  const handleResumeSystem = async () => {
    try {
      await fetch('http://localhost:3101/api/resume', { method: 'POST' });
      setSystemStatus(prev => ({ ...prev, paused: false, pausedAt: undefined }));
    } catch (error: any) {
      console.error('Failed to resume system:', error);
    }
  };

  const handleUpdateThreshold = async () => {
    try {
      const res = await fetch('http://localhost:3101/api/config/threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: confluenceThreshold }),
      });
      if (res.ok) {
        setScanResult(`✅ Threshold updated to ${confluenceThreshold}/5. Next scans will use this value.`);
      } else {
        const err = await res.json();
        setScanResult(`❌ Error: ${err.error}`);
      }
    } catch (error: any) {
      setScanResult(`❌ Failed to update threshold: ${error.message}`);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">System Health</h2>

      {/* System Controls */}
      <div className={`mb-6 rounded-lg border p-5 ${systemStatus.paused ? 'border-yellow-800 bg-yellow-950/50' : 'border-green-800 bg-green-950/50'}`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className={`font-semibold ${systemStatus.paused ? 'text-yellow-300' : 'text-green-300'}`}>
              {systemStatus.paused ? '⏸️ System Paused' : '▶️ System Active'}
            </h3>
            {systemStatus.pausedAt && (
              <p className="text-sm text-gray-400">Paused since {new Date(systemStatus.pausedAt).toLocaleTimeString()}</p>
            )}
            {systemStatus.activeScan && (
              <p className="text-sm text-blue-300">🔄 Scan in progress...</p>
            )}
          </div>
          <div className="flex gap-2">
            {systemStatus.paused ? (
              <button onClick={handleResumeSystem} className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700">
                ▶️ Resume
              </button>
            ) : (
              <button onClick={handleStopSystem} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700">
                ⏸️ Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confluence Threshold Control */}
      <div className="mb-6 rounded-lg border border-purple-800 bg-purple-950/50 p-5">
        <h3 className="mb-2 font-semibold text-purple-300">🎯 Confluence Threshold: {confluenceThreshold}/5</h3>
        <p className="mb-3 text-sm text-gray-400">Minimum checklist items required for a signal. Lower = more aggressive, higher = more conservative.</p>
        <div className="flex items-center gap-3">
          {[2, 3, 4, 5].map(val => (
            <button
              key={val}
              onClick={() => setConfluenceThreshold(val)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                confluenceThreshold === val
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {val} {val === 2 ? '(Very Aggressive)' : val === 3 ? '(Aggressive)' : val === 4 ? '(Balanced)' : '(Conservative)'}
            </button>
          ))}
          <button
            onClick={handleUpdateThreshold}
            className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Apply
          </button>
        </div>
      </div>

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
            disabled={scanning || systemStatus.paused}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              scanning || systemStatus.paused
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
  const prevMsgCountRef = React.useRef(5);

  // Only auto-scroll when new messages are added, not on every re-render or filter change
  React.useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // Poll for new messages every 5 seconds
  React.useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('http://localhost:3101/api/chat?limit=100');
        if (res.ok) {
          const data = await res.json();
          const apiMessages = data.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          // Only update if we got new messages
          if (apiMessages.length > messages.length) {
            setMessages(apiMessages);
          }
        }
      } catch {
        // API not available — use demo messages
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [messages.length]);

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
      await fetch('http://localhost:3101/api/chat', {
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
  { id: 'AGENT-01', strategy: 'NyamPip', promptFile: 'ict_concepts.json' },
  { id: 'AGENT-02', strategy: 'DekTrade', promptFile: 'smc.json' },
  { id: 'AGENT-03', strategy: 'LengFX', promptFile: 'support_resistance.json' },
  { id: 'AGENT-04', strategy: 'LazyTrader', promptFile: 'rsi_price_action.json' },
  { id: 'AGENT-05', strategy: 'SaorchSell 😂', promptFile: 'macd_momentum.json' },
  { id: 'AGENT-06', strategy: 'LoyLong', promptFile: 'trend_following.json' },
  { id: 'AGENT-07', strategy: 'OtLuyShort 💀', promptFile: 'breakout_hunter.json' },
  { id: 'AGENT-08', strategy: 'HotMargin', promptFile: 'mean_reversion.json' },
  { id: 'AGENT-09', strategy: 'RotSL 😆', promptFile: 'volatility_squeeze.json' },
  { id: 'AGENT-10', strategy: 'ChnganhProfit', promptFile: 'multi_confluence.json' },
];
