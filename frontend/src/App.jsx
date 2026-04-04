import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Portfolio from './pages/Portfolio';
import Compare from './pages/Compare';
import Financials from './pages/Financials';
import Login from './pages/Login';
import Watchlist from './pages/Watchlist';
import MomentumRadar from './pages/MomentumRadar';
import BattleArena from './pages/BattleArena';
import MacroPulse from './pages/MacroPulse';
import SmartPatterns from './pages/SmartPatterns';
import Competitions from './pages/Competitions';
import CompetitionDetail from './pages/CompetitionDetail';
import './App.css';

/** Polls /api/health and shows a banner if the server is cold-starting. */
function ServerStatusBanner() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'slow' | 'ok'
  const retryRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const slowTimer = setTimeout(() => { if (mounted && status === 'checking') setStatus('slow'); }, 4000);

    async function ping() {
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(8000) });
        if (res.ok && mounted) { setStatus('ok'); clearTimeout(slowTimer); return; }
      } catch {}
      if (mounted) {
        retryRef.current = setTimeout(ping, 5000);
      }
    }
    ping();
    return () => { mounted = false; clearTimeout(slowTimer); clearTimeout(retryRef.current); };
  }, []);

  if (status !== 'slow') return null;
  return (
    <div className="server-banner">
      <span className="server-banner-spinner" />
      <span>Server is starting up — data will load in up to 60 seconds on first visit.</span>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="app">
      <ServerStatusBanner />
      {!isLoginPage && <Navbar />}
      <main className={isLoginPage ? '' : 'main-content'}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock/:ticker" element={<StockDetail />} />
          <Route path="/stock/:ticker/financials" element={<Financials />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/momentum" element={<MomentumRadar />} />
          <Route path="/battle" element={<BattleArena />} />
          <Route path="/macro" element={<MacroPulse />} />
          <Route path="/patterns" element={<SmartPatterns />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/competitions/:id" element={<CompetitionDetail />} />
          {/* Redirect removed pages */}
          <Route path="/screener" element={<Navigate to="/" replace />} />
          <Route path="/rotation" element={<Navigate to="/" replace />} />
          <Route path="/weather" element={<Navigate to="/" replace />} />
          <Route path="/xray" element={<Navigate to="/portfolio" replace />} />
          <Route path="/quiz" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
