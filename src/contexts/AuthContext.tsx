
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage: 'english' | 'bemba' | 'nyanja';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateLanguage: (language: 'english' | 'bemba' | 'nyanja') => void;
  guestLanguage: 'english' | 'bemba' | 'nyanja';
  updateGuestLanguage: (language: 'english' | 'bemba' | 'nyanja') => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestLanguage, setGuestLanguage] = useState<'english' | 'bemba' | 'nyanja'>('english');

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        console.error('Login error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        
        let userFriendlyError = error.message;
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid')) {
          userFriendlyError = 'Invalid email or password. Please try again.';
        } else if (error.message?.includes('Email not confirmed')) {
          userFriendlyError = 'Please verify your email address before logging in.';
        } else if (error.status === 400) {
          userFriendlyError = 'Invalid email or password.';
        } else if (error.status === 429) {
          userFriendlyError = 'Too many login attempts. Please try again later.';
        }
        
        return { 
          success: false, 
          error: userFriendlyError 
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error?.message || 'An error occurred during login. Please try again.' 
      };
    }
  };

  const register = async (userData: Omit<User, 'id'> & { password: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Test connection first
      try {
        const { error: healthCheck } = await supabase.from('profiles').select('id').limit(1);
        if (healthCheck && healthCheck.message?.includes('Failed to fetch')) {
          return {
            success: false,
            error: 'Cannot connect to database. Please check your internet connection and try again.'
          };
        }
      } catch (networkError: any) {
        if (networkError.message?.includes('Failed to fetch') || networkError.message?.includes('NetworkError')) {
          return {
            success: false,
            error: 'Network error: Cannot reach the server. Please check your internet connection and verify the Supabase project is active.'
          };
        }
      }
      
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone || '',
            preferred_language: userData.preferredLanguage || 'english'
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          code: error.code,
          name: error.name,
          fullError: JSON.stringify(error, null, 2)
        });
        
        // Provide more helpful error messages
        let userFriendlyError = error.message;
        if (error.message?.includes('User already registered')) {
          userFriendlyError = 'This email is already registered. Please try logging in instead.';
        } else if (error.message?.includes('Invalid email')) {
          userFriendlyError = 'Please enter a valid email address.';
        } else if (error.message?.includes('Password')) {
          userFriendlyError = 'Password does not meet requirements. Please use a stronger password.';
        } else if (error.status === 400) {
          userFriendlyError = `Invalid request: ${error.message || 'Please check your input and try again.'}`;
        } else if (error.status === 500 || error.status === 503) {
          // For server errors, show more details if available
          userFriendlyError = `Server error (${error.status}): ${error.message || 'Please check the browser console (F12) for details and try again.'}`;
        }
        
        return { 
          success: false, 
          error: userFriendlyError || `Failed to create account (${error.status || 'Unknown error'}). Please check the browser console for details.` 
        };
      }

      // User account created successfully!
      // The database trigger will automatically create the profile
      // We don't need to create it manually here since:
      // 1. The user isn't authenticated yet, so RLS would block it
      // 2. The trigger (handle_new_user_profile) runs with SECURITY DEFINER and will create it
      // 3. The auth state listener will also create it if the trigger somehow fails
      
      if (data?.user) {
        console.log('User account created successfully. Profile will be created automatically by database trigger.');
      }

      // Signup is successful if auth user was created
      // Profile will be created automatically by the database trigger
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle network errors specifically
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError') {
        return {
          success: false,
          error: 'Network error: Cannot connect to the server. Please check:\n1. Your internet connection\n2. Supabase project is active (not paused)\n3. Supabase URL and API key are correct'
        };
      }
      
      return { 
        success: false, 
        error: error?.message || 'An unexpected error occurred during registration' 
      };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateLanguage = async (language: 'english' | 'bemba' | 'nyanja') => {
    if (user && session) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: language })
          .eq('id', user.id);

        if (!error) {
          // Update user state immediately for instant UI update
          setUser(prev => prev ? { ...prev, preferredLanguage: language } : null);
          console.log('Language updated successfully to:', language);
        } else {
          console.error('Error updating language:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error updating language:', error);
        throw error;
      }
    } else {
      // If not authenticated, update guest language instead
      updateGuestLanguage(language);
    }
  };

  const updateGuestLanguage = (language: 'english' | 'bemba' | 'nyanja') => {
    setGuestLanguage(language);
    localStorage.setItem('zambus_guest_language', language);
  };

  // Initialize guest language from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('zambus_guest_language');
    if (savedLanguage && ['english', 'bemba', 'nyanja'].includes(savedLanguage)) {
      setGuestLanguage(savedLanguage as 'english' | 'bemba' | 'nyanja');
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    
    // Force loading to false after maximum wait time (safety net)
    const maxLoadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('AuthContext: Maximum loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 8000); // 8 second maximum wait
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Only update session if it actually changed to avoid unnecessary re-renders
        setSession(prevSession => {
          if (prevSession?.access_token === session?.access_token) {
            return prevSession; // No change, return previous session
          }
          return session;
        });
        
        if (session?.user) {
          try {
            // Fetch user profile from profiles table with timeout
            const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Query timeout')), 5000)
            );
            
            let profileResult = await Promise.race([
              profilePromise,
              timeoutPromise
            ]) as { data: any; error: any };
            
            let { data: profile, error: profileError } = profileResult;

            // If profile doesn't exist and no error, try to create it
            if (!profile && !profileError && session.user.user_metadata) {
              const { error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  first_name: session.user.user_metadata.first_name || 'User',
                  last_name: session.user.user_metadata.last_name || 'Name',
                  phone: session.user.user_metadata.phone || null,
                  preferred_language: session.user.user_metadata.preferred_language || 'english'
                });

              if (!createError) {
                const { data: newProfile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .maybeSingle();
                profile = newProfile;
              }
            }

            if (profile) {
              const userData: User = {
                id: session.user.id,
                firstName: profile.first_name || '',
                lastName: profile.last_name || '',
                email: session.user.email || '',
                phone: profile.phone || '',
                preferredLanguage: profile.preferred_language || 'english'
              };
              if (mounted) setUser(userData);
            } else if (session.user.user_metadata) {
              // Fallback to user metadata if profile doesn't exist
              const userData: User = {
                id: session.user.id,
                firstName: session.user.user_metadata.first_name || '',
                lastName: session.user.user_metadata.last_name || '',
                email: session.user.email || '',
                phone: session.user.user_metadata.phone || '',
                preferredLanguage: session.user.user_metadata.preferred_language || 'english'
              };
              if (mounted) setUser(userData);
            } else {
              // Even if no metadata, create a minimal user object
              const userData: User = {
                id: session.user.id,
                firstName: 'User',
                lastName: 'Name',
                email: session.user.email || '',
                phone: '',
                preferredLanguage: 'english'
              };
              if (mounted) setUser(userData);
            }
          } catch (error: any) {
            // Only log if it's not a timeout (timeouts are expected and handled gracefully)
            if (!error.message?.includes('timeout') && !error.message?.includes('Query timeout')) {
              console.error('Error loading user profile:', error);
            }
            // Fallback to user metadata on error
            if (session.user.user_metadata) {
              const userData: User = {
                id: session.user.id,
                firstName: session.user.user_metadata.first_name || '',
                lastName: session.user.user_metadata.last_name || '',
                email: session.user.email || '',
                phone: session.user.user_metadata.phone || '',
                preferredLanguage: session.user.user_metadata.preferred_language || 'english'
              };
              if (mounted) setUser(userData);
            } else {
              // Create minimal user even on error
              const userData: User = {
                id: session.user.id,
                firstName: 'User',
                lastName: 'Name',
                email: session.user.email || '',
                phone: '',
                preferredLanguage: 'english'
              };
              if (mounted) setUser(userData);
            }
          }
        } else {
          // Only clear user if we're sure there's no session
          // Don't clear during navigation or temporary state changes
          if (mounted) {
            if (event === 'SIGNED_OUT') {
              // User explicitly signed out
              setUser(null);
            } else if (!session) {
              // Session is null, but check if it's a real sign-out or just a temporary state
              // Wait a bit and double-check before clearing
              setTimeout(async () => {
                if (!mounted) return;
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (!currentSession && mounted) {
                  // Really no session, clear user
                  setUser(null);
                }
                // If session exists, don't clear - it was just a temporary state change
              }, 500);
            }
          }
        }
        
        if (mounted) {
          setLoading(false);
          clearTimeout(maxLoadingTimeout);
        }
      }
    );

    // Check for existing session with timeout
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout')), 5000)
    );
    
    Promise.race([sessionPromise, timeoutPromise])
      .then((result: any) => {
        if (!mounted) return;
        if (result && result.data) {
          const { data: { session } } = result;
          setSession(session);
          if (!session) {
            setLoading(false);
            clearTimeout(maxLoadingTimeout);
          }
          // Note: If session exists, loading will be set to false in onAuthStateChange
        } else {
          setLoading(false);
          clearTimeout(maxLoadingTimeout);
        }
      })
      .catch((error) => {
        // Only log if it's not a timeout (timeouts are expected and handled gracefully)
        if (!error.message?.includes('timeout') && !error.message?.includes('Session timeout')) {
          console.error('Error getting session:', error);
        }
        if (mounted) {
          setLoading(false);
          clearTimeout(maxLoadingTimeout);
        }
      });

    // Load guest language
    const storedGuestLanguage = localStorage.getItem('zambus_guest_language');
    if (storedGuestLanguage) {
      setGuestLanguage(storedGuestLanguage as 'english' | 'bemba' | 'nyanja');
    }

    return () => {
      mounted = false;
      clearTimeout(maxLoadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        user,
        session,
        login, 
        register, 
        logout, 
        updateLanguage,
        guestLanguage,
        updateGuestLanguage,
        isAuthenticated: !!user,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
