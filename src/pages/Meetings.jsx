import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { CalendarDays, MapPin, FileText, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

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
      // Direct path to the WP REST endpoint we created
      const data = await base44.get('/agm');
      return data || [];
    },
  });

  const upcoming = meetings.filter(m => m.status === 'upcoming' || m.status === 'in_progress');
  const past = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled');

  return (
     <> {/* ADDED HEADER: Matches the style and functionality of AdminLayout */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-xl text-primary">Member Portal</span>
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/my-profile"
                className="bg-primary/10 text-primary flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
              <Link
                to="/meetings"
                className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Meetings
              </Link>
            </nav>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 mb-4 text-sm font-medium">
            <CalendarDays className="w-4 h-4" />
            Full Send SimSport Inc.
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">General Meetings</h1>
          <p className="text-white/80">View upcoming and past Annual General Meetings.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">Upcoming Meetings</h2>
            <div className="space-y-4">
              {upcoming.map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </section>
        )}

        {!isLoading && upcoming.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No upcoming meetings scheduled.
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 text-muted-foreground">Past Meetings</h2>
            <div className="space-y-4">
              {past.map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="text-center text-xs text-muted-foreground pb-8">
        © {new Date().getFullYear()} Full Send SimSport Inc. ·{' '}
        <Link to="/" className="hover:underline">Back to Registration</Link>
      </footer>
    </div>
   </>
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
        {meeting.notes && (
          <div className="flex items-start gap-2 pt-1">
            <FileText className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="whitespace-pre-wrap">{meeting.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}