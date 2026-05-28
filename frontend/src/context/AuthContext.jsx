import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('easytrip_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and check JWT on boot
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          setUser(res.data);
        } catch (err) {
          console.error('Session restore failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (emailOrUsername, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { emailOrUsername, password });
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('easytrip_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setLoading(false);
      return false;
    }
  };

  const signup = async (username, email, password, bikeModel, licensePlate, experienceLevel) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/signup', {
        username,
        email,
        password,
        bikeModel,
        licensePlate,
        experienceLevel,
      });
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('easytrip_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('easytrip_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await api.put('/auth/profile', profileData);
      setUser((prev) => ({
        ...prev,
        profileImage: res.data.profileImage,
        riderDetails: res.data.riderDetails,
      }));
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        signup,
        logout,
        updateProfile,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
