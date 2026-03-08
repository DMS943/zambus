import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requireAdminOrModerator?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requiredRole,
  requireAdminOrModerator = false 
}: ProtectedRouteProps) => {
  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL LOGIC
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { hasRole, isAdminOrModerator, loading: rolesLoading } = useUserRole();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Timeout protection - if loading takes too long, allow page to render
  useEffect(() => {
    if (authLoading || rolesLoading) {
      const timeout = setTimeout(() => {
        console.warn('ProtectedRoute: Loading timeout, allowing page to render');
        setTimeoutReached(true);
      }, 3000);
      
      return () => clearTimeout(timeout);
    } else {
      setTimeoutReached(false);
    }
  }, [authLoading, rolesLoading]);

  // Redirect unauthenticated users to auth page
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !timeoutReached) {
      const timer = setTimeout(() => {
        const currentPath = window.location.pathname;
        const protectedPaths = ['/profile', '/bookings', '/admin', '/validation', '/analytics', '/operator'];
        
        if (protectedPaths.includes(currentPath)) {
          const currentSession = supabase.auth.getSession();
          currentSession.then(({ data: { session } }) => {
            if (!session && protectedPaths.includes(window.location.pathname)) {
              navigate('/auth');
            }
          }).catch(() => {
            console.warn('ProtectedRoute: Session check failed, not redirecting');
          });
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, navigate, timeoutReached]);

  // Calculate hasPermission (must be before conditional returns)
  const hasPermission = 
    (!requiredRole && !requireAdminOrModerator) ||
    (requiredRole && hasRole(requiredRole)) ||
    (requireAdminOrModerator && (isAdminOrModerator() || (timeoutReached && rolesLoading && isAuthenticated)));

  // Redirect regular users away from admin pages
  useEffect(() => {
    if (!hasPermission && !timeoutReached && isAuthenticated && !rolesLoading && requireAdminOrModerator) {
      // Redirect immediately but check we're not already redirecting
      if (window.location.pathname !== "/") {
        const timer = setTimeout(() => {
          navigate("/", { replace: true });
        }, 1000); // Reduced from 3000 to 1000ms
        return () => clearTimeout(timer);
      }
    }
  }, [hasPermission, timeoutReached, isAuthenticated, rolesLoading, requireAdminOrModerator, navigate]);

  // NOW WE CAN DO CONDITIONAL RENDERING - ALL HOOKS ARE ABOVE
  if ((authLoading || rolesLoading) && !timeoutReached) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !timeoutReached) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If timeout reached and roles are still loading, show warning but allow access
  if (timeoutReached && rolesLoading && requireAdminOrModerator && !isAdminOrModerator() && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="default" className="max-w-2xl mx-auto border-yellow-500 bg-yellow-50">
            <ShieldAlert className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="text-lg font-semibold text-yellow-800">Connection Timeout</AlertTitle>
            <AlertDescription className="mt-2 text-yellow-700">
              Unable to verify your admin permissions due to connection timeout. 
              <p className="mt-2 font-medium">Allowing access temporarily. Please ensure:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Your Supabase project is active and accessible</li>
                <li>Your admin role is assigned in the user_roles table</li>
                <li>Your internet connection is stable</li>
              </ul>
              <p className="mt-2 text-sm">If you don't have admin access, you may see errors on this page.</p>
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // If we don't have permission and haven't timed out, show access denied
  if (!hasPermission && !timeoutReached) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Access Denied</AlertTitle>
          <AlertDescription className="mt-2">
            You don't have the required permissions to access this page. 
            {requiredRole && ` Required role: ${requiredRole}`}
            {requireAdminOrModerator && ' Admin or Moderator access required.'}
            {rolesLoading && (
              <div className="mt-2 text-sm">
                <p>Note: Still checking your permissions. If you believe you should have access, please wait or refresh the page.</p>
              </div>
            )}
            {requireAdminOrModerator && isAuthenticated && !rolesLoading && (
              <div className="mt-2 text-sm">
                <p>You will be redirected to the home page shortly.</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;