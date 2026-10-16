import React, { useState } from 'react';
import { api } from '../../services/api';

export const EditProduct = ({ product, onNavigate, onToast }) => {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price || '');
  const [stock, setStock] = useState(product?.stock || '');
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState(product?.location || 'Main store');
  const [status, setStatus] = useState(product?.status === 'Disabled' ? 'Inactive' : 'Active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const originalStock = Number(product?.stock) || 0;
  const stockChanged = Number(stock) !== originalStock;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) {
      setError('Please enter a product name (2+ characters).');
      return;
    }
    if (!description || description.trim().length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Please enter a valid price above 0.');
      return;
    }
    if (stock === '' || Number(stock) < 0) {
      setError('Please enter a valid stock quantity.');
      return;
    }
    if (stockChanged && (!reason || reason.trim().length < 3)) {
      setError('A valid reason is required for any manual inventory adjustment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.products.update(product.id, {
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        reason: stockChanged ? reason.trim() : undefined,
        location,
        status: status === 'Inactive' ? 'Disabled' : 'Active',
      });

      if (res.success) {
        onToast('Product updated successfully!');
        onNavigate('hist');
      }
    } catch (err) {
      setError(err.message || 'Failed to update product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Edit Product · {product.id}</h1>
      <div className="pn">
        <form onSubmit={handleSave}>
          <div className="fg">
            <label htmlFor="e_n">
              Product name <i className="rq">*</i>
            </label>
            <input id="e_n" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="fg">
            <label htmlFor="e_d">
              Description <i className="rq">*</i>
            </label>
            <textarea
              id="e_d"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="fg">
            <label htmlFor="e_p">
              Unit price (₹) <i className="rq">*</i>
            </label>
            <input
              id="e_p"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="fg">
            <label htmlFor="e_s">
              Available quantity ({product.unit}) <i className="rq">*</i>
            </label>
            <input
              id="e_s"
              type="number"
              step={product.product_type === 'Loose / Weighted' ? '0.001' : '1'}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          {stockChanged && (
            <div className="fg">
              <label htmlFor="e_r">
                Reason for quantity change <i className="rq">*</i>
              </label>
              <input
                id="e_r"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. New supplier shipment arrived, damaged stock discarded"
              />
            </div>
          )}

          <div className="fg">
            <label htmlFor="e_l">Location</label>
            <input id="e_l" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="fg">
            <label htmlFor="e_a">Availability</label>
            <select id="e_a" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {error && (
            <div className="er" style={{ marginBottom: '10px' }}>
              {error}
            </div>
          )}

          <button className="b" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? <span className="sp"></span> : null}
            Save changes
          </button>

          <button
            className="o"
            type="button"
            style={{ width: '100%', marginTop: '8px' }}
            onClick={() => onNavigate('hist')}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};
