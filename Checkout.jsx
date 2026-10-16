import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const Checkout = ({ checkoutItems, onOrderCompleted, onNavigate, onToast }) => {
  const { user } = useAuth();

  const [step, setStep] = useState('addr'); // 'addr', 'pay', 'review', 'qr_proof', 'done'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrders, setPlacedOrders] = useState([]);

  // Address form fields
  const [name, setName] = useState(user?.full_name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || 'Hyderabad');
  const [state, setState] = useState(user?.state || 'Telangana');
  const [pincode, setPincode] = useState(user?.pincode || '500001');
  const [instructions, setInstructions] = useState('');

  // Payment form fields
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' or 'on'
  const [utr, setUtr] = useState('');
  const [proofImage, setProofImage] = useState('');

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');

  const subtotal = checkoutItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const delivery = subtotal >= 999 ? 0 : 49;
  const total = subtotal + delivery;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      onToast('Please choose an image file (JPG or PNG) under 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddressProceed = (e) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) {
      setError('Please enter your full name (2+ characters).');
      return;
    }
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email.');
      return;
    }
    if (!address || address.trim().length < 8) {
      setError('Please enter the complete delivery address (at least 8 characters).');
      return;
    }
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      setError('Please enter a 6-digit PIN code.');
      return;
    }

    setError('');
    setStep('pay');
  };

  const handleConfirmCodOrder = async () => {
    setSubmitting(true);
    setError('');

    try {
      const orderPayload = {
        items: checkoutItems.map((it) => ({
          id: it.id,
          product_id: it.id,
          owner_id: it.owner_id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          unit: it.unit || 'pcs',
          product_type: it.product_type || 'Packaged',
          image_url: it.image_url,
        })),
        address: {
          name,
          mobile,
          email,
          address,
          city,
          state,
          pincode,
          instructions,
        },
        payment_method: 'cod',
      };

      const res = await api.orders.create(orderPayload);
      if (res.success) {
        setPlacedOrders(res.orders || []);
        setStep('done');
        onToast('Order placed successfully!');
        if (onOrderCompleted) onOrderCompleted();
      }
    } catch (err) {
      setError(err.message || 'Failed to place order.');
      onToast(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnlinePaymentSubmit = async () => {
    if (!utr || !/^[A-Za-z0-9]{8,22}$/.test(utr.trim())) {
      setError('Please enter a valid 8-22 character UTR / transaction reference.');
      return;
    }
    if (!proofImage) {
      setError('Please upload a screenshot of your payment proof.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const orderPayload = {
        items: checkoutItems.map((it) => ({
          id: it.id,
          product_id: it.id,
          owner_id: it.owner_id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          unit: it.unit || 'pcs',
          product_type: it.product_type || 'Packaged',
          image_url: it.image_url,
        })),
        address: {
          name,
          mobile,
          email,
          address,
          city,
          state,
          pincode,
          instructions,
        },
        payment_method: 'on',
        utr_reference: utr.trim(),
        proof_url: proofImage,
      };

      const res = await api.orders.create(orderPayload);
      if (res.success) {
        setPlacedOrders(res.orders || []);
        setStep('done');
        onToast('Payment proof submitted! Order created awaiting verification.');
        if (onOrderCompleted) onOrderCompleted();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit online payment order.');
      onToast(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Summary component reused across steps
  const renderSummary = () => (
    <div className="pn">
      <h2>Order summary</h2>
      {checkoutItems.map((it) => (
        <div key={it.id} className="ln">
          <div className="im">
            {it.image_url ? <img src={it.image_url} alt={it.name} /> : <span>{it.emoji || '📦'}</span>}
          </div>
          <div className="n">
            <b>{it.name}</b>
            <br />
            <span className="sm">
              {it.quantity} × {formatMoney(it.price)}
            </span>
          </div>
          <b>{formatMoney(it.price * it.quantity)}</b>
        </div>
      ))}
      <div className="tt" style={{ marginTop: '10px' }}>
        <div>
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <div>
          <span>Delivery fee</span>
          <span>{delivery ? formatMoney(delivery) : 'Free'}</span>
        </div>
        <div className="gt">
          <span>Final total</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>
    </div>
  );

  // STEP 1: Address
  if (step === 'addr') {
    return (
      <div>
        <h1>Checkout · Delivery details</h1>
        <div className="two">
          {renderSummary()}

          <div className="pn">
            <h2 style={{ marginBottom: '10px' }}>Delivery address</h2>
            <form onSubmit={handleAddressProceed}>
              <div className="fg">
                <label htmlFor="ca_n">
                  Full name <i className="rq">*</i>
                </label>
                <input
                  id="ca_n"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anita Rao"
                />
              </div>

              <div className="fg">
                <label htmlFor="ca_m">
                  Mobile number <i className="rq">*</i>
                </label>
                <input
                  id="ca_m"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="10 digits"
                  maxLength={10}
                />
              </div>

              <div className="fg">
                <label htmlFor="ca_e">
                  Email address <i className="rq">*</i>
                </label>
                <input
                  id="ca_e"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="fg">
                <label htmlFor="ca_a">
                  Complete delivery address <i className="rq">*</i>
                </label>
                <textarea
                  id="ca_a"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House/flat no., street, landmark"
                />
              </div>

              <div className="fg">
                <label htmlFor="ca_c">City</label>
                <input id="ca_c" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>

              <div className="fg">
                <label htmlFor="ca_s">State</label>
                <input id="ca_s" value={state} onChange={(e) => setState(e.target.value)} />
              </div>

              <div className="fg">
                <label htmlFor="ca_p">
                  PIN code <i className="rq">*</i>
                </label>
                <input
                  id="ca_p"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 digits"
                  maxLength={6}
                />
              </div>

              <div className="fg">
                <label htmlFor="ca_i">
                  Delivery instructions <span className="sm">(optional)</span>
                </label>
                <textarea
                  id="ca_i"
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Leave at gate, call on arrival, etc."
                />
              </div>

              {error && (
                <div className="er" style={{ marginBottom: '10px' }}>
                  {error}
                </div>
              )}

              <button className="b" type="submit" style={{ width: '100%' }}>
                Proceed
              </button>
              <button
                className="o"
                type="button"
                style={{ width: '100%', marginTop: '8px' }}
                onClick={() => onNavigate('cart')}
              >
                Back to cart
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Choose Payment
  if (step === 'pay') {
    return (
      <div>
        <h1>Choose payment</h1>
        <div className="two">
          {renderSummary()}

          <div className="pn">
            <h2 style={{ marginBottom: '10px' }}>Payment method</h2>

            <label
              className={`po ${paymentMethod === 'cod' ? 'on' : ''}`}
              onClick={() => setPaymentMethod('cod')}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
              />
              Cash on Delivery
            </label>

            <label
              className={`po ${paymentMethod === 'on' ? 'on' : ''}`}
              onClick={() => setPaymentMethod('on')}
            >
              <input
                type="radio"
                name="pm"
                checked={paymentMethod === 'on'}
                onChange={() => setPaymentMethod('on')}
              />
              Pay Now (Online UPI QR)
            </label>

            {paymentMethod === 'cod' ? (
              <p className="sm" style={{ margin: '6px 0 12px' }}>
                You pay {formatMoney(total)} in cash when your order is delivered to your door.
              </p>
            ) : (
              <p className="sm" style={{ margin: '6px 0 12px' }}>
                You scan a verified UPI QR code, pay {formatMoney(total)}, and upload your payment reference (UTR) & screenshot.
              </p>
            )}

            <button
              className="b"
              style={{ width: '100%' }}
              onClick={() => setStep(paymentMethod === 'cod' ? 'review' : 'qr_proof')}
            >
              {paymentMethod === 'cod' ? 'Review order' : 'Proceed to UPI QR payment'}
            </button>

            <button
              className="o"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setStep('addr')}
            >
              Back to address
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3A: Review COD Order
  if (step === 'review') {
    return (
      <div>
        <h1>Review your order</h1>
        <div className="two">
          {renderSummary()}

          <div className="pn">
            <h2>Delivery Details</h2>
            <p style={{ margin: '8px 0' }}>
              <b>{name}</b>
              <br />
              {mobile} · {email}
              <br />
              {address}, {city}, {state} {pincode}
            </p>
            {instructions && (
              <p className="sm" style={{ marginBottom: '10px' }}>
                Note: {instructions}
              </p>
            )}

            <p style={{ marginTop: '10px' }}>
              <b>Payment method:</b> Cash on Delivery ({formatMoney(total)})
            </p>
            <p className="sm" style={{ margin: '4px 0 14px' }}>
              Expected delivery: 2–4 days (standard marketplace delivery)
            </p>

            {error && (
              <div className="er" style={{ marginBottom: '10px' }}>
                {error}
              </div>
            )}

            <button
              className="b"
              style={{ width: '100%' }}
              disabled={submitting}
              onClick={handleConfirmCodOrder}
            >
              {submitting ? <span className="sp"></span> : null}
              Confirm Order
            </button>
            <button
              className="o"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setStep('pay')}
            >
              Back to payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3B: Online QR Payment & Proof
  if (step === 'qr_proof') {
    return (
      <div>
        <h1>Pay Now · UPI QR</h1>
        <div className="two">
          <div className="pn">
            <h2>Scan to pay</h2>
            <div className="kp" style={{ margin: '8px 0' }}>
              <div>
                <small>Exact amount to pay</small>
                <b>{formatMoney(total)}</b>
              </div>
            </div>
            <div className="qr"></div>
            <p className="sm" style={{ textAlign: 'center' }}>
              Pay to: Quantum Market Platform (Official UPI Recipient)
            </p>
          </div>

          <div className="pn">
            <h2 style={{ marginBottom: '10px' }}>Submit payment proof</h2>
            <div className="fg">
              <label htmlFor="pn_r">
                Transaction reference (UTR) <i className="rq">*</i>
              </label>
              <input
                id="pn_r"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="12-digit UPI UTR (e.g. 481234567890)"
                maxLength={22}
              />
            </div>

            <div className="fg">
              <label htmlFor="pn_img">
                Payment screenshot <i className="rq">*</i>
              </label>
              <input id="pn_img" type="file" accept="image/*" onChange={handleImageUpload} />
              <div className="sm">JPG or PNG, up to 2 MB</div>
              {proofImage && (
                <img
                  src={proofImage}
                  alt="Proof preview"
                  style={{ height: '60px', borderRadius: '8px', marginTop: '6px' }}
                />
              )}
            </div>

            <p className="sm" style={{ margin: '10px 0' }}>
              Note: The order status remains Payment Pending / Awaiting Verification until an admin verifies the funds.
            </p>

            {error && (
              <div className="er" style={{ marginBottom: '10px' }}>
                {error}
              </div>
            )}

            <button
              className="b"
              style={{ width: '100%' }}
              disabled={submitting || !utr || !proofImage}
              onClick={handleOnlinePaymentSubmit}
            >
              {submitting ? <span className="sp"></span> : null}
              Submit payment proof & place order
            </button>

            <button
              className="o"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setStep('pay')}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 4: Order Confirmed
  if (step === 'done') {
    return (
      <div>
        <div className="pn" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>✅</div>
          <h1>Order Confirmed Successfully</h1>
          <p className="sm">Thank you for your purchase from Quantum Market!</p>
        </div>

        {placedOrders.map((o) => (
          <div key={o.id} className="pn">
            <b>Order ID: {o.id}</b>
            <p className="sm" style={{ margin: '4px 0' }}>
              Payment Method: {o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online QR'}{' '}
              · Status: {o.payment_status}
            </p>
            <p>
              <b>Total:</b> {formatMoney(o.total)}
            </p>
            <p className="sm">
              Deliver to: {o.buyer_name}, {o.delivery_address}, {o.delivery_city}{' '}
              {o.delivery_pincode}
            </p>
          </div>
        ))}

        <div className="btns">
          <button className="b" onClick={() => onNavigate('orders')}>
            View My Orders
          </button>
          <button className="o" onClick={() => onNavigate('products')}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return null;
};
