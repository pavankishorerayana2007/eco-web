import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const CATEGORIES = [
  'All',
  'Groceries',
  'Ayurvedic Medicines',
  'Other Medical Products',
  'Household Products',
  'Other Categories',
  'Combos',
];

const SORT_OPTIONS = [
  'Newest',
  'Price: low to high',
  'Price: high to low',
  'Name',
];

export const ProductCatalog = ({ onAddToCart, onBuyNow, onToast }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Newest');
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    fetchProducts();
  }, [category, sort]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.list({ category, sort });
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      onToast('Failed to load products: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFinalPrice = (p) => {
    return Math.round(p.price * (1 - (p.discount_percent || 0) / 100) * 100) / 100;
  };

  const formatMoney = (n) => {
    return '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  };

  const isLoose = (p) => p.product_type === 'Loose / Weighted';

  const handleQtyChange = (productId, val) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, Number(val) || 1),
    }));
  };

  const getSelectedQty = (productId) => {
    return quantities[productId] || 1;
  };

  // Filter by client-side search text
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // Extract distinct paused stores for alert banners
  const pausedStores = products
    .filter((p) => p.profiles?.store_status === 'paused')
    .reduce((acc, p) => {
      if (!acc.some((x) => x.id === p.owner_id)) {
        acc.push({
          id: p.owner_id,
          name: p.profiles?.shop_name || 'Store',
          message: p.profiles?.store_pause_message || 'Temporarily paused.',
        });
      }
      return acc;
    }, []);

  return (
    <div>
      <h1>Products</h1>

      {/* Paused Store Banners */}
      {pausedStores.map((st) => (
        <div key={st.id} className="errb">
          <span className="sm">{st.name}</span>
          <br />
          <b>This Store Is Temporarily Paused.</b>
          <br />
          <span style={{ whiteSpace: 'pre-wrap' }}>{st.message}</span>
        </div>
      ))}

      {/* Filter & Search Bar */}
      <div className="bar">
        <div className="fg grow">
          <label htmlFor="sq">Search</label>
          <input
            id="sq"
            type="search"
            placeholder="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="fg">
          <label htmlFor="sc">Category</label>
          <select id="sc" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="fg">
          <label htmlFor="ss">Sort by</label>
          <select id="ss" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((so) => (
              <option key={so} value={so}>
                {so}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="empty">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty pn">No products match. Try another search or category.</div>
      ) : (
        <div className="grid">
          {filteredProducts.map((p) => {
            const isStorePaused = p.profiles?.store_status === 'paused';
            const finalPrice = getFinalPrice(p);
            const qty = getSelectedQty(p.id);

            return (
              <div key={p.id} className="card">
                <div className="art">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <span>{p.emoji || (p.type === 'combo' ? '🎁' : '📦')}</span>
                  )}
                  {p.type === 'combo' && <span className="tag">Combo</span>}
                </div>

                <div className="cb">
                  <span className="sm">{p.category}</span>
                  <h3>{p.name}</h3>
                  <p className="sm">{p.description}</p>

                  <div className="pr">
                    {formatMoney(finalPrice)}
                    {p.discount_percent > 0 && <s> {formatMoney(p.price)}</s>}
                    <span className="sm"> per {isLoose(p) ? p.unit : 'package'}</span>
                  </div>

                  <span className="sm">
                    {p.stock <= 5
                      ? `Only ${p.stock} left in stock`
                      : `${p.stock} ${p.unit} available`}{' '}
                    · Sold by {p.profiles?.shop_name || p.shop_name || 'Marketplace Seller'}
                  </span>

                  {isStorePaused ? (
                    <div className="sm" style={{ marginTop: '8px' }}>
                      <b>Store paused.</b> Ordering is unavailable.
                    </div>
                  ) : (
                    <>
                      <div className="fg" style={{ margin: '6px 0 0' }}>
                        <label htmlFor={`q_${p.id}`}>
                          {p.type === 'combo'
                            ? 'Packages'
                            : isLoose(p)
                            ? `Quantity (${p.unit})`
                            : 'Quantity'}
                        </label>
                        <div className="st">
                          <button
                            className="o"
                            type="button"
                            onClick={() => handleQtyChange(p.id, qty - 1)}
                            aria-label="Decrease"
                          >
                            −
                          </button>
                          <input
                            id={`q_${p.id}`}
                            value={qty}
                            onChange={(e) => handleQtyChange(p.id, e.target.value)}
                            inputMode="numeric"
                            maxLength={4}
                          />
                          <button
                            className="o"
                            type="button"
                            onClick={() => handleQtyChange(p.id, qty + 1)}
                            aria-label="Increase"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="btns">
                        <button
                          className="o"
                          type="button"
                          onClick={() => onAddToCart(p, qty)}
                        >
                          Add to Cart
                        </button>
                        <button
                          className="b"
                          type="button"
                          onClick={() => onBuyNow(p, qty)}
                        >
                          Buy Now
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
