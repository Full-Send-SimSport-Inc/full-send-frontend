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
import { Plus, Calendar, MapPin, ChevronRight, Users, Loader2 } from 'lucide-react';
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
    queryFn: async () => {
        const data = await base44.get('/agm');
        console.log("DEBUG: Fetched Meetings List:", data);
        return data || [];
    }
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
        console.log("Attempting to create meeting with data:", data);
        return base44.post('/agm', data);
    },
    onSuccess: (response) => {
        console.log("Meeting created successfully:", response);
        queryClient.invalidateQueries({ queryKey: ['agms'] });
        setOpen(false);
        setForm({ title: '', meeting_date: '', location: '', quorum_minimum: 10, notes: '' });
    },
    onError: (error) => {
        console.error("Mutation failed:", error);
        alert("Failed to create meeting. Check console for details.");
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AGM & Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">Track annual general meetings and attendance.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto shadow-sm">
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
                <Card className="border-0 shadow-md shadow-primary/5 hover:shadow-lg transition-all cursor-pointer group overflow-hidden">
                  <CardContent className="p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate text-base sm:text-lg">{agm.title}</h3>
                        <Badge variant="outline" className={cn("text-[10px] sm:text-xs border px-1.5 py-0", STATUS_STYLES[agm.status])}>
                          {agm.status?.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {agm.meeting_date ? format(new Date(agm.meeting_date), 'dd MMM yyyy') : 'Date TBC'}
                        </span>

                        {agm.location && (
                          <span className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3 h-3" /> {agm.location}
                          </span>
                        )}

                        <span className="flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          {attendeeCount}/{quorumNeeded} quorum
                          {quorumMet && <span className="text-green-600 font-bold ml-0.5">✓</span>}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 self-center" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Responsive Dialog - Fixed for WordPress Admin Bar compatibility */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[95vw] max-w-md rounded-xl p-0 flex flex-col max-h-[90vh] overflow-hidden !z-[100001] top-[55%] sm:top-[50%]"
        >
          <DialogHeader className="p-4 sm:p-6 pb-2">
            <DialogTitle>Create New Meeting</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Meeting Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. AGM 2025"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date *</Label>
              <Input
                type="date"
                value={form.meeting_date}
                onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Location</Label>
              <Input
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="Online / Address"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Quorum Minimum (People)</Label>
              <Input
                type="number"
                min={1}
                value={form.quorum_minimum}
                onChange={e => setForm(p => ({ ...p, quorum_minimum: Number(e.target.value) }))}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes / Agenda</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Agenda items..."
                className="text-base sm:text-sm mb-4"
              />
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-6 pt-2 flex-col sm:flex-row gap-2 bg-muted/30 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </Button>
            <Button
              onClick={() => {
                  console.log("Button clicked. Form state:", form);
                  createMutation.mutate(form);
              }}
              disabled={!form.title || !form.meeting_date || createMutation.isPending}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : "Create Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}