// src/components/booking/types.ts
export interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  date: string; // This should remain as string
  room_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  isMyBooking?: boolean;
  
  // Add these properties that you're actually using
  startTime?: string;
  endTime?: string;
  duration?: string;
  meetingRoom?: string;
  time?: string;
  attendee?: string;
  bookedBy?: string;
  isAllDay?: boolean;
  timeRange?: string;
  isMultiDay?: boolean;
  startDate?: string;
  endDate?: string;
  originalBookingId?: string;
  allDay?: boolean;
  isPartOfMultiDay?: boolean;
}

export interface MeetingsData {
  [date: string]: Meeting[];
}
export interface BookingFormProps {
  selectedDate: Date;
  showBookingForm: boolean;
  setShowBookingForm: (show: boolean) => void;
  handleAddMeeting: (meeting: any) => void;
  meetingRooms?: any[];
  formatDate?: (date: Date) => string;
}

export interface CalendarGridProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDate: Date | null;
  meetingsData: MeetingsData;
  onDateClick: (date: Date, meetings: Meeting[]) => void;
  viewMode?: 'month' | 'week';
}

export interface MeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  selectedDateMeetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
  showMeetingDialog?: boolean;
  setShowMeetingDialog?: (show: boolean) => void;
  setShowBookingForm?: (show: boolean) => void;
  viewMode?: string;
}

// ... keep your other interfaces

export interface CalendarStatsProps {
  meetingsData: MeetingsData;
}

export interface CalendarLegendProps {
  meetingsData: MeetingsData;
  viewMode: 'month' | 'week';
}

