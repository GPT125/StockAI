import { useState, useEffect, useCallback } from 'react';
import {
  Globe, TrendingUp, TrendingDown, DollarSign, Newspaper, ExternalLink,
  RefreshCw, Activity, Fuel, Gem, Wheat, Bitcoin, BarChart3, Clock,
  ChevronDown, ChevronUp, ArrowUpDown, Gauge, Landmark, Signal
} from 'lucide-react';
import api from '../api/client';
import { formatCurrency, getChangeColor } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Globe },
  { id: 'indices', label: 'Indices', icon: BarChart3 },
  { id: 'currencies', label: 'Forex', icon: DollarSign },
  { id: 'commodities', label: 'Commodities', icon: Fuel },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
  { id: 'bonds', label: 'Bonds & Rates', icon: Landmark },
  { id: 'events', label: 'News & Events', icon: Newspaper },
];

const COMMODITY_ICONS = { Energy: Fuel, Metals: Gem, Agriculture: Wheat };

function formatNum(n, digits = 2) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
}

function formatVol(v) {
  if (!v) return '—';
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toLocaleString();
}

function ChangeCell({ value, abs }) {
  const color = getChangeColor(value);
  const arrow = value >= 0 ? '▲' : '▼';
  return (
    <span style={{ color, fontWeight: 600 }}>
      {arrow} {Math.abs(value || 0).toFixed(2)}%
      {abs != null && <span style={{ opacity: 0.7, fontWeight: 400 }}> ({abs >= 0 ? '+' : ''}{formatNum(abs)})</span>}
    </span>
  );
}

function StatusDot({ status }) {
  const colors = { open: '#22c55e', closed: '#ef4444', unknown: '#6b7280' };
  return (
    <span className="gm-status-dot" style={{ background: colors[status] || colors.unknown }} title={status}>
      <span className="gm-status-label">{status === 'open' ? 'Open' : status === 'closed' ? 'Closed' : '—'}</span>
    </span>
  );
}

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th onClick={() => onSort(field)} className="gm-sortable-th">
      {label}
      <span className="gm-sort-icon">
        {active ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} style={{ opacity: 0.3 }} />}
      </span>
    </th>
  );
}

function useSort(defaultField = 'changePercent', defaultDir = 'desc') {
  const [sortField, setSortField] = useState(defaultField);
  const [sortDir, setSortDir] = useState(defaultDir);
  const onSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const sortFn = (a, b) => {
    const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  };
  return { sortField, sortDir, onSort, sortFn };
}

