// src/components/booking/CalendarGrid.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { CalendarGridProps, Meeting } from './types'; // Import Meeting type
import { formatDate, dayHeaders } from './utils';

export const CalendarGrid = ({
  currentDate,
  setCurrentDate,
  selectedDate,
  meetingsData,
  onDateClick
  // Remove unused prop:
  // viewMode
}: CalendarGridProps) => {
  const getMeetingsForDate = (date: Date) => {
    const dateKey = formatDate(date);
    return meetingsData[dateKey] || [];
  };

  // Add proper typing to the filter functions
  const hasApprovedMeetings = (date: Date) => {
    return getMeetingsForDate(date).some((meeting: Meeting) => meeting.status === 'approved');
  };

  const hasPendingMeetings = (date: Date) => {
    return getMeetingsForDate(date).some((meeting: Meeting) => meeting.status === 'pending');
  };

  const getMeetingIndicator = (date: Date) => {
    const hasApproved = hasApprovedMeetings(date);
    const hasPending = hasPendingMeetings(date);
    
    if (!hasApproved && !hasPending) return null;

    return (
      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex gap-1 z-10">
        {hasApproved && (
          <div 
            key="approved" 
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border border-white shadow-sm" 
            title="Approved booking" 
          />
        )}
        {hasPending && (
          <div 
            key="pending" 
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-500 rounded-full border border-white shadow-sm" 
            title="Pending booking" 
          />
        )}
      </div>
    );
  };

  const getMeetingCount = (date: Date) => {
    const meetings = getMeetingsForDate(date);
    return meetings.length;
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDateClick = (date: Date) => {
    const meetings = getMeetingsForDate(date);
    onDateClick(date, meetings);
  };

  const renderCustomCalendar = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Day headers - responsive text
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={`header-${i}`} className="h-10 sm:h-10 flex items-center justify-center text-sm font-medium text-gray-500 bg-gray-50 rounded-lg">
          <span className="hidden sm:inline">{dayHeaders[i]}</span>
          <span className="sm:hidden text-sm font-semibold">{dayHeaders[i].slice(0, 3)}</span>
        </div>
      );
    }

    // Empty cells
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 sm:h-20 border border-transparent"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      // const meetings = getMeetingsForDate(date);
      const meetingCount = getMeetingCount(date);
      const hasMeeting = meetingCount > 0;
      const pastDate = isPastDate(date);
      const today = isToday(date);
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

      let baseStyles = "relative h-16 sm:h-20 w-full text-base sm:text-lg rounded-xl transition-all duration-200 border-2 flex items-center justify-center";
      let conditionalStyles = "";
      
      if (pastDate) {
        conditionalStyles = "text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed hover:bg-gray-100";
      } else if (isSelected) {
        conditionalStyles = "bg-blue-600 text-white border-blue-700 shadow-lg transform scale-105 cursor-pointer";
      } else if (today) {
        conditionalStyles = "bg-blue-100 text-blue-800 border-blue-300 font-semibold cursor-pointer hover:bg-blue-200 active:scale-95";
      } else {
        conditionalStyles = "bg-white border-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100 active:scale-95";
      }

      let ringStyles = "";
      if (hasMeeting && !pastDate) {
        ringStyles = "ring-2 ring-offset-1 ring-blue-200";
      } else if (hasMeeting && pastDate) {
        ringStyles = "ring-1 ring-offset-1 ring-gray-300";
      }

      days.push(
        <button
          key={day}
          onClick={() => !pastDate && handleDateClick(date)}
          disabled={pastDate}
          className={`${baseStyles} ${conditionalStyles} ${ringStyles} touch-manipulation`}
        >
          {/* Date number - centered */}
          <span className={`font-medium ${isSelected && !pastDate ? "text-white" : ""} z-0`}>
            {day}
          </span>
          
          {hasMeeting && (
            <>
              {/* Meeting count badge - positioned top-right with better spacing */}
              <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
                <span className={`
                  text-xs font-semibold px-1.5 py-1 rounded-full min-w-[20px] h-[20px] flex items-center justify-center
                  ${pastDate 
                    ? 'bg-gray-300 text-gray-700' 
                    : isSelected 
                      ? 'bg-white text-blue-600' 
                      : 'bg-blue-100 text-blue-700'
                  }
                `}>
                  {meetingCount}
                </span>
              </div>
              
              {/* Status indicators - positioned top-left with better spacing */}
              {getMeetingIndicator(date)}
            </>
          )}
        </button>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-lg">
        {days}
      </div>
    );
  };

  return (
    <Card className="border-gray-200 shadow-lg sm:shadow-xl mx-2 sm:mx-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg pb-4 sm:pb-4 px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-white/10 text-white h-10 w-10 sm:h-10 sm:w-10 touch-manipulation"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          
          <CardTitle className="text-lg sm:text-2xl text-center flex-1">
            <div className="font-bold">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <span className="block text-sm font-normal opacity-90 mt-1">
              {selectedDate 
                ? `${getMeetingsForDate(selectedDate).length} meeting${getMeetingsForDate(selectedDate).length !== 1 ? 's' : ''}` 
                : 'Select a date'}
            </span>
          </CardTitle>
          
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-white/10 text-white h-10 w-10 sm:h-10 sm:w-10 touch-manipulation"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 sm:p-6">
        {/* Calendar Grid */}
        {renderCustomCalendar()}
        
        {/* Legend - Responsive with better mobile layout */}
        <div className="mt-4 sm:mt-4 p-4 sm:p-0">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-3 sm:h-3 bg-blue-600 rounded-full shrink-0"></div>
              <span className="text-sm">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-3 sm:h-3 bg-blue-100 rounded-full border border-blue-300 shrink-0"></div>
              <span className="text-sm">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-3 sm:h-3 bg-green-500 rounded-full shrink-0"></div>
              <span className="text-sm">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-3 sm:h-3 bg-yellow-500 rounded-full shrink-0"></div>
              <span className="text-sm">Pending</span>
            </div>
          </div>

          {/* Mobile instructions */}
          <div className="sm:hidden mt-4 text-center text-sm text-gray-500 space-y-1">
            <p className="font-medium">💡 Tap dates to view meetings</p>
            <p className="text-xs">Numbers show meeting count</p>
          </div>

          {/* Desktop instructions */}
          <div className="hidden sm:block mt-4 text-center text-sm text-gray-500">
            <p>• Click on dates with meetings to view details</p>
            <p>• Click on empty dates to book new meetings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};