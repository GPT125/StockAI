import { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, PieChart, Target, Play, RefreshCw } from 'lucide-react';

/**
 * Interactive mini-games / simulators used in Academy lessons.
 * Each game is small and self-contained. Dispatched by lesson.game field.
 */

// ──────────────────────────────────────────────────────────────────────────
// 1. Compound Interest Calculator
// ──────────────────────────────────────────────────────────────────────────
function CompoundGame() {
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(30);
  const [rate, setRate] = useState(10);

  const { final, contributed, growth, yearly } = useMemo(() => {
    const r = rate / 100 / 12;
    const n = years * 12;
    let balance = 0;
    const yearly = [];
    for (let i = 1; i <= n; i++) {
      balance = balance * (1 + r) + monthly;
      if (i % 12 === 0) yearly.push(Math.round(balance));
    }
    const contributed = monthly * n;
    return { final: Math.round(balance), contributed, growth: Math.round(balance) - contributed, yearly };
  }, [monthly, years, rate]);

  const fmt = (n) => '$' + n.toLocaleString();

  return (
    <div className="academy-game-card">
      <div className="academy-game-header">
        <DollarSign size={20} />
        <h3>Compound Interest Simulator</h3>
      </div>
      <div className="academy-game-controls">
        <label>
          Monthly investment: <strong>{fmt(monthly)}</strong>
          <input type="range" min={50} max={3000} step={50} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
        </label>
        <label>
          Years invested: <strong>{years}</strong>
          <input type="range" min={1} max={50} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </label>
        <label>
          Annual return: <strong>{rate}%</strong>
          <input type="range" min={1} max={15} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </label>
      </div>
      <div className="academy-game-results">
        <div><span>Total contributed</span><strong>{fmt(contributed)}</strong></div>
        <div><span>Growth (compound interest)</span><strong style={{ color: '#22c55e' }}>+{fmt(growth)}</strong></div>
        <div className="big"><span>Final balance</span><strong>{fmt(final)}</strong></div>
      </div>
      <MiniBarChart values={yearly} label="Year-by-year balance" />
      <div className="academy-game-insight">
        Your money grew <strong>{contributed > 0 ? Math.round((final / contributed) * 10) / 10 : 0}×</strong> over {years} years. That's the magic of compounding!
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Dollar-Cost Averaging vs Lump Sum
// ──────────────────────────────────────────────────────────────────────────
function DCAGame() {
  // Simulated monthly prices for one year (volatile)
  const prices = [100, 95, 110, 92, 105, 88, 115, 102, 90, 108, 98, 112];
  const [showResult, setShowResult] = useState(false);
  const amount = 12000;
  const monthly = amount / 12;

  const dca = useMemo(() => {
    let shares = 0;
    prices.forEach((p) => { shares += monthly / p; });
    return { shares, avg: amount / shares };
  }, []);

  const lump = { shares: amount / prices[0], avg: prices[0] };
  const finalPrice = prices[prices.length - 1];
  const dcaValue = dca.shares * finalPrice;
  const lumpValue = lump.shares * finalPrice;

  return (
    <div className="academy-game-card">
      <div className="academy-game-header">
        <TrendingUp size={20} />
        <h3>DCA vs Lump Sum Simulator</h3>
      </div>
      <p className="academy-game-sub">
        You invest $12,000 in a stock that moves up and down over 12 months. Which strategy wins?
      </p>
      <MiniBarChart values={prices} label="Monthly price ($)" />
      {!showResult ? (
        <button className="academy-game-btn" onClick={() => setShowResult(true)}>
          <Play size={14} /> Run simulation
        </button>
      ) : (
        <div className="academy-game-results">
          <div>
            <span>Lump sum (all upfront at $100)</span>
            <strong>{lump.shares.toFixed(1)} shares</strong>
            <span className="mini">Final value: <strong>${lumpValue.toFixed(0)}</strong></span>
          </div>
          <div>
            <span>DCA ($1,000/month)</span>
            <strong>{dca.shares.toFixed(1)} shares</strong>
            <span className="mini">Avg cost: <strong>${dca.avg.toFixed(2)}</strong>, Final: <strong>${dcaValue.toFixed(0)}</strong></span>
          </div>
          <div className="academy-game-insight">
            In this volatile market, DCA delivered an average cost of <strong>${dca.avg.toFixed(2)}</strong> — below
            the lump-sum price of <strong>$100</strong>. DCA shines in sideways/choppy markets. In steadily rising markets,
            lump sum usually wins. The real benefit of DCA is psychological: it removes emotion from investing.
          </div>
          <button className="academy-game-btn secondary" onClick={() => setShowResult(false)}>
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Risk Tolerance Questionnaire → Portfolio suggestion
// ──────────────────────────────────────────────────────────────────────────
function RiskToleranceGame() {
  const questions = [
    {
      q: 'How old are you?',
      options: [
        { label: '18-30', score: 5 },
        { label: '31-45', score: 4 },
        { label: '46-55', score: 3 },
        { label: '56-65', score: 2 },
        { label: '65+', score: 1 },
      ],
    },
    {
      q: 'Your portfolio drops 35% in a month. What do you do?',
      options: [
        { label: 'Sell everything to stop the pain', score: 1 },
        { label: 'Sell some to reduce stress', score: 2 },
        { label: 'Hold and wait it out', score: 4 },
        { label: 'Buy more — sale prices!', score: 5 },
      ],
    },
    {
      q: 'When do you need this money?',
      options: [
        { label: 'Less than 3 years', score: 1 },
        { label: '3-10 years', score: 3 },
        { label: '10-25 years', score: 4 },
        { label: '25+ years', score: 5 },
      ],
    },
    {
      q: 'Your primary goal:',
      options: [
        { label: 'Preserve what I have', score: 1 },
        { label: 'Steady modest growth', score: 3 },
        { label: 'Build long-term wealth', score: 4 },
        { label: 'Maximum growth, I accept big swings', score: 5 },
      ],
    },
  ];

  const [answers, setAnswers] = useState({});
  const done = Object.keys(answers).length === questions.length;
  const score = done ? Object.values(answers).reduce((a, b) => a + b, 0) : 0;

  const profile = useMemo(() => {
    if (!done) return null;
    if (score <= 8) return { name: 'Conservative', stocks: 30, bonds: 60, cash: 10, desc: 'Preservation-focused. Low volatility but lower long-term returns.' };
    if (score <= 12) return { name: 'Moderate', stocks: 60, bonds: 35, cash: 5, desc: 'Balanced growth and stability. Classic 60/40 portfolio.' };
    if (score <= 16) return { name: 'Growth', stocks: 80, bonds: 15, cash: 5, desc: 'Growth-focused with some cushion. Strong long-term returns with moderate volatility.' };
    return { name: 'Aggressive', stocks: 95, bonds: 5, cash: 0, desc: 'Maximum growth. Expect big drawdowns but highest long-term returns.' };
  }, [done, score]);

  return (
    <div className="academy-game-card">
      <div className="academy-game-header">
        <Target size={20} />
        <h3>Risk Tolerance Quiz</h3>
      </div>
      {questions.map((q, i) => (
        <div key={i} className="academy-game-q">
          <div className="q-label">{i + 1}. {q.q}</div>
          <div className="q-options">
            {q.options.map((o, j) => (
              <button
                key={j}
                className={`academy-game-option ${answers[i] === o.score ? 'selected' : ''}`}
                onClick={() => setAnswers(a => ({ ...a, [i]: o.score }))}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {profile && (
        <div className="academy-game-results">
          <div className="big"><span>Your profile</span><strong style={{ color: '#7c8cf8' }}>{profile.name}</strong></div>
          <p className="academy-game-sub">{profile.desc}</p>
          <div className="allocation-bars">
            <AllocBar label="Stocks" pct={profile.stocks} color="#22c55e" />
            <AllocBar label="Bonds" pct={profile.bonds} color="#3b82f6" />
            <AllocBar label="Cash" pct={profile.cash} color="#94a3b8" />
          </div>
          <div className="academy-game-insight">
            Suggested starter portfolio: <strong>{profile.stocks}%</strong> in VTI (total US stocks),
            <strong> {profile.bonds}%</strong> in BND (US bonds),
            <strong> {profile.cash}%</strong> in a high-yield savings account.
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Portfolio Builder Game — drag sliders to build a 3-ETF portfolio
// ──────────────────────────────────────────────────────────────────────────
function PortfolioBuilderGame() {
  const [vti, setVti] = useState(60);
  const [vxus, setVxus] = useState(30);
  const [bnd, setBnd] = useState(10);
  const total = vti + vxus + bnd;

  // Historical 10yr real returns (rough averages for illustration)
  const projected10yr = useMemo(() => {
    const vtiR = 0.11, vxusR = 0.06, bndR = 0.03;
    const blend = (vti / 100) * vtiR + (vxus / 100) * vxusR + (bnd / 100) * bndR;
    const volatility = (vti / 100) * 16 + (vxus / 100) * 18 + (bnd / 100) * 5;
    return { ret: blend * 100, vol: volatility };
  }, [vti, vxus, bnd]);

  const grow10k = Math.round(10000 * Math.pow(1 + projected10yr.ret / 100, 10));

  return (
    <div className="academy-game-card">
      <div className="academy-game-header">
        <PieChart size={20} />
        <h3>Portfolio Builder</h3>
      </div>
      <p className="academy-game-sub">
        Drag the sliders to build your 3-ETF portfolio. Total should equal 100%.
      </p>
      <div className="academy-game-controls">
        <label>
          VTI (US Stocks): <strong>{vti}%</strong>
          <input type="range" min={0} max={100} value={vti} onChange={(e) => setVti(Number(e.target.value))} />
        </label>
        <label>
          VXUS (International): <strong>{vxus}%</strong>
          <input type="range" min={0} max={100} value={vxus} onChange={(e) => setVxus(Number(e.target.value))} />
        </label>
        <label>
          BND (Bonds): <strong>{bnd}%</strong>
          <input type="range" min={0} max={100} value={bnd} onChange={(e) => setBnd(Number(e.target.value))} />
        </label>
      </div>
      <div className={`academy-total ${total === 100 ? 'ok' : 'warn'}`}>
        Total: {total}% {total !== 100 && '(should be 100)'}
      </div>
      <div className="allocation-bars">
        <AllocBar label="VTI" pct={vti} color="#22c55e" />
        <AllocBar label="VXUS" pct={vxus} color="#3b82f6" />
        <AllocBar label="BND" pct={bnd} color="#94a3b8" />
      </div>
      <div className="academy-game-results">
        <div><span>Expected annual return</span><strong>{projected10yr.ret.toFixed(1)}%</strong></div>
        <div><span>Volatility (std dev)</span><strong>{projected10yr.vol.toFixed(1)}%</strong></div>
        <div className="big"><span>$10,000 → 10 years</span><strong>${grow10k.toLocaleString()}</strong></div>
      </div>
      <div className="academy-game-insight">
        More stocks = higher expected return but bigger swings. More bonds = smoother ride but less growth.
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Shared mini components
// ──────────────────────────────────────────────────────────────────────────
function MiniBarChart({ values, label }) {
  const max = Math.max(...values);
  return (
    <div className="mini-bar-chart">
      <div className="mini-bar-label">{label}</div>
      <div className="mini-bar-bars">
        {values.map((v, i) => (
          <div key={i} className="mini-bar" style={{ height: `${(v / max) * 100}%` }} title={`${v.toLocaleString()}`} />
        ))}
      </div>
    </div>
  );
}

function AllocBar({ label, pct, color }) {
  return (
    <div className="alloc-bar">
      <div className="alloc-label">{label} <strong>{pct}%</strong></div>
      <div className="alloc-track">
        <div className="alloc-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main dispatcher — called from AcademyLesson.jsx
// ──────────────────────────────────────────────────────────────────────────
export default function AcademyGame({ game }) {
  switch (game) {
    case 'compound': return <CompoundGame />;
    case 'dca': return <DCAGame />;
    case 'risk-tolerance': return <RiskToleranceGame />;
    case 'portfolio-builder': return <PortfolioBuilderGame />;
    default:
      return <div className="academy-game-card"><p>Game not found: {game}</p></div>;
  }
}
