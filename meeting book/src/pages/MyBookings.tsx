import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { format } from "date-fns"
import { Calendar, Clock, MapPin, Plus, Search,  RefreshCw, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Booking {
  id: number;
  purpose: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  meeting_rooms?: {
    room_name: string;
  };
  room_name?: string;
  created_at: string;
  remarks?: string;
  is_multi_day?: boolean;
  end_date?: string;
  all_day?: boolean;
}

// Skeleton Loading Component
const BookingSkeleton = () => (
  <Card className="overflow-hidden animate-pulse">
    <CardContent className="p-4 sm:p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-16 sm:w-20"></div>
          <div className="h-6 bg-gray-200 rounded w-20 sm:w-24"></div>
        </div>
      </div>
      <div className="mb-4">
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    </CardContent>
  </Card>
);

export function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [error, setError] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:3000';

  const getAuthToken = (): string => {
    return localStorage.getItem('authToken') || '';
  };

  // Memoized date formatting functions
  const formatDisplayDate = useCallback((dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, "EEE, MMM d, yyyy");
    } catch (error) {
      return dateString;
    }
  }, []);

  const formatDisplayTime = useCallback((timeString: string) => {
    if (!timeString) return 'All Day';
    
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const displayMinutes = minutes.toString().padStart(2, '0');
      
      return `${displayHours}:${displayMinutes} ${period}`;
    } catch (error) {
      return timeString;
    }
  }, []);

  // Memoized helper functions
  const getRoomName = useCallback((booking: Booking): string => {
    return booking.meeting_rooms?.room_name || booking.room_name || 'Unknown Room';
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'approved': return 'text-green-800 bg-green-100 border-green-200';
      case 'pending': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'rejected': return 'text-red-800 bg-red-100 border-red-200';
      case 'cancelled': return 'text-gray-800 bg-gray-100 border-gray-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  }, []);

  const formatTime = useCallback((timeString: string) => {
    return formatDisplayTime(timeString);
  }, [formatDisplayTime]);

  const formatDuration = useCallback((startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'All Day';
    
    try {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;
      const durationMins = endTotalMinutes - startTotalMinutes;
      
      if (durationMins < 60) return `${durationMins} min`;
      if (durationMins === 60) return '1 hour';
      const hours = Math.floor(durationMins / 60);
      const remainingMins = durationMins % 60;
      if (remainingMins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
      return `${hours}h ${remainingMins}m`;
    } catch (error) {
      return 'Duration unknown';
    }
  }, []);

  // Memoized unique rooms calculation
  const uniqueRooms = useMemo(() => {
    const rooms = bookings.map(booking => getRoomName(booking));
    return [...new Set(rooms)].filter(room => room !== 'Unknown Room').sort();
  }, [bookings, getRoomName]);

  // Main fetch function with caching and retry logic
  const fetchMyBookings = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes cache
    
    // Return cached data if it's fresh and not forced refresh
    if (!forceRefresh && now - lastFetchTime < fiveMinutes && bookings.length > 0) {
      setLoading(false);
      return;
    }

    const isRefreshing = !loading;
    if (isRefreshing) setRefreshing(true);
    
    setLoading(true);
    setError("");
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_BASE_URL}/api/bookings/my-bookings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // More specific error handling
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          throw new Error('Authentication failed. Please login again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view these bookings.');
        } else if (response.status === 404) {
          throw new Error('Bookings endpoint not found.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Improved response handling
      if (result.success) {
        // Handle various response formats more robustly
        let bookingsData: Booking[] = [];
        
        if (Array.isArray(result.data)) {
          bookingsData = result.data;
        } else if (result.data && Array.isArray(result.data.all)) {
          bookingsData = result.data.all;
        } else if (result.data && Array.isArray(result.data.bookings)) {
          bookingsData = result.data.bookings;
        } else if (Array.isArray(result.bookings)) {
          bookingsData = result.bookings;
        }
        
        // Sort bookings by date (newest first)
        bookingsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Cache the successful fetch
        setLastFetchTime(now);
        setRetryCount(0);
        
        setBookings(bookingsData);
        setFilteredBookings(bookingsData);
      } else {
        throw new Error(result.message || 'Failed to fetch bookings');
      }
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      
      // Retry logic for transient errors
      if (retryCount < 3 && !error.message.includes('Authentication')) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchMyBookings(true);
        }, 2000 * retryCount); // Exponential backoff
        return;
      }
      
      // More specific error messages
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (error.message.includes('Failed to fetch')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(error.message || 'Failed to load your bookings. Please try again.');
      }
      
      setBookings([]);
      setFilteredBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookings.length, lastFetchTime, loading, retryCount]);

  // Initial load
  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  // Debounced filtering with useMemo
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);
    
    // Set new timeout for search
    const timeout = setTimeout(() => {
      filterBookings();
    }, 300); // 300ms debounce
    
    setSearchTimeout(timeout);
    
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTerm, statusFilter, roomFilter, bookings]);

  // Separate filtering function
  const filterBookings = useCallback(() => {
    let filtered = bookings;

    // Early return if no filters applied
    if (searchTerm === "" && statusFilter === "all" && roomFilter === "all") {
      setFilteredBookings(bookings);
      return;
    }

    // Filter by search term (optimized with early returns)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.purpose.toLowerCase().includes(term) ||
        (booking.description?.toLowerCase() || '').includes(term) ||
        getRoomName(booking).toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Filter by room
    if (roomFilter !== "all") {
      const room = roomFilter.toLowerCase();
      filtered = filtered.filter(booking => 
        getRoomName(booking).toLowerCase().includes(room)
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter, roomFilter, getRoomName]);

  // Show skeleton loading for initial load
  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30">
        <Header />
        <main className="flex-grow container mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            {/* Skeleton Header */}
            <div className="flex flex-col justify-between items-start mb-6 sm:mb-8 gap-4">
              <div className="w-full">
                <div className="h-7 sm:h-8 bg-gray-200 rounded w-48 sm:w-64 mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-24 sm:w-32"></div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="h-9 sm:h-10 bg-gray-200 rounded flex-1 sm:flex-none sm:w-24"></div>
                <div className="h-9 sm:h-10 bg-gray-200 rounded flex-1 sm:flex-none sm:w-32"></div>
              </div>
            </div>

            {/* Skeleton Filters */}
            <div className="h-16 sm:h-20 bg-gray-200 rounded mb-4 sm:mb-6"></div>

            {/* Skeleton Bookings */}
            <div className="grid gap-3 sm:gap-4">
              {[...Array(3)].map((_, i) => (
                <BookingSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30">
      <Header />
      <main className="flex-grow container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col justify-between items-start mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                My Bookings
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
                {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
                {filteredBookings.length !== bookings.length && ` (${filteredBookings.length} filtered)`}
                {refreshing && ' • Refreshing...'}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => fetchMyBookings(true)}
                disabled={refreshing}
                className="flex items-center gap-2 flex-1 sm:flex-none"
                size="sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-1 sm:flex-none"
                onClick={() => navigate('/book')}
                size="sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">New Booking</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4 sm:mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {error}
                {error.includes('Authentication') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-2 mt-1 sm:mt-0"
                    onClick={() => navigate('/login')}
                  >
                    Login Again
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Filters and Search */}
          <Card className="mb-4 sm:mb-6 border-blue-100 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search bookings..." 
                    className="pl-10 bg-white text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full bg-white text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={roomFilter} onValueChange={setRoomFilter}>
                    <SelectTrigger className="w-full bg-white text-sm">
                      <SelectValue placeholder="Room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {uniqueRooms.map(room => (
                        <SelectItem key={room} value={room}>{room}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bookings List */}
          <div className="grid gap-3 sm:gap-4">
            {filteredBookings.length === 0 ? (
              <Card className="text-center py-8 sm:py-12">
                <CardContent className="px-4 sm:px-6">
                  <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    {bookings.length === 0 ? 'No bookings found' : 'No matching bookings'}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    {bookings.length === 0 
                      ? "You haven't made any bookings yet. Start by creating your first booking!"
                      : "Try adjusting your search or filters to find what you're looking for."
                    }
                  </p>
                  {bookings.length === 0 && (
                    <Button 
                      onClick={() => navigate('/book')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Booking
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredBookings.map((booking) => (
                <Card 
                  key={booking.id} 
                  className="overflow-hidden transition-all hover:shadow-lg border-l-4"
                  style={{
                    borderLeftColor: booking.status === 'approved' ? '#10b981' : 
                                   booking.status === 'pending' ? '#f59e0b' : 
                                   booking.status === 'rejected' ? '#ef4444' : '#6b7280'
                  }}
                >
                  <CardContent className="p-0">
                    <div className="p-4 sm:p-6">
                      {/* Header with purpose and badges */}
                      <div className="flex flex-col gap-3 mb-4">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-semibold text-lg sm:text-xl text-gray-900 break-words flex-1">
                            {booking.purpose}
                          </h3>
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                            <Badge 
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-xs"
                            >
                              {getRoomName(booking)}
                            </Badge>
                            <Badge 
                              className={`text-xs ${getStatusColor(booking.status)}`}
                            >
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Description Display */}
                      {booking.description && (
                        <div className="mb-4">
                          <p className="text-gray-700 text-sm leading-relaxed break-words">
                            {booking.description}
                          </p>
                        </div>
                      )}
                      
                      {/* Booking Details */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                        <div className="flex items-start text-gray-700">
                          <Calendar className="h-4 w-4 mr-2 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm break-words">
                            {formatDisplayDate(booking.date)}
                            {booking.is_multi_day && booking.end_date && (
                              <span className="block text-xs text-gray-500 mt-1">
                                to {formatDisplayDate(booking.end_date)}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-start text-gray-700">
                          <Clock className="h-4 w-4 mr-2 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm break-words">
                            {booking.all_day ? 'All Day' : (
                              <>
                                {formatTime(booking.start_time)} 
                                {booking.end_time && ` - ${formatTime(booking.end_time)}`}
                                {booking.start_time && booking.end_time && (
                                  <span className="block text-xs text-gray-500 mt-1">
                                    ({formatDuration(booking.start_time, booking.end_time)})
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex items-start text-gray-700">
                          <MapPin className="h-4 w-4 mr-2 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-blue-600 font-medium break-words">
                            {getRoomName(booking)}
                          </span>
                        </div>
                      </div>

                      {/* Remarks */}
                      {booking.remarks && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 break-words">
                            <span className="font-medium">Remarks: </span>
                            {booking.remarks}
                          </p>
                        </div>
                      )}

                      {/* Created Date */}
                      <div className="mt-3 text-xs text-gray-500">
                        Created: {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}