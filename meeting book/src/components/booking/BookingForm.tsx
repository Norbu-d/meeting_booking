"use client"

import { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar, Clock, X, CheckCircle, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BookingFormProps, Meeting } from './types';

import { 
  generateTimeOptions, 
  formatTimeToDisplay, 
  getDaysInMonth, 
  getFirstDayOfMonth, 
  isSameDate, 
  calculateDurationInMinutes,
  formatTimeRange,
  createLocalDate,
  parseDateInLocalTimezone
} from './utils';

const API_BASE_URL = 'http://localhost:3000';

// Updated meeting rooms array to include Mini Conference
const updatedMeetingRooms = [
  'Board Room',
  'Training Hall',
  'Mini Conference',
];

// FIXED: Helper function to format date for API calls (ensures consistent YYYY-MM-DD format)
const formatDateForAPI = (date: Date) => {
  // Debug logging
  console.log('formatDateForAPI input:', {
    original: date,
    toString: date.toString(),
    toISOString: date.toISOString(),
    getFullYear: date.getFullYear(),
    getMonth: date.getMonth(),
    getDate: date.getDate()
  });

  // Force local timezone interpretation to avoid timezone shifts
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const result = `${year}-${month}-${day}`;
  
  console.log('formatDateForAPI output:', result);
  return result;
};

