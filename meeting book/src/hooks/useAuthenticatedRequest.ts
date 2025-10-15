import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

// Utility function to check if token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true;
  }
};

// Enhanced logout function
const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

export const useAuthenticatedRequest = () => {
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    clearAuthData();
    navigate('/');
  }, [navigate]);

  const makeRequest = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response | null> => {
    const token = localStorage.getItem('authToken');
    
    // Check if token exists and is not expired
    if (!token || isTokenExpired(token)) {
      console.log('Token missing or expired, logging out...');
      handleLogout();
      return null;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // If server returns 401 (Unauthorized), the token is invalid
      if (response.status === 401) {
        console.log('Server rejected token (401), logging out...');
        handleLogout();
        return null;
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }, [handleLogout]);

  const get = useCallback((url: string, options?: RequestInit) => {
    return makeRequest(url, { ...options, method: 'GET' });
  }, [makeRequest]);

  const post = useCallback((url: string, data?: any, options?: RequestInit) => {
    return makeRequest(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [makeRequest]);

  const put = useCallback((url: string, data?: any, options?: RequestInit) => {
    return makeRequest(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [makeRequest]);

  const del = useCallback((url: string, options?: RequestInit) => {
    return makeRequest(url, { ...options, method: 'DELETE' });
  }, [makeRequest]);

  return {
    makeRequest,
    get,
    post,
    put,
    delete: del,
  };
};