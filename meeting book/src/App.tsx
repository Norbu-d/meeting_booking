// App.tsx - Keep your current route protection
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import UserHome from "./pages/userHome";
import BookMeeting from "./pages/BookMeeting";
import { MyBookings } from "./pages/MyBookings";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/login";
import { useEffect, useState } from "react";

// Utility functions (keep these)
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

const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

// Keep your existing ProtectedRoute and PublicRoute components
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      if (isTokenExpired(token)) {
        console.log('Token expired, logging out...');
        clearAuthData();
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);
    };

    checkAuthentication();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        setIsAuthenticated(false);
        return;
      }

      if (isTokenExpired(token)) {
        console.log('Token expired, clearing auth data...');
        clearAuthData();
        setIsAuthenticated(false);
        return;
      }

      try {
        const userData = JSON.parse(user);
        setIsAuthenticated(true);
        setRedirectPath(userData.isAdmin ? '/admin' : '/user-home');
      } catch (error) {
        console.error('Error parsing user data:', error);
        clearAuthData();
        setIsAuthenticated(false);
      }
    };

    checkAuthentication();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated && redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

// Keep your existing router configuration
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/home",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "/user-home",
    element: (
      <ProtectedRoute>
        <UserHome />
      </ProtectedRoute>
    ),
  },
  {
    path: "/book",
    element: (
      <ProtectedRoute>
        <BookMeeting />
      </ProtectedRoute>
    ),
  },
  {
    path: "/my-bookings",
    element: (
      <ProtectedRoute>
        <MyBookings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/book/admin",
    element: (
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}