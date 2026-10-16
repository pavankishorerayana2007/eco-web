import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const OwnerToday = ({ onToast }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pay Commission modal states
  const [showPayModal, setShowPayModal] = useState(false);
  const [payStep, setPayStep] = useState(1); // 1 = enter amount, 2 = scan QR & submit proof
  const [payAmount, setPayAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [proofImg, setProofImg] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const res = await api.owner.getToday();
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
  const formatDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

  const metrics = data?.metrics || {};
  const soldItems = data?.sold_items || [];
  const commPayments = data?.commission_payments || [];

  const handleStartPayCommission = () => {
    setPayAmount(String(metrics.outstanding_commission || ''));
    setPayStep(1);
    setShowPayModal(true);
  };

  const handleSubmitCommissionProof = async () => {
    if (!utr || !/^[A-Za-z0-9]{8,22}$/.test(utr.trim())) {
      onToast('Please enter a valid 8-22 character UTR / reference.');
      return;
    }
    if (!proofImg) {
      onToast('Please upload a screenshot of your payment proof.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await api.owner.payCommission({
        amount: Number(payAmount),
        reference: utr.trim(),
        proof_url: proofImg,
      });

      if (res.success) {
        onToast('Commission payment submitted! Status: Pending Verification.');
        setShowPayModal(false);
        fetchTodayData();
      }
    } catch (err) {
      onToast('Error: ' + err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div>
      <h1>Today's Operations</h1>

      {loading ? (
        <div className="empty">Loading daily metrics...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kp">
            <div>
              <small>Products added today</small>
              <b>{metrics.products_added_today || 0}</b>
            </div>
            <div>
              <small>Combos added today</small>
              <b>{metrics.combos_added_today || 0}</b>
            </div>
            <div>
              <small>Orders received today</small>
              <b>{metrics.orders_received_today || 0}</b>
            </div>
            <div>
              <small>Units sold today</small>
              <b>{metrics.units_sold_today || 0}</b>
            </div>
            <div>
              <small>Completed deliveries</small>
              <b>{metrics.deliveries_completed_today || 0}</b>
            </div>
            <div>
              <small>Gross sales (completed)</small>
              <b>{formatMoney(metrics.gross_sales_today || 0)}</b>
            </div>
            <div>
              <small>Commission earned today</small>
              <b>{formatMoney(metrics.commission_earned_today || 0)}</b>
            </div>
            <div>
              <small>Commission paid today</small>
              <b>{formatMoney(metrics.commission_paid_today || 0)}</b>
            </div>
            <div>
              <small>Pending verification</small>
              <b>{formatMoney(metrics.pending_verification || 0)}</b>
            </div>
            <div>
              <small>Outstanding commission</small>
              <b>{formatMoney(metrics.outstanding_commission || 0)}</b>
            </div>
          </div>

          <p className="sm" style={{ marginBottom: '14px' }}>
            Only delivered orders count as completed sales. Outstanding commission carries forward daily until settled.
          </p>

          {/* Pay Commission Action Card */}
          <div className="pn">
            <b>Outstanding Platform Commission: {formatMoney(metrics.outstanding_commission || 0)}</b>
            <br />
            <span className="sm">Payable to the Quantum Market platform</span>
            <br />
            <button
              className="b"
              style={{ marginTop: '10px' }}
              onClick={handleStartPayCommission}
            >
              Pay Commission
            </button>
          </div>

          {/* Sold Today Table */}
          <h2 style={{ margin: '14px 0 8px' }}>Sold today</h2>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {soldItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      No products delivered today yet.
                    </td>
                  </tr>
                ) : (
                  soldItems.map((s, idx) => (
                    <tr key={idx}>
                      <td><b>{s.name}</b></td>
                      <td>{s.quantity}</td>
                      <td>{formatMoney(s.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Commission Payment History Table */}
          <h2 style={{ margin: '18px 0 8px' }}>Commission payments</h2>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Submitted</th>
                  <th>Reference (UTR)</th>
                  <th>Status</th>
                  <th>Verified at</th>
                </tr>
              </thead>
              <tbody>
                {commPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      No commission payments submitted yet.
                    </td>
                  </tr>
                ) : (
                  commPayments.map((cp) => (
                    <tr key={cp.id}>
                      <td><b>{cp.id}</b></td>
                      <td>{formatMoney(cp.amount)}</td>
                      <td>{formatDate(cp.submitted_at)}</td>
                      <td>{cp.reference}</td>
                      <td>
                        <span
                          className={`pill ${
                            cp.status === 'Paid'
                              ? 'g'
                              : cp.status === 'Rejected'
                              ? 'r'
                              : 'y'
                          }`}
                        >
                          {cp.status}
                        </span>
                      </td>
                      <td>{formatDate(cp.verified_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pay Commission Modal */}
      {showPayModal && (
        <div className="ov on" onClick={() => setShowPayModal(false)}>
          <div className="mdl" onClick={(e) => e.stopPropagation()}>
            {payStep === 1 ? (
              <div>
                <h2>Pay Platform Commission</h2>
                <div className="kp" style={{ margin: '10px 0' }}>
                  <div>
                    <small>Outstanding balance</small>
                    <b>{formatMoney(metrics.outstanding_commission || 0)}</b>
                  </div>
                </div>

                <div className="fg">
                  <label htmlFor="pc_a">Amount to pay (₹)</label>
                  <input
                    id="pc_a"
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    max={metrics.outstanding_commission || 0}
                  />
                </div>

                <div className="btns" style={{ marginTop: '14px' }}>
                  <button className="o" onClick={() => setShowPayModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="b"
                    disabled={!payAmount || Number(payAmount) <= 0}
                    onClick={() => setPayStep(2)}
                  >
                    Show UPI QR
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h2>Scan & Submit Proof</h2>
                <div className="kp" style={{ margin: '8px 0' }}>
                  <div>
                    <small>Exact amount to transfer</small>
                    <b>{formatMoney(payAmount)}</b>
                  </div>
                </div>
                <div className="qr"></div>
                <p className="sm" style={{ textAlign: 'center' }}>
                  Pay to: Quantum Market Platform (Official UPI Recipient)
                </p>

                <div className="fg" style={{ marginTop: '10px' }}>
                  <label htmlFor="pc_r">Transaction reference (UTR)</label>
                  <input
                    id="pc_r"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="12-digit UPI UTR"
                    maxLength={22}
                  />
                </div>

                <div className="fg">
                  <label htmlFor="pc_img">Payment screenshot</label>
                  <input
                    id="pc_img"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setProofImg(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {proofImg && (
                    <img
                      src={proofImg}
                      alt="Proof preview"
                      style={{ height: '60px', borderRadius: '8px', marginTop: '6px' }}
                    />
                  )}
                </div>

                <p className="sm" style={{ margin: '8px 0' }}>
                  Your balance drops only after a super admin verifies the deposit.
                </p>

                <div className="btns" style={{ marginTop: '12px' }}>
                  <button className="o" onClick={() => setPayStep(1)}>
                    Back
                  </button>
                  <button
                    className="b"
                    disabled={submittingPayment || !utr || !proofImg}
                    onClick={handleSubmitCommissionProof}
                  >
                    {submittingPayment ? <span className="sp"></span> : null}
                    Submit for verification
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
