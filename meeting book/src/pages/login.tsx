import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import logo from "../assets/Ricb.png";
import { useNavigate } from "react-router-dom";

// API configuration
const API_BASE_URL = 'http://localhost:3000';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.username.trim() || !formData.password.trim()) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      console.log('Making login request to:', `${API_BASE_URL}/api/auth/login`);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password.trim()
        })
      });

      console.log('Response status:', response.status);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Login API response:', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        // Store token and user info
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        const welcomeMessage = `Login successful! Welcome ${result.user.username}${result.user.isAdmin ? ' (Admin)' : ''}`;
        setSuccess(welcomeMessage);
        
        setFormData({ username: '', password: '' });
        
        console.log('Login successful:', result);
        console.log('User isAdmin:', result.user.isAdmin);
        
        // Redirect based on user role after 1 second
        setTimeout(() => {
          if (result.user.isAdmin) {
            console.log('Redirecting admin to /admin...');
            navigate('/admin');
          } else {
            console.log('Redirecting regular user to /user-home...');
            navigate('/user-home');
          }
        }, 1000);
        
      } else {
        setError(result.message || 'Login failed');
      }
      
    } catch (error: any) {
      console.error('Login error details:', error);
      if (error.message.includes('Failed to fetch')) {
        setError(`Cannot connect to server at ${API_BASE_URL}. Please check:
        • Backend server is running on port 3000
        • No CORS issues
        • Network connectivity`);
      } else if (error.message.includes('non-JSON response')) {
        setError('Server returned unexpected response. Please check backend logs.');
      } else {
        setError(error.message || 'Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#1c2d56' }}>
      <div className="max-w-md w-full space-y-8">
        {/* Login Form Card with Enhanced White Background */}
        <div className="flex justify-center">
          <Card className="p-8 shadow-2xl rounded-2xl border-0 bg-white w-full max-w-md ring-4 ring-white/20 backdrop-blur-sm" style={{ backgroundColor: '#ffffff' }}>
            {/* Logo inside the card */}
            <div className="text-center mb-8">
              <div className="mx-auto w-24 h-24 mb-4">
                <img 
                  src={logo} 
                  alt="RICB Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-1">Board Room / Training Hall Booking System</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Success Alert */}
              {success && (
                <Alert className="border-green-200 bg-green-50 animate-fade-in shadow-sm">
                  <AlertDescription className="text-green-700 font-medium">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {error && (
                <Alert className="border-red-200 bg-red-50 animate-fade-in shadow-sm">
                  <AlertDescription className="text-red-700 font-medium">
                    {error.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-800 font-medium text-sm">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your login ID"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                  className="h-12 rounded-lg border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-800 font-medium text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                    className="h-12 rounded-lg pr-12 border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-700 space-y-1">
              <p>Having trouble signing in? Contact your system administrator.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}