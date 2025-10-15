// src/utils/alertUtils.ts
export const showToast = (message: string) => {
  // Remove unused 'type' parameter
  alert(message);
};

export const formatConflictMessage = (conflicts: any[]): string => {
  if (!conflicts || conflicts.length === 0) return '';
  
  const messages = conflicts.map((conflict: any) => {
    switch (conflict.conflict_type) {
      case 'multi_day_block':
        return `• Multi-day booking blocks your selected dates`;
      case 'blocked_by_all_day':
        return `• Room is fully booked for the entire day`;
      case 'time_slot':
        return `• Time slot conflicts with existing booking`;
      default:
        return `• ${conflict.message || 'Unknown conflict'}`;
    }
  });
  
  return `Booking conflicts detected:\n${messages.join('\n')}`;
};