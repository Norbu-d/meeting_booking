// @/components/booking/utils.ts

// FIXED: Format date consistently for calendar keys without timezone shifts
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// FIXED: Create local date from components
export const createLocalDate = (year: number, month: number, day: number): Date => {
  return new Date(year, month, day);
};

// FIXED: Parse date string in local timezone
export const parseDateInLocalTimezone = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-based in JS Date
};

// FIXED: Compare dates without time components using consistent formatting
export const isSameDate = (date1: Date, date2: Date): boolean => {
  return formatDate(date1) === formatDate(date2);
};

// Get today's date in local timezone
export const getTodayLocal = (): Date => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

// FIXED: Get today's date as string in local timezone
export const getTodayAsString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateTimeOptions = (): string[] => {
  const options = [];
  for (let hour = 8; hour < 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
};

export const formatTimeToDisplay = (time: string): string => {
  const [hour, minute] = time.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// FIXED: Renamed from calculateDuration to calculateDurationInMinutes
export const calculateDurationInMinutes = (startTime: string, endTime: string): number => {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
};

export const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

// FIXED: Check if a date is in the past using local timezone
export const isPastDate = (date: Date): boolean => {
  const today = getTodayLocal();
  return date < today;
};

// FIXED: Check if a date is today using local timezone
export const isToday = (date: Date): boolean => {
  return isSameDate(date, getTodayLocal());
};

// FIXED: Check if a date is in the future using local timezone
export const isFutureDate = (date: Date): boolean => {
  const today = getTodayLocal();
  return date > today;
};

// Helper function to get date range between two dates
export const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const current = parseDateInLocalTimezone(startDate);
  const end = parseDateInLocalTimezone(endDate);
  
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// Debug function to log date information
export const debugDate = (date: Date, label?: string): void => {
  console.log(`${label || 'Date Debug'}:`, {
    date: date,
    toString: date.toString(),
    toDateString: date.toDateString(),
    formatted: formatDate(date),
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate()
  });
};

// Format time range for display
export const formatTimeRange = (startTime: string, endTime: string): string => {
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

export const meetingRooms = ['Board Room', 'Training Hall', 'Mini Conference'];

export const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];