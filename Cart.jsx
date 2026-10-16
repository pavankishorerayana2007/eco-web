import React from 'react';

export const Cart = ({ cartItems, onUpdateQuantity, onRemoveItem, onProceedToCheckout, onNavigate }) => {
  const formatMoney = (n) => {
    return '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  };

  if (!cartItems || cartItems.length === 0) {
    return (
      <div>
        <h1>Your cart</h1>
        <div className="empty pn">
          Your cart is empty.
          <br />
          <br />
          <button className="b" onClick={() => onNavigate('products')}>
            Browse products
          </button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = subtotal >= 999 ? 0 : 49;
  const total = subtotal + delivery;

  // Check if any items belong to a paused store
  const pausedStoreItems = cartItems.filter((it) => it.is_paused);

  return (
    <div>
      <h1>Your cart</h1>

      {pausedStoreItems.length > 0 && (
        <div className="errb">
          <b>Some stores in your cart are temporarily paused:</b>
          <ul style={{ margin: '6px 0 6px 20px' }}>
            {pausedStoreItems.map((it) => (
              <li key={it.id}>{it.name} ({it.shop_name})</li>
            ))}
          </ul>
          <span className="sm">Please remove items from paused stores before proceeding to checkout.</span>
        </div>
      )}

      <div className="pn">
        {cartItems.map((item) => (
          <div key={item.id} className="ln">
            <div className="im">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} />
              ) : (
                <span>{item.emoji || '📦'}</span>
              )}
            </div>

            <div className="n">
              <b>{item.name}</b>
              <br />
              <span className="sm">
                {formatMoney(item.price)} each · Subtotal {formatMoney(item.price * item.quantity)}
              </span>
            </div>

            <div className="st">
              <button
                className="o s"
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                aria-label="Decrease"
              >
                −
              </button>
              <b style={{ padding: '8px' }}>{item.quantity}</b>
              <button
                className="o s"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                aria-label="Increase"
              >
                +
              </button>
            </div>

            <button
              className="o s"
              style={{ marginLeft: '8px' }}
              onClick={() => onRemoveItem(item.id)}
            >
              Remove
            </button>
          </div>
        ))}

        <div className="tt" style={{ marginTop: '14px' }}>
          <div>
            <span>Items total</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div>
            <span>Delivery (est.)</span>
            <span>{delivery ? formatMoney(delivery) : 'Free'}</span>
          </div>
          <div className="gt">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        <button
          className="b"
          style={{ width: '100%', marginTop: '14px' }}
          disabled={pausedStoreItems.length > 0}
          onClick={onProceedToCheckout}
        >
          Proceed to checkout
        </button>
      </div>
    </div>
  );
};
