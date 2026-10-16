import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const Orders = ({ onToast, onOpenModal, onCloseModal }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pay Now modal state for online orders
  const [payOrder, setPayOrder] = useState(null);
  const [utr, setUtr] = useState('');
  const [proofImg, setProofImg] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.orders.getMyOrders();
      if (res.success) {
        // Active orders: not yet delivered, or delivered COD awaiting payment
        const active = (res.orders || []).filter(
          (o) => o.order_status !== 'Delivered' || (o.payment_method === 'cod' && o.payment_status !== 'Paid')
        );
        setOrders(active);
      }
    } catch (err) {
      onToast('Failed to load orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  const formatDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

  const handleCancelOrder = (orderId) => {
    onOpenModal({
      title: 'Cancel order?',
      children: (
        <div>
          <p style={{ margin: '10px 0 16px' }}>
            Are you sure you want to cancel {orderId}? Reserved items will be returned to the store's inventory.
          </p>
          <div className="btns">
            <button className="o" onClick={onCloseModal}>
              Keep order
            </button>
            <button
              className="d"
              onClick={async () => {
                onCloseModal();
                try {
                  const res = await api.orders.cancel(orderId);
                  if (res.success) {
                    onToast('Order cancelled successfully.');
                    fetchOrders();
                  }
                } catch (err) {
                  onToast('Error cancelling order: ' + err.message);
                }
              }}
            >
              Yes, cancel
            </button>
          </div>
        </div>
      ),
    });
  };

  const handleConfirmReceived = (orderId) => {
    onOpenModal({
      title: 'Confirm collection',
      children: (
        <div>
          <p style={{ margin: '10px 0 16px' }}>
            Confirm that you have collected and received order {orderId}?
          </p>
          <div className="btns">
            <button className="o" onClick={onCloseModal}>
              Cancel
            </button>
            <button
              className="b"
              onClick={async () => {
                onCloseModal();
                try {
                  const res = await api.orders.confirmReceived(orderId);
                  if (res.success) {
                    onToast('Order collection recorded!');
                    fetchOrders();
                  }
                } catch (err) {
                  onToast('Error: ' + err.message);
                }
              }}
            >
              I have taken it
            </button>
          </div>
        </div>
      ),
    });
  };

  const handleConfirmPaidCash = (orderId, amount) => {
    onOpenModal({
      title: 'Confirm cash payment',
      children: (
        <div>
          <p style={{ margin: '10px 0 16px' }}>
            Confirm that you paid {formatMoney(amount)} in cash for {orderId}? This records the order as Paid.
          </p>
          <div className="btns">
            <button className="o" onClick={onCloseModal}>
              Cancel
            </button>
            <button
              className="y"
              onClick={async () => {
                onCloseModal();
                try {
                  const res = await api.orders.confirmPaidCash(orderId);
                  if (res.success) {
                    onToast('Cash payment confirmed and recorded as Paid.');
                    fetchOrders();
                  }
                } catch (err) {
                  onToast('Error: ' + err.message);
                }
              }}
            >
              I paid cash
            </button>
          </div>
        </div>
      ),
    });
  };

  const handleProofSubmit = async () => {
    if (!utr || !/^[A-Za-z0-9]{8,22}$/.test(utr.trim())) {
      onToast('Enter a valid 8-22 character UTR / reference.');
      return;
    }
    if (!proofImg) {
      onToast('Payment screenshot is required.');
      return;
    }

    setSubmittingProof(true);
    try {
      const res = await api.orders.submitPaymentProof(payOrder.id, {
        utr_reference: utr.trim(),
        proof_url: proofImg,
      });
      if (res.success) {
        onToast('Payment proof submitted! Verification in progress.');
        setPayOrder(null);
        fetchOrders();
      }
    } catch (err) {
      onToast(err.message);
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <div>
      <h1>Placed Orders</h1>

      {loading ? (
        <div className="empty">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty pn">No active placed orders.</div>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="pn">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{o.id}</b>
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
            </div>

            <div className="sm" style={{ margin: '4px 0' }}>
              {formatDate(o.created_at)} ·{' '}
              {o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online QR payment'} · Payment:{' '}
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
            </div>

            {/* Line items */}
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

            {/* Timeline */}
            <ul className="tl2">
              <li className="d">Placed · {formatDate(o.created_at)}</li>
              {o.order_status === 'Delivered' && (
                <li className="d">Delivered · {formatDate(o.delivered_at)}</li>
              )}
              {o.order_status === 'Cancelled' && (
                <li style={{ background: '#FEE2E2', color: '#991B1B' }}>
                  Cancelled · {formatDate(o.cancelled_at)}
                </li>
              )}
            </ul>

            <b>Total {formatMoney(o.total)}</b>

            {/* Buyer action buttons */}
            <div className="btns" style={{ flexWrap: 'wrap', alignItems: 'center', marginTop: '10px' }}>
              {o.payment_method === 'on' &&
                o.order_status === 'Awaiting Payment' &&
                ['Pending', 'Failed'].includes(o.payment_status) && (
                  <button className="b s" onClick={() => setPayOrder(o)}>
                    Pay Now
                  </button>
                )}

              {o.order_status === 'Placed' && (
                <button className="b s" onClick={() => handleConfirmReceived(o.id)}>
                  I Have Taken Order
                </button>
              )}

              {o.payment_method === 'cod' &&
                o.order_status === 'Delivered' &&
                o.payment_status !== 'Paid' && (
                  <button
                    className="y s"
                    onClick={() => handleConfirmPaidCash(o.id, o.total)}
                  >
                    I Have Paid Cash
                  </button>
                )}

              {o.payment_status === 'Awaiting Verification' && (
                <span className="sm">Payment proof submitted. Verification in progress.</span>
              )}

              {['Placed', 'Awaiting Payment'].includes(o.order_status) && (
                <button className="o s" onClick={() => handleCancelOrder(o.id)}>
                  Cancel order
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {/* Pay Now Modal for Online Orders */}
      {payOrder && (
        <div className="ov on" onClick={() => setPayOrder(null)}>
          <div className="mdl" onClick={(e) => e.stopPropagation()}>
            <h2>Pay Now · Order {payOrder.id}</h2>
            <div className="kp" style={{ margin: '8px 0' }}>
              <div>
                <small>Exact amount to pay</small>
                <b>{formatMoney(payOrder.total)}</b>
              </div>
            </div>
            <div className="qr"></div>
            <p className="sm" style={{ textAlign: 'center' }}>
              Pay to: Quantum Market Platform
            </p>

            <div className="fg" style={{ marginTop: '10px' }}>
              <label htmlFor="pn_r2">
                Transaction reference (UTR) <i className="rq">*</i>
              </label>
              <input
                id="pn_r2"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="12-digit UPI UTR"
                maxLength={22}
              />
            </div>

            <div className="fg">
              <label htmlFor="pn_img2">
                Payment screenshot <i className="rq">*</i>
              </label>
              <input
                id="pn_img2"
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

            <div className="btns" style={{ marginTop: '12px' }}>
              <button className="o" onClick={() => setPayOrder(null)}>
                Cancel
              </button>
              <button
                className="b"
                disabled={submittingProof || !utr || !proofImg}
                onClick={handleProofSubmit}
              >
                {submittingProof ? <span className="sp"></span> : null}
                Submit proof
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
