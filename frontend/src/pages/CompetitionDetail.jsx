import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Bot, Users, Clock, DollarSign, Plus, X, TrendingUp, TrendingDown, Copy, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getChangeColor } from '../utils/formatters';
import { searchStocks } from '../api/client';
import api from '../api/client';

export default function CompetitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [comp, setComp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myHoldings, setMyHoldings] = useState([]);
  const [showTrade, setShowTrade] = useState(false);
  const [tradeQuery, setTradeQuery] = useState('');
  const [tradeResults, setTradeResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeShares, setTradeShares] = useState('');
  const [tradeType, setTradeType] = useState('buy');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadComp();
    const interval = setInterval(loadComp, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [id]);

  const loadComp = async () => {
    try {
      const res = await api.get(`/competitions/${id}`);
      setComp(res.data);
      const myPart = res.data.participants?.find(p => p.user_id === user?.id);
      if (myPart) setMyHoldings(myPart.holdings || []);
    } catch {
      setComp(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTradeSearch = async (q) => {
    setTradeQuery(q);
    if (q.length >= 1) {
      const res = await searchStocks(q).catch(() => ({ data: [] }));
      setTradeResults(res.data?.slice(0, 6) || []);
    } else {
      setTradeResults([]);
    }
  };

  const executeTrade = async () => {
    if (!selectedStock || !tradeShares || Number(tradeShares) <= 0) {
      setTradeError('Please select a stock and enter shares');
      return;
    }
    setTradeLoading(true);
    setTradeError('');
    try {
      await api.post(`/competitions/${id}/trade`, {
        ticker: selectedStock.ticker,
        shares: Number(tradeShares),
        action: tradeType,
      });
      setShowTrade(false);
      setSelectedStock(null);
      setTradeShares('');
      setTradeQuery('');
      loadComp();
    } catch (e) {
      setTradeError(e.response?.data?.detail || 'Trade failed');
    } finally {
      setTradeLoading(false);
    }
  };

  if (loading) return <div className="comp-loading" style={{ marginTop: 60 }}>Loading...</div>;
  if (!comp) return <div className="comp-empty" style={{ marginTop: 60 }}><h3>Competition not found</h3><button onClick={() => navigate('/competitions')} className="create-comp-btn">Back to Competitions</button></div>;

  const sorted = [...(comp.participants || [])].sort((a, b) => b.portfolio_value - a.portfolio_value);
  const myEntry = sorted.find(p => p.user_id === user?.id);
  const myRank = sorted.findIndex(p => p.user_id === user?.id) + 1;
  const isActive = comp.status === 'active';
  const isPending = comp.status === 'pending';
  const isOwner = comp.created_by === user?.id;

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/competitions?join=${comp.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startComp = async () => {
    try {
      await api.post(`/competitions/${id}/start`);
      loadComp();
    } catch {}
  };

  const daysLeft = comp.end_date
    ? Math.max(0, Math.ceil((new Date(comp.end_date) - new Date()) / 86400000))
    : null;

  return (
    <div className="comp-detail-page">
      <button className="back-btn" onClick={() => navigate('/competitions')}>
        <ArrowLeft size={16} /> Back to Competitions
      </button>

      <div className="comp-detail-header">
        <div>
          <h1><Trophy size={24} /> {comp.name}</h1>
          <div className="comp-meta" style={{ marginTop: 8 }}>
            <span className={`comp-status status-${comp.status}`}>{comp.status}</span>
            {daysLeft !== null && isActive && <span className="comp-days"><Clock size={12} /> {daysLeft} days left</span>}
            <span className="comp-participants"><Users size={12} /> {sorted.length} participants</span>
            <span className="comp-budget"><DollarSign size={12} /> {formatCurrency(comp.starting_budget)} starting</span>
          </div>
        </div>

        <div className="comp-header-actions">
          {isOwner && isPending && (
            <button className="create-comp-btn" onClick={startComp}>Start Competition</button>
          )}
          {isOwner && (
            <button className="comp-copy-btn" onClick={copyLink}>
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Invite Link</>}
            </button>
          )}
          {myEntry && isActive && (
            <button className="create-comp-btn" onClick={() => setShowTrade(true)}>
              <Plus size={16} /> Make Trade
            </button>
          )}
        </div>
      </div>

      {/* My stats summary */}
      {myEntry && (
        <div className="comp-my-summary">
          <div className="comp-summary-card">
            <span className="comp-stat-label">Portfolio Value</span>
            <span className="comp-stat-value large">{formatCurrency(myEntry.portfolio_value)}</span>
          </div>
          <div className="comp-summary-card">
            <span className="comp-stat-label">Cash Available</span>
            <span className="comp-stat-value large">{formatCurrency(myEntry.cash || 0)}</span>
          </div>
          <div className="comp-summary-card">
            <span className="comp-stat-label">Total Return</span>
            <span className="comp-stat-value large" style={{ color: getChangeColor(myEntry.return_pct) }}>
              {myEntry.return_pct >= 0 ? '+' : ''}{myEntry.return_pct?.toFixed(2)}%
            </span>
          </div>
          <div className="comp-summary-card">
            <span className="comp-stat-label">My Rank</span>
            <span className="comp-stat-value large">#{myRank}</span>
          </div>
        </div>
      )}

      <div className="comp-detail-grid">
        {/* Leaderboard */}
        <div className="comp-section">
          <h2>Leaderboard</h2>
          <div className="comp-leaderboard">
            {sorted.map((p, i) => (
              <div key={p.user_id} className={`comp-lb-row ${p.user_id === user?.id ? 'me' : ''}`}>
                <span className="lb-rank">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className="lb-name">
                  {p.is_ai ? <><Bot size={14} /> AI Bot</> : (p.display_name || `Player ${i + 1}`)}
                  {p.user_id === user?.id && <span className="lb-you-badge">You</span>}
                </span>
                <div className="lb-values">
                  <span className="lb-value">{formatCurrency(p.portfolio_value)}</span>
                  <span className="lb-change" style={{ color: getChangeColor(p.return_pct) }}>
                    {p.return_pct >= 0 ? '+' : ''}{p.return_pct?.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Holdings */}
        {myEntry && (
          <div className="comp-section">
            <h2>My Holdings</h2>
            {myHoldings.length === 0 ? (
              <div className="comp-no-holdings">
                <TrendingUp size={32} style={{ opacity: 0.3 }} />
                <p>No holdings yet. {isActive ? 'Make your first trade!' : 'Competition starts soon.'}</p>
              </div>
            ) : (
              <div className="comp-holdings-list">
                {myHoldings.map(h => (
                  <div key={h.ticker} className="comp-holding-row">
                    <div className="holding-info">
                      <strong>{h.ticker}</strong>
                      <span>{h.shares} shares</span>
                    </div>
                    <div className="holding-values">
                      <span>{formatCurrency(h.current_value)}</span>
                      <span style={{ color: getChangeColor(h.gain_pct) }}>
                        {h.gain_pct >= 0 ? '+' : ''}{h.gain_pct?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trade Modal */}
      {showTrade && (
        <div className="modal-overlay" onClick={() => setShowTrade(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Make a Trade</h2>
              <button className="modal-close" onClick={() => setShowTrade(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="trade-type-toggle">
                <button className={`trade-type-btn ${tradeType === 'buy' ? 'buy active' : ''}`} onClick={() => setTradeType('buy')}>
                  <TrendingUp size={16} /> Buy
                </button>
                <button className={`trade-type-btn ${tradeType === 'sell' ? 'sell active' : ''}`} onClick={() => setTradeType('sell')}>
                  <TrendingDown size={16} /> Sell
                </button>
              </div>

              <div className="form-group">
                <label>Search Stock</label>
                <input
                  type="text"
                  value={selectedStock ? selectedStock.ticker : tradeQuery}
                  onChange={e => { setSelectedStock(null); handleTradeSearch(e.target.value.toUpperCase()); }}
                  placeholder="Type ticker or name..."
                  className="form-input"
                />
                {tradeResults.length > 0 && !selectedStock && (
                  <div className="trade-search-results">
                    {tradeResults.map(r => (
                      <div key={r.ticker} className="trade-search-item" onClick={() => { setSelectedStock(r); setTradeQuery(r.ticker); setTradeResults([]); }}>
                        <strong>{r.ticker}</strong> — {r.name?.substring(0, 30)} <span style={{ color: '#888' }}>{formatCurrency(r.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedStock && (
                  <div className="selected-stock-info">
                    Current price: <strong>{formatCurrency(selectedStock.price)}</strong>
                    <span style={{ color: getChangeColor(selectedStock.changePercent) }}> ({selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent?.toFixed(2)}%)</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Number of Shares</label>
                <input
                  type="number"
                  value={tradeShares}
                  onChange={e => setTradeShares(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="form-input"
                />
                {selectedStock && tradeShares > 0 && (
                  <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                    Total: {formatCurrency(selectedStock.price * Number(tradeShares))}
                    {tradeType === 'buy' && myEntry && ` | Cash: ${formatCurrency(myEntry.cash)}`}
                  </p>
                )}
              </div>

              {tradeError && <div className="form-error">{tradeError}</div>}

              <button
                className={`create-comp-btn ${tradeType === 'sell' ? 'sell-btn' : ''}`}
                onClick={executeTrade}
                disabled={tradeLoading}
              >
                {tradeLoading ? 'Processing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${tradeShares || '0'} Shares`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
