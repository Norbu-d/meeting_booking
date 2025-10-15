import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, RefreshCw, Calendar, Clock, MapPin, CheckCircle, XCircle,  Search, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Header } from '@/components/layout/Header';

const API_BASE_URL = 'http://localhost:3000';

interface Meeting {
  id: string;
  purpose: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  meeting_rooms?: {
    room_name: string;
  };
  session_id: string;
  created_at: string;
  admin_remarks?: string;
  is_multi_day?: boolean;
  end_date?: string;
  all_day?: boolean;
}

interface BackendBooking {
  id: string | number;
  session_id: string | number;
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  admin_remarks?: string;
  is_multi_day?: boolean;
  end_date?: string;
  all_day?: boolean;
  meeting_rooms?: {
    id: number;
    room_name: string;
  };
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const transformBookingData = (backendBooking: BackendBooking): Meeting => {
    return {
      id: backendBooking.id.toString(),
      purpose: backendBooking.purpose || 'Meeting',
      description: backendBooking.description,
      date: backendBooking.date,
      start_time: backendBooking.start_time,
      end_time: backendBooking.end_time,
      status: backendBooking.status,
      session_id: backendBooking.session_id.toString(),
      created_at: backendBooking.created_at,
      admin_remarks: backendBooking.admin_remarks,
      is_multi_day: backendBooking.is_multi_day,
      end_date: backendBooking.end_date,
      all_day: backendBooking.all_day,
      meeting_rooms: backendBooking.meeting_rooms
    };
  };

  const formatDisplayDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "EEE, MMM d, yyyy");
  };

  const formatDisplayTime = (timeString: string) => {
    if (!timeString) return 'All Day';
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const formatDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'All Day';
    
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
  };

  const getRoomName = (meeting: Meeting): string => {
    return meeting.meeting_rooms?.room_name || `Room ${meeting.session_id}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-800 bg-green-100 border-green-200';
      case 'pending': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'rejected': return 'text-red-800 bg-red-100 border-red-200';
      case 'cancelled': return 'text-gray-800 bg-gray-100 border-gray-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const fetchBookings = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/bookings/admin/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const transformedMeetings = result.data.map(transformBookingData);
        setMeetings(transformedMeetings);
        setFilteredMeetings(transformedMeetings);
      } else {
        throw new Error(result.message || 'Failed to fetch bookings');
      }

    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setError(error.message);
      
      if (error.message.includes('Authentication failed') || error.message.includes('No authentication token')) {
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: 'approved' | 'rejected', remarks?: string) => {
    try {
      setError('');
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/bookings/admin/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          admin_remarks: remarks || `Booking ${status} by admin`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${status} booking`);
      }

      const result = await response.json();
      
      if (result.success) {
        setMeetings(prevMeetings => 
          prevMeetings.map(meeting => 
            meeting.id === bookingId 
              ? { ...meeting, status, admin_remarks: remarks || `Booking ${status} by admin` }
              : meeting
          )
        );
        
        setError(`Booking ${status} successfully!`);
        setTimeout(() => setError(''), 3000);
        
        return result;
      } else {
        throw new Error(result.message || `Failed to ${status} booking`);
      }
    } catch (error: any) {
      console.error(`Error ${status} booking:`, error);
      setError(error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    let filtered = meetings;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(meeting => {
        const sessionIdString = meeting.session_id.toString().toLowerCase();
        const roomName = getRoomName(meeting).toLowerCase();
        const purpose = meeting.purpose.toLowerCase();
        const description = meeting.description ? meeting.description.toLowerCase() : '';
        
        return (
          purpose.includes(searchLower) ||
          description.includes(searchLower) ||
          roomName.includes(searchLower) ||
          sessionIdString.includes(searchLower)
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(meeting => meeting.status === statusFilter);
    }

    if (roomFilter !== 'all') {
      filtered = filtered.filter(meeting => getRoomName(meeting) === roomFilter);
    }

    setFilteredMeetings(filtered);
  }, [meetings, searchTerm, statusFilter, roomFilter]);

  const pendingCount = meetings.filter(m => m.status === 'pending').length;
  const approvedCount = meetings.filter(m => m.status === 'approved').length;
  const rejectedCount = meetings.filter(m => m.status === 'rejected').length;
  const rooms = Array.from(new Set(meetings.map(m => getRoomName(m))));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <Header />
      
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section - Mobile Optimized */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(-1)}
                className="h-10 px-3"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchBookings(true)} 
                disabled={refreshing}
                className="h-10 px-3"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
            
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                Review and manage meeting room bookings
              </p>
            </div>
          </div>

          {error && (
            <Alert variant={error.includes('successfully') ? "default" : "destructive"} className="mb-6">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Overview - Mobile Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4 sm:gap-4">
            <Card className="border-blue-100 bg-white/70 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">{pendingCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-100 bg-white/70 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Approved</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{approvedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-red-100 bg-white/70 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-red-100">
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Rejected</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">{rejectedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-blue-100 bg-white/70 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{meetings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters - Mobile Optimized */}
          <Card className="mb-6 border-blue-100 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-4">
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search bookings..." 
                  className="pl-10 bg-white text-sm h-12"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter Toggle for Mobile */}
              <div className="sm:hidden">
                <Button
                  variant="outline"
                  className="w-full justify-center h-12"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters {showFilters ? '▲' : '▼'}
                </Button>
              </div>

              {/* Filters - Collapsible on Mobile */}
              <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
                <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-white h-12 text-sm">
                      <SelectValue placeholder="Filter by status" />
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
                    <SelectTrigger className="bg-white h-12 text-sm">
                      <SelectValue placeholder="Filter by room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {rooms.map(room => (
                        <SelectItem key={room} value={room}>{room}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meetings List - Mobile Optimized */}
          <div className="space-y-4">
            {filteredMeetings.length === 0 ? (
              <Card className="text-center py-8 sm:py-12">
                <CardContent>
                  <Calendar className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    {meetings.length === 0 ? 'No bookings found' : 'No matching bookings'}
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {meetings.length === 0 
                      ? "No meeting bookings have been submitted yet."
                      : "Try adjusting your search or filters."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMeetings.map((meeting) => (
                <Card 
                  key={meeting.id} 
                  className="overflow-hidden transition-all hover:shadow-lg border-l-4"
                  style={{
                    borderLeftColor: meeting.status === 'approved' ? '#10b981' : 
                                  meeting.status === 'pending' ? '#f59e0b' : 
                                  meeting.status === 'rejected' ? '#ef4444' : '#6b7280'
                  }}
                >
                  <CardContent className="p-4 sm:p-6">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                      <h3 className="font-semibold text-lg sm:text-xl text-gray-900 break-words">
                        {meeting.purpose}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge 
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-xs"
                        >
                          {getRoomName(meeting)}
                        </Badge>
                        <Badge className={`${getStatusColor(meeting.status)} text-xs`}>
                          {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Description */}
                    {meeting.description && (
                      <div className="mb-4">
                        <p className="text-gray-700 text-sm leading-relaxed break-words">
                          {meeting.description}
                        </p>
                      </div>
                    )}
                    
                    {/* Meeting Details - Stacked on Mobile */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-start text-gray-700">
                        <Calendar className="h-4 w-4 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                        <span className="text-sm break-words">
                          {formatDisplayDate(meeting.date)}
                          {meeting.is_multi_day && meeting.end_date && (
                            <span className="text-gray-500 ml-1">
                              to {formatDisplayDate(meeting.end_date)}
                            </span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-start text-gray-700">
                        <Clock className="h-4 w-4 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                        <span className="text-sm break-words">
                          {meeting.all_day ? 'All Day' : (
                            <>
                              {formatDisplayTime(meeting.start_time)} 
                              {meeting.end_time && ` - ${formatDisplayTime(meeting.end_time)}`}
                              {meeting.start_time && meeting.end_time && (
                                <span className="text-gray-500 ml-1 block sm:inline">
                                  ({formatDuration(meeting.start_time, meeting.end_time)})
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-700">
                        <MapPin className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                        <span className="text-blue-600 font-medium text-sm">
                          {getRoomName(meeting)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Section */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="text-xs text-gray-500">
                        <div>Requested by: <span className="font-medium">{meeting.session_id}</span></div>
                        <div>Created: {format(new Date(meeting.created_at), "MMM d, yyyy 'at' h:mm a")}</div>
                      </div>

                      {meeting.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateBookingStatus(meeting.id, 'approved')}
                            className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none text-xs h-9"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateBookingStatus(meeting.id, 'rejected')}
                            className="flex-1 sm:flex-none text-xs h-9"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Admin Remarks */}
                    {meeting.admin_remarks && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 break-words">
                          <span className="font-medium">Admin Remarks: </span>
                          {meeting.admin_remarks}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;