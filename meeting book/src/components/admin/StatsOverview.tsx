import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';

interface StatsOverviewProps {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ pendingCount, approvedCount, rejectedCount }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Pending Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <div className="absolute top-4 right-4 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="h-6 w-6 text-amber-600" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-amber-700">Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-amber-800">{pendingCount}</div>
          <div className="flex items-center mt-2">
            <div className="w-3 h-3 bg-amber-400 rounded-full mr-2"></div>
            <p className="text-xs text-amber-600">Awaiting approval</p>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-400"></div>
      </Card>

      {/* Approved Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
        <div className="absolute top-4 right-4 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-emerald-600" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-emerald-700">Approved Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-emerald-800">{approvedCount}</div>
          <div className="flex items-center mt-2">
            <TrendingUp className="h-3 w-3 text-emerald-500 mr-2" />
            <p className="text-xs text-emerald-600">Confirmed bookings</p>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-400"></div>
      </Card>

      {/* Rejected Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
        <div className="absolute top-4 right-4 w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
          <XCircle className="h-6 w-6 text-rose-600" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-rose-700">Rejected Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-rose-800">{rejectedCount}</div>
          <div className="flex items-center mt-2">
            <div className="w-3 h-3 bg-rose-400 rounded-full mr-2"></div>
            <p className="text-xs text-rose-600">Not approved</p>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-red-400"></div>
      </Card>
    </div>
  );
};

export default StatsOverview;