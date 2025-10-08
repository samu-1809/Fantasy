import { useState, useEffect } from 'react';

export const useLocalStorage = (key, initialValue) => {
  // Estado para almacenar nuestro valor
  // Pasar la función de estado inicial a useState para que la lógica solo se ejecute una vez
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Obtener del localStorage por key
      const item = window.localStorage.getItem(key);
      // Parsear el JSON almacenado o devolver initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Si hay error, devolver initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Devolver una versión envuelta de la función setter de useState que...
  // ... persiste el nuevo valor en localStorage.
  const setValue = (value) => {
    try {
      // Permitir que el valor sea una función para tener la misma API que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Guardar estado
      setStoredValue(valueToStore);
      // Guardar en localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

// Hook específico para tokens
export const useAuthTokens = () => {
  const [accessToken, setAccessToken] = useLocalStorage('access_token', null);
  const [refreshToken, setRefreshToken] = useLocalStorage('refresh_token', null);

  const setTokens = (access, refresh) => {
    setAccessToken(access);
    setRefreshToken(refresh);
  };

  const clearTokens = () => {
    setAccessToken(null);
    setRefreshToken(null);
  };

  return {
    accessToken,
    refreshToken,
    setTokens,
    clearTokens,
    isAuthenticated: !!accessToken
  };
};