import { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/api';

// Hook complementario para funcionalidades específicas de auth
// que no están en el AuthContext
export const useAuthData = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const user = await getCurrentUser();
          setUserData(user);
        }
      } catch (err) {
        setError('Error cargando datos de usuario');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  return {
    userData,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      const loadUserData = async () => {
        try {
          const user = await getCurrentUser();
          setUserData(user);
        } catch (err) {
          setError('Error cargando datos de usuario');
        } finally {
          setLoading(false);
        }
      };
      loadUserData();
    }
  };
};