'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPwd, setRegPwd] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.replace('/chat');
    }
  }, [router]);

  function showError(msg) {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginPhone || !loginPwd) return showError('All fields required');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPwd }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace('/chat');
    } catch {
      showError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!regName || !regPhone || !regPwd) return showError('All fields required');
    if (regPwd.length < 6) return showError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, phone: regPhone, password: regPwd }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace('/chat');
    } catch {
      showError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left-content">
          <h1>WhatsApp Web</h1>
          <p>Send and receive messages without keeping your phone online.</p>
          <p>Use WhatsApp on up to 4 linked devices and 1 phone at the same time.</p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-logo">
            <svg viewBox="0 0 39 39" width="60" height="60">
              <path fill="#25D366" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.3 8.1 2.3 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.5 5.5 5.9-1.2z"/>
              <path fill="#FFF" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9z"/>
            </svg>
          </div>

          {tab === 'login' ? (
            <form className="auth-form active" onSubmit={handleLogin}>
              <h2>Welcome back</h2>
              <div className="input-group">
                <input type="text" id="login-phone" placeholder="Phone number" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="password" id="login-password" placeholder="Password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} required />
              </div>
              <button id="login-btn" className="auth-btn" type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Log In'}
              </button>
              <p className="auth-switch">Don&apos;t have an account? <a href="#" onClick={e => { e.preventDefault(); setTab('register'); }}>Sign up</a></p>
            </form>
          ) : (
            <form className="auth-form active" onSubmit={handleRegister}>
              <h2>Create account</h2>
              <div className="input-group">
                <input type="text" id="reg-name" placeholder="Your name" value={regName} onChange={e => setRegName(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="text" id="reg-phone" placeholder="Phone number" value={regPhone} onChange={e => setRegPhone(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="password" id="reg-password" placeholder="Password (min 6 chars)" value={regPwd} onChange={e => setRegPwd(e.target.value)} required />
              </div>
              <button id="register-btn" className="auth-btn" type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Sign Up'}
              </button>
              <p className="auth-switch">Already have an account? <a href="#" onClick={e => { e.preventDefault(); setTab('login'); }}>Log in</a></p>
            </form>
          )}

          {error && <div id="auth-error" className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
