import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const AdminOwners = ({ onSelectOwner, onOpenModal, onCloseModal, onToast }) => {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const res = await api.admin.listOwners();
      if (res.success) {
        setOwners(res.owners || []);
      }
    } catch (err) {
      onToast('Failed to load owners: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
  const formatDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  const handleUpdateStatus = (owner, newStatus) => {
    const isDelete = newStatus === 'Deleted';
    const isSuspend = newStatus === 'Suspended';

    onOpenModal({
      title: isDelete ? 'Delete owner?' : isSuspend ? 'Suspend owner?' : 'Resume owner?',
      children: (
        <div>
          <p style={{ margin: '10px 0 16px' }}>
            {isDelete
              ? `Access will be revoked for ${owner.full_name}. Personal details will be anonymized and products disabled. Financial and order records are preserved for audit.`
              : isSuspend
              ? `${owner.full_name} will not be able to list products or receive orders. Existing records remain intact.`
              : `Reactivate ${owner.full_name}? Store products will be purchasable.`}
          </p>
          <div className="btns">
            <button className="o" onClick={onCloseModal}>
              Cancel
            </button>
            <button
              className={isDelete ? 'd' : 'b'}
              onClick={async () => {
                onCloseModal();
                try {
                  const res = await api.admin.updateOwnerStatus(owner.id, newStatus);
                  if (res.success) {
                    onToast(`Owner marked as ${newStatus}.`);
                    fetchOwners();
                  }
                } catch (err) {
                  onToast('Error: ' + err.message);
                }
              }}
            >
              {isDelete ? 'Delete owner' : isSuspend ? 'Suspend' : 'Resume'}
            </button>
          </div>
        </div>
      ),
    });
  };

  return (
    <div>
      <h1>Store Owners Management</h1>

      {loading ? (
        <div className="empty">Loading owners...</div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name / Shop</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Store</th>
                <th>Products</th>
                <th>Orders</th>
                <th>Gross Revenue</th>
                <th>Commission</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr>
                  <td colSpan={14} className="empty">
                    No store owners found.
                  </td>
                </tr>
              ) : (
                owners.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>
                      <button className="o s" onClick={() => onSelectOwner(o.id)}>
                        {o.full_name}
                      </button>
                      <br />
                      <span className="sm">{o.shop_name || 'No shop name'}</span>
                    </td>
                    <td>{o.email}</td>
                    <td>{o.mobile || '—'}</td>
                    <td>{formatDate(o.created_at)}</td>
                    <td>
                      <span
                        className={`pill ${
                          o.status === 'Active'
                            ? 'g'
                            : o.status === 'Deleted'
                            ? 'r'
                            : 'y'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${o.store_status === 'paused' ? 'y' : 'g'}`}>
                        {o.store_status === 'paused' ? 'Paused' : 'Active'}
                      </span>
                    </td>
                    <td>
                      {o.single_count || 0} single / {o.combo_count || 0} combo
                    </td>
                    <td>{o.orders_count || 0}</td>
                    <td>{formatMoney(o.gross_sales || 0)}</td>
                    <td>{formatMoney(o.commission_accrued || 0)}</td>
                    <td>{formatMoney(o.commission_paid || 0)}</td>
                    <td>
                      <b>{formatMoney(o.outstanding || 0)}</b>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="o s" onClick={() => onSelectOwner(o.id)}>
                        View
                      </button>
                      {o.status === 'Active' && (
                        <button
                          className="o s"
                          style={{ marginLeft: '4px' }}
                          onClick={() => handleUpdateStatus(o, 'Suspended')}
                        >
                          Suspend
                        </button>
                      )}
                      {o.status === 'Suspended' && (
                        <button
                          className="b s"
                          style={{ marginLeft: '4px' }}
                          onClick={() => handleUpdateStatus(o, 'Active')}
                        >
                          Resume
                        </button>
                      )}
                      {o.status !== 'Deleted' && (
                        <button
                          className="d s"
                          style={{ marginLeft: '4px' }}
                          onClick={() => handleUpdateStatus(o, 'Deleted')}
                        >
                          Delete
                        </button>
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
