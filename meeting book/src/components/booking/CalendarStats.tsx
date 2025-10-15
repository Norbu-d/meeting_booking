"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CalendarStatsProps } from './types';

export const CalendarStats = ({ meetingsData }: CalendarStatsProps) => {
  const totalMeetings = Object.values(meetingsData).reduce((acc, meetings) => acc + meetings.length, 0);
  const daysWithMeetings = Object.keys(meetingsData).length;
  const pendingMeetings = Object.values(meetingsData).reduce((acc, meetings) => 
    acc + meetings.filter(m => m.status === 'pending').length, 0
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">This Month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-lg">Total Meetings</span>
          <Badge variant="outline" className="font-semibold text-blue-600 text-lg">
            {totalMeetings}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-lg">Days with Meetings</span>
          <Badge variant="outline" className="font-semibold text-green-600 text-lg">
            {daysWithMeetings}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-lg">Pending Approval</span>
          <Badge variant="outline" className="font-semibold text-yellow-600 text-lg">
            {pendingMeetings}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};