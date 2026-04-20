import { useSession } from 'next-auth/react';

export default function AdvancedFeatures() {
  const { data: session } = useSession();

  if (!session) {
    return <div className="d-flex align-items-center justify-content-center min-vh-100 bg-primary text-white fw-bold fs-4">You must be signed in to view this page.</div>;
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="bg-white rounded-4 shadow-lg p-4 p-md-5">
            <h1 className="fw-bold mb-4 text-primary text-center">Advanced Features</h1>
            <ul className="list-group mb-4">
              <li className="list-group-item">ELO Estimator <span className="badge bg-secondary ms-2">Coming Soon</span></li>
              <li className="list-group-item">Puzzle Generator <span className="badge bg-secondary ms-2">Coming Soon</span></li>
              <li className="list-group-item">Social Features <span className="badge bg-secondary ms-2">Coming Soon</span></li>
              <li className="list-group-item">Notifications <span className="badge bg-secondary ms-2">Coming Soon</span></li>
            </ul>
            <div className="alert alert-info text-center">More features will be added soon. Stay tuned!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
