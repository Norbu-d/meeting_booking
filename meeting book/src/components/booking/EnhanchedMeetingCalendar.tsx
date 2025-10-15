"use client"

import { useState, useEffect } from 'react';
import { MeetingDialog } from './MeetingDialog';
import { BookingForm } from './BookingForm';
import { CalendarGrid } from './CalendarGrid';
import { CalendarLegend } from './CalendarLegend';
import type { Meeting, MeetingsData } from './types';
import { 
  formatDate, 
  calculateDurationInMinutes, 
  formatTimeToDisplay, 
  parseDateInLocalTimezone, 
} from './utils';

interface EnhancedMeetingCalendarProps {
  className?: string;
}

const API_BASE_URL = 'http://localhost:3000';

export const EnhancedMeetingCalendar = ({ className = "" }: EnhancedMeetingCalendarProps) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [meetingsData, setMeetingsData] = useState<MeetingsData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewMode = 'all';

  const getAuthToken = (): string => {
    return localStorage.getItem('authToken') || '';
  };

  const getDatesInRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const current = parseDateInLocalTimezone(startDate);
    const end = parseDateInLocalTimezone(endDate);
    
    while (current <= end) {
      const dateKey = formatDate(current);
      dates.push(dateKey);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const convertBookingToMeeting = (booking: any): Meeting => {
    const startTime = booking.start_time ? booking.start_time.substring(0, 5) : '09:00';
    const endTime = booking.end_time ? booking.end_time.substring(0, 5) : '10:00';
    const durationMinutes = booking.all_day ? 'All Day' : `${calculateDurationInMinutes(startTime, endTime)} min`;
    const time = booking.all_day ? 'All Day' : formatTimeToDisplay(startTime);

    let sessionId = 'Unknown';
    if (booking.session_id) {
      sessionId = booking.session_id.toString();
    } else if (booking.users?.id) {
      sessionId = booking.users.id.toString();
    } else {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      sessionId = userData.id || userData.userId || userData.session_id || 'Unknown';
    }

    const isMultiDay = booking.is_multi_day && booking.end_date && booking.end_date !== booking.date;
    
    return {
      id: booking.id,
      title: booking.purpose || 'Meeting',
      time,
      duration: durationMinutes,
      attendee: booking.users?.full_name || sessionId,
      description: booking.description || '',
      startTime,
      endTime,
      status: booking.status,
      bookedBy: sessionId,
      meetingRoom: booking.meeting_rooms?.room_name || 'Unknown Room',
      allDay: booking.all_day || false,
      isMyBooking: booking.session_id === sessionId,
      isMultiDay: isMultiDay,
      startDate: booking.date,
      endDate: booking.end_date,
      originalBookingId: booking.id,
      date: parseDateInLocalTimezone(booking.date)
    };
  };

  const transformBookingsData = (bookings: any[]): MeetingsData => {
    const transformedData: MeetingsData = {};
    
    bookings.forEach((booking: any) => {
      const meeting = convertBookingToMeeting(booking);
      
      if (meeting.isMultiDay && meeting.startDate && meeting.endDate) {
        const dateRange = getDatesInRange(meeting.startDate, meeting.endDate);
        
        dateRange.forEach(dateKey => {
          if (!transformedData[dateKey]) {
            transformedData[dateKey] = [];
          }
          
          const meetingForDate = {
            ...meeting,
            id: `${meeting.id}-${dateKey}`,
            date: parseDateInLocalTimezone(dateKey),
            isPartOfMultiDay: true
          };
          
          transformedData[dateKey].push(meetingForDate);
        });
      } else {
        const dateKey = booking.date;
        if (!transformedData[dateKey]) {
          transformedData[dateKey] = [];
        }
        transformedData[dateKey].push(meeting);
      }
    });
    
    return transformedData;
  };

  const fetchBookings = async () => {
    const token = getAuthToken();
    if (!token) {
      setError('No authentication token found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = `${API_BASE_URL}/api/bookings/all-bookings`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch bookings');
      }

      const result = await response.json();
      
      if (result.success) {
        const transformedData = transformBookingsData(result.data.all);
        setMeetingsData(transformedData);
      } else {
        throw new Error(result.message || 'Failed to load bookings');
      }

    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setError(error.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleDateClick = (date: Date) => {
    const dateKey = formatDate(date);
    setSelectedDate(date);
    
    const foundMeetings = meetingsData[dateKey];
    
    if (foundMeetings?.length > 0) {
      setShowMeetingDialog(true);
    } else {
      setShowBookingForm(true);
    }
  };

  const handleAddMeeting = async (meeting: Partial<Meeting>) => {
    await fetchBookings();
    setShowBookingForm(false);
    
    const targetDate = meeting.date || selectedDate;
    if (targetDate) {
      setTimeout(() => {
        const dateKey = formatDate(targetDate);
        const updatedMeetings = meetingsData[dateKey];
        if (updatedMeetings?.length > 0) {
          setShowMeetingDialog(true);
        }
      }, 100);
    }
  };

  const selectedDateMeetings = selectedDate ? meetingsData[formatDate(selectedDate)] || [] : [];

  return (
    <div className={`bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen ${className}`}>
      {/* Mobile-optimized container */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-6 lg:py-8 pb-16 lg:pb-8">
        {/* Error message - mobile optimized */}
        {error && (
          <div className="mb-3 sm:mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mx-2 sm:mx-0">
            <div className="flex items-center justify-between">
              <span className="break-words flex-1">{error}</span>
              <button 
                onClick={fetchBookings}
                className="text-red-800 hover:text-red-900 underline text-xs ml-2 flex-shrink-0"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading indicator - mobile optimized */}
        {isLoading && (
          <div className="mb-2 sm:mb-3 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs sm:text-sm mx-2 sm:mx-0">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600 mr-2 flex-shrink-0"></div>
              <span>Loading bookings...</span>
            </div>
          </div>
        )}

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-4">
          <CalendarGrid
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedDate={selectedDate}
            meetingsData={meetingsData}
            onDateClick={handleDateClick}
            viewMode={viewMode}
          />
          
          {/* Mobile Legend */}
          <div className="mx-2">
            <CalendarLegend meetingsData={meetingsData} viewMode={viewMode} />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="w-full lg:w-3/4">
            <CalendarGrid
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              selectedDate={selectedDate}
              meetingsData={meetingsData}
              onDateClick={handleDateClick}
              viewMode={viewMode}
            />
          </div>

          <div className="lg:w-1/4 space-y-6">
            <CalendarLegend meetingsData={meetingsData} viewMode={viewMode} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <MeetingDialog
        selectedDate={selectedDate}
        selectedDateMeetings={selectedDateMeetings}
        showMeetingDialog={showMeetingDialog}
        setShowMeetingDialog={setShowMeetingDialog}
        setShowBookingForm={setShowBookingForm}
        viewMode={viewMode}
      />

      <BookingForm
        selectedDate={selectedDate}
        showBookingForm={showBookingForm}
        setShowBookingForm={setShowBookingForm}
        handleAddMeeting={handleAddMeeting}
      />
    </div>
  );
};