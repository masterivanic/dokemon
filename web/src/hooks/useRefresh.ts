import { getCookie, setCookie } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function useRefresh(initialInterval = 60) {
  const [refreshInterval, setRefreshInterval] = useState<number>(initialInterval);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const savedInterval = getCookie('refreshInterval');
    if (savedInterval) {
      setRefreshInterval(parseInt(savedInterval));
    }
  }, []);

  useEffect(() => {
    setCookie('refreshInterval', refreshInterval.toString());
  }, [refreshInterval]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (refreshInterval > 0) {
      intervalId = setInterval(() => setCurrentTime(Date.now()), 1000);
    }
    return () => intervalId && clearInterval(intervalId);
  }, [refreshInterval]);

  const secondsSinceLastRefresh = Math.floor((currentTime - lastRefreshTime) / 1000);

  return {
    refreshInterval,
    setRefreshInterval,
    setLastRefreshTime,
    currentTime,
    secondsSinceLastRefresh,
    setCurrentTime
  };
}