// ── Fear & Greed Gauge ──
function FearGreedGauge({ data }) {
  if (!data) return null;
  const { score, label, vix, vixChange } = data;
  const rotation = -90 + (score / 100) * 180;
  const gaugeColor =
    score >= 75 ? '#22c55e' : score >= 55 ? '#84cc16' : score >= 45 ? '#eab308' : score >= 25 ? '#f97316' : '#ef4444';

  return (
    <div className="gm-fear-greed">
      <div className="gm-fg-gauge">
        <svg viewBox="0 0 200 120" width="180" height="108">
          <defs>
            <linearGradient id="fgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#fgGrad)" strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 251.33} 251.33`} />
          <line x1="100" y1="100" x2="100" y2="30"
            stroke={gaugeColor} strokeWidth="3" strokeLinecap="round"
            transform={`rotate(${rotation}, 100, 100)`} />
          <circle cx="100" cy="100" r="6" fill={gaugeColor} />
        </svg>
        <div className="gm-fg-score" style={{ color: gaugeColor }}>{score}</div>
      </div>
      <div className="gm-fg-label" style={{ color: gaugeColor }}>{label}</div>
      <div className="gm-fg-vix">
        VIX: {vix} <ChangeCell value={vixChange} />
      </div>
    </div>
  );
}

// ── Heat Map ──
function HeatMap({ indices }) {
  if (!indices || typeof indices !== 'object') return null;
  const all = Object.values(indices).flat().filter(Boolean);
  if (all.length === 0) return null;

  return (
    <div className="gm-heatmap">
      {all.map(ix => {
        const pct = ix.changePercent || 0;
        const intensity = Math.min(Math.abs(pct) / 3, 1);
        const bg = pct >= 0
          ? `rgba(34, 197, 94, ${0.1 + intensity * 0.5})`
          : `rgba(239, 68, 68, ${0.1 + intensity * 0.5})`;
        return (
          <div key={ix.ticker} className="gm-heat-cell" style={{ background: bg }}>
            <span className="gm-heat-flag">{ix.flag}</span>
            <span className="gm-heat-name">{ix.name}</span>
            <span className="gm-heat-pct" style={{ color: getChangeColor(pct) }}>
              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ──
export default function GlobalMarkets() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState({});

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await api.get('/global/overview');
      setData(res.data);
      setLastUpdated(new Date());
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => loadData(false), 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const toggleRegion = (region) => {
    setExpandedRegions(prev => ({ ...prev, [region]: !prev[region] }));
  };

  if (loading) return <LoadingSpinner message="Loading global markets..." />;

  const { indices, currencies, commodities, crypto, bonds, futures, fearGreed, dxy, events } = data || {};

  return (
    <div className="dashboard gm-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1><Globe size={26} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Global Markets</h1>
          <span className="dashboard-date">
            Real-time global indices, forex, commodities, crypto & news
            {lastUpdated && (
              <span style={{ marginLeft: 12, opacity: 0.6 }}>
                <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </span>
        </div>
        <button className="analyze-btn" onClick={() => loadData(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="gm-tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`gm-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="gm-overview">
          {/* Top row: Fear & Greed + Futures + DXY + Bonds */}
          <div className="gm-top-row">
            <div className="gm-card gm-card-fg">
              <h3><Gauge size={16} /> Market Sentiment</h3>
              <FearGreedGauge data={fearGreed} />
            </div>

            <div className="gm-card">
              <h3><Signal size={16} /> US Futures</h3>
              <div className="gm-mini-table">
                {(futures || []).map(f => (
                  <div key={f.ticker} className="gm-mini-row">
                    <span className="gm-mini-label">{f.label}</span>
                    <span className="gm-mini-price">{formatNum(f.price)}</span>
                    <ChangeCell value={f.changePercent} />
                  </div>
                ))}
              </div>
            </div>

            <div className="gm-card">
              <h3><Landmark size={16} /> Treasury Yields</h3>
              <div className="gm-mini-table">
                {(bonds || []).map(b => (
                  <div key={b.ticker} className="gm-mini-row">
                    <span className="gm-mini-label">{b.label}</span>
                    <span className="gm-mini-price">{b.price != null ? b.price.toFixed(3) + '%' : '—'}</span>
                    <ChangeCell value={b.changePercent} />
                  </div>
                ))}
                {dxy && (
                  <div className="gm-mini-row" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 4 }}>
                    <span className="gm-mini-label">Dollar Index</span>
                    <span className="gm-mini-price">{formatNum(dxy.price)}</span>
                    <ChangeCell value={dxy.changePercent} />
                  </div>
                )}
              </div>
            </div>

            <div className="gm-card">
              <h3><Bitcoin size={16} /> Crypto</h3>
              <div className="gm-mini-table">
                {(crypto || []).slice(0, 4).map(c => (
                  <div key={c.ticker} className="gm-mini-row">
                    <span className="gm-mini-label">{c.label}</span>
                    <span className="gm-mini-price">{formatCurrency(c.price)}</span>
                    <ChangeCell value={c.changePercent} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Heat Map */}
          <div className="gm-section">
            <h2><Activity size={18} /> Global Heat Map</h2>
            <HeatMap indices={indices} />
          </div>

          {/* Key Commodities row */}
          <div className="gm-section">
            <h2><Fuel size={18} /> Key Commodities</h2>
            <div className="gm-commodity-strip">
              {commodities && Object.values(commodities).flat().slice(0, 8).map(c => (
                <div key={c.ticker} className="gm-comm-chip">
                  <span className="gm-comm-name">{c.label}</span>
                  <span className="gm-comm-price">{formatCurrency(c.price)}</span>
                  <ChangeCell value={c.changePercent} />
                </div>
              ))}
            </div>
          </div>

          {/* Currencies row */}
          <div className="gm-section">
            <h2><DollarSign size={18} /> Major Currency Pairs</h2>
            <div className="gm-currency-grid">
              {(currencies || []).slice(0, 8).map(c => (
                <div key={c.ticker} className="gm-curr-card">
                  <span className="gm-curr-pair">{c.label}</span>
                  <span className="gm-curr-rate">{c.price?.toFixed(4)}</span>
                  <ChangeCell value={c.changePercent} />
                </div>
              ))}
            </div>
          </div>

          {/* Latest news */}
          <div className="gm-section">
            <h2><Newspaper size={18} /> Latest Global News</h2>
            <NewsList events={events} limit={8} />
          </div>
        </div>
      )}

      {/* Indices Tab */}
      {tab === 'indices' && (
        <IndicesTab indices={indices} expandedRegions={expandedRegions} toggleRegion={toggleRegion} />
      )}

      {/* Forex Tab */}
      {tab === 'currencies' && <ForexTab currencies={currencies} dxy={dxy} />}

      {/* Commodities Tab */}
      {tab === 'commodities' && <CommoditiesTab commodities={commodities} />}

      {/* Crypto Tab */}
      {tab === 'crypto' && <CryptoTab crypto={crypto} />}

      {/* Bonds Tab */}
      {tab === 'bonds' && <BondsTab bonds={bonds} futures={futures} dxy={dxy} fearGreed={fearGreed} />}

      {/* Events Tab */}
      {tab === 'events' && (
        <div className="gm-section">
          <h2><Newspaper size={18} /> International News & Events</h2>
          <p className="gm-section-desc">Auto-updated from global financial news sources</p>
          <NewsList events={events} limit={30} />
        </div>
      )}
    </div>
  );
}

