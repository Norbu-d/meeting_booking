// src/components/ConflictAlertDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Clock, X } from "lucide-react";

interface Conflict {
  conflict_type: string;
  message: string;
  existing_booking?: {
    purpose: string;
    is_multi_day?: boolean;
    date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    all_day?: boolean;
  };
}

interface ConflictAlertDialogProps {
  conflicts: Conflict[];
  isOpen: boolean;
  onClose: () => void;
  onTryDifferentRoom: () => void;
  onTryDifferentTime: () => void;
}

export const ConflictAlertDialog = ({ 
  conflicts, 
  isOpen, 
  onClose, 
  onTryDifferentRoom,
  onTryDifferentTime 
}: ConflictAlertDialogProps) => {
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
          {conflicts.map((conflict: Conflict, index: number) => (
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