import { Link } from 'react-router-dom';

export const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <h2 className="text-6xl font-bold text-blue-600">404</h2>
        <h3 className="mt-2 text-xl font-semibold text-gray-900">Page not found</h3>
        <p className="mt-2 text-sm text-gray-600">
          The page you are looking for does not exist or you do not have access.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};
