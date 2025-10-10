// hooks/useRefresh.js
import { useState } from 'react';

export const useRefresh = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return {
    refreshKey,
    refresh
  };
};