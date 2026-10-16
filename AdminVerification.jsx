import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminVerification = ({ onOpenModal, onCloseModal, onToast }) => {
  const [data, setData] = useState({ commission_payments: [], buyer_payments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getVerifications();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      onToast('Failed to load verifications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  const formatDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

  const viewProofModal = (title, ref, proofUrl) => {
    onOpenModal({
      title: 'Payment Proof',
      children: (
        <div>
          <p className="sm" style={{ marginBottom: '8px' }}>
            {title} · Reference: <b>{ref}</b>
          </p>
          {proofUrl ? (
            <img
              src={proofUrl}
              alt="Payment proof screenshot"
              style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--ln)', maxHeight: '400px', objectFit: 'contain' }}
            />
          ) : (
            <p className="empty">No image attached.</p>
          )}
          <button className="o" style={{ width: '100%', marginTop: '12px' }} onClick={onCloseModal}>
            Close
          </button>
        </div>
      ),
    });
  };

  const handleVerifyCommission = async (id, approved) => {
    try {
      const res = await api.admin.verifyCommission(id, approved);
      if (res.success) {
        onToast(approved ? 'Commission payment verified and approved.' : 'Commission payment rejected.');
        fetchVerifications();
      }
    } catch (err) {
      onToast('Error: ' + err.message);
    }
  };

  const handleVerifyBuyerPayment = async (id, approved) => {
    try {
      const res = await api.admin.verifyBuyerPayment(id, approved);
      if (res.success) {
        onToast(approved ? 'Buyer payment verified and order marked Placed.' : 'Buyer payment rejected.');
        fetchVerifications();
      }
    } catch (err) {
      onToast('Error: ' + err.message);
    }
  };

  const commList = data.commission_payments || [];
  const buyerList = data.buyer_payments || [];

  return (
    <div>
      <h1>Payment Verifications</h1>
      <p className="sm" style={{ marginBottom: '14px' }}>
        Review bank references and screenshots before approving. Approvals immediately update platform balances and order states.
      </p>

      {/* Section 1: Store Owner Commission Deposits */}
      <h2 style={{ marginBottom: '8px' }}>Store Owner Commission Payments</h2>
      {loading ? (
        <div className="empty">Loading verifications...</div>
      ) : (
        <div className="tw" style={{ marginBottom: '20px' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Owner / Shop</th>
                <th>Amount</th>
                <th>Reference (UTR)</th>
                <th>Proof</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {commList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    No pending owner commission payments to verify.
                  </td>
                </tr>
              ) : (
                commList.map((cp) => (
                  <tr key={cp.id}>
                    <td><b>{cp.id}</b></td>
                    <td>
                      {cp.profiles?.full_name}
                      <br />
                      <span className="sm">{cp.profiles?.shop_name || cp.profiles?.email}</span>
                    </td>
                    <td><b>{formatMoney(cp.amount)}</b></td>
                    <td>{cp.reference}</td>
                    <td>
                      {cp.proof_url ? (
                        <button
                          className="o s"
                          onClick={() => viewProofModal(cp.id, cp.reference, cp.proof_url)}
                        >
                          View Screenshot
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{formatDate(cp.submitted_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="b s" onClick={() => handleVerifyCommission(cp.id, true)}>
                        Approve
                      </button>
                      <button
                        className="d s"
                        style={{ marginLeft: '4px' }}
                        onClick={() => handleVerifyCommission(cp.id, false)}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Section 2: Buyer Online Orders */}
      <h2 style={{ margin: '14px 0 8px' }}>Buyer Online QR Payments</h2>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Order ID</th>
              <th>Buyer</th>
              <th>Shop</th>
              <th>Amount</th>
              <th>Reference (UTR)</th>
              <th>Proof</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {buyerList.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty">
                  No pending buyer online payments to verify.
                </td>
              </tr>
            ) : (
              buyerList.map((bp) => (
                <tr key={bp.id}>
                  <td><b>{bp.id}</b></td>
                  <td><b>{bp.order_id}</b></td>
                  <td>
                    {bp.buyer?.full_name}
                    <br />
                    <span className="sm">{bp.buyer?.email}</span>
                  </td>
                  <td>{bp.profiles?.shop_name || 'Store'}</td>
                  <td><b>{formatMoney(bp.amount)}</b></td>
                  <td>{bp.reference}</td>
                  <td>
                    {bp.proof_url ? (
                      <button
                        className="o s"
                        onClick={() => viewProofModal(bp.order_id, bp.reference, bp.proof_url)}
                      >
                        View Screenshot
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{formatDate(bp.submitted_at)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="b s" onClick={() => handleVerifyBuyerPayment(bp.id, true)}>
                      Approve
                    </button>
                    <button
                      className="d s"
                      style={{ marginLeft: '4px' }}
                      onClick={() => handleVerifyBuyerPayment(bp.id, false)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