// Conflict Alert Dialog Component
const ConflictAlertDialog = ({ 
  conflicts, 
  isOpen, 
  onClose, 
  onTryDifferentRoom,
  onTryDifferentTime 
}: {
  conflicts: any[];
  isOpen: boolean;
  onClose: () => void;
  onTryDifferentRoom: () => void;
  onTryDifferentTime: () => void;
}) => {
  if (!conflicts || conflicts.length === 0) return null;

  const getConflictIcon = (conflictType: string) => {
    switch (conflictType) {
      case 'multi_day_block':
        return <Calendar className="h-5 w-5 text-amber-600" />;
      case 'all_day':
      case 'all_day_override':
        return <Clock className="h-5 w-5 text-red-600" />;
      case 'blocked_by_all_day':
        return <X className="h-5 w-5 text-red-600" />;
      case 'time_slot':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
  };

  const getConflictTitle = (conflictType: string) => {
    switch (conflictType) {
      case 'multi_day_block':
        return "Multi-Day Booking Conflict";
      case 'all_day':
        return "All-Day Booking Conflict";
      case 'blocked_by_all_day':
        return "Room Fully Booked";
      case 'time_slot':
        return "Time Slot Unavailable";
      default:
        return "Booking Conflict";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Booking Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The room is not available for your selected time. Please review the conflicts below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {conflicts.map((conflict, index) => (
            <div key={index} className="p-3 border rounded-lg bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                {getConflictIcon(conflict.conflict_type)}
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">
                    {getConflictTitle(conflict.conflict_type)}
                  </h4>
                  <p className="text-sm text-gray-700">{conflict.message}</p>
                  
                  {conflict.existing_booking && (
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <div>Existing booking: {conflict.existing_booking.purpose}</div>
                      {conflict.existing_booking.is_multi_day && (
                        <div>Duration: {conflict.existing_booking.date} to {conflict.existing_booking.end_date}</div>
                      )}
                      {!conflict.existing_booking.all_day && conflict.existing_booking.start_time && (
                        <div>Time: {conflict.existing_booking.start_time} - {conflict.existing_booking.end_time}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button 
            onClick={onTryDifferentTime}
            variant="outline"
            className="w-full"
          >
            Try Different Time
          </Button>
          <Button 
            onClick={onTryDifferentRoom}
            variant="default"
            className="w-full"
          >
            Try Different Room
          </Button>
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Success Dialog Component
const SuccessDialog = ({ 
  isOpen, 
  onClose, 
  message 
}: {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Success!
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-center text-gray-700">{message}</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose} variant="default">
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Error Dialog Component
const ErrorDialog = ({ 
  isOpen, 
  onClose, 
  message,
  onRetry 
}: {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  onRetry?: () => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <X className="h-5 w-5" />
            Error
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-center text-gray-700">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              Retry
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Validation Dialog Component
const ValidationDialog = ({ 
  isOpen, 
  onClose, 
  message 
}: {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Info className="h-5 w-5" />
            Validation Error
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-center text-gray-700">{message}</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose} variant="default">
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const BookingForm = ({
  selectedDate,
  showBookingForm,
  setShowBookingForm,
  handleAddMeeting
}: BookingFormProps) => {
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
   title: '',
  description: '',
  start_time: '09:00', // Changed from startTime
  end_time: '10:00',   // Changed from endTime
  duration: '60 min',
  meetingRoom: 'Board Room'
});
  const [isLoading, setIsLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const timeOptions = generateTimeOptions();
  const filteredEndTimeOptions = timeOptions.filter(
    time => time > (newMeeting.startTime || '00:00')
  );

  // Calculate duration whenever start or end time changes
  const durationInMinutes = calculateDurationInMinutes(newMeeting.startTime || '09:00', newMeeting.endTime || '10:00');
  const timeRangeDisplay = formatTimeRange(newMeeting.startTime || '09:00', newMeeting.endTime || '10:00');

  // Map meeting room names to room IDs - updated to include Mini Conference
  const roomNameToIdMap: { [key: string]: number } = {
    'Board Room': 1,
    'Mini Conference': 3,
    'Training Hall': 2,
  };

  const getAuthToken = (): string => {
    return localStorage.getItem('authToken') || '';
  };

  const validateDateRange = (dates: Date[]): string | null => {
    if (dates.length === 0) return null;
    
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const endDate = sortedDates[sortedDates.length - 1];
    
    // Get today's date at midnight for proper comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if any date is in the past (before today)
    const pastDates = sortedDates.filter(date => date < today);
    if (pastDates.length > 0) {
      return 'Cannot book dates in the past';
    }
    
    // Check if end date is within reasonable range (e.g., 90 days)
    const maxDays = 90;
    const totalDaysRange = (endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
    if (totalDaysRange > maxDays) {
      return `Booking cannot exceed ${maxDays} days in the future`;
    }
    
    return null;
  };

  // FIXED: Create backend booking with consistent date handling
  const createBackendBooking = async (meetingData: any) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    // For multi-day bookings: Create ONE multi-day booking with start_date and end_date
    const isMultiDay = isAllDay && selectedDates.length > 1;
    
    if (isMultiDay) {
      // Create ONE multi-day booking
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      // FIXED: Ensure dates are formatted consistently without timezone shifts
      const formattedStartDate = formatDateForAPI(startDate);
      const formattedEndDate = formatDateForAPI(endDate);

      const bookingPayload = {
        room_id: roomNameToIdMap[meetingData.meetingRoom] || 1,
        date: formattedStartDate,
        end_date: formattedEndDate,
        start_time: isAllDay ? null : meetingData.startTime,
        end_time: isAllDay ? null : meetingData.endTime,
        purpose: meetingData.title,
        description: meetingData.description,
        is_multi_day: true,
        all_day: isAllDay,
        session_id: userData.id || userData.userId || userData.session_id
      };

      console.log('Creating MULTI-DAY booking with dates:', {
        original_start: startDate.toString(),
        original_end: endDate.toString(),
        formatted_start: formattedStartDate,
        formatted_end: formattedEndDate,
        payload: bookingPayload
      });

      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create multi-day booking');
      }

      return await response.json();

    } else {
      // Single day booking
      const startDate = selectedDates.length > 0 ? selectedDates[0] : (meetingData.date || selectedDate || new Date());
      
      // FIXED: Ensure date is formatted consistently without timezone shifts
      const formattedDate = formatDateForAPI(startDate);

      const bookingPayload = {
        room_id: roomNameToIdMap[meetingData.meetingRoom] || 1,
        date: formattedDate,
        start_time: isAllDay ? null : meetingData.startTime,
        end_time: isAllDay ? null : meetingData.endTime,
        purpose: meetingData.title,
        description: meetingData.description,
        is_multi_day: false,
        all_day: isAllDay,
        session_id: userData.id || userData.userId || userData.session_id
      };

      console.log('Creating SINGLE-DAY booking with date:', {
        original_date: startDate.toString(),
        formatted_date: formattedDate,
        payload: bookingPayload
      });

      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }

      return await response.json();
    }
  };

  const showSuccessAlert = (message: string) => {
    setAlertMessage(message);
    setShowSuccessDialog(true);
  };

  const showErrorAlert = (message: string) => {
    setAlertMessage(message);
    setShowErrorDialog(true);
  };

  const showValidationAlert = (message: string) => {
    setAlertMessage(message);
    setShowValidationDialog(true);
  };

  const handleAllDayToggle = () => {
    const nowAllDay = !isAllDay;
    setIsAllDay(nowAllDay);
    
    if (nowAllDay) {
      setNewMeeting({
        ...newMeeting,
        startTime: '08:00',
        endTime: '20:00'
      });
      if (selectedDate) {
        // Only select today or future dates by default
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate >= today) {
          setSelectedDates([selectedDate]);
        } else {
          setSelectedDates([today]);
        }
      }
    } else {
      setNewMeeting({
        ...newMeeting,
        startTime: '09:00',
        endTime: '10:00'
      });
      setSelectedDates([]);
    }
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => isSameDate(selectedDate, date));
  };

  // FIXED: Handle date click with consistent local timezone
  const handleDateClick = (date: Date) => {
    if (!isAllDay) return;
    
    // FIXED: Ensure we're working with a clean local date
    const cleanDate = createLocalDate(date.getFullYear(), date.getMonth(), date.getDate());
    
    console.log('handleDateClick called with:', {
      originalDate: date,
      cleanDate: cleanDate,
      dateString: cleanDate.toString(),
      formatted: formatDateForAPI(cleanDate)
    });
    
    const isSelected = isDateSelected(cleanDate);
    let newSelectedDates: Date[];
    
    if (isSelected) {
      newSelectedDates = selectedDates.filter(d => !isSameDate(d, cleanDate));
    } else {
      newSelectedDates = [...selectedDates, cleanDate].sort((a, b) => a.getTime() - b.getTime());
    }
    
    console.log('New selected dates after click:', newSelectedDates.map(d => ({
      date: d,
      formatted: formatDateForAPI(d)
    })));
    
    // Validate the date range (dates don't need to be consecutive)
    const validationError = validateDateRange(newSelectedDates);
    if (validationError) {
      showValidationAlert(validationError);
      return;
    }
    
    setSelectedDates(newSelectedDates);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // FIXED: Render calendar with consistent local date creation
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    
    // Get today's date at midnight for proper comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      // FIXED: Create date in local timezone consistently
      const date = createLocalDate(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      
      console.log('Calendar date creation:', {
        day,
        createdDate: date,
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth(),
        formattedForAPI: formatDateForAPI(date)
      });
      
      const isToday = isSameDate(date, today);
      const isSelected = isDateSelected(date);
      const isPast = date < today;

      days.push(
        <button
          key={day}
          onClick={() => !isPast && handleDateClick(date)}
          disabled={isPast}
          className={`
            h-8 w-8 text-sm rounded-md transition-colors
            ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
            ${isToday ? 'bg-blue-100 text-blue-600' : ''}
            ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            ${!isPast ? 'text-gray-900' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // FIXED: Handle schedule meeting with consistent date parsing
  const handleScheduleMeeting = async () => {
    if (!newMeeting.title || (isAllDay && selectedDates.length === 0)) {
      showValidationAlert('Please fill in all required fields');
      return;
    }

    // Validate date range
    if (isAllDay && selectedDates.length > 0) {
      const validationError = validateDateRange(selectedDates);
      if (validationError) {
        showValidationAlert(validationError);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Create booking (single API call for both single and multi-day)
      const result = await createBackendBooking(newMeeting);

      // Update UI with the returned booking data
      if (result.success) {
        const bookingData = result.data;
        
        // Calculate duration and time range for display
        const durationMinutes = isAllDay ? 720 : calculateDurationInMinutes(
          newMeeting.startTime || '09:00', 
          newMeeting.endTime || '10:00'
        );
        const timeRange = isAllDay ? 'All Day' : formatTimeRange(
          newMeeting.startTime || '09:00', 
          newMeeting.endTime || '10:00'
        );

        // Handle multi-day booking display
        if (bookingData.is_multi_day && bookingData.end_date) {
          // FIXED: Create UI events for each day in the range using consistent date parsing
          const start = parseDateInLocalTimezone(bookingData.date);
          const end = parseDateInLocalTimezone(bookingData.end_date);
          const current = new Date(start);
          
          while (current <= end) {
            handleAddMeeting({
              ...newMeeting,
              date: new Date(current),
              isAllDay: bookingData.all_day,
              status: bookingData.status || 'pending',
              id: `${bookingData.id}-${formatDateForAPI(current)}`,
              duration: `${durationMinutes} min`,
              timeRange: timeRange
            });
            current.setDate(current.getDate() + 1);
          }
        } else {
          // FIXED: Single day booking with consistent date parsing
          const bookingDate = parseDateInLocalTimezone(bookingData.date);
          handleAddMeeting({
            ...newMeeting,
            date: bookingDate,
            isAllDay: bookingData.all_day,
            status: bookingData.status || 'pending',
            duration: `${durationMinutes} min`,
            timeRange: timeRange
          });
        }

        setShowBookingForm(false);
        setSelectedDates([]);
        setIsAllDay(false);
        
        // Reset form
        setNewMeeting({
          title: '',
          description: '',
          startTime: '09:00',
          endTime: '10:00',
          duration: '60 min',
          meetingRoom: 'Board Room'
        });
        
        // Show success message
        showSuccessAlert('Booking created successfully! It will be pending admin approval.');
      } else {
        // Handle conflicts or other errors
        if (result.conflicts && result.conflicts.length > 0) {
          setConflicts(result.conflicts);
          setShowConflictDialog(true);
        } else {
          throw new Error(result.message || 'Booking failed');
        }
      }
      
    } catch (error: any) {
      console.error('Booking creation failed:', error);
      showErrorAlert(`Booking failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryDifferentTime = () => {
    setShowConflictDialog(false);
    // Keep the form open but reset time selection
    if (!isAllDay) {
      setNewMeeting({
        ...newMeeting,
        startTime: '09:00',
        endTime: '10:00'
      });
    }
  };

  const handleTryDifferentRoom = () => {
    setShowConflictDialog(false);
    // Keep the form open but suggest next available room
    const currentRoomIndex = updatedMeetingRooms.indexOf(newMeeting.meetingRoom || 'Board Room');
    const nextRoom = updatedMeetingRooms[(currentRoomIndex + 1) % updatedMeetingRooms.length];
    setNewMeeting({
      ...newMeeting,
      meetingRoom: nextRoom
    });
  };

  const handleRetryBooking = () => {
    setShowErrorDialog(false);
    handleScheduleMeeting();
  };

  // Check if dates are consecutive (for display purposes only)
  const areDatesConsecutive = (dates: Date[]): boolean => {
    if (dates.length <= 1) return true;
    
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    for (let i = 1; i < sorted.length; i++) {
      const prevDay = new Date(sorted[i - 1]);
      prevDay.setDate(prevDay.getDate() + 1);
      
      if (!isSameDate(prevDay, sorted[i])) {
        return false;
      }
    }
    return true;
  };

  const isConsecutive = areDatesConsecutive(selectedDates);

  return (
    <>
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAllDay && selectedDates.length > 1 
                ? `Selected ${selectedDates.length} days`
                : selectedDate?.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })
              }
            </DialogTitle>
            <DialogDescription>
              Schedule a new meeting (will be pending approval)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label htmlFor="title" className="text-sm font-medium">Meeting Title *</label>
                <Input
                  id="title"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                  placeholder="Team Standup"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="description" className="text-sm font-medium">Description</label>
                <Input
                  id="description"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                  placeholder="Meeting description"
                  disabled={isLoading}
                />
              </div>

              {/* All Day toggle and Time inputs in same row */}
              <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="space-y-1 flex-1">
                    <label htmlFor="startTime" className="text-sm font-medium">Start Time</label>
                    <Select
                      value={newMeeting.startTime}
                      onValueChange={(value) => setNewMeeting({...newMeeting, startTime: value})}
                      disabled={isAllDay || isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time}>
                            {formatTimeToDisplay(time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 flex-1">
                    <label htmlFor="endTime" className="text-sm font-medium">End Time</label>
                    <Select
                      value={newMeeting.endTime}
                      onValueChange={(value) => setNewMeeting({...newMeeting, endTime: value})}
                      disabled={isAllDay || isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {filteredEndTimeOptions.map(time => (
                          <SelectItem key={time} value={time}>
                            {formatTimeToDisplay(time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Button 
                    variant={isAllDay ? "default" : "outline"} 
                    onClick={handleAllDayToggle}
                    size="sm"
                    disabled={isLoading}
                  >
                    All Day
                  </Button>
                </div>
              </div>

              {/* Display duration and time range */}
              {!isAllDay && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium">Meeting Duration:</div>
                    <div>{timeRangeDisplay} ({durationInMinutes} minutes)</div>
                  </div>
                </div>
              )}

              {/* Meeting Room - moved below time inputs */}
              <div className="space-y-1">
                <label htmlFor="meetingRoom" className="text-sm font-medium">Meeting Room</label>
                <Select
                  value={newMeeting.meetingRoom}
                  onValueChange={(value) => setNewMeeting({...newMeeting, meetingRoom: value})}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting room" />
                  </SelectTrigger>
                  <SelectContent>
                    {updatedMeetingRooms.map(room => (
                      <SelectItem key={room} value={room}>
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isAllDay && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Dates *</label>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1 hover:bg-gray-100 rounded"
                        disabled={isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <h3 className="font-medium">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-1 hover:bg-gray-100 rounded"
                        disabled={isLoading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                      {renderCalendar()}
                    </div>
                    
                    {selectedDates.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600 mb-2">Selected dates:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedDates.map((date, index) => (
                            <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ))}
                        </div>
                        {selectedDates.length > 1 && (
                          <p className={`text-xs mt-2 ${
                            isConsecutive ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {isConsecutive 
                              ? `Multi-day booking: ${selectedDates.length} consecutive days`
                              : `Multiple individual days: ${selectedDates.length} selected dates`
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBookingForm(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleMeeting}
              disabled={!newMeeting.title || (isAllDay && selectedDates.length === 0) || isLoading}
            >
              {isLoading ? (
                <>Creating Booking...</>
              ) : isAllDay && selectedDates.length > 1 ? (
                `Schedule Multi-Day Booking`
              ) : isAllDay ? (
                'Schedule All-Day Booking'
              ) : (
                'Schedule Meeting'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Alert Dialogs */}
      <ConflictAlertDialog
        conflicts={conflicts}
        isOpen={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        onTryDifferentTime={handleTryDifferentTime}
        onTryDifferentRoom={handleTryDifferentRoom}
      />

      <SuccessDialog
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        message={alertMessage}
      />

      <ErrorDialog
        isOpen={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        message={alertMessage}
        onRetry={handleRetryBooking}
      />

      <ValidationDialog
        isOpen={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        message={alertMessage}
      />
    </>
  );
};