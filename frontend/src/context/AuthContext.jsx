import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService, profileService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('dt_token');
      const storedUser = localStorage.getItem('dt_current_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          
          // Fetch the profile for the logged in user
          const userProfile = await profileService.getProfile(parsedUser.id);
          setProfile(userProfile);
        } catch (err) {
          console.error('Failed to restore authentication session', err);
          // Token expired or invalid
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const authData = await authService.login(email, password);
      setToken(authData.token);
      
      const loggedInUser = {
        id: authData.id,
        username: authData.username,
        email: authData.email
      };
      setUser(loggedInUser);

      // Fetch user profile
      const userProfile = await profileService.getProfile(authData.id);
      setProfile(userProfile);
      return { user: loggedInUser, profile: userProfile };
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
      throw err;
    }
  };

  const register = async (username, email, password) => {
    setError(null);
    try {
      await authService.register(username, email, password);
      // Automatically log in user after registration
      return await login(email, password);
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setProfile(null);
    setToken(null);
    setError(null);
  };

  const updateProfile = async (profileData) => {
    setError(null);
    try {
      // Ensure current user ID is tied to the profile
      const updatedProfile = await profileService.saveProfile({
        ...profileData,
        userId: user.id
      });
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
      throw err;
    }
  };

  const loginGoogle = async (idToken) => {
    setError(null);
    try {
      const authData = await authService.loginGoogle(idToken);
      setToken(authData.token);
      const loggedInUser = {
        id: authData.id,
        username: authData.username,
        email: authData.email
      };
      setUser(loggedInUser);
      const userProfile = await profileService.getProfile(authData.id);
      setProfile(userProfile);
      return { user: loggedInUser, profile: userProfile };
    } catch (err) {
      setError(err.message || 'Google login failed.');
      throw err;
    }
  };

  const loginGithub = async (code) => {
    setError(null);
    try {
      const authData = await authService.loginGithub(code);
      setToken(authData.token);
      const loggedInUser = {
        id: authData.id,
        username: authData.username,
        email: authData.email
      };
      setUser(loggedInUser);
      const userProfile = await profileService.getProfile(authData.id);
      setProfile(userProfile);
      return { user: loggedInUser, profile: userProfile };
    } catch (err) {
      setError(err.message || 'GitHub login failed.');
      throw err;
    }
  };

  const value = {
    user,
    profile,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    updateProfile,
    loginGoogle,
    loginGithub,
    clearError: () => setError(null)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