// ── Indices Tab ──
function IndicesTab({ indices, expandedRegions, toggleRegion }) {
  const sort = useSort();
  if (!indices) return null;

  return (
    <div className="gm-indices-tab">
      {Object.entries(indices).map(([region, items]) => {
        const expanded = expandedRegions[region] !== false; // default expanded
        const sorted = [...items].sort(sort.sortFn);
        const gainers = items.filter(i => (i.changePercent || 0) > 0).length;
        const losers = items.length - gainers;
        return (
          <div key={region} className="gm-region-block">
            <div className="gm-region-header" onClick={() => toggleRegion(region)}>
              <h3>{region}</h3>
              <div className="gm-region-summary">
                <span style={{ color: '#22c55e' }}>▲ {gainers}</span>
                <span style={{ color: '#ef4444' }}>▼ {losers}</span>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
            {expanded && (
              <div className="gm-table-wrap">
                <table className="gm-table">
                  <thead>
                    <tr>
                      <th>Index</th>
                      <th>Status</th>
                      <SortHeader label="Price" field="price" {...sort} />
                      <SortHeader label="Change %" field="changePercent" {...sort} />
                      <SortHeader label="Day High" field="dayHigh" {...sort} />
                      <SortHeader label="Day Low" field="dayLow" {...sort} />
                      <SortHeader label="Volume" field="volume" {...sort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(ix => (
                      <tr key={ix.ticker}>
                        <td>
                          <span className="gm-idx-flag">{ix.flag}</span>
                          <span className="gm-idx-name">{ix.name}</span>
                          <span className="gm-idx-country">{ix.country}</span>
                        </td>
                        <td><StatusDot status={ix.status} /></td>
                        <td className="gm-num">{formatNum(ix.price)}</td>
                        <td className="gm-num"><ChangeCell value={ix.changePercent} abs={ix.change} /></td>
                        <td className="gm-num">{formatNum(ix.dayHigh)}</td>
                        <td className="gm-num">{formatNum(ix.dayLow)}</td>
                        <td className="gm-num">{formatVol(ix.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Forex Tab ──
function ForexTab({ currencies, dxy }) {
  const sort = useSort('changePercent', 'desc');
  const sorted = [...(currencies || [])].sort(sort.sortFn);

  return (
    <div className="gm-section">
      {dxy && (
        <div className="gm-dxy-banner">
          <div>
            <span className="gm-dxy-label">US Dollar Index (DXY)</span>
            <span className="gm-dxy-price">{formatNum(dxy.price)}</span>
          </div>
          <ChangeCell value={dxy.changePercent} abs={dxy.change} />
        </div>
      )}
      <div className="gm-table-wrap">
        <table className="gm-table">
          <thead>
            <tr>
              <SortHeader label="Pair" field="label" {...sort} />
              <SortHeader label="Rate" field="price" {...sort} />
              <SortHeader label="Change %" field="changePercent" {...sort} />
              <th>Prev Close</th>
              <th>Day Range</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.ticker}>
                <td className="gm-pair-cell"><DollarSign size={14} /> {c.label}</td>
                <td className="gm-num" style={{ fontWeight: 600 }}>{c.price?.toFixed(4)}</td>
                <td className="gm-num"><ChangeCell value={c.changePercent} abs={c.change} /></td>
                <td className="gm-num">{c.previousClose?.toFixed(4) || '—'}</td>
                <td className="gm-num">{c.dayLow?.toFixed(4) || '—'} – {c.dayHigh?.toFixed(4) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Commodities Tab ──
function CommoditiesTab({ commodities }) {
  const sort = useSort();
  if (!commodities) return null;

  return (
    <div className="gm-commodities-tab">
      {Object.entries(commodities).map(([category, items]) => {
        const Icon = COMMODITY_ICONS[category] || Fuel;
        const sorted = [...items].sort(sort.sortFn);
        return (
          <div key={category} className="gm-section">
            <h3><Icon size={16} /> {category}</h3>
            <div className="gm-table-wrap">
              <table className="gm-table">
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <SortHeader label="Price" field="price" {...sort} />
                    <SortHeader label="Change %" field="changePercent" {...sort} />
                    <th>Day Range</th>
                    <th>52W High</th>
                    <th>52W Low</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(c => (
                    <tr key={c.ticker}>
                      <td>{c.label}</td>
                      <td className="gm-num" style={{ fontWeight: 600 }}>{formatCurrency(c.price)}</td>
                      <td className="gm-num"><ChangeCell value={c.changePercent} abs={c.change} /></td>
                      <td className="gm-num">{formatNum(c.dayLow)} – {formatNum(c.dayHigh)}</td>
                      <td className="gm-num">{formatNum(c.fiftyTwoWeekHigh)}</td>
                      <td className="gm-num">{formatNum(c.fiftyTwoWeekLow)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Crypto Tab ──
function CryptoTab({ crypto }) {
  const sort = useSort();
  const sorted = [...(crypto || [])].sort(sort.sortFn);

  return (
    <div className="gm-section">
      <h2><Bitcoin size={18} /> Cryptocurrency</h2>
      <div className="gm-table-wrap">
        <table className="gm-table">
          <thead>
            <tr>
              <th>Asset</th>
              <SortHeader label="Price" field="price" {...sort} />
              <SortHeader label="Change %" field="changePercent" {...sort} />
              <SortHeader label="Market Cap" field="marketCap" {...sort} />
              <SortHeader label="Volume" field="volume" {...sort} />
              <th>Day Range</th>
              <th>52W Range</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.ticker}>
                <td style={{ fontWeight: 600 }}>{c.label}</td>
                <td className="gm-num" style={{ fontWeight: 600 }}>{formatCurrency(c.price)}</td>
                <td className="gm-num"><ChangeCell value={c.changePercent} abs={c.change} /></td>
                <td className="gm-num">{c.marketCap ? formatVol(c.marketCap) : '—'}</td>
                <td className="gm-num">{formatVol(c.volume)}</td>
                <td className="gm-num">{formatNum(c.dayLow)} – {formatNum(c.dayHigh)}</td>
                <td className="gm-num">{formatNum(c.fiftyTwoWeekLow)} – {formatNum(c.fiftyTwoWeekHigh)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Bonds Tab ──
function BondsTab({ bonds, futures, dxy, fearGreed }) {
  return (
    <div className="gm-bonds-tab">
      <div className="gm-bonds-grid">
        <div className="gm-card">
          <h3><Landmark size={16} /> US Treasury Yields</h3>
          <div className="gm-table-wrap">
            <table className="gm-table">
              <thead>
                <tr><th>Maturity</th><th>Yield</th><th>Change</th></tr>
              </thead>
              <tbody>
                {(bonds || []).map(b => (
                  <tr key={b.ticker}>
                    <td>{b.label}</td>
                    <td className="gm-num" style={{ fontWeight: 600 }}>{b.price != null ? b.price.toFixed(3) + '%' : '—'}</td>
                    <td className="gm-num"><ChangeCell value={b.changePercent} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="gm-card">
          <h3><Signal size={16} /> US Index Futures</h3>
          <div className="gm-table-wrap">
            <table className="gm-table">
              <thead>
                <tr><th>Contract</th><th>Price</th><th>Change</th></tr>
              </thead>
              <tbody>
                {(futures || []).map(f => (
                  <tr key={f.ticker}>
                    <td>{f.label}</td>
                    <td className="gm-num" style={{ fontWeight: 600 }}>{formatNum(f.price)}</td>
                    <td className="gm-num"><ChangeCell value={f.changePercent} abs={f.change} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="gm-card gm-card-fg">
          <h3><Gauge size={16} /> Fear & Greed</h3>
          <FearGreedGauge data={fearGreed} />
        </div>

        {dxy && (
          <div className="gm-card">
            <h3>US Dollar Index</h3>
            <div className="gm-dxy-big">
              <div className="gm-dxy-big-price">{formatNum(dxy.price)}</div>
              <ChangeCell value={dxy.changePercent} abs={dxy.change} />
            </div>
            <div className="gm-mini-table" style={{ marginTop: 12 }}>
              <div className="gm-mini-row">
                <span className="gm-mini-label">Day Range</span>
                <span>{formatNum(dxy.dayLow)} – {formatNum(dxy.dayHigh)}</span>
              </div>
              <div className="gm-mini-row">
                <span className="gm-mini-label">Prev Close</span>
                <span>{formatNum(dxy.previousClose)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── News List ──
function NewsList({ events, limit = 25 }) {
  if (!events || events.length === 0) {
    return <div className="comp-empty" style={{ padding: 24 }}><p style={{ color: '#888' }}>No recent events available.</p></div>;
  }
  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    const now = new Date();
    const diffH = Math.floor((now - d) / 3600000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    if (diffH < 48) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="gm-news-list">
      {events.slice(0, limit).map((n, i) => (
        <a key={i} href={n.link || n.url} target="_blank" rel="noopener noreferrer" className="gm-news-item">
          {n.thumbnail && <img src={n.thumbnail} alt="" className="gm-news-thumb" />}
          <div className="gm-news-content">
            <h4 className="gm-news-title">{n.title}</h4>
            <div className="gm-news-meta">
              {n.publisher && <span className="gm-news-source">{n.publisher}</span>}
              <span className="gm-news-time">{formatDate(n.providerPublishTime || n.pubDate)}</span>
            </div>
          </div>
          <ExternalLink size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
        </a>
      ))}
    </div>
  );
}
