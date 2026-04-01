import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Wifi, 
  ShieldCheck, 
  AlertTriangle, 
  Terminal, 
  Database, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HealthState {
  id: number;
  timestamp: string;
  interface: string;
  health_state: string;
}

interface Milestone {
  id: number;
  timestamp: string;
  name: string;
  details: string;
}

interface Forensic {
  id: number;
  timestamp: string;
  trigger_event: string;
  source: string;
  output: string;
}

export default function App() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [forensics, setForensics] = useState<Forensic[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const [lintResult, setLintResult] = useState<any>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const runLint = async () => {
    try {
      const res = await fetch('/api/lint');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Lint failed: ${res.status} ${text}`);
      }
      const data = await res.json();
      setLintResult(data);
    } catch (e) {
      console.error('Lint failed', e);
      setLintResult({ code: 1, output: String(e) });
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Status fetch failed: ${res.status} ${text}`);
        }
        const data = await res.json();
        setStatus(data);
      } catch (e) {
        console.error('Failed to fetch status', e);
      }
    };

    const fetchForensics = async () => {
      try {
        const res = await fetch('/api/forensics');
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Forensics fetch failed: ${res.status} ${text}`);
        }
        const data = await res.json();
        setForensics(data);
      } catch (e) {
        console.error('Failed to fetch forensics', e);
      }
    };

    fetchStatus();
    fetchForensics();
    runLint();
    const interval = setInterval(() => {
      fetchStatus();
      fetchForensics();
    }, 5000);

    const eventSource = new EventSource('/api/stream');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        setLogs(prev => {
          const newLogs = [...prev, ...data.lines];
          return Array.from(new Set(newLogs)).slice(-200);
        });
      }
    };

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      await fetch('/api/recover', { method: 'POST' });
    } catch (e) {
      console.error('Recovery failed', e);
    } finally {
      setTimeout(() => setIsRecovering(false), 5000);
    }
  };

  const parseHealth = (healthStr: string) => {
    if (!healthStr) return [];
    const parts = healthStr.split(' ');
    // overall=HEALTHY icmp=PASS dns_system=PASS dns_external=PASS route=PASS link=PASS nmcli=PASS
    return parts.slice(1).map(p => {
      const [key, val] = p.split('=');
      return { key, val };
    });
  };

  const healthSignals = status?.lastHealth ? parseHealth(status.lastHealth.health_state) : [];
  const isHealthy = status?.lastHealth?.health_state.includes('overall=HEALTHY');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="text-blue-400" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Deterministic Network Controller</h1>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {new Date().toLocaleTimeString()}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>v0.7.0-clean</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${
              isHealthy ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${isHealthy ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {isHealthy ? 'SYSTEM HEALTHY' : 'SYSTEM DEGRADED'}
            </div>
            
            <button 
              onClick={handleRecover}
              disabled={isRecovering}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              <RefreshCw size={18} className={isRecovering ? 'animate-spin' : ''} />
              Force Recovery
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-12 gap-6">
        
        {/* Left Column: Health & Milestones */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Health Panel */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Activity size={120} />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
              <Activity size={16} /> Real-Time Health Signals
            </h2>
            
            <div className="grid grid-cols-1 gap-3">
              {healthSignals.length > 0 ? healthSignals.map((signal) => (
                <div key={signal.key} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-sm font-medium text-white/70 uppercase">{signal.key.replace('_', ' ')}</span>
                  <div className={`flex items-center gap-2 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    signal.val === 'PASS' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {signal.val === 'PASS' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {signal.val}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-white/30 italic text-sm">
                  Waiting for first health check...
                </div>
              )}
            </div>
          </section>

          {/* Last Milestone */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
              <Clock size={16} /> Last Milestone
            </h2>
            {status?.lastMilestone ? (
              <div className="space-y-2">
                <div className="text-blue-400 font-bold text-lg">{status.lastMilestone.name}</div>
                <div className="text-sm text-white/60 leading-relaxed">{status.lastMilestone.details}</div>
                <div className="text-[10px] text-white/30 font-mono mt-2">{status.lastMilestone.timestamp}</div>
              </div>
            ) : (
              <div className="text-white/30 italic text-sm">No milestones recorded.</div>
            )}
          </section>

          {/* Interface Health */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
              <Wifi size={16} /> Interface Balancing
            </h2>
            <div className="space-y-2">
              {status?.ifaceHealth?.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                  <span className="text-xs font-mono">{h.interface}</span>
                  <span className={`text-[10px] font-bold ${h.health === 'HEALTHY' ? 'text-emerald-400' : 'text-red-400'}`}>{h.health}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Security Audit (Lint) */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
              <ShieldCheck size={16} /> Security Self-Audit
            </h2>
            {lintResult ? (
              <div className={`p-3 rounded-xl border text-xs ${lintResult.code === 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  {lintResult.code === 0 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {lintResult.code === 0 ? 'AUDIT PASSED' : 'AUDIT FAILED'}
                </div>
                <pre className="text-[10px] opacity-70 whitespace-pre-wrap font-mono mt-2 bg-black/40 p-2 rounded">
                  {lintResult.output}
                </pre>
              </div>
            ) : (
              <div className="text-white/20 italic text-xs animate-pulse">Running audit...</div>
            )}
          </section>

          {/* Audit Findings */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} /> NM Audit Findings
            </h2>
            <div className="space-y-3">
              {status?.auditFindings?.length > 0 ? status.auditFindings.map((f: any) => (
                <div key={f.id} className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-red-400">{f.finding}</span>
                    <span className="text-white/20">{new Date(f.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-white/50">{f.detail}</div>
                  {f.fixed === 1 && (
                    <div className="mt-2 text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={10} /> Automatically Fixed
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-white/30 italic text-sm text-center py-4">No audit findings.</div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Logs & Forensics */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Live Logs */}
          <section className="bg-black border border-white/10 rounded-2xl flex flex-col h-[500px] overflow-hidden shadow-2xl">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 flex items-center gap-2">
                <Terminal size={16} /> Live Telemetry Stream
              </h2>
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-white/10">
              {logs.map((line, i) => (
                <div key={i} className={`whitespace-pre-wrap ${
                  line.includes('[EXEC]') ? 'text-blue-400' :
                  line.includes('[RC] rc=0') ? 'text-emerald-400' :
                  line.includes('[RC] rc=') ? 'text-red-400' :
                  line.includes('[HEALTH]') ? 'text-purple-400 font-bold' :
                  line.includes('[NM_AUDIT]') ? 'text-yellow-400' :
                  'text-white/70'
                }`}>
                  {line}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </section>

          {/* Forensic Data */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
              <Database size={16} /> Forensic Evidence Cache
            </h2>
            <div className="space-y-4">
              {forensics.map((f) => (
                <div key={f.id} className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                  <div className="bg-white/5 px-4 py-2 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-white/40">
                    <div className="flex items-center gap-3">
                      <span className="text-blue-400">{f.trigger_event}</span>
                      <span className="text-white/20">|</span>
                      <span>{f.source}</span>
                    </div>
                    <span>{new Date(f.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="p-4 font-mono text-[10px] text-white/60 whitespace-pre overflow-x-auto max-h-40 scrollbar-thin scrollbar-thumb-white/10">
                    {f.output}
                  </div>
                </div>
              ))}
              {forensics.length === 0 && (
                <div className="text-center py-12 text-white/20 italic">
                  No forensic data captured yet.
                </div>
              )}
            </div>
          </section>
        </div>

      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-white/5 text-[10px] text-white/20 flex justify-between items-center">
        <div className="flex gap-6">
          <span>LOG: {status?.logPath}</span>
          <span>DB: {status?.dbPath}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          ENGINE ACTIVE
        </div>
      </footer>
    </div>
  );
}
