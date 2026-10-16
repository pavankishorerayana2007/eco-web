import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const OwnerOrders = ({ onToast }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('all'); // 'active', 'done', 'all'

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.orders.getOwnerOrders();
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err) {
      onToast('Failed to load store orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  const formatDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

  const filtered = orders.filter((o) => {
    if (filterMode === 'active') return o.order_status !== 'Delivered' && o.order_status !== 'Cancelled';
    if (filterMode === 'done') return o.order_status === 'Delivered' || o.order_status === 'Cancelled';
    return true;
  });

  return (
    <div>
      <h1>Store Orders</h1>
      <p className="sm" style={{ marginBottom: '10px' }}>
        Read-only order tracking. Buyers confirm physical receipt and cash payments upon delivery. Online payments are verified before showing as Paid.
      </p>

      <div className="bar">
        {[
          ['active', 'Active Orders'],
          ['done', 'Completed / History'],
          ['all', 'All Orders'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`${filterMode === key ? 'b' : 'o'} s`}
            onClick={() => setFilterMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Loading orders...</div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Buyer</th>
                <th>Location</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Amount</th>
                <th>Placed</th>
                <th>Method</th>
                <th>Payment</th>
                <th>Platform Commission</th>
                <th>Your Earnings</th>
                <th>Timestamps</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="empty">
                    No orders for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const subtotal = Number(o.subtotal);
                  const commRate = Number(o.commission_rate || 5);
                  const comm = Math.round(((subtotal * commRate) / 100) * 100) / 100;
                  const ownerEarnings = Math.round((subtotal - comm) * 100) / 100;

                  return (
                    <tr key={o.id}>
                      <td>
                        <b>{o.id}</b>
                        <br />
                        <span
                          className={`pill ${
                            o.order_status === 'Delivered'
                              ? 'g'
                              : o.order_status === 'Cancelled'
                              ? 'r'
                              : 'y'
                          }`}
                        >
                          {o.order_status}
                        </span>
                      </td>

                      <td>
                        <b>{o.buyer_name}</b>
                        <br />
                        <span className="sm">{o.buyer_mobile}</span>
                      </td>

                      <td style={{ minWidth: '140px' }}>
                        {o.delivery_location || `${o.delivery_address}, ${o.delivery_city}`}
                      </td>

                      <td>
                        {(o.order_items || []).map((it) => (
                          <div key={it.id || it.product_id} style={{ marginBottom: '4px' }}>
                            {it.product_name}
                          </div>
                        ))}
                      </td>

                      <td>
                        {(o.order_items || []).map((it) => (
                          <div key={it.id || it.product_id}>{it.quantity}</div>
                        ))}
                      </td>

                      <td>
                        {(o.order_items || []).map((it) => (
                          <div key={it.id || it.product_id}>{formatMoney(it.price)}</div>
                        ))}
                      </td>

                      <td>
                        <b>{formatMoney(o.total)}</b>
                      </td>

                      <td>{formatDate(o.created_at)}</td>

                      <td>{o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online QR'}</td>

                      <td>
                        <span
                          className={`pill ${
                            o.payment_status === 'Paid'
                              ? 'g'
                              : o.payment_status === 'Failed'
                              ? 'r'
                              : 'y'
                          }`}
                        >
                          {o.payment_status}
                        </span>
                      </td>

                      <td>
                        {formatMoney(comm)}
                        {o.order_status !== 'Delivered' && (
                          <span className="sm"> (on completion)</span>
                        )}
                      </td>

                      <td>
                        <b>{formatMoney(ownerEarnings)}</b>
                      </td>

                      <td className="sm">
                        Delivered: {formatDate(o.delivered_at)}
                        <br />
                        Paid: {formatDate(o.paid_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
