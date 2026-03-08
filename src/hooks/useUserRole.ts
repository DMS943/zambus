import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'moderator' | 'operator' | 'user';

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchUserRoles = async () => {
      if (!user?.id) {
        if (mounted) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }

      try {
        const queryPromise = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 3000)
        );
        
        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as { data: any; error: any };
        
        const { data, error } = result;

        if (error) {
          // Only log if it's not a timeout or missing table (these are expected and handled gracefully)
          if (!error.message?.includes('timeout') && 
              !error.message?.includes('Query timeout') &&
              error.code !== '42P01' && 
              !error.message?.includes('does not exist')) {
            console.error('Error fetching user roles:', error);
          }
          
          // If table doesn't exist, default to 'user' role
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            if (mounted) {
              setRoles(['user']);
              setLoading(false);
            }
            return;
          }
          // On other errors, default to 'user' role
          if (mounted) {
            setRoles(['user']);
            setLoading(false);
          }
        } else {
          if (mounted) {
            const userRoles = data?.map((r: any) => r.role as UserRole) || [];
            // If no roles found, default to 'user' role
            const finalRoles = userRoles.length > 0 ? userRoles : ['user'];
            setRoles(finalRoles);
            setLoading(false);
            // Debug: Log roles for admin users
            if (finalRoles.includes('admin') || finalRoles.includes('moderator')) {
              console.log('User roles loaded:', finalRoles);
            }
          }
        }
      } catch (err: any) {
        // Only log if it's not a timeout (timeouts are expected and handled gracefully)
        if (!err.message?.includes('timeout') && !err.message?.includes('Query timeout')) {
          console.error('Error fetching roles:', err);
        }
        // On timeout or error, default to 'user' role so pages can still load
        if (mounted) {
          setRoles(['user']);
          setLoading(false);
        }
      }
    };

    fetchUserRoles();
    
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const hasRole = (role: UserRole): boolean => {
    return roles.includes(role);
  };

  const isAdmin = (): boolean => hasRole('admin');
  const isModerator = (): boolean => hasRole('moderator');
  const isOperator = (): boolean => hasRole('operator');
  const isAdminOrModerator = (): boolean => isAdmin() || isModerator();
  const isAdminOrOperator = (): boolean => isAdmin() || isOperator();

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isModerator,
    isOperator,
    isAdminOrModerator,
    isAdminOrOperator,
  };
};
