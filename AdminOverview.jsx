import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminOverview = ({ onToast }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(30);

  // Commission rate edit
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, [periodDays]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getOverview(periodDays);
      if (res.success) {
        setData(res.metrics);
        setRateInput(String(res.metrics.commission_rate || 5.0));
      }
    } catch (err) {
      onToast('Failed to load overview: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');

  const handleSaveRate = async () => {
    const newRate = Number(rateInput);
    if (isNaN(newRate) || newRate < 0) {
      onToast('Please enter a valid rate (0 or higher).');
      return;
    }

    setSavingRate(true);
    try {
      const res = await api.admin.updateCommissionRate(newRate);
      if (res.success) {
        onToast(res.message);
        fetchOverview();
      }
    } catch (err) {
      onToast('Error: ' + err.message);
    } finally {
      setSavingRate(false);
    }
  };

  const metrics = data || {};

  return (
    <div>
      <h1>Platform Overview</h1>

      {loading ? (
        <div className="empty">Loading overview metrics...</div>
      ) : (
        <>
          <div className="kp">
            <div>
              <small>Total owners</small>
              <b>{metrics.total_owners || 0}</b>
            </div>
            <div>
              <small>Active owners</small>
              <b>{metrics.active_owners || 0}</b>
            </div>
            <div>
              <small>Suspended owners</small>
              <b>{metrics.suspended_owners || 0}</b>
            </div>
            <div>
              <small>Active single products</small>
              <b>{metrics.active_products || 0}</b>
            </div>
            <div>
              <small>Active combos</small>
              <b>{metrics.active_combos || 0}</b>
            </div>
            <div>
              <small>Orders placed today</small>
              <b>{metrics.orders_placed_today || 0}</b>
            </div>
            <div>
              <small>Orders completed today</small>
              <b>{metrics.orders_completed_today || 0}</b>
            </div>
            <div>
              <small>Gross sales today</small>
              <b>{formatMoney(metrics.gross_sales_today || 0)}</b>
            </div>
            <div>
              <small>Commission today</small>
              <b>{formatMoney(metrics.commission_today || 0)}</b>
            </div>
            <div>
              <small>Pending verifications</small>
              <b>{metrics.pending_verifications || 0}</b>
            </div>
            <div>
              <small>Total outstanding commission</small>
              <b>{formatMoney(metrics.total_outstanding_commission || 0)}</b>
            </div>
            <div>
              <small>Settled commission (paid)</small>
              <b>{formatMoney(metrics.total_settled_commission || 0)}</b>
            </div>
            <div>
              <small>
                Commission, last{' '}
                <select
                  style={{ width: 'auto', minHeight: '26px', padding: '2px 4px' }}
                  value={periodDays}
                  onChange={(e) => setPeriodDays(Number(e.target.value))}
                >
                  <option value={7}>7</option>
                  <option value={30}>30</option>
                  <option value={90}>90</option>
                  <option value={365}>365</option>
                </select>{' '}
                days
              </small>
              <b>{formatMoney(metrics.period_commission || 0)}</b>
            </div>
          </div>

          {/* Platform Commission Setting */}
          <div className="pn">
            <h2 style={{ marginBottom: '8px' }}>Platform Commission Rate</h2>
            <div className="fg">
              <label htmlFor="rt">Platform commission (%)</label>
              <input
                id="rt"
                type="number"
                step="0.1"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                style={{ maxWidth: '240px' }}
              />
            </div>
            <p className="sm" style={{ margin: '-4px 0 10px' }}>
              Calculated on the item amount after store discounts (delivery charges are excluded). Platform rule: Commission rate can only be reduced or maintained.
            </p>
            <button className="b" disabled={savingRate} onClick={handleSaveRate}>
              {savingRate ? <span className="sp"></span> : null}
              Save rate
            </button>
          </div>
        </>
      )}
    </div>
  );
};
