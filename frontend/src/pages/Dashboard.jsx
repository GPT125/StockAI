import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMarketOverview, getSectors, getTopStocks, getMarketSummary } from '../api/client';
import { formatCurrency, formatChangePercent, getChangeColor, getScoreColor } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StockCard from '../components/common/StockCard';
import { FileText, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

const getHeatmapColor = (changePercent) => {
  const val = parseFloat(changePercent) || 0;
  if (val > 2) return '#00c853';
  if (val > 1) return '#2e7d32';
  if (val > 0.5) return '#1b5e20';
  if (val > 0) return '#33691e';
  if (val > -0.5) return '#827717';
  if (val > -1) return '#bf360c';
  if (val > -2) return '#c62828';
  return '#b71c1c';
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function Dashboard() {
  const { user } = useAuth();
  const [indices, setIndices] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [topStocks, setTopStocks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const navigate = useNavigate();

  const loadSummary = () => {
    setSummaryLoading(true);
    getMarketSummary()
      .then(res => setSummary(res.data))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  };

  useEffect(() => {
    async function load() {
      try {
        const [idx, sec, top] = await Promise.all([
          getMarketOverview().catch(() => ({ data: [] })),
          getSectors().catch(() => ({ data: [] })),
          getTopStocks(12).catch(() => ({ data: [] })),
        ]);
        setIndices(idx.data);
        setSectors(sec.data);
        setTopStocks(top.data);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Load summary separately (it's slower due to AI)
    loadSummary();

    // Auto-refresh market summary every 5 minutes
    const summaryInterval = setInterval(loadSummary, 5 * 60 * 1000);
    return () => clearInterval(summaryInterval);
  }, []);

  if (loading) return <LoadingSpinner message="Loading market data..." />;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{user ? `${getGreeting()}, ${user.name?.split(' ')[0] || user.email.split('@')[0]}` : 'Market Overview'}</h1>
        <span className="dashboard-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>

      {/* Market Summary */}
      <div className="market-summary-card">
        <h3><FileText size={18} /> Market Summary</h3>
        {summaryLoading ? (
          <p style={{ color: '#888', fontSize: 14 }}>Generating AI market summary...</p>
        ) : summary ? (
          <>
            <div className="summary-text" dangerouslySetInnerHTML={{ __html: (summary.summary || '')
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>')
              .replace(/\n/g, '<br/>')
            }} />
            {summary.sources && summary.sources.length > 0 && (
              <div className="summary-sources">
                <span style={{ color: '#888', fontSize: 12 }}>Sources: </span>
                {summary.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="source-link">
                    {s.source || 'Link'} <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            )}
            {summary.generatedAt && (
              <span className="summary-time">Updated: {new Date(summary.generatedAt).toLocaleTimeString()}</span>
            )}
          </>
        ) : (
          <p style={{ color: '#666', fontSize: 14 }}>Market summary unavailable.</p>
        )}
      </div>

      <div className="index-cards">
        {indices.map((idx) => (
          <div key={idx.name} className="index-card">
            <h3>{idx.name}</h3>
            <p className="index-price">{formatCurrency(idx.price)}</p>
            <p className="index-change" style={{ color: getChangeColor(idx.changePercent) }}>
              {formatChangePercent(idx.changePercent)}
            </p>
          </div>
        ))}
      </div>

      {/* Market Movers */}
      {topStocks.length > 0 && (
        <div className="market-movers">
          <div className="movers-section">
            <h3 className="movers-title gainers-title">
              <TrendingUp size={16} /> Top Gainers
            </h3>
            <div className="movers-list">
              {[...topStocks]
                .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
                .slice(0, 5)
                .map((s) => (
                  <div key={s.ticker} className="mover-item" onClick={() => navigate(`/stock/${s.ticker}`)}>
                    <div className="mover-info">
                      <span className="mover-ticker">{s.ticker}</span>
                      <span className="mover-name">{s.name?.substring(0, 20)}</span>
                    </div>
                    <div className="mover-data">
                      <span className="mover-price">{formatCurrency(s.price)}</span>
                      <span className="mover-change" style={{ color: getChangeColor(s.changePercent) }}>
                        {formatChangePercent(s.changePercent)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className="movers-section">
            <h3 className="movers-title losers-title">
              <TrendingDown size={16} /> Top Losers
            </h3>
            <div className="movers-list">
              {[...topStocks]
                .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
                .slice(0, 5)
                .map((s) => (
                  <div key={s.ticker} className="mover-item" onClick={() => navigate(`/stock/${s.ticker}`)}>
                    <div className="mover-info">
                      <span className="mover-ticker">{s.ticker}</span>
                      <span className="mover-name">{s.name?.substring(0, 20)}</span>
                    </div>
                    <div className="mover-data">
                      <span className="mover-price">{formatCurrency(s.price)}</span>
                      <span className="mover-change" style={{ color: getChangeColor(s.changePercent) }}>
                        {formatChangePercent(s.changePercent)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <h2>Top Rated Stocks</h2>
      <div className="stock-grid">
        {topStocks.map((stock) => (
          <StockCard key={stock.ticker} stock={stock} />
        ))}
      </div>

      <h2>Sector Performance</h2>
      <div className="sector-heatmap">
        {sectors.map((s) => (
          <div
            key={s.sector}
            className="heatmap-cell"
            style={{ backgroundColor: getHeatmapColor(s.changePercent) }}
            onClick={() => navigate(`/screener?sector=${encodeURIComponent(s.sector)}`)}
          >
            <span className="heatmap-cell-name">{s.sector}</span>
            <span className="heatmap-cell-etf">{s.etf}</span>
            <span className="heatmap-cell-change">
              {s.changePercent >= 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
