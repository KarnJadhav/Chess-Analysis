import Link from 'next/link';
import { GetServerSideProps } from 'next';

const errorMessages: Record<string, string> = {
  Configuration: 'The authentication service is missing one or more required environment variables.',
  AccessDenied: 'Access was denied. Please try signing in again.',
  Verification: 'The verification link is invalid or expired.',
  default: 'An authentication error occurred. Please try again.',
};

export default function AuthErrorPage({ error }: { error: string }) {
  const message = errorMessages[error] || errorMessages.default;

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 w-100 text-center" style={{ maxWidth: 520 }}>
        <h1 className="fw-bold mb-3 text-danger">Authentication Error</h1>
        <p className="lead mb-4">{message}</p>
        <p className="text-muted small mb-4">Error code: {error}</p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          <Link href="/auth/signin" className="btn btn-primary px-4">
            Back to Sign In
          </Link>
          <Link href="/auth/signup" className="btn btn-outline-secondary px-4">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const error = typeof context.query.error === 'string' ? context.query.error : 'default';
  return {
    props: { error },
  };
};