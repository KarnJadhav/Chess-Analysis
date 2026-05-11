import { getCsrfToken, signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { type GetServerSidePropsContext } from 'next';

export default function SignIn({ csrfToken }: { csrfToken: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError('Invalid email or password.');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" style={{ maxWidth: 420 }} method="post" onSubmit={handleSubmit}>
        <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
        <div className="auth-brand">Chanakya</div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to review your latest games and insights.</p>
        {error && <div className="auth-alert">{error}</div>}
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button className="auth-button" type="submit">Sign In</button>
        <div className="auth-footer">
          <span>Don&apos;t have an account?</span>
          <Link href="/auth/signup" className="auth-link">Sign Up</Link>
        </div>
      </form>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {
      csrfToken: await getCsrfToken(context)
    }
  };
}
