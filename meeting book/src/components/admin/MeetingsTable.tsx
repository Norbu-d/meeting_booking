import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import MeetingCard from './MeetingCard';
import type { Meeting } from './MeetingCard';
import { Clock, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface MeetingsTableProps {
  filteredMeetings: Meeting[];
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const MeetingsTable: React.FC<MeetingsTableProps> = ({
  filteredMeetings,
  pendingCount,
  approvedCount,
  rejectedCount,
  onApprove,
  onReject
}) => {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-indigo-600" />
          Meeting Requests
        </CardTitle>
        <CardDescription className="text-gray-600">
          Review and manage meeting room booking requests with multi-day support
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid grid-cols-3 mb-8 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="pending" 
              className="flex items-center gap-2 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <Clock className="h-4 w-4 text-amber-600" />
              Pending
              <Badge variant="secondary" className="ml-1 bg-amber-500 text-white">
                {pendingCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="approved" 
              className="flex items-center gap-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Approved
              <Badge variant="secondary" className="ml-1 bg-emerald-500 text-white">
                {approvedCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="rejected" 
              className="flex items-center gap-2 data-[state=active]:bg-rose-100 data-[state=active]:text-rose-900 data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <XCircle className="h-4 w-4 text-rose-600" />
              Rejected
              <Badge variant="secondary" className="ml-1 bg-rose-500 text-white">
                {rejectedCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-4">
              {filteredMeetings
                .filter(meeting => meeting.status === 'pending')
                .map(meeting => (
                  <MeetingCard 
                    key={meeting.id} 
                    meeting={meeting} 
                    onApprove={() => onApprove(meeting.id)}
                    onReject={() => onReject(meeting.id)}
                  />
                ))}
              
              {filteredMeetings.filter(meeting => meeting.status === 'pending').length === 0 && (
                <div className="text-center py-12 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-amber-800">No pending requests</h3>
                  <p className="text-amber-600 mt-1">All meeting requests have been processed</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-4">
              {filteredMeetings
                .filter(meeting => meeting.status === 'approved')
                .map(meeting => (
                  <MeetingCard 
                    key={meeting.id} 
                    meeting={meeting} 
                    showStatus={true}
                  />
                ))}
              
              {filteredMeetings.filter(meeting => meeting.status === 'approved').length === 0 && (
                <div className="text-center py-12 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-emerald-800">No approved meetings</h3>
                  <p className="text-emerald-600 mt-1">Approved meetings will appear here</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-4">
              {filteredMeetings
                .filter(meeting => meeting.status === 'rejected')
                .map(meeting => (
                  <MeetingCard 
                    key={meeting.id} 
                    meeting={meeting} 
                    showStatus={true}
                  />
                ))}
              
              {filteredMeetings.filter(meeting => meeting.status === 'rejected').length === 0 && (
                <div className="text-center py-12 bg-rose-50 rounded-lg border border-rose-200">
                  <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-rose-800">No rejected meetings</h3>
                  <p className="text-rose-600 mt-1">No meeting requests have been rejected</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MeetingsTable;