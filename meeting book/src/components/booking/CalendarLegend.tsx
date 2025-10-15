"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { MeetingsData } from './types';

interface CalendarLegendProps {
  meetingsData: MeetingsData;
  viewMode?: string;
}

export const CalendarLegend = ({ meetingsData }: CalendarLegendProps) => {
  const totalMeetings = Object.values(meetingsData).reduce((acc, meetings) => acc + meetings.length, 0);
  const approvedMeetings = Object.values(meetingsData).flat().filter(m => m.status === 'approved').length;
  const pendingMeetings = Object.values(meetingsData).flat().filter(m => m.status === 'pending').length;

  return (
    <Card className="shadow-lg border-blue-100 mx-2 lg:mx-0">
      <CardHeader className="bg-blue-50 border-b border-blue-200 py-3 lg:py-4">
        <CardTitle className="text-lg lg:text-xl text-blue-800">Calendar Legend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 lg:space-y-4 p-3 lg:p-4">
        <div className="space-y-2 lg:space-y-3">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-blue-100 border-2 border-blue-400 rounded flex-shrink-0" />
            <span className="text-xs lg:text-sm font-medium">Today</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-blue-600 rounded flex-shrink-0" />
            <span className="text-xs lg:text-sm font-medium">Selected Date</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="relative w-3 h-3 lg:w-4 lg:h-4 bg-white border border-gray-300 rounded flex-shrink-0">
              <div className="absolute top-0 right-0 w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full border border-white transform translate-x-1/2 -translate-y-1/2" />
            </div>
            <span className="text-xs lg:text-sm font-medium">Approved</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="relative w-3 h-3 lg:w-4 lg:h-4 bg-white border border-gray-300 rounded flex-shrink-0">
              <div className="absolute top-0 right-0 w-2 h-2 lg:w-3 lg:h-3 bg-yellow-500 rounded-full border border-white transform translate-x-1/2 -translate-y-1/2" />
            </div>
            <span className="text-xs lg:text-sm font-medium">Pending</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="relative w-3 h-3 lg:w-4 lg:h-4 bg-white border border-gray-300 rounded flex-shrink-0">
              <div className="absolute top-0 right-0 flex gap-0.5 transform translate-x-1/2 -translate-y-1/2">
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full border border-white" />
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-yellow-500 rounded-full border border-white" />
              </div>
            </div>
            <span className="text-xs lg:text-sm font-medium">Both Types</span>
          </div>
        </div>

        {/* Statistics - Mobile Optimized */}
        <div className="pt-3 lg:pt-4 border-t border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-2 text-sm lg:text-base">Meeting Statistics</h4>
          <div className="space-y-1 text-xs lg:text-sm">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-medium">{totalMeetings}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Approved:</span>
              <span className="font-medium text-green-600">{approvedMeetings}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-600">Pending:</span>
              <span className="font-medium text-yellow-600">{pendingMeetings}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};