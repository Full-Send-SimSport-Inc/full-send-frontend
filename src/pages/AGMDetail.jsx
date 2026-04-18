import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, UserCheck, UserX, CheckCircle2, XCircle, Users, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  upcoming: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200"
};

export default function AGMDetail() {
  const { id: agmId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: agm, isLoading: isLoadingAGM } = useQuery({
    queryKey: ['agm', agmId],
    queryFn: async () => {
        const data = await base44.get(`/agm?id=${agmId}`);
        // The PHP returns an array, so we take the first item
        return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!agmId
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-first_name'),
  });

  const updateMutation = useMutation({
    mutationFn: (updates) => base44.post(`/agm/${agmId}`, updates), // Direct POST
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['agm', agmId] });
    }
    });

  const toggleAttendance = (memberId) => {
  const currentAttendees = agm.attendee_ids || [];
  const isAttending = currentAttendees.includes(memberId);
    
  const newAttendees = isAttending
    ? currentAttendees.filter(id => id !== memberId)
    : [...currentAttendees, memberId];

    updateMutation.mutate({ attendee_ids: newAttendees });
  };

  const activeMembers = useMemo(() => members.filter(m => m.status === 'active'), [members]);

  const filteredMembers = useMemo(() => {
    return activeMembers.filter(m =>
      !search || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeMembers, search]);

  const attendeeIds = agm?.attendee_ids || [];
  const attendeeCount = attendeeIds.length;
  const quorumNeeded = agm?.quorum_minimum || 10;
  const quorumMet = attendeeCount >= quorumNeeded;
  const quorumPct = activeMembers.length > 0 ? Math.round((attendeeCount / activeMembers.length) * 100) : 0;

  if (isLoadingAGM || loadingMembers) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!agm) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Meeting not found. <Link to="/admin/agm" className="text-primary underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/admin/agm" className="p-2 rounded-lg hover:bg-muted transition-colors mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{agm.title}</h1>
            <Select value={agm.status} onValueChange={(value) => updateMutation.mutate({ status: value })}>
              <SelectTrigger className="w-36 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {agm.meeting_date ? format(new Date(agm.meeting_date), 'EEEE, dd MMMM yyyy') : 'Date TBC'}
            {agm.location && ` · ${agm.location}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attending</p>
              <p className="text-2xl font-bold">{attendeeCount} <span className="text-sm font-normal text-muted-foreground">of {activeMembers.length}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", quorumMet ? "bg-green-100" : "bg-amber-100")}>
              <Scale className={cn("w-5 h-5", quorumMet ? "text-green-600" : "text-amber-600")} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Quorum Required (min. {agm.quorum_minimum || 10} people)</p>
              <p className="text-2xl font-bold">
                {quorumNeeded}
                <span className={cn("text-sm font-medium ml-2", quorumMet ? "text-green-600" : "text-amber-600")}>
                  {quorumMet ? '✓ Met' : `Need ${quorumNeeded - attendeeCount} more`}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
              <p className="text-2xl font-bold">{quorumPct}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium">Quorum Progress</span>
            <span className="text-muted-foreground">{attendeeCount} / {quorumNeeded} required</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", quorumMet ? "bg-green-500" : "bg-primary")}
              style={{ width: `${Math.min(100, quorumNeeded > 0 ? (attendeeCount / quorumNeeded) * 100 : 0)}%` }}
            />
          </div>
          {quorumMet && (
            <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Quorum has been reached — this AGM can proceed officially.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Member Roll Call */}
      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">Roll Call — Active Members</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <Button variant="outline" size="sm" onClick={() => updateAGM.mutate({ attendee_ids: activeMembers.map(m => m.id) })}>
                Mark All Present
              </Button>
              <Button variant="outline" size="sm" onClick={() => updateAGM.mutate({ attendee_ids: [] })}>
                Clear All
              </Button>
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredMembers.map(member => {
              const attending = attendeeIds.includes(member.id);
              return (
                <div key={member.id} className={cn(
                  "flex items-center justify-between px-5 py-3 transition-colors",
                  attending ? "bg-green-50/50" : "hover:bg-muted/30"
                )}>
                  <div>
                    <p className="font-medium text-sm">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <button
                    onClick={() => toggleAttendance(member.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      attending
                        ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {attending
                      ? <><UserCheck className="w-4 h-4" /> Present</>
                      : <><UserX className="w-4 h-4" /> Absent</>
                    }
                  </button>
                </div>
              );
            })}
            {filteredMembers.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">No active members found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}