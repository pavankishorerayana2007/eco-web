import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminHistory = ({ onToast }) => {
  const [subTab, setSubTab] = useState('products'); // 'owners', 'products', 'orders', 'payments', 'commission', 'cancellations', 'store'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [subTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getHistory(subTab);
      if (res.success) {
        setRecords(res.records || []);
      }
    } catch (err) {
      onToast('Failed to load history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  const formatDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const str = JSON.stringify(r).toLowerCase();
    return str.includes(q);
  });

  return (
    <div>
      <h1>Platform Audit History</h1>

      {/* Sub tabs */}
      <div className="bar">
        {[
          ['products', 'Products'],
          ['owners', 'Owners'],
          ['orders', 'Orders'],
          ['payments', 'Payments'],
          ['commission', 'Commission'],
          ['cancellations', 'Cancellations'],
          ['store', 'Store Pauses'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`${subTab === key ? 'b' : 'o'} s`}
            onClick={() => {
              setSubTab(key);
              setSearch('');
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bar">
        <div className="fg grow">
          <label htmlFor="aq">Filter records</label>
          <input
            id="aq"
            type="search"
            placeholder="Search by ID, name, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading records...</div>
      ) : (
        <div className="tw">
          {subTab === 'products' && (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Shop</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td><b>{p.name}</b></td>
                    <td>{p.profiles?.shop_name || 'Store'}</td>
                    <td>{p.category}</td>
                    <td>{formatMoney(p.price)}</td>
                    <td>{p.stock} {p.unit}</td>
                    <td><span className={`pill ${p.status === 'Active' ? 'g' : 'r'}`}>{p.status}</span></td>
                    <td>{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {subTab === 'orders' && (
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Buyer</th>
                  <th>Shop</th>
                  <th>Total</th>
                  <th>Method</th>
                  <th>Order Status</th>
                  <th>Payment</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td><b>{o.id}</b></td>
                    <td>{o.buyer_name}</td>
                    <td>{o.profiles?.shop_name || 'Store'}</td>
                    <td>{formatMoney(o.total)}</td>
                    <td>{o.payment_method === 'cod' ? 'COD' : 'Online'}</td>
                    <td><span className={`pill ${o.order_status === 'Delivered' ? 'g' : 'y'}`}>{o.order_status}</span></td>
                    <td><span className={`pill ${o.payment_status === 'Paid' ? 'g' : 'y'}`}>{o.payment_status}</span></td>
                    <td>{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {subTab === 'store' && (
            <table>
              <thead>
                <tr>
                  <th>Owner / Shop</th>
                  <th>Announcement</th>
                  <th>Paused at</th>
                  <th>Resumed at</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.profiles?.full_name}</b><br /><span className="sm">{s.profiles?.shop_name}</span></td>
                    <td style={{ minWidth: '220px' }}>{s.message}</td>
                    <td>{formatDate(s.paused_at)}</td>
                    <td>{s.resumed_at ? formatDate(s.resumed_at) : 'Still paused'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!['products', 'orders', 'store'].includes(subTab) && (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Record Details</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td><b>{item.id || idx + 1}</b></td>
                    <td>
                      <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </td>
                    <td>{formatDate(item.created_at || item.submitted_at || item.paused_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
