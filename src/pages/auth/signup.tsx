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
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <form className="bg-white rounded-4 shadow-lg p-4 p-md-5 w-100" style={{ maxWidth: 400 }} onSubmit={handleSubmit}>
  <h2 className="fw-bold mb-4 text-center text-primary">Sign Up</h2>
        <div className="mb-3">
          <label className="form-label fw-semibold">Username</label>
          <input className="form-control" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Email</label>
          <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label className="form-label fw-semibold">Password</label>
          <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary w-100 py-2 mb-3 fw-bold" type="submit">Sign Up</button>
        <div className="text-center">
          <Link href="/auth/signin" className="text-secondary text-decoration-underline">Already have an account? Sign In</Link>
        </div>
        {error && <div className="alert alert-danger mt-4 text-center fw-semibold">{error}</div>}
        {success && <div className="alert alert-success mt-4 text-center fw-semibold">Account created! You can now sign in.</div>}
      </form>
    </div>
  );
}
