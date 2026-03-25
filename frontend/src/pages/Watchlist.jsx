import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { searchStocks, getStock, getStockHistory, getWatchlist, addToWatchlist, removeFromWatchlist } from '../api/client';
import { formatCurrency, formatLargeNumber, formatPercent, getChangeColor } from '../utils/formatters';
import { Search, Eye, Plus, X, TrendingUp, TrendingDown, Bell, Trash2, ArrowRight } from 'lucide-react';

export default function Watchlist() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTicker, setAlertTicker] = useState('');
  const [alertType, setAlertType] = useState('price_below');
  const [alertValue, setAlertValue] = useState('');
  const [alertNotes, setAlertNotes] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      const res = await getWatchlist();
      setWatchlist(res.data || []);
    } catch {
      setWatchlist([]);
    }
  };

  const handleSearch = async (q) => {
    setQuery(q);
    if (q.length >= 1) {
      setSearching(true);
      try {
        const res = await searchStocks(q);
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectStock = async (ticker) => {
    setLoadingPreview(true);
    try {
      const [stockRes, histRes] = await Promise.all([
        getStock(ticker).catch(() => ({ data: null })),
        getStockHistory(ticker, '3m').catch(() => ({ data: [] })),
      ]);
      setSelectedStock(stockRes.data);
      setSelectedHistory(histRes.data || []);
    } catch {
      setSelectedStock(null);
      setSelectedHistory([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleOpenAlertModal = (ticker) => {
    setAlertTicker(ticker);
    setAlertType('price_below');
    setAlertValue('');
    setAlertNotes('');
    setShowAlertModal(true);
  };

  const handleAddToWatchlist = async () => {
    try {
      await addToWatchlist(alertTicker, alertType, alertValue ? Number(alertValue) : null, alertNotes);
      setShowAlertModal(false);
      loadWatchlist();
    } catch {}
  };

  const handleRemove = async (ticker) => {
    try {
      await removeFromWatchlist(ticker);
      loadWatchlist();
    } catch {}
  };

  const isInWatchlist = (ticker) => watchlist.some(w => w.ticker === ticker);

  return (
    <div className="watchlist-page">
      <h1><Eye size={24} /> Watchlist</h1>

      <div className="watchlist-layout">
        {/* Left: Search & Preview */}
        <div className="watchlist-search-side">
          <div className="watchlist-search-card">
            <div className="watchlist-search-bar">
              <Search size={16} className="ws-icon" />
              <input
                type="text"
                placeholder="Search stocks and ETFs..."
                value={query}
                onChange={(e) => handleSearch(e.target.value.toUpperCase())}
                className="ws-input"
              />
            </div>

            <div className="ws-results">
              {searchResults.length > 0 ? searchResults.map((r) => (
                <div
                  key={r.ticker}
                  className={`ws-result-item ${selectedStock?.ticker === r.ticker ? 'selected' : ''}`}
                  onClick={() => handleSelectStock(r.ticker)}
                >
                  <div className="ws-result-left">
                    <strong>{r.ticker}</strong>
                    {r.quoteType === 'ETF' && <span className="ws-etf-tag">ETF</span>}
                    <span className="ws-result-name">{r.name}</span>
                  </div>
                  <div className="ws-result-right">
                    <span className="ws-result-price">{formatCurrency(r.price)}</span>
                    <span style={{ color: getChangeColor(r.changePercent), fontSize: 12, fontWeight: 600 }}>
                      {r.changePercent >= 0 ? '+' : ''}{r.changePercent?.toFixed(2)}%
                    </span>
                    {!isInWatchlist(r.ticker) ? (
                      <button className="ws-add-btn" onClick={(e) => { e.stopPropagation(); handleOpenAlertModal(r.ticker); }} title="Add to Watchlist">
                        <Plus size={14} />
                      </button>
                    ) : (
                      <span className="ws-in-list" title="In watchlist">
                        <Eye size={14} />
                      </span>
                    )}
                  </div>
                </div>
              )) : query.length > 0 && !searching ? (
                <div className="ws-empty">No results found</div>
              ) : (
                <div className="ws-empty">Type to search for stocks and ETFs</div>
              )}
            </div>
          </div>

          {/* Stock Preview */}
          {selectedStock && (
            <div className="ws-preview-card">
              <div className="ws-preview-header">
                <div>
                  <h3>{selectedStock.ticker} <span style={{ color: '#888', fontWeight: 400, fontSize: 14 }}>{selectedStock.name}</span></h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>{formatCurrency(selectedStock.price)}</span>
                    <span style={{ color: getChangeColor(selectedStock.changePercent), fontWeight: 600 }}>
                      {selectedStock.changePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent?.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!isInWatchlist(selectedStock.ticker) && (
                    <button className="ws-action-btn green" onClick={() => handleOpenAlertModal(selectedStock.ticker)}>
                      <Plus size={14} /> Watch
                    </button>
                  )}
                  <button className="ws-action-btn" onClick={() => navigate(`/stock/${selectedStock.ticker}`)}>
                    Details <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Mini Chart */}
              {selectedHistory.length > 0 && (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={selectedHistory}>
                    <defs>
                      <linearGradient id="previewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={(selectedStock.changePercent || 0) >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={(selectedStock.changePercent || 0) >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #333', borderRadius: 6, fontSize: 12 }} formatter={(v) => [formatCurrency(v), 'Price']} />
                    <Area type="monotone" dataKey="close" stroke={(selectedStock.changePercent || 0) >= 0 ? '#22c55e' : '#ef4444'} fill="url(#previewGrad)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Key Stats */}
              <div className="ws-stats-grid">
                <div className="ws-stat"><span className="ws-stat-label">Market Cap</span><span>{formatLargeNumber(selectedStock.marketCap)}</span></div>
                <div className="ws-stat"><span className="ws-stat-label">P/E</span><span>{selectedStock.pe?.toFixed(1) || 'N/A'}</span></div>
                <div className="ws-stat"><span className="ws-stat-label">52W High</span><span>{formatCurrency(selectedStock.fiftyTwoWeekHigh)}</span></div>
                <div className="ws-stat"><span className="ws-stat-label">52W Low</span><span>{formatCurrency(selectedStock.fiftyTwoWeekLow)}</span></div>
                <div className="ws-stat"><span className="ws-stat-label">Volume</span><span>{formatLargeNumber(selectedStock.volume)}</span></div>
                <div className="ws-stat"><span className="ws-stat-label">Beta</span><span>{selectedStock.beta?.toFixed(2) || 'N/A'}</span></div>
                <div className="ws-stat"><span className="ws-stat-label">EPS</span><span>{selectedStock.eps ? formatCurrency(selectedStock.eps) : 'N/A'}</span></div>
                <div className="ws-stat"><span className="ws-stat-label">Dividend</span><span>{selectedStock.dividend ? formatPercent(selectedStock.dividend) : 'N/A'}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Watchlist */}
        <div className="watchlist-list-side">
          <div className="watchlist-list-card">
            <div className="wl-header">
              <h3><Eye size={16} /> My Watchlist ({watchlist.length})</h3>
            </div>

            {watchlist.length > 0 ? (
              <div className="wl-items">
                {watchlist.map((item) => {
                  const isUp = (item.changePercent || 0) >= 0;
                  return (
                    <div key={item.ticker} className="wl-item" onClick={() => handleSelectStock(item.ticker)}>
                      <div className="wl-item-left">
                        <div className="wl-ticker-row">
                          <strong>{item.ticker}</strong>
                          {item.quoteType === 'ETF' && <span className="ws-etf-tag">ETF</span>}
                        </div>
                        <span className="wl-item-name">{item.name}</span>
                        {item.alertType && (
                          <span className="wl-alert-badge">
                            <Bell size={10} /> {item.alertType.replace('_', ' ')} {item.alertValue != null ? `$${item.alertValue}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="wl-item-right">
                        <span className="wl-item-price">{item.price ? formatCurrency(item.price) : '—'}</span>
                        <span style={{ color: getChangeColor(item.changePercent), fontSize: 12, fontWeight: 600 }}>
                          {isUp ? '+' : ''}{item.changePercent?.toFixed(2) || '0.00'}%
                        </span>
                        <button className="wl-remove-btn" onClick={(e) => { e.stopPropagation(); handleRemove(item.ticker); }} title="Remove">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="wl-empty">
                <Eye size={32} style={{ color: '#333', marginBottom: 8 }} />
                <p>Your watchlist is empty</p>
                <span>Search for stocks and click the + button to add them</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add {alertTicker} to Watchlist</h3>
              <button className="modal-close" onClick={() => setShowAlertModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body">
              <label className="modal-label">Alert Type (optional)</label>
              <div className="alert-options">
                {[
                  { value: 'price_below', label: 'Price falls below' },
                  { value: 'price_above', label: 'Price rises above' },
                  { value: 'percent_drop', label: 'Drops by %' },
                  { value: 'percent_rise', label: 'Rises by %' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    className={`alert-option ${alertType === opt.value ? 'active' : ''}`}
                    onClick={() => setAlertType(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label className="modal-label">{alertType.includes('percent') ? 'Percentage' : 'Price'}</label>
              <input
                type="number"
                className="modal-input"
                placeholder={alertType.includes('percent') ? 'e.g. 5' : 'e.g. 150.00'}
                value={alertValue}
                onChange={(e) => setAlertValue(e.target.value)}
              />

              <label className="modal-label">Notes (optional)</label>
              <input
                type="text"
                className="modal-input"
                placeholder="e.g. Buy opportunity at this level"
                value={alertNotes}
                onChange={(e) => setAlertNotes(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setShowAlertModal(false)}>Cancel</button>
              <button className="modal-submit" onClick={handleAddToWatchlist}>
                <Plus size={14} /> Add to Watchlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
