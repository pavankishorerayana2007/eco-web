import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const OrderHistory = ({ onReorder, onToast }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.orders.getMyOrders();
      if (res.success) {
        // Delivered & completed orders
        const delivered = (res.orders || []).filter(
          (o) => o.order_status === 'Delivered' && (o.payment_method !== 'cod' || o.payment_status === 'Paid')
        );
        setOrders(delivered);
      }
    } catch (err) {
      onToast('Failed to load history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  const formatDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

  return (
    <div>
      <h1>Order History</h1>

      {loading ? (
        <div className="empty">Loading order history...</div>
      ) : orders.length === 0 ? (
        <div className="empty pn">No delivered orders yet.</div>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="pn">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{o.id}</b>
              <span className="pill g">{o.order_status}</span>
            </div>

            <div className="sm" style={{ margin: '4px 0' }}>
              Purchased {formatDate(o.created_at)} · {o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'} · Payment: {o.payment_status}
            </div>

            {(o.order_items || []).map((it) => (
              <div key={it.id || it.product_id} className="ln">
                <div className="im">
                  {it.image_url ? <img src={it.image_url} alt={it.product_name} /> : <span>📦</span>}
                </div>
                <div className="n">
                  <b>{it.product_name}</b>
                  <br />
                  <span className="sm">
                    Qty {it.quantity} × {formatMoney(it.price)}
                  </span>
                </div>
              </div>
            ))}

            <p style={{ marginTop: '8px' }}>
              <b>Total {formatMoney(o.total)}</b>
            </p>

            <button
              className="b s"
              style={{ marginTop: '10px' }}
              onClick={() => onReorder(o)}
            >
              Buy Again
            </button>
          </div>
        ))
      )}
    </div>
  );
};
