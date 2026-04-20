import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function Profile() {
  const { data: session } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [lichessAccount, setLichessAccount] = useState('');
  const [chesscomAccount, setChesscomAccount] = useState('');
  const [theme, setTheme] = useState('light');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!session) return;
      setLoading(true);
      const res = await fetch('/api/profile', { credentials: 'include' });
      const data = await res.json();
      if (data.user) {
        setDisplayName(data.user.username || '');
        setLichessAccount(data.user.lichessAccount || '');
        setChesscomAccount(data.user.chesscomAccount || '');
        setTheme(data.user.theme || 'light');
      }
      setLoading(false);
    }
    fetchProfile();
  }, [session]);

  if (!session) {
    return <div className="d-flex align-items-center justify-content-center min-vh-100 bg-primary text-white fw-bold fs-4">You must be signed in to view this page.</div>;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, lichessAccount, chesscomAccount, theme }),
      credentials: 'include',
    });
    const data = await res.json();
    if (data.message) setMessage('Profile updated!');
    else setMessage(data.error || 'Error updating profile');
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="bg-white rounded-4 shadow-lg p-4 p-md-5">
            <h1 className="fw-bold mb-4 text-primary text-center">Profile & Settings</h1>
            {loading ? (
              <div className="text-center py-5">Loading profile...</div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Display Name</label>
                  <input className="form-control" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Lichess Account</label>
                  <input className="form-control" type="text" value={lichessAccount} onChange={e => setLichessAccount(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Chess.com Account</label>
                  <input className="form-control" type="text" value={chesscomAccount} onChange={e => setChesscomAccount(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Theme</label>
                  <select className="form-select" value={theme} onChange={e => setTheme(e.target.value)}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <button className="btn btn-primary w-100 py-2 fw-bold" type="submit">Save Changes</button>
              </form>
            )}
            {message && <div className="text-success fw-semibold text-center mt-3">{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
