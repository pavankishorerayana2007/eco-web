import React, { useState } from 'react';
import { api } from '../../services/api';

export const AdminCreateOwner = ({ onToast }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid owner email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.admin.inviteOwner(email);
      if (res.success) {
        onToast(res.message);
        setEmail('');
      }
    } catch (err) {
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create & Invite Store Owner</h1>

      <div className="pn">
        <form onSubmit={handleInvite}>
          <div className="fg">
            <label htmlFor="ow_e">
              Owner email address <i className="rq">*</i>
            </label>
            <input
              id="ow_e"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="newowner@quantum.shop"
            />
          </div>

          <p className="sm" style={{ margin: '-4px 0 12px' }}>
            The owner will receive a secure activation link to configure their store profile and set their password.
          </p>

          {error && (
            <div className="er" style={{ marginBottom: '10px' }}>
              {error}
            </div>
          )}

          <button className="b" type="submit" disabled={loading}>
            {loading ? <span className="sp"></span> : null}
            Create Owner Invitation
          </button>
        </form>
      </div>
    </div>
  );
};
