import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('easytrip_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and check JWT on boot
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        if (token.startsWith('guest:')) {
          const parts = token.split(':');
          const userId = parts[1];
          const username = parts[2];
          const bikeModel = parts[3] || '';
          const experienceLevel = parts[4] || 'Beginner';
          setUser({
            id: userId,
            username,
            riderDetails: {
              bikeModel,
              experienceLevel,
              batteryPercentage: 100,
              speed: 0,
            },
          });
        } else {
          try {
            const res = await api.get('/auth/profile');
            setUser(res.data);
          } catch (err) {
            console.error('Session restore failed:', err.message);
            logout();
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const enterAsGuest = (username, bikeModel = '', experienceLevel = 'Beginner') => {
    setLoading(true);
    const userId = 'rider_' + Math.random().toString(36).substring(2, 9);
    const guestToken = `guest:${userId}:${username}:${bikeModel}:${experienceLevel}`;
    sessionStorage.setItem('easytrip_token', guestToken);
    setToken(guestToken);
    setUser({
      id: userId,
      username,
      riderDetails: {
        bikeModel,
        experienceLevel,
        batteryPercentage: 100,
        speed: 0,
      },
    });
    setLoading(false);
    return true;
  };

  const login = async (emailOrUsername, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { emailOrUsername, password });
      const { token: receivedToken, user: receivedUser } = res.data;

      sessionStorage.setItem('easytrip_token', receivedToken);
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

      sessionStorage.setItem('easytrip_token', receivedToken);
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
    sessionStorage.removeItem('easytrip_token');
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
        enterAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
