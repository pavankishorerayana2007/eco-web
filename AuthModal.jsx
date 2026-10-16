import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const AuthModal = ({ onLoginSuccess, onToast }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!email || !password) {
        setError('Please enter both email and password.');
        return;
      }

      setLoading(true);
      try {
        const res = await login(email, password);
        if (res.success) {
          onToast('Logged in successfully!');
          if (onLoginSuccess) onLoginSuccess();
        }
      } catch (err) {
        setError(err.message || 'Login failed. Please check credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!fullName || fullName.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const res = await register({ email, password, full_name: fullName });
        if (res.success) {
          onToast('Buyer account created! Please log in.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      } catch (err) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const fillDemoAccount = (demoEmail, demoPw = 'demo1234') => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setMode('login');
  };

  return (
    <div id="login">
      <div className="lg">
        <div className="lgo">Quantum Market</div>

        <div className="bar" style={{ margin: '12px 0 4px' }}>
          <button
            className={`${mode === 'login' ? 'b' : 'o'} s`}
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Log in
          </button>
          <button
            className={`${mode === 'register' ? 'b' : 'o'} s`}
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Register (buyer)
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '10px' }}>
          {mode === 'register' && (
            <div className="fg">
              <label htmlFor="rn">
                Full name <i className="rq">*</i>
              </label>
              <input
                id="rn"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Anita Rao"
                autoComplete="name"
              />
            </div>
          )}

          <div className="fg">
            <label htmlFor="le1">
              Email <i className="rq">*</i>
            </label>
            <input
              id="le1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="fg">
            <label htmlFor="lp1">
              {mode === 'login' ? 'Password' : 'Password (8+ characters)'} <i className="rq">*</i>
            </label>
            <input
              id="lp1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="fg">
              <label htmlFor="lc1">
                Confirm password <i className="rq">*</i>
              </label>
              <input
                id="lc1"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="er" role="alert" style={{ marginBottom: '10px' }}>
              {error}
            </div>
          )}

          <button className="b" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? <span className="sp"></span> : null}
            {mode === 'login' ? 'Log in' : 'Create buyer account'}
          </button>
        </form>

        <div style={{ marginTop: '14px', borderTop: '1px solid var(--ln)', paddingTop: '10px' }}>
          <p className="sm" style={{ fontWeight: 600, marginBottom: '6px' }}>Quick Demo Accounts (Password: demo1234):</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <button className="o s" type="button" onClick={() => fillDemoAccount('buyer@demo.com')}>
              Buyer (Anita)
            </button>
            <button className="o s" type="button" onClick={() => fillDemoAccount('owner@quantum.shop')}>
              Owner (Rajesh)
            </button>
            <button className="o s" type="button" onClick={() => fillDemoAccount('meera@quantum.shop')}>
              Owner (Meera)
            </button>
            <button className="o s" type="button" onClick={() => fillDemoAccount('admin@quantum.shop')}>
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
