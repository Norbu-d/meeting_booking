import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import logo from "@/assets/logo.jpg"

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

export function Header() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [homeRoute, setHomeRoute] = useState("/user-home")

  useEffect(() => {
    const checkAuthAndSetUserData = () => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      
      // Check if token exists and is not expired
      if (!token || isTokenExpired(token)) {
        console.log('Token missing or expired, logging out...');
        clearAuthData();
        navigate('/');
        return;
      }

      if (user) {
        try {
          const userData = JSON.parse(user)
          setIsAdmin(userData.isAdmin || false)
          setHomeRoute(userData.isAdmin ? '/home' : '/user-home')
        } catch (error) {
          console.error('Error parsing user data:', error)
          clearAuthData();
          navigate('/');
        }
      } else {
        // No user data but token exists - this shouldn't happen
        clearAuthData();
        navigate('/');
      }
    };

    checkAuthAndSetUserData();

    // Optional: Set up an interval to periodically check token expiry
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem('authToken');
      if (token && isTokenExpired(token)) {
        console.log('Token expired during session, logging out...');
        clearAuthData();
        navigate('/');
      }
    }, 60000); // Check every minute

    return () => clearInterval(tokenCheckInterval);
  }, [navigate])

  const handleLogout = () => {
    // Clear authentication data
    clearAuthData();
    
    // Redirect to login page
    navigate('/')
  }



  return (
    <header className="bg-white shadow-sm border-b">
      {/* Desktop and Tablet Header */}
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo and Brand */}
        <Link to={isAdmin ? "/book/admin" : homeRoute} className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src={logo} 
              alt="RICB Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-base sm:text-xl font-bold text-primary hidden xs:block">
            RICB Booking
          </span>
        </Link>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-6 lg:space-x-8">
            <Link 
              to={isAdmin ? "/book/admin" : homeRoute}
              className="hover:text-primary transition-colors font-medium text-gray-700 hover:text-blue-600"
            >
              Home
            </Link>
            <Link 
              to="/book" 
              className="hover:text-primary transition-colors font-medium text-gray-700 hover:text-blue-600"
            >
              Book Meeting
            </Link>
            <Link 
              to="/my-bookings" 
              className="hover:text-primary transition-colors font-medium text-gray-700 hover:text-blue-600"
            >
              My Bookings
            </Link>
          </div>
        </nav>

        {/* User Avatar Dropdown */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src="/avatars/default.png" alt="User" />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                    {isAdmin ? 'A' : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem className="cursor-pointer">
                <Link to="/my-bookings" className="w-full flex items-center">
                  My Bookings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                onClick={handleLogout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="grid grid-cols-3 h-16">
          <Link 
            to={isAdmin ? "/book/admin" : homeRoute}
            className="flex flex-col items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all active:bg-blue-100"
          >
            <span className="text-2xl mb-1">🏠</span>
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link 
            to="/book" 
            className="flex flex-col items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all active:bg-blue-100"
          >
            <span className="text-2xl mb-1">📅</span>
            <span className="text-xs font-medium">Book</span>
          </Link>
          <Link 
            to="/my-bookings" 
            className="flex flex-col items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all active:bg-blue-100"
          >
            <span className="text-2xl mb-1">📋</span>
            <span className="text-xs font-medium">Bookings</span>
          </Link>
        </div>
      </div>
    </header>
  )
}