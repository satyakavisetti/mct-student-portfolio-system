import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, coordinatorOnly = false, studentOnly = false }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (coordinatorOnly && user?.role !== 'coordinator') {
    return <Navigate to="/dashboard" replace />;
  }

  if (studentOnly && user?.role !== 'student') {
    return <Navigate to="/coordinator/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
