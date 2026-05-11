import { useState } from 'react';
import Link from 'next/link';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else {
      setSuccess(true);
      window.location.href = '/auth/signin';
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" style={{ maxWidth: 440 }} onSubmit={handleSubmit}>
        <div className="auth-brand">Chanakya</div>
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Start your first review in minutes with a clean setup.</p>
        <div className="auth-field">
          <label className="auth-label">Username</label>
          <input className="auth-input" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button className="auth-button" type="submit">Sign Up</button>
        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link href="/auth/signin" className="auth-link">Sign In</Link>
        </div>
        {error && <div className="auth-alert">{error}</div>}
        {success && <div className="auth-success">Account created! You can now sign in.</div>}
      </form>
    </div>
  );
}
