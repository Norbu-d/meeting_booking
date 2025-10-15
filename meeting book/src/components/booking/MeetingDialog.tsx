"use client"

import { Clock, User, Plus, UserCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { MeetingDialogProps } from './types';

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Pending</Badge>;
    case 'approved':
      return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Rejected</Badge>;
    case 'cancelled':
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">Cancelled</Badge>;
    default:
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Pending</Badge>;
  }
};

export const MeetingDialog = ({
  selectedDate,
  selectedDateMeetings,
  showMeetingDialog,
  setShowMeetingDialog,
  setShowBookingForm,
  viewMode
}: MeetingDialogProps) => {
  const filteredMeetings = viewMode === 'my' 
    ? selectedDateMeetings.filter(meeting => meeting.isMyBooking)
    : selectedDateMeetings;

  if (filteredMeetings.length === 0 && viewMode === 'my') {
    return (
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[80vh] overflow-hidden p-0 mx-2">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4">
            <DialogTitle className="text-white text-lg sm:text-xl">
              {selectedDate?.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-sm">
              No meetings found
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 sm:p-6 text-center py-6 sm:py-8">
            <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">You have no bookings on this date.</p>
            <Button 
              onClick={() => {
                setShowMeetingDialog(false);
                setShowBookingForm(true);
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Book a Meeting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[80vh] overflow-hidden p-0 mx-2">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4">
          <DialogTitle className="text-white text-lg sm:text-xl">
            {selectedDate?.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </DialogTitle>
          <DialogDescription className="text-blue-100 text-sm">
            {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? 's' : ''} scheduled
            {viewMode === 'my' && ' (Your bookings only)'}
            {viewMode === 'all' && ' (All visible bookings)'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 sm:p-6 max-h-64 sm:max-h-96 overflow-y-auto">
          {filteredMeetings.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {filteredMeetings.map((meeting) => (
                <Card key={meeting.id} className={`hover:shadow-md transition-shadow ${
                  meeting.isMyBooking ? 'border-l-4 border-l-blue-500' : ''
                }`}>
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-base sm:text-lg break-words">{meeting.title}</CardTitle>
                        {meeting.isMyBooking && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            Your Booking
                          </Badge>
                        )}
                      </div>
                      {getStatusBadge(meeting.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="break-words">{meeting.time} ({meeting.duration})</span>
                      </div>
                      
                      {meeting.attendee && (
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="break-words">{meeting.attendee}</span>
                        </div>
                      )}

                      {meeting.meetingRoom && (
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                          <span className="font-medium">Room:</span>
                          <span className="break-words">{meeting.meetingRoom}</span>
                        </div>
                      )}

                      {meeting.bookedBy && (
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 pt-2 border-t">
                          <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                          <div className="break-words">
                            <span className="font-medium">Booked by: </span>
                            <span className={`${meeting.isMyBooking ? 'text-green-600 font-semibold' : 'text-blue-600'}`}>
                              {meeting.isMyBooking ? 'You' : meeting.bookedBy}
                            </span>
                          </div>
                        </div>
                      )}

                      {meeting.description && (
                        <div className="mt-2 text-xs sm:text-sm text-gray-600 pt-2 border-t">
                          <p className="font-medium">Description:</p>
                          <p className="mt-1 break-words">{meeting.description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">No meetings scheduled for this date</p>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 pb-3 sm:pb-4">
          <Button 
            className="w-full" 
            onClick={() => {
              setShowMeetingDialog(false);
              setShowBookingForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Meeting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};