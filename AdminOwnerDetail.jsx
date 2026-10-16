import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminOwnerDetail = ({ ownerId, onBack, onToast }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'products', 'orders', 'payments'

  // Commission reduction form
  const [newBalance, setNewBalance] = useState('');
  const [reductionReason, setReductionReason] = useState('');
  const [applyingReduction, setApplyingReduction] = useState(false);

  useEffect(() => {
    fetchOwnerDetails();
  }, [ownerId]);

  const fetchOwnerDetails = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getOwnerDetails(ownerId);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      onToast('Failed to load owner details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  const formatDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

  const owner = data?.owner || {};
  const products = data?.products || [];
  const orders = data?.orders || [];
  const pauseHistory = data?.pause_history || [];
  const payments = data?.payments || { commission: [], buyer: [] };
  const audits = data?.audits || [];

  // Financial calculations
  let totalGross = 0;
  let totalComm = 0;
  orders.forEach((o) => {
    if (o.order_status === 'Delivered') {
      totalGross += Number(o.subtotal);
      totalComm += (Number(o.subtotal) * Number(o.commission_rate || 5)) / 100;
    }
  });

  let totalPaid = 0;
  (payments.commission || []).forEach((c) => {
    if (c.status === 'Paid') totalPaid += Number(c.amount);
  });

  let totalReductions = 0;
  audits.forEach((a) => (totalReductions += Number(a.reduction)));

  const outstanding = Math.max(0, Math.round((totalComm - totalReductions - totalPaid) * 100) / 100);

  const handleApplyReduction = async (e) => {
    e.preventDefault();
    const newBal = Number(newBalance);
    if (isNaN(newBal) || newBal < 0) {
      onToast('Enter a valid non-negative balance.');
      return;
    }
    if (newBal > outstanding) {
      onToast(`Platform rule: Commission balance can only be reduced (current outstanding is ${formatMoney(outstanding)}).`);
      return;
    }
    if (!reductionReason || reductionReason.trim().length < 3) {
      onToast('Please enter a clear reason for the reduction.');
      return;
    }

    setApplyingReduction(true);
    try {
      const res = await api.admin.adjustCommission(ownerId, {
        new_balance: newBal,
        reason: reductionReason.trim(),
      });
      if (res.success) {
        onToast('Commission reduction applied!');
        setNewBalance('');
        setReductionReason('');
        fetchOwnerDetails();
      }
    } catch (err) {
      onToast('Error: ' + err.message);
    } finally {
      setApplyingReduction(false);
    }
  };

  return (
    <div>
      <button className="o s" onClick={onBack}>
        ← Back to Owners
      </button>

      {loading ? (
        <div className="empty">Loading owner details...</div>
      ) : (
        <>
          <h1 style={{ marginTop: '10px' }}>{owner.full_name} ({owner.shop_name})</h1>

          {/* Sub Navigation Bar */}
          <div className="bar" style={{ margin: '10px 0 14px' }}>
            {[
              ['details', 'Owner Details'],
              ['products', 'Products & Inventory'],
              ['orders', 'Orders'],
              ['payments', 'Payments & Commission'],
            ].map(([tabKey, label]) => (
              <button
                key={tabKey}
                className={`${activeTab === tabKey ? 'b' : 'o'} s`}
                onClick={() => setActiveTab(tabKey)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div>
              <div className="pn">
                <b>{owner.full_name}</b> · {owner.id}
                <br />
                {owner.email} · {owner.mobile || 'No mobile listed'}
                <br />
                Shop: {owner.shop_name} · Status:{' '}
                <span className={`pill ${owner.status === 'Active' ? 'g' : 'r'}`}>
                  {owner.status}
                </span>{' '}
                · Storefront:{' '}
                <span className={`pill ${owner.store_status === 'paused' ? 'y' : 'g'}`}>
                  {owner.store_status === 'paused' ? 'Paused' : 'Active'}
                </span>
              </div>

              <div className="kp">
                <div>
                  <small>Total products</small>
                  <b>{products.length}</b>
                </div>
                <div>
                  <small>Total store orders</small>
                  <b>{orders.length}</b>
                </div>
                <div>
                  <small>Delivered sales</small>
                  <b>{formatMoney(totalGross)}</b>
                </div>
                <div>
                  <small>Commission accrued</small>
                  <b>{formatMoney(totalComm)}</b>
                </div>
                <div>
                  <small>Commission verified paid</small>
                  <b>{formatMoney(totalPaid)}</b>
                </div>
                <div>
                  <small>Current outstanding</small>
                  <b>{formatMoney(outstanding)}</b>
                </div>
              </div>

              {/* Store Status Block */}
              <div className="pn" style={{ marginTop: '14px' }}>
                <h2 style={{ marginBottom: '6px' }}>Store status</h2>
                <p>
                  Status:{' '}
                  <span className={`pill ${owner.store_status === 'paused' ? 'y' : 'g'}`}>
                    {owner.store_status === 'paused' ? 'Paused' : 'Active'}
                  </span>
                  {owner.store_status === 'paused' && (
                    <>
                      <br />
                      Announcement: <i>{owner.store_pause_message}</i>
                    </>
                  )}
                </p>
              </div>

              <h2 style={{ margin: '14px 0 8px' }}>Store pause & resume history</h2>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Paused at</th>
                      <th>Announcement</th>
                      <th>Resumed at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pauseHistory.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="empty">
                          No store pause events recorded.
                        </td>
                      </tr>
                    ) : (
                      pauseHistory.map((ph) => (
                        <tr key={ph.id}>
                          <td>{formatDate(ph.paused_at)}</td>
                          <td style={{ minWidth: '220px' }}>{ph.message}</td>
                          <td>{ph.resumed_at ? formatDate(ph.resumed_at) : 'Still paused'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty">
                        No products listed by this owner.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td><b>{p.name}</b></td>
                        <td>{p.type}</td>
                        <td>{formatMoney(p.price)}</td>
                        <td>{p.stock} {p.unit}</td>
                        <td>
                          <span className={`pill ${p.status === 'Active' ? 'g' : 'r'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>{formatDate(p.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Buyer</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty">
                        No orders recorded for this store.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id}>
                        <td><b>{o.id}</b></td>
                        <td>{o.buyer_name}</td>
                        <td>{formatMoney(o.total)}</td>
                        <td>{o.payment_method === 'cod' ? 'COD' : 'Online'}</td>
                        <td>
                          <span className={`pill ${o.order_status === 'Delivered' ? 'g' : 'y'}`}>
                            {o.order_status}
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${o.payment_status === 'Paid' ? 'g' : 'y'}`}>
                            {o.payment_status}
                          </span>
                        </td>
                        <td>{formatDate(o.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: PAYMENTS & COMMISSION MANAGEMENT */}
          {activeTab === 'payments' && (
            <div>
              <div className="pn">
                <h2 style={{ marginBottom: '8px' }}>Commission Management</h2>
                <div className="kp">
                  <div>
                    <small>Accrued commission</small>
                    <b>{formatMoney(totalComm)}</b>
                  </div>
                  <div>
                    <small>Approved reductions</small>
                    <b>{formatMoney(totalReductions)}</b>
                  </div>
                  <div>
                    <small>Paid (verified)</small>
                    <b>{formatMoney(totalPaid)}</b>
                  </div>
                  <div>
                    <small>Remaining balance</small>
                    <b>{formatMoney(outstanding)}</b>
                  </div>
                </div>

                <form onSubmit={handleApplyReduction} style={{ marginTop: '12px' }}>
                  <div className="fg">
                    <label htmlFor="cm_v">New remaining balance (₹)</label>
                    <input
                      id="cm_v"
                      type="number"
                      step="0.01"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      placeholder={`At or below ${outstanding}`}
                    />
                  </div>

                  <div className="fg">
                    <label htmlFor="cm_r">Reason for reduction</label>
                    <textarea
                      id="cm_r"
                      rows={2}
                      value={reductionReason}
                      onChange={(e) => setReductionReason(e.target.value)}
                      placeholder="e.g. Promotional subsidy credit, verified store rebate"
                    />
                  </div>

                  <button className="b" type="submit" disabled={applyingReduction}>
                    {applyingReduction ? <span className="sp"></span> : null}
                    Apply reduction
                  </button>
                  <span className="sm" style={{ marginLeft: '10px' }}>
                    Rule: Commission balances can only be reduced. Paid records are never modified.
                  </span>
                </form>
              </div>

              {/* Adjustment Audit Log */}
              <h2 style={{ margin: '16px 0 8px' }}>Adjustment audit log</h2>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Original balance</th>
                      <th>New balance</th>
                      <th>Reduction</th>
                      <th>Reason</th>
                      <th>Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty">
                          No commission adjustments logged for this store.
                        </td>
                      </tr>
                    ) : (
                      audits.map((a) => (
                        <tr key={a.id}>
                          <td>{formatDate(a.created_at)}</td>
                          <td>{formatMoney(a.original_value)}</td>
                          <td>{formatMoney(a.new_value)}</td>
                          <td><b>{formatMoney(a.reduction)}</b></td>
                          <td>{a.reason}</td>
                          <td>{a.admin_email}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Commission Payments Submitted */}
              <h2 style={{ margin: '16px 0 8px' }}>Submitted commission deposits</h2>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                      <th>Reference (UTR)</th>
                      <th>Status</th>
                      <th>Submitted at</th>
                      <th>Verified at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payments.commission || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty">
                          No commission deposits submitted.
                        </td>
                      </tr>
                    ) : (
                      payments.commission.map((c) => (
                        <tr key={c.id}>
                          <td><b>{c.id}</b></td>
                          <td>{formatMoney(c.amount)}</td>
                          <td>{c.reference}</td>
                          <td>
                            <span className={`pill ${c.status === 'Paid' ? 'g' : c.status === 'Rejected' ? 'r' : 'y'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>{formatDate(c.submitted_at)}</td>
                          <td>{formatDate(c.verified_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
