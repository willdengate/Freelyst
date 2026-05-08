import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(formatUser(session.user)); setIsAuthenticated(true); }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(formatUser(session.user)); setIsAuthenticated(true); }
      else { setUser(null); setIsAuthenticated(false); }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const formatUser = (u) => ({
    id: u.id, email: u.email,
    full_name: u.user_metadata?.full_name ?? '',
    avatar_url: u.user_metadata?.avatar_url ?? '',
    profile_picture: u.user_metadata?.profile_picture ?? '',
  });

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth,
      isLoadingPublicSettings: false, authError: null,
      appPublicSettings: null, authChecked, logout,
      navigateToLogin: () => {}, checkUserAuth: async () => {}, checkAppState: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
