import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle } from 'lucide-react';

// Add the 'type' keyword for type-only export
export interface Meeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  requester: string;
  attendees: number;
  status: 'pending' | 'approved' | 'rejected';
  isAllDay: boolean;
  description?: string;
}

interface MeetingCardProps {
  meeting: Meeting;
  onApprove?: () => void;
  onReject?: () => void;
  showStatus?: boolean;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onApprove, onReject, showStatus = false }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="md:flex">
          <div className="p-6 flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{meeting.title}</h3>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <User className="h-4 w-4 mr-1" />
                  <span>{meeting.requester}</span>
                  <span className="mx-2">•</span>
                  <span>{meeting.attendees} attendees</span>
                </div>
              </div>
              
              {showStatus && (
                <Badge className={statusColors[meeting.status]}>
                  {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>{new Date(meeting.date).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span>
                  {meeting.isAllDay ? 'All Day' : `${meeting.startTime} - ${meeting.endTime}`}
                </span>
              </div>
              
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                <span>{meeting.room}</span>
              </div>
            </div>
            
            {meeting.description && (
              <p className="mt-4 text-sm text-gray-600">{meeting.description}</p>
            )}
          </div>
          
          {!showStatus && onApprove && onReject && (
            <div className="bg-gray-50 p-6 md:border-l md:flex md:flex-col md:justify-center">
              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={onApprove}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onReject}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MeetingCard;