/** SkillSwap - Protected Route */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullPage />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (adminOnly && !user.is_admin) return <Navigate to="/dashboard" replace />;

  return children;
};
