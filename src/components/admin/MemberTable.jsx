import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { CalendarDays, MapPin, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
    queryFn: async () => {
      const resp = await base44.get('/agm');
      return resp || [];
    },
  });

  const upcoming = meetings.filter(m => m.status === 'upcoming' || m.status === 'in_progress');
  const past = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading meetings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Upcoming Meetings</h2>
          <p className="text-sm text-muted-foreground mt-1">Scheduled sessions and general meetings.</p>
        </div>

        <div className="grid gap-4">
          {upcoming.map(meeting => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
          {upcoming.length === 0 && (
            <Card className="border-dashed shadow-none bg-muted/20">
              <CardContent className="py-10 text-center text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm italic">No upcoming meetings scheduled at this time.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="pt-8 border-t">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-muted-foreground">Past Meetings</h2>
            <p className="text-xs text-muted-foreground mt-1">Archived meeting records and attendance.</p>
          </div>
          <div className="grid gap-4">
            {past.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} isPast />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MeetingCard({ meeting, isPast = false }) {
  return (
    <Card className={cn(
      "border-0 shadow-md shadow-primary/5 transition-all",
      isPast ? "opacity-80 grayscale-[0.5]" : "hover:shadow-lg hover:shadow-primary/10"
    )}>
      <CardHeader className="p-4 sm:p-6 pb-2">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base sm:text-lg font-bold leading-tight">
            {meeting.title}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] sm:text-xs shrink-0 border px-2 py-0.5 uppercase tracking-wide font-bold",
              STATUS_STYLES[meeting.status]
            )}
          >
            {STATUS_LABELS[meeting.status] || meeting.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-2.5">
        {meeting.meeting_date && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium">
              {format(new Date(meeting.meeting_date), 'EEEE, dd MMMM yyyy')}
            </span>
          </div>
        )}
        {meeting.location && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{meeting.location}</span>
          </div>
        )}

        {/* Mobile-only subtle separator if notes were to be added later */}
        {!isPast && meeting.status === 'upcoming' && (
          <div className="pt-2 mt-2 border-t border-dashed border-muted" />
        )}
      </CardContent>
    </Card>
  );
}