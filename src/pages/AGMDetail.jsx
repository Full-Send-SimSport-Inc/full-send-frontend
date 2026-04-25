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
import { ArrowLeft, Search, UserCheck, UserX, CheckCircle2, Users, Scale, Loader2 } from 'lucide-react';
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
        return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!agmId
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-first_name'),
  });

  const updateMutation = useMutation({
    mutationFn: (updates) => base44.post(`/agm/${agmId}`, updates),
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!agm) {
    return (
      <div className="text-center py-20 text-muted-foreground px-4">
        Meeting not found. <Link to="/admin/agm" className="text-primary underline font-medium">Go back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-4">
        <Link to="/admin/agm" className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{agm.title}</h1>
            <Select
              value={agm.status}
              onValueChange={(value) => updateMutation.mutate({ status: value })}
              disabled={updateMutation.isPending}
            >
              <SelectTrigger className="w-32 sm:w-36 h-8 text-xs">
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
          <p className="text-muted-foreground text-xs sm:text-sm mt-1 flex flex-wrap gap-1 items-center">
            {agm.meeting_date ? format(new Date(agm.meeting_date), 'EEEE, dd MMMM yyyy') : 'Date TBC'}
            {agm.location && <><span className="hidden sm:inline">·</span> <span className="block sm:inline">{agm.location}</span></>}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm shadow-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">Attending</p>
              <p className="text-xl sm:text-2xl font-bold truncate">
                {attendeeCount} <span className="text-sm font-normal text-muted-foreground">/ {activeMembers.length}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm shadow-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", quorumMet ? "bg-green-100" : "bg-amber-100")}>
              <Scale className={cn("w-5 h-5", quorumMet ? "text-green-600" : "text-amber-600")} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold truncate">Quorum (min. {agm.quorum_minimum})</p>
              <p className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                {quorumNeeded}
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 h-5", quorumMet ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                  {quorumMet ? 'Met' : `+${quorumNeeded - attendeeCount}`}
                </Badge>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm shadow-primary/5 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">Attendance Rate</p>
              <p className="text-xl sm:text-2xl font-bold">{quorumPct}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card className="border-0 shadow-sm shadow-primary/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
            <span className="font-semibold">Quorum Progress</span>
            <span className="text-muted-foreground font-medium">{attendeeCount} / {quorumNeeded} reached</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-out", quorumMet ? "bg-green-500" : "bg-primary")}
              style={{ width: `${Math.min(100, quorumNeeded > 0 ? (attendeeCount / quorumNeeded) * 100 : 0)}%` }}
            />
          </div>
          {quorumMet && (
            <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-100">
              <p className="text-xs sm:text-sm text-green-700 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Quorum reached — meeting can proceed officially.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Roll Call */}
      <Card className="border-0 shadow-sm shadow-primary/5">
        <CardHeader className="px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">Roll Call — Active Members</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none text-xs h-8"
                  onClick={() => updateMutation.mutate({ attendee_ids: activeMembers.map(m => m.id) })}
                  disabled={updateMutation.isPending}
                >
                  Mark All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none text-xs h-8"
                  onClick={() => updateMutation.mutate({ attendee_ids: [] })}
                  disabled={updateMutation.isPending}
                >
                  Clear All
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y border-t">
            {filteredMembers.map(member => {
              const attending = attendeeIds.includes(member.id);
              return (
                <div key={member.id} className={cn(
                  "flex items-center justify-between px-4 py-3 sm:px-6 transition-colors",
                  attending ? "bg-green-50/40" : "hover:bg-muted/30"
                )}>
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-sm truncate">{member.first_name} {member.last_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <button
                    onClick={() => toggleAttendance(member.id)}
                    disabled={updateMutation.isPending}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0",
                      attending
                        ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600 border border-green-200"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-transparent"
                    )}
                  >
                    {attending
                      ? <><UserCheck className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Present</span></>
                      : <><UserX className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Absent</span></>
                    }
                  </button>
                </div>
              );
            })}
            {filteredMembers.length === 0 && (
              <div className="text-center py-12 px-4">
                <Users className="w-8 h-8 mx-auto text-muted-foreground opacity-20 mb-2" />
                <p className="text-muted-foreground text-sm font-medium">No active members found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}