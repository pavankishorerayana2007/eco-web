import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminToday = ({ onToast }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchToday();
  }, []);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getToday();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      onToast('Failed to load today data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');

  const metrics = data?.metrics || {};
  const ownersSummary = data?.owners_summary || [];
  const transactions = data?.transactions || [];

  return (
    <div>
      <h1>Platform Today</h1>

      {loading ? (
        <div className="empty">Loading today's activity...</div>
      ) : (
        <>
          <div className="kp">
            <div>
              <small>Orders placed today</small>
              <b>{metrics.orders_placed_today || 0}</b>
            </div>
            <div>
              <small>Deliveries completed</small>
              <b>{metrics.deliveries_completed_today || 0}</b>
            </div>
            <div>
              <small>Units sold today</small>
              <b>{metrics.units_sold_today || 0}</b>
            </div>
            <div>
              <small>Gross sales completed</small>
              <b>{formatMoney(metrics.gross_completed_today || 0)}</b>
            </div>
            <div>
              <small>Commission earned today</small>
              <b>{formatMoney(metrics.commission_earned_today || 0)}</b>
            </div>
          </div>

          <h2 style={{ margin: '16px 0 8px' }}>Store Owner Performance Today</h2>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Store Owner</th>
                  <th>Completed Deliveries</th>
                  <th>Gross Sales</th>
                  <th>Commission Earned</th>
                  <th>Owner Net Earnings</th>
                </tr>
              </thead>
              <tbody>
                {ownersSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      No store orders completed today.
                    </td>
                  </tr>
                ) : (
                  ownersSummary.map((os) => (
                    <tr key={os.id}>
                      <td><b>{os.name}</b></td>
                      <td>{os.completed}</td>
                      <td>{formatMoney(os.gross)}</td>
                      <td>{formatMoney(os.commission)}</td>
                      <td><b>{formatMoney(os.gross - os.commission)}</b></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 style={{ margin: '18px 0 8px' }}>Today's Completed Orders</h2>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Shop</th>
                  <th>Buyer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Commission</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      No order transactions completed today.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id}>
                      <td><b>{t.id}</b></td>
                      <td>{t.profiles?.shop_name || 'Store'}</td>
                      <td>{t.buyer_name}</td>
                      <td>{(t.order_items || []).map((i) => i.product_name).join(', ')}</td>
                      <td>{formatMoney(t.total)}</td>
                      <td>{formatMoney((Number(t.subtotal) * Number(t.commission_rate || 5)) / 100)}</td>
                      <td><span className="pill g">{t.payment_status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
