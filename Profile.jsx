import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const Profile = ({ onToast }) => {
  const { user, updateUserProfile, logout } = useAuth();

  // Profile details
  const [name, setName] = useState(user?.full_name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) {
      onToast('Full name must be at least 2 characters.');
      return;
    }
    if (mobile && !/^\d{10}$/.test(mobile)) {
      onToast('Mobile number must be 10 digits.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.auth.updateProfile({
        full_name: name,
        mobile,
        address,
        city,
        state,
        pincode,
      });
      if (res.success) {
        updateUserProfile(res.user);
        onToast('Profile saved successfully!');
      }
    } catch (err) {
      onToast('Error updating profile: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      onToast('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      onToast('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      onToast('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.auth.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (res.success) {
        onToast('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      onToast('Error: ' + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <h1>Profile</h1>

      <div className="two">
        {/* Personal Details Panel */}
        <div className="pn">
          <h2 style={{ marginBottom: '10px' }}>Your details</h2>
          <form onSubmit={handleSaveProfile}>
            <div className="fg">
              <label htmlFor="pf_n">Full name</label>
              <input id="pf_n" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="fg">
              <label htmlFor="pf_m">Mobile number</label>
              <input
                id="pf_m"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
              />
            </div>

            <div className="fg">
              <label htmlFor="pf_e">Email</label>
              <input id="pf_e" value={user?.email || ''} disabled />
              <span className="sm">Email is managed by the sign-in provider.</span>
            </div>

            <div className="fg">
              <label htmlFor="pf_a">Delivery address</label>
              <textarea
                id="pf_a"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="fg">
              <label htmlFor="pf_c">City</label>
              <input id="pf_c" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>

            <div className="fg">
              <label htmlFor="pf_s">State</label>
              <input id="pf_s" value={state} onChange={(e) => setState(e.target.value)} />
            </div>

            <div className="fg">
              <label htmlFor="pf_p">PIN code</label>
              <input
                id="pf_p"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
              />
            </div>

            <button className="b" type="submit" disabled={savingProfile} style={{ width: '100%' }}>
              {savingProfile ? <span className="sp"></span> : null}
              Save changes
            </button>
          </form>
        </div>

        {/* Change Password Panel */}
        <div className="pn">
          <h2 style={{ marginBottom: '10px' }}>Change password</h2>
          <form onSubmit={handleSavePassword}>
            <div className="fg">
              <label htmlFor="pw_o">Current password</label>
              <input
                id="pw_o"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="fg">
              <label htmlFor="pw_n">New password</label>
              <input
                id="pw_n"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="fg">
              <label htmlFor="pw_c">Confirm new password</label>
              <input
                id="pw_c"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button className="b" type="submit" disabled={savingPassword} style={{ width: '100%' }}>
              {savingPassword ? <span className="sp"></span> : null}
              Update password
            </button>
          </form>

          <button
            className="o"
            style={{ width: '100%', marginTop: '16px' }}
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
