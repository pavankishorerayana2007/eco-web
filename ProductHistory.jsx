import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const ProductHistory = ({ onEditProduct, onOpenModal, onCloseModal, onToast }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.list({ owner_id: user?.id, status: statusFilter });
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      onToast('Failed to load listings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  const formatDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'Active' ? 'Disabled' : 'Active';
    try {
      const res = await api.products.updateStatus(product.id, newStatus);
      if (res.success) {
        onToast(`${product.name} is now ${newStatus === 'Disabled' ? 'Inactive' : 'Active'}.`);
        fetchProducts();
      }
    } catch (err) {
      onToast('Error updating status: ' + err.message);
    }
  };

  const handleDeleteProduct = (product) => {
    onOpenModal({
      title: 'Delete listing?',
      children: (
        <div>
          <p style={{ margin: '10px 0 16px' }}>
            This hides <b>{product.name}</b> from the shop. Orders and audit records are safely kept (soft delete).
          </p>
          <div className="btns">
            <button className="o" onClick={onCloseModal}>
              Cancel
            </button>
            <button
              className="d"
              onClick={async () => {
                onCloseModal();
                try {
                  const res = await api.products.updateStatus(product.id, 'Deleted');
                  if (res.success) {
                    onToast(`${product.name} deleted.`);
                    fetchProducts();
                  }
                } catch (err) {
                  onToast('Error: ' + err.message);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
    });
  };

  const handleViewAuditHistory = async (product) => {
    try {
      const res = await api.products.getHistory(product.id);
      const logs = res.logs || [];

      onOpenModal({
        title: product.name,
        children: (
          <div>
            <p className="sm" style={{ marginBottom: '10px' }}>
              {product.id} · Original qty {product.original_quantity || product.stock} · Available {product.stock} {product.unit} · Status: {product.status}
            </p>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div className="empty">No modification records.</div>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="nt">
                    <b>{l.kind}</b>
                    {l.quantity_delta !== 0 && (
                      <span
                        className={`pill ${l.quantity_delta > 0 ? 'g' : 'r'}`}
                        style={{ marginLeft: '6px' }}
                      >
                        {l.quantity_delta > 0 ? `+${l.quantity_delta}` : l.quantity_delta}
                      </span>
                    )}
                    <br />
                    {l.details}
                    <br />
                    <span className="sm">{formatDate(l.created_at)}</span>
                  </div>
                ))
              )}
            </div>

            <button
              className="o"
              style={{ width: '100%', marginTop: '14px' }}
              onClick={onCloseModal}
            >
              Close
            </button>
          </div>
        ),
      });
    } catch (err) {
      onToast('Error loading history: ' + err.message);
    }
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <h1>Product Listings & History</h1>
      <p className="sm" style={{ marginBottom: '10px' }}>
        Product inventory, audit trails, and status toggles. Customer orders are tracked under the Orders tab.
      </p>

      {/* Filter Bar */}
      <div className="bar">
        <div className="fg grow">
          <label htmlFor="hq">Search</label>
          <input
            id="hq"
            type="search"
            placeholder="Name or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="fg">
          <label htmlFor="hs">Status</label>
          <select id="hs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Disabled">Inactive</option>
            <option value="Deleted">Deleted</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading inventory...</div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Image</th>
                <th>Name</th>
                <th>Available</th>
                <th>Original qty</th>
                <th>Added</th>
                <th>Status</th>
                <th>Last modified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: '#E5F5F3',
                          display: 'grid',
                          placeItems: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span>{p.emoji || '📦'}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <b>{p.name}</b>
                      <br />
                      <span className="sm">{p.category} · {formatMoney(p.price)}</span>
                    </td>
                    <td>
                      {p.stock} {p.unit}
                    </td>
                    <td>
                      {p.original_quantity || p.stock} {p.unit}
                    </td>
                    <td>{formatDate(p.created_at)}</td>
                    <td>
                      <span
                        className={`pill ${
                          p.status === 'Active'
                            ? 'g'
                            : p.status === 'Deleted'
                            ? 'r'
                            : 'y'
                        }`}
                      >
                        {p.status === 'Disabled' ? 'Inactive' : p.status}
                      </span>
                    </td>
                    <td>{formatDate(p.updated_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="o s" onClick={() => handleViewAuditHistory(p)}>
                        History
                      </button>
                      {p.status !== 'Deleted' && (
                        <>
                          <button
                            className="b s"
                            style={{ marginLeft: '4px' }}
                            onClick={() => onEditProduct(p)}
                          >
                            Edit
                          </button>
                          <button
                            className="o s"
                            style={{ marginLeft: '4px' }}
                            onClick={() => handleToggleStatus(p)}
                          >
                            {p.status === 'Active' ? 'Stop' : 'Resume'}
                          </button>
                          <button
                            className="d s"
                            style={{ marginLeft: '4px' }}
                            onClick={() => handleDeleteProduct(p)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
