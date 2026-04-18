import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { CalendarDays, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_STYLES = {
  upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS = {
  upcoming: 'Upcoming',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function Meetings() {
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['public-meetings'],
    // UPDATED: Use the direct endpoint we fixed in PHP
    queryFn: async () => {
      const resp = await base44.get('/agm');
      return resp || [];
    },
  });

  const upcoming = meetings.filter(m => m.status === 'upcoming' || m.status === 'in_progress');
  const past = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled');

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading meetings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Upcoming Meetings</h2>
        <div className="grid gap-4">
          {upcoming.map(meeting => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No upcoming meetings scheduled.</p>
          )}
        </div>
      </div>

      {past.length > 0 && (
        <div className="pt-8 border-t">
          <h2 className="text-xl font-bold tracking-tight mb-6 text-muted-foreground">Past Meetings</h2>
          <div className="grid gap-4 opacity-75">
            {past.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingCard({ meeting }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-bold">{meeting.title}</CardTitle>
          <Badge variant="outline" className={`text-xs shrink-0 border ${STATUS_STYLES[meeting.status]}`}>
            {STATUS_LABELS[meeting.status] || meeting.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {meeting.meeting_date && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            {format(new Date(meeting.meeting_date), 'EEEE, dd MMMM yyyy')}
          </div>
        )}
        {meeting.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            {meeting.location}
          </div>
        )}
      </CardContent>
    </Card>
  );
}