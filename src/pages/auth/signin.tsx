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
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <form className="bg-white rounded-4 shadow-lg p-4 p-md-5 w-100" style={{ maxWidth: 400 }} method="post" onSubmit={handleSubmit}>
        <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
  <h2 className="fw-bold mb-4 text-center text-primary">Sign In</h2>
        {error && <div className="alert alert-danger text-center fw-semibold">{error}</div>}
        <div className="mb-3">
          <label className="form-label fw-semibold">Email</label>
          <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label className="form-label fw-semibold">Password</label>
          <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary w-100 py-2 mb-3 fw-bold" type="submit">Sign In</button>
        <div className="text-center">
          <Link href="/auth/signup" className="text-secondary text-decoration-underline">Don&apos;t have an account? Sign Up</Link>
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
