import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Calendar, MapPin, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  upcoming: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200"
};

export default function AdminAGM() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', meeting_date: '', location: '', quorum_minimum: 10, notes: '' });

  const { data: agms = [], isLoading } = useQuery({
    queryKey: ['agms'],
    queryFn: () => base44.entities.AGM.list('-meeting_date'),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.AGM.create({ ...form, attendee_ids: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agms'] });
      setOpen(false);
      setForm({ title: '', meeting_date: '', location: '', quorum_minimum: 10, notes: '' });
    }
  });

  const activeCount = members.filter(m => m.status === 'active').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AGM & Meetings</h1>
          <p className="text-muted-foreground mt-1">Track annual general meetings and attendance.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Meeting
        </Button>
      </div>

      {agms.length === 0 ? (
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No meetings yet</p>
            <p className="text-sm mt-1">Create your first AGM to start tracking attendance.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agms.map(agm => {
            const attendeeCount = agm.attendee_ids?.length || 0;
            const quorumNeeded = agm.quorum_minimum || 10;
            const quorumMet = attendeeCount >= quorumNeeded;

            return (
              <Link key={agm.id} to={`/admin/agm/${agm.id}`}>
                <Card className="border-0 shadow-md shadow-primary/5 hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{agm.title}</h3>
                        <Badge variant="outline" className={cn("text-xs border", STATUS_STYLES[agm.status])}>
                          {agm.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {agm.meeting_date ? format(new Date(agm.meeting_date), 'dd MMM yyyy') : 'Date TBC'}
                        </span>
                        {agm.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {agm.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {attendeeCount} / {quorumNeeded} for quorum
                          {quorumMet && <span className="text-green-600 font-medium ml-1">✓ Met</span>}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Meeting Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="AGM 2025" />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.meeting_date} onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Online / Address" />
            </div>
            <div className="space-y-2">
              <Label>Quorum Minimum (people required)</Label>
              <Input type="number" min={1} value={form.quorum_minimum} onChange={e => setForm(p => ({ ...p, quorum_minimum: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes / Agenda</Label>
              <Textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Agenda items..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.title || !form.meeting_date || createMutation.isPending}>
              Create Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}