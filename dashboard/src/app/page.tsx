'use client';

import { useState } from 'react';
import React from 'react';

const PAGES = [
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'signals', label: 'Signals', icon: '📊' },
  { id: 'manage-signals', label: 'Manage Signals', icon: '⚙️' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'chat', label: 'Chat Room', icon: '💬' },
  { id: 'elimination', label: 'Elimination', icon: '⚔️' },
  { id: 'system', label: 'System', icon: '🔧' },
];

export default function DashboardPage() {
  const [activePage, setActivePage] = useState('leaderboard');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [dryRun, setDryRun] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ paused: false, activeScan: false });
  const [confluenceThreshold, setConfluenceThreshold] = useState(3);
  const [agentCount, setAgentCount] = useState(10);
  const [scanDetails, setScanDetails] = useState<any[]>([]);
  const [activeAgentSignals, setActiveAgentSignals] = useState<Record<string, any>>({});
  const [activeSignals, setActiveSignals] = useState(0);

  const assets = ['all', 'FX:XAUUSD', 'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY'];

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
    const fetchActiveSignals = async () => {
      try {
        const res = await fetch('http://localhost:3101/api/agents/active-signals');
        if (res.ok) {
          const data = await res.json();
          setActiveAgentSignals(data.agentSignals || {});
        }
      } catch {
        // Ignore
      }
    };
    const stored = localStorage.getItem('confluenceThreshold');
    if (stored) setConfluenceThreshold(parseInt(stored, 10));
    fetchStatus();
    fetchActiveSignals();
    const statusInterval = setInterval(fetchStatus, 3000);
    const signalInterval = setInterval(fetchActiveSignals, 15000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(signalInterval);
    };
  }, []);

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
              5 Agents
            </span>
            <span className="rounded-full bg-orange-900/50 px-3 py-1 text-xs text-orange-300">
              🔒 {activeSignals} Busy
            </span>
            <span className="rounded-full bg-green-900/50 px-3 py-1 text-xs text-green-300">
              ✅ {5 - activeSignals} Available
            </span>
            <span className="rounded-full bg-blue-900/50 px-3 py-1 text-xs text-blue-300">
              Threshold: {confluenceThreshold}
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
        {activePage === 'leaderboard' && <LeaderboardPage activeAgentSignals={activeAgentSignals} systemStatus={systemStatus} />}
        {activePage === 'signals' && <SignalsPage />}
        {activePage === 'manage-signals' && <ManageSignalsPage />}
        {activePage === 'agents' && <AgentsPage />}
        {activePage === 'chat' && <ChatRoomPage />}
        {activePage === 'elimination' && <EliminationPage />}
        {activePage === 'system' && <SystemPage />}
      </main>
    </div>
  );
}

/* ── Leaderboard Page ─────────────────────────────── */

function LeaderboardPage({ activeAgentSignals, systemStatus }: { activeAgentSignals: Record<string, any>, systemStatus: { activeScan?: boolean } }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSignals, setTotalSignals] = useState(0);
  const [activeSignals, setActiveSignals] = useState(0);
  const [openAgentIds, setOpenAgentIds] = useState<Record<string, any>>({});

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch agent performance metrics (includes scan stats + win rate, profit factor, etc.)
        const allAgentData: any[] = [];
        for (let i = 1; i <= 10; i++) {
          const id = `AGENT-${String(i).padStart(2, '0')}`;
          try {
            const res = await fetch(`http://localhost:3101/api/agent/${id}/performance`);
            if (res.ok) {
              const data = await res.json();
              allAgentData.push({ id, ...data });
            }
          } catch {
            allAgentData.push({ id, totalSignals: 0, activeSignals: 0, resolvedSignals: 0, wins: 0, losses: 0, expired: 0, winRate: 0, profitFactor: 0, maxDrawdown: 0, avgResponseTime: 0, lastScanAt: null, lastSignalAt: null });
          }
        }

        // Fetch open signals to determine active status
        try {
          const res = await fetch('http://localhost:3101/api/signals');
          if (res.ok) {
            const data = await res.json();
            const openSignals = (data.signals || []).filter((s: any) => s.status === 'OPEN');
            const activeIds: Record<string, any> = {};
            for (const sig of openSignals) {
              const agentId = sig.agent_id || sig.agentId;
              activeIds[agentId] = sig;
            }
            setOpenAgentIds(activeIds);
            setActiveSignals(Object.keys(activeIds).length);
          }
        } catch {
          // Ignore
        }

        // Calculate totals
        const totalScans = allAgentData.reduce((sum, a) => sum + (a.totalScans || 0), 0);
        const totalSig = allAgentData.reduce((sum, a) => sum + (a.totalSignals || 0), 0);
        setTotalSignals(totalScans);
        setActiveSignals(totalSig);

        // Sort by composite score: Win Rate (50%) + Profit Factor normalized (30%) + inverse Max DD (20%)
        // Agents with no signals go to the bottom
        allAgentData.sort((a, b) => {
          const aHasSignals = a.totalSignals > 0;
          const bHasSignals = b.totalSignals > 0;
          if (!aHasSignals && !bHasSignals) return 0;
          if (!aHasSignals) return 1;
          if (!bHasSignals) return -1;

          const scoreA = (a.winRate || 0) * 0.5 + 
            Math.min((a.profitFactor || 0) / 3, 1) * 100 * 0.3 + 
            Math.max(100 - (a.maxDrawdown || 0) * 10, 0) * 0.2;
          const scoreB = (b.winRate || 0) * 0.5 + 
            Math.min((b.profitFactor || 0) / 3, 1) * 100 * 0.3 + 
            Math.max(100 - (b.maxDrawdown || 0) * 10, 0) * 0.2;
          return scoreB - scoreA;
        });
        setAgents(allAgentData);
      } catch {
        // API not available
      }
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard label="Total Scans" value={totalSignals.toString()} sub="Across all agents" color="green" />
        <StatCard label="Signals Generated" value={activeSignals.toString()} sub="Total valid signals" color="blue" />
        <StatCard label="Active Signals" value={Object.keys(activeAgentSignals).length.toString()} sub="Currently OPEN" color="yellow" />
        <StatCard label="Next Elimination" value="Sunday" sub="23:59 EST" color="purple" />
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Agent Leaderboard</h2>
          <p className="text-sm text-gray-400">Ranked by composite score: Win Rate (50%) + Profit Factor (30%) + Drawdown (20%)</p>
        </div>
        {loading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase">
                  <th className="px-6 py-3">Rank</th>
                  <th className="px-6 py-3">Agent</th>
                  <th className="px-6 py-3">Strategy</th>
                  <th className="px-6 py-3 text-center">Signals</th>
                  <th className="px-6 py-3 text-center">Wins / Losses</th>
                  <th className="px-6 py-3 text-center">Win Rate</th>
                  <th className="px-6 py-3 text-center">Profit Factor</th>
                  <th className="px-6 py-3 text-center">Max DD</th>
                  <th className="px-6 py-3 text-center">Score</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, i) => {
                  const isActive = !!activeAgentSignals[agent.id];
                  const hasSignals = agent.totalSignals > 0;
                  const score = hasSignals ? Math.round(
                    (agent.winRate || 0) * 0.5 + 
                    Math.min((agent.profitFactor || 0) / 3, 1) * 100 * 0.3 + 
                    Math.max(100 - (agent.maxDrawdown || 0) * 10, 0) * 0.2
                  ) : 0;

                  return (
                    <tr key={agent.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-6 py-4 text-gray-500 font-bold">#{i + 1}</td>
                      <td className="px-6 py-4 font-mono text-xs">{agent.id}</td>
                      <td className="px-6 py-4 text-gray-300">{agentList.find(a => a.id === agent.id)?.strategy || agent.id}</td>
                      <td className="px-6 py-4 text-center font-bold">{agent.totalSignals || 0}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-green-400">{agent.wins || 0}</span> / <span className="text-red-400">{agent.losses || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        {hasSignals ? <span className={agent.winRate >= 50 ? 'text-green-400' : agent.winRate >= 40 ? 'text-yellow-400' : 'text-red-400'}>{agent.winRate.toFixed(1)}%</span> : '—'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        {hasSignals ? (agent.profitFactor === 999 ? '∞' : <span className={agent.profitFactor >= 1.5 ? 'text-green-400' : agent.profitFactor >= 1.0 ? 'text-yellow-400' : 'text-red-400'}>{agent.profitFactor.toFixed(2)}</span>) : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {hasSignals ? <span className="text-yellow-400">{agent.maxDrawdown.toFixed(1)}%</span> : '—'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        {hasSignals ? <span className="text-white">{score.toFixed(0)}</span> : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const isActive = !!openAgentIds[agent.id] || !!activeAgentSignals[agent.id];
                          const hasScanned = agent.totalScans > 0;
                          const isScanning = systemStatus?.activeScan;
                          if (isActive) {
                            return (
                              <span className="rounded-full bg-orange-900/50 px-2.5 py-0.5 text-xs text-orange-300">
                                🔒 Active Signal
                              </span>
                            );
                          }
                          if (isScanning && hasScanned) {
                            return (
                              <span className="rounded-full bg-blue-900/50 px-2.5 py-0.5 text-xs text-blue-300">
                                🔍 Scanning
                              </span>
                            );
                          }
                          if (hasScanned) {
                            return (
                              <span className="rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-gray-300">
                                💤 Idle
                              </span>
                            );
                          }
                          return (
                            <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-500">
                              ⏳ Pending
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalSignals === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                Awaiting first scan to populate data
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const agentList = [
  { id: 'AGENT-01', strategy: 'NyamPip' },
  { id: 'AGENT-02', strategy: 'DekTrade' },
  { id: 'AGENT-03', strategy: 'LengFX' },
  { id: 'AGENT-04', strategy: 'LazyTrader' },
  { id: 'AGENT-05', strategy: 'SaorchSell 😂' },
];

/* ── Signals Page ─────────────────────────────────── */

function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [assetFilter, setAssetFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchSignals = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3101/api/signals');
        if (res.ok) {
          const data = await res.json();
          // Only show OPEN (active) signals
          const openSignals = (data.signals || []).filter((s: any) => s.status === 'OPEN');
          setSignals(openSignals);
          setPrices(data.prices || {});
        }
      } catch {
        // API not available
      }
      setLoading(false);
    };
    fetchSignals();
    const interval = setInterval(fetchSignals, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = signals.filter(s => {
    if (assetFilter !== 'all' && s.asset !== assetFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Active Signals ({filtered.length})</h2>
          <p className="text-sm text-gray-400">Currently OPEN signals being monitored</p>
        </div>
        <div className="flex gap-2">
          <select
            value={assetFilter}
            onChange={e => setAssetFilter(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="all">All Assets</option>
            <option value="FX:XAUUSD">FX:XAUUSD</option>
            <option value="FX:EURUSD">FX:EURUSD</option>
            <option value="FX:GBPUSD">FX:GBPUSD</option>
            <option value="FX:USDJPY">FX:USDJPY</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900">
        {loading ? (
          <div className="flex h-96 items-center justify-center text-gray-500">Loading...</div>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {filtered.map((sig: any, i: number) => {
              // Handle both camelCase and snake_case field names
              const agentId = sig.agent_id || sig.agentId;
              const strategy = sig.strategy;
              const asset = sig.asset;
              const direction = sig.direction;
              const status = sig.status;
              const entry = sig.entry;
              const sl = sig.stop_loss || sig.stopLoss;
              const tp1 = sig.take_profit_1 || sig.takeProfit1;
              const tp2 = sig.take_profit_2 || sig.takeProfit2;
              const rr = sig.risk_reward_ratio || sig.riskRewardRatio;
              const confidence = sig.confidence_pct || sig.confidencePct;
              const posSize = sig.position_size_pct || sig.positionSizePct;
              const rationale = sig.rationale;
              const invalidation = sig.invalidation;
              const timestamp = sig.timestamp ? new Date(sig.timestamp) : new Date();
              const age = Math.round((Date.now() - timestamp.getTime()) / 60000);

              // Current price and P&L - try multiple key formats
              const currentPrice = prices[sig.asset] ||
                prices[sig.asset?.replace('FX:', '')] ||
                prices[`FX:${sig.asset}`] ||
                null;
              let pnlValue: number | null = null;
              let pnlPercent: number | null = null;
              if (currentPrice && entry) {
                if (direction === 'BUY') {
                  pnlValue = currentPrice - entry;
                  pnlPercent = ((currentPrice - entry) / entry) * 100;
                } else {
                  pnlValue = entry - currentPrice;
                  pnlPercent = ((entry - currentPrice) / entry) * 100;
                }
              }
              const isProfit = pnlValue !== null && pnlValue > 0;
              const isLoss = pnlValue !== null && pnlValue < 0;

              return (
              <div key={i} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold">{agentId}</span>
                    <span className="text-sm text-gray-400">{strategy}</span>
                    <span className={`rounded px-2 py-0.5 text-xs text-white ${direction === 'BUY' ? 'bg-green-700' : 'bg-red-700'}`}>
                      {direction}
                    </span>
                    <span className="rounded bg-blue-900/50 px-2 py-0.5 text-xs text-blue-300">
                      🔵 ACTIVE
                    </span>
                    <span className="text-xs text-gray-500">{age}m ago</span>
                  </div>
                  <span className="text-xs text-gray-500">{timestamp.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-7 gap-3 text-xs mb-3">
                  <div className="rounded bg-gray-800 px-3 py-2">
                    <div className="text-gray-500">Asset</div>
                    <div className="font-bold">{asset}</div>
                  </div>
                  <div className="rounded bg-gray-800 px-3 py-2">
                    <div className="text-gray-500">Entry</div>
                    <div className="font-bold">{entry}</div>
                  </div>
                  <div className="rounded bg-gray-800 px-3 py-2">
                    <div className="text-gray-500">Current Price</div>
                    <div className={`font-bold ${currentPrice ? (isProfit ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-white') : 'text-gray-600'}`}>
                      {currentPrice || 'Loading...'}
                    </div>
                  </div>
                  <div className="rounded bg-gray-800 px-3 py-2">
                    <div className="text-gray-500">P&L</div>
                    <div className={`font-bold ${isProfit ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-gray-500'}`}>
                      {pnlValue !== null ? `${pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(2)} (${pnlPercent?.toFixed(2) || '0.00'}%)` : '—'}
                    </div>
                  </div>
                  <div className="rounded bg-gray-800 px-3 py-2">
                    <div className="text-gray-500">Stop Loss</div>
                    <div className="font-bold text-red-300">{sl}</div>
                  </div>
                  <div className="rounded bg-gray-800 px-3 py-2">
                    <div className="text-gray-500">Take Profit</div>
                    <div className="font-bold text-green-300">{tp1}</div>
                  </div>
                  <div className="rounded bg-gray-800 px-3 py-2">
                    <div className="text-gray-500">R:R</div>
                    <div className="font-bold text-yellow-300">{rr}</div>
                  </div>
                </div>
                {rationale && (
                  <div className="mb-2 rounded bg-gray-800/50 p-3 text-sm">
                    <div className="mb-1 text-xs text-gray-500">Rationale:</div>
                    <p className="text-gray-300">{rationale}</p>
                  </div>
                )}
                {invalidation && (
                  <div className="text-xs text-gray-500">
                    ❌ Invalidation: <span className="text-red-400">{invalidation}</span>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        ) : (
          <div className="flex h-96 items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-4xl mb-2">📊</p>
              <p>No active signals</p>
              <p className="text-sm text-gray-600">Signals will appear here when agents generate them</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Manage Signals Page ──────────────────────────── */

function ManageSignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSignals = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('http://localhost:3101/api/signals');
      if (res.ok) {
        const data = await res.json();
        setSignals(data.signals || []);
      }
    } catch {
      // Ignore
    }
    setLoading(false);
    setRefreshing(false);
  };

  React.useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`http://localhost:3101/api/signals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchSignals();
      }
    } catch {
      // Ignore
    }
  };

  const handleDeleteSignal = async (id: string) => {
    if (!confirm('Delete this signal?')) return;
    try {
      const res = await fetch(`http://localhost:3101/api/signals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSignals();
      }
    } catch {
      // Ignore
    }
  };

  const filtered = signals.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  const statusCounts = {
    OPEN: signals.filter(s => s.status === 'OPEN').length,
    TP_HIT: signals.filter(s => s.status === 'TP_HIT').length,
    SL_HIT: signals.filter(s => s.status === 'SL_HIT').length,
    EXPIRED: signals.filter(s => s.status === 'EXPIRED').length,
    CANCELLED: signals.filter(s => s.status === 'CANCELLED').length,
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Signal Management</h2>
          <p className="text-sm text-gray-400">Manage and update signal statuses</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="all">All Status ({signals.length})</option>
            <option value="OPEN">OPEN ({statusCounts.OPEN})</option>
            <option value="TP_HIT">TP_HIT ({statusCounts.TP_HIT})</option>
            <option value="SL_HIT">SL_HIT ({statusCounts.SL_HIT})</option>
            <option value="EXPIRED">EXPIRED ({statusCounts.EXPIRED})</option>
            <option value="CANCELLED">CANCELLED ({statusCounts.CANCELLED})</option>
          </select>
          <button
            onClick={fetchSignals}
            disabled={refreshing}
            className="rounded-lg bg-gray-700 px-4 py-1.5 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 py-16 text-center text-gray-500">Loading...</div>
      ) : filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">SL</th>
                <th className="px-4 py-3">TP</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((sig: any) => (
                <tr key={sig.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-xs">{sig.agentId}</td>
                  <td className="px-4 py-3">{sig.asset}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${sig.direction === 'BUY' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                      {sig.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{sig.entry}</td>
                  <td className="px-4 py-3 font-mono text-xs text-red-300">{sig.stopLoss}</td>
                  <td className="px-4 py-3 font-mono text-xs text-green-300">{sig.takeProfit1}</td>
                  <td className="px-4 py-3">
                    {editingId === sig.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={newStatus}
                          onChange={e => setNewStatus(e.target.value)}
                          className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs"
                          autoFocus
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="TP_HIT">TP_HIT</option>
                          <option value="SL_HIT">SL_HIT</option>
                          <option value="EXPIRED">EXPIRED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                        <button onClick={() => handleUpdateStatus(sig.id, newStatus)} className="rounded bg-green-700 px-2 py-1 text-xs text-white">✓</button>
                        <button onClick={() => setEditingId(null)} className="rounded bg-gray-700 px-2 py-1 text-xs text-white">✕</button>
                      </div>
                    ) : (
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        sig.status === 'OPEN' ? 'bg-blue-900/50 text-blue-300' :
                        sig.status === 'TP_HIT' ? 'bg-green-900/50 text-green-300' :
                        sig.status === 'SL_HIT' ? 'bg-red-900/50 text-red-300' :
                        sig.status === 'EXPIRED' ? 'bg-gray-700 text-gray-300' :
                        'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {sig.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {sig.timestamp ? new Date(sig.timestamp).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingId(sig.id); setNewStatus(sig.status); }}
                        className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteSignal(sig.id)}
                        className="rounded bg-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-900/80"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 bg-gray-900 py-16 text-center text-gray-500">
          No signals found
        </div>
      )}
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
  perfMetrics: {
    totalSignals: number;
    activeSignals: number;
    resolvedSignals: number;
    wins: number;
    losses: number;
    expired: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
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
  const [agentPerf, setAgentPerf] = useState<Record<string, any>>({});

  // Fetch performance data for all agents on the list view
  React.useEffect(() => {
    const fetchAllPerformance = async () => {
      const perf: Record<string, any> = {};
      for (const agent of agents) {
        try {
          const res = await fetch(`http://localhost:3101/api/agent/${agent.id}/performance`);
          if (res.ok) {
            perf[agent.id] = await res.json();
          }
        } catch {
          perf[agent.id] = null;
        }
      }
      setAgentPerf(perf);
    };
    fetchAllPerformance();
  }, []);

  const fetchAgentData = async (agentId: string) => {
    setLoading(true);
    setSelectedAgent(agentId);
    setAgentTab('analysis');
    try {
      const agentInfo = agents.find(a => a.id === agentId);

      // Fetch stats
      const statsRes = await fetch(`http://localhost:3101/api/agent/${agentId}/stats`);
      const stats = statsRes.ok ? (await statsRes.json()).stats : { totalScans: 0, totalSignals: 0, approvedSignals: 0, suppressedSignals: 0, avgResponseTime: 0, lastScanAt: null, lastSignalAt: null };

      // Fetch performance metrics
      const perfRes = await fetch(`http://localhost:3101/api/agent/${agentId}/performance`);
      const perfMetrics = perfRes.ok ? (await perfRes.json()) : { totalSignals: 0, activeSignals: 0, resolvedSignals: 0, wins: 0, losses: 0, expired: 0, winRate: 0, profitFactor: 0, maxDrawdown: 0, avgResponseTime: 0, lastScanAt: null, lastSignalAt: null };

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
        perfMetrics,
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
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="rounded bg-gray-800 px-2 py-1.5 text-center">
                  <div className="text-gray-500">Signals</div>
                  <div className="font-bold">{agentPerf[agent.id]?.totalSignals ?? '—'}</div>
                </div>
                <div className="rounded bg-gray-800 px-2 py-1.5 text-center">
                  <div className="text-gray-500">Win Rate</div>
                  <div className="font-bold">{agentPerf[agent.id]?.winRate !== undefined ? `${agentPerf[agent.id].winRate}%` : '—'}</div>
                </div>
                <div className="rounded bg-gray-800 px-2 py-1.5 text-center">
                  <div className="text-gray-500">Profit F.</div>
                  <div className="font-bold">{agentPerf[agent.id]?.profitFactor !== undefined ? (agentPerf[agent.id].profitFactor === 999 ? '∞' : agentPerf[agent.id].profitFactor.toFixed(2)) : '—'}</div>
                </div>
                <div className="rounded bg-gray-800 px-2 py-1.5 text-center">
                  <div className="text-gray-500">Max DD</div>
                  <div className="font-bold">{agentPerf[agent.id]?.maxDrawdown !== undefined ? `${agentPerf[agent.id].maxDrawdown}%` : '—'}</div>
                </div>
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
        <div className="grid grid-cols-6 gap-4 text-sm">
          <div className="text-right">
            <div className="text-gray-500 text-xs">Total Signals</div>
            <div className="font-bold text-blue-400">{currentAgent.perfMetrics.totalSignals}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">Wins / Losses</div>
            <div className="font-bold"><span className="text-green-400">{currentAgent.perfMetrics.wins}</span> / <span className="text-red-400">{currentAgent.perfMetrics.losses}</span></div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">Win Rate</div>
            <div className="font-bold">{currentAgent.perfMetrics.winRate.toFixed(1)}%</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">Profit Factor</div>
            <div className="font-bold">{currentAgent.perfMetrics.profitFactor === 999 ? '∞' : currentAgent.perfMetrics.profitFactor.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">Max Drawdown</div>
            <div className="font-bold text-yellow-400">{currentAgent.perfMetrics.maxDrawdown.toFixed(2)}%</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">Avg Response</div>
            <div className="font-bold">{currentAgent.perfMetrics.avgResponseTime}ms</div>
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
  activeScan?: boolean;
  lastScanAt?: string;
  confluenceThreshold?: number;
}

function SystemPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [dryRun, setDryRun] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ paused: false, activeScan: false });
  const [confluenceThreshold, setConfluenceThreshold] = useState(3);
  const [agentCount, setAgentCount] = useState(10);
  const [scanDetails, setScanDetails] = useState<any[]>([]);

  const assets = ['all', 'FX:XAUUSD', 'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY'];

  // Poll system status and fetch config
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
    const fetchConfig = async () => {
      try {
        // Read the config from settings.json via the API health endpoint 
        // (threshold is applied per-scan, we just need the local state to match)
        const stored = localStorage.getItem('confluenceThreshold');
        if (stored) setConfluenceThreshold(parseInt(stored, 10));
      } catch {
        // Ignore
      }
    };
    fetchStatus();
    fetchConfig();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerScan = async () => {
    setScanning(true);
    setScanResult(null);
    setScanDetails([]);

    try {
      const asset = selectedAsset === 'all' ? undefined : selectedAsset;
      const res = await fetch('http://localhost:3101/api/trigger-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, dryRun, verbose: true, agents: agentCount }),
      });

      if (res.ok) {
        const data = await res.json();
        const summary = data.results
          .map((r: any) => `${r.asset}: ${r.approved} approved, ${r.suppressed} suppressed`)
          .join(' | ');
        setScanResult(`✅ Scan complete — ${dryRun ? '[DRY RUN] ' : ''}${summary}`);
        // Store detailed agent responses for display
        if (data.results[0]?.agentDetails) {
          setScanDetails(data.results[0].agentDetails);
        }
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
        localStorage.setItem('confluenceThreshold', confluenceThreshold.toString());
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
          {[1, 2, 3, 4, 5].map(val => (
            <button
              key={val}
              onClick={() => setConfluenceThreshold(val)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                confluenceThreshold === val
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {val} {val === 1 ? '(Ultra Aggressive)' : val === 2 ? '(Very Aggressive)' : val === 3 ? '(Aggressive)' : val === 4 ? '(Balanced)' : '(Conservative)'}
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

      {/* Agent Count Selector */}
      <div className="mb-6 rounded-lg border border-indigo-800 bg-indigo-950/50 p-5">
        <h3 className="mb-2 font-semibold text-indigo-300">🤖 Active Agents: {agentCount}/10</h3>
        <p className="mb-3 text-sm text-gray-400">Number of agents to run per scan. Use fewer for faster testing.</p>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
            <button
              key={val}
              onClick={() => setAgentCount(val)}
              className={`rounded-lg w-10 h-10 text-sm font-medium transition-colors ${
                agentCount === val
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {val}
            </button>
          ))}
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

      {/* Agent Thinking Details */}
      {scanDetails.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-6 py-4">
            <h3 className="font-semibold">🧠 Agent Thinking — Last Scan Results</h3>
            <p className="text-sm text-gray-400">How each agent analyzed the market and what they decided</p>
          </div>
          <div className="divide-y divide-gray-800">
            {scanDetails.map((agent: any, i: number) => (
              <AgentCard key={i} agent={agent} />
            ))}
          </div>
        </div>
      )}

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
          <EventRow time="Just now" event="Database seeded with 5 agents" type="info" />
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
            <span className="rounded-full bg-green-900/50 px-3 py-1 text-xs text-green-300">5 agents online</span>
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

function AgentCard({ agent }: { agent: any }) {
  const [expanded, setExpanded] = useState(false);
  const resp = agent.response;
  const isSignal = typeof resp === 'object';
  const rawOutput = agent.rawOutput || '';

  return (
    <div className={`p-5 ${isSignal ? 'bg-green-900/10' : 'bg-gray-800/20'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold">{agent.id}</span>
          <span className="text-sm text-gray-400">{agent.strategy}</span>
          {isSignal ? (
            <span className="rounded bg-green-700 px-2 py-0.5 text-xs text-white">✅ SIGNAL — {resp.direction}</span>
          ) : (
            <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">❌ NO_SIGNAL</span>
          )}
        </div>
        <span className="text-xs text-gray-500">{agent.responseTimeMs}ms</span>
      </div>

      {isSignal && (
        <div className="mb-3 grid grid-cols-4 gap-3 text-xs">
          <div className="rounded bg-gray-800 px-3 py-2">
            <div className="text-gray-500">Entry</div>
            <div className="font-bold">{resp.entry}</div>
          </div>
          <div className="rounded bg-gray-800 px-3 py-2">
            <div className="text-gray-500">Stop Loss</div>
            <div className="font-bold text-red-300">{resp.stop_loss}</div>
          </div>
          <div className="rounded bg-gray-800 px-3 py-2">
            <div className="text-gray-500">Take Profit</div>
            <div className="font-bold text-green-300">{resp.take_profit_1}</div>
          </div>
          <div className="rounded bg-gray-800 px-3 py-2">
            <div className="text-gray-500">R:R Ratio</div>
            <div className="font-bold text-yellow-300">{resp.risk_reward_ratio}</div>
          </div>
        </div>
      )}

      {isSignal && resp.rationale && (
        <div className="mb-3 rounded bg-gray-800/50 p-3 text-sm">
          <div className="mb-1 text-xs text-gray-500">Agent's Reasoning:</div>
          <p className="text-gray-300">{resp.rationale}</p>
        </div>
      )}

      {/* Raw Output Toggle — Shows full agent thinking */}
      {rawOutput && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mb-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <span>{expanded ? '▼' : '▶'}</span>
            <span>{expanded ? 'Hide' : 'Show'} Full Agent Analysis ({rawOutput.length} chars)</span>
          </button>
          {expanded && (
            <div className="rounded bg-gray-950 p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto border border-gray-800 leading-relaxed">
              {rawOutput}
            </div>
          )}
        </div>
      )}

      {agent.error && (
        <div className="rounded bg-red-900/20 p-3 text-sm text-red-300">
          ⚠️ Error: {agent.error}
        </div>
      )}
    </div>
  );
}

const agents = [
  { id: 'AGENT-01', strategy: 'NyamPip', promptFile: 'ict_concepts.json' },
  { id: 'AGENT-02', strategy: 'DekTrade', promptFile: 'smc.json' },
  { id: 'AGENT-03', strategy: 'LengFX', promptFile: 'support_resistance.json' },
  { id: 'AGENT-04', strategy: 'LazyTrader', promptFile: 'rsi_price_action.json' },
  { id: 'AGENT-05', strategy: 'SaorchSell 😂', promptFile: 'macd_momentum.json' },
];
