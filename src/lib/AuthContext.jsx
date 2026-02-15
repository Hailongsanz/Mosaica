import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthChange, getCurrentUserAsync, getCurrentUser, logout as firebaseLogout } from '@/firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);
      console.log('checkAppState: Fetching current user...');
      const currentUser = await getCurrentUserAsync();
      
      console.log('checkAppState: Got user:', currentUser);
      console.log('checkAppState: User photoURL:', currentUser?.photoURL);
      console.log('checkAppState: User profile_picture:', currentUser?.profile_picture);
      
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        console.log('checkAppState: User state updated');
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log('checkAppState: No user found');
      }
    } catch (error) {
      console.error('Auth state check failed:', error);
      setAuthError({
        type: 'auth_error',
        message: error instanceof Error ? error.message : 'Failed to check authentication',
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const refreshUser = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
    }
  };

  const updateUserField = (fieldOrFields, value) => {
    console.log('updateUserField called:', fieldOrFields, value);
    if (user) {
      if (typeof fieldOrFields === 'object') {
        // Multiple fields passed as object
        const updatedUser = { ...user, ...fieldOrFields };
        console.log('Updated user object (multiple fields):', updatedUser);
        setUser(updatedUser);
      } else {
        // Single field
        const updatedUser = { ...user, [fieldOrFields]: value };
        console.log('Updated user object (single field):', updatedUser);
        setUser(updatedUser);
      }
    } else {
      console.log('No user to update');
    }
  };

  // Listen for real-time auth changes
  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser);
      setIsAuthenticated(!!authUser);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await firebaseLogout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      setAuthError({
        type: 'logout_error',
        message: 'Failed to logout',
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      checkAppState,
      refreshUser,
      updateUserField
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
