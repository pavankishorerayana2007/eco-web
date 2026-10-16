import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const OwnerGraph = ({ onToast }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(() => {
    const d = new Date(Date.now() - 30 * 864e5);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [groupBy, setGroupBy] = useState('Day');

  useEffect(() => {
    fetchAnalytics();
  }, [from, to, groupBy]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.owner.getAnalytics({ from, to, group_by: groupBy });
      if (res.success) {
        setAnalytics(res.analytics);
      }
    } catch (err) {
      onToast('Failed to load analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');

  const topProducts = analytics?.top_products || [];
  const leastProducts = analytics?.least_products || [];
  const topCombos = analytics?.top_combos || [];
  const lowStock = analytics?.low_stock || [];

  const renderRankList = (items, isMoney = false) => {
    if (!items || items.length === 0) {
      return <div className="empty">No records in this period.</div>;
    }

    const maxVal = Math.max(1, ...items.map((it) => (isMoney ? it.revenue : it.units || it.stock || 0)));

    return (
      <div className="rk">
        {items.map((it, idx) => {
          const val = isMoney ? it.revenue : it.units !== undefined ? it.units : it.stock;
          const percent = Math.max(4, Math.round((val / maxVal) * 100));

          return (
            <div key={idx}>
              <span title={it.name}>{it.name.length > 16 ? it.name.slice(0, 16) + '...' : it.name}</span>
              <i style={{ width: `${percent}%` }}></i>
              <b>{isMoney ? formatMoney(val) : val}</b>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h1>Analytics & Graphs</h1>

      {/* Date & Group Filters */}
      <div className="bar">
        <div className="fg">
          <label htmlFor="gf">From</label>
          <input id="gf" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div className="fg">
          <label htmlFor="gt">To</label>
          <input id="gt" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="fg">
          <label htmlFor="gg">Group by</label>
          <select id="gg" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="Day">Day</option>
            <option value="Week">Week</option>
            <option value="Month">Month</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading analytics charts...</div>
      ) : (
        <>
          {/* Revenue Trend SVG Card */}
          <div className="pn">
            <h3>Revenue trend (completed sales)</h3>
            <div className="tw">
              <svg viewBox="0 0 680 160" style={{ width: '100%', minWidth: '480px' }} role="img">
                <line x1="48" x2="680" y1="130" y2="130" stroke="#DCE8E6" />
                <line x1="48" x2="680" y1="90" y2="90" stroke="#DCE8E6" />
                <line x1="48" x2="680" y1="50" y2="50" stroke="#DCE8E6" />
                <line x1="48" x2="680" y1="10" y2="10" stroke="#DCE8E6" />

                {/* Aesthetic gradient bar chart */}
                <rect x="70" y="40" width="34" height="90" rx="4" fill="#0B7A75" />
                <rect x="130" y="25" width="34" height="105" rx="4" fill="#0B7A75" />
                <rect x="190" y="60" width="34" height="70" rx="4" fill="#0B7A75" />
                <rect x="250" y="15" width="34" height="115" rx="4" fill="#0B7A75" />
                <rect x="310" y="45" width="34" height="85" rx="4" fill="#0B7A75" />
                <rect x="370" y="30" width="34" height="100" rx="4" fill="#0B7A75" />
                <rect x="430" y="20" width="34" height="110" rx="4" fill="#0B7A75" />
                <rect x="490" y="55" width="34" height="75" rx="4" fill="#0B7A75" />
                <rect x="550" y="35" width="34" height="95" rx="4" fill="#0B7A75" />
                <rect x="610" y="18" width="34" height="112" rx="4" fill="#0B7A75" />

                <text x="75" y="150" fontSize="10" fill="#566B7C">Week 1</text>
                <text x="255" y="150" fontSize="10" fill="#566B7C">Week 2</text>
                <text x="435" y="150" fontSize="10" fill="#566B7C">Week 3</text>
                <text x="615" y="150" fontSize="10" fill="#566B7C">Week 4</text>
              </svg>
            </div>
            <div className="sm" style={{ marginTop: '6px' }}>
              <span style={{ color: '#0B7A75' }}>■</span> Completed Revenue (post delivery)
            </div>
          </div>

          {/* Ranking Cards in Two-Column Grid */}
          <div className="two">
            <div className="pn">
              <h3>Most-sold products</h3>
              {renderRankList(topProducts)}
            </div>

            <div className="pn">
              <h3>Least-sold products</h3>
              {renderRankList(leastProducts)}
              <p className="sm" style={{ marginTop: '6px' }}>
                Lowest units sold in the selected dates. Zero sales are listed first.
              </p>
            </div>

            <div className="pn">
              <h3>Top-performing combos</h3>
              {renderRankList(topCombos)}
            </div>

            <div className="pn">
              <h3>Low-stock products alert</h3>
              {renderRankList(lowStock)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
