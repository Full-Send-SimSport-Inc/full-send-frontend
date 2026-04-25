import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, Users, User, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from "sonner";
import { CLUB_SIGNATURE_HTML } from '@/constants/emailTemplates';
import EmailSignatureEditor from '@/components/admin/EmailSignatureEditor';

export default function AdminEmail() {
  const [recipientMode, setRecipientMode] = useState('all'); // all | select
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({ active: true, pending: false, inactive: false });
  const [fromName, setFromName] = useState('Full Send SimSports');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [signature, setSignature] = useState(CLUB_SIGNATURE_HTML);
  const [showSigEditor, setShowSigEditor] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.get('/admin/users'),
  });

  const getMemberName = (m) => {
    return m.display_name || m.email || 'Unknown Member';
  };

  const grouped = {
    active: members.filter(m => m.status === 'active'),
    pending: members.filter(m => m.status === 'pending'),
    inactive: members.filter(m => m.status === 'inactive' || !m.status),
  };

  const toggleMember = (m) => {
    setSelectedMembers(prev =>
      prev.find(s => s.id === m.id) ? prev.filter(s => s.id !== m.id) : [...prev, m]
    );
  };

  const toggleGroup = (status) => {
    const group = grouped[status];
    const allSelected = group.every(m => selectedMembers.find(s => s.id === m.id));
    if (allSelected) {
      setSelectedMembers(prev => prev.filter(s => !group.find(g => g.id === s.id)));
    } else {
      const toAdd = group.filter(m => !selectedMembers.find(s => s.id === m.id));
      setSelectedMembers(prev => [...prev, ...toAdd]);
    }
  };

  const recipients = recipientMode === 'all' ? members : selectedMembers;

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) {
      toast.error('Please fill in subject, body and select at least one recipient.');
      return;
    }
    setSending(true);
    try {
      await base44.post('/admin/send-email', {
        to_emails: recipients,
        from_name: fromName,
        subject: subject,
        body: body,
        signature: signature
      });

      setSent(true);
      toast.success(`Emails successfully queued!`);
    } catch (error) {
      toast.error('Failed to send emails.');
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setBody('');
    setSelectedMembers([]);
    setMemberSearch('');
    setSent(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-24 space-y-4 px-4 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-bold">Emails Sent!</h2>
        <p className="text-muted-foreground">Successfully sent to {recipients.length} member{recipients.length !== 1 ? 's' : ''}.</p>
        <Button onClick={resetForm} className="w-full sm:w-auto">Send Another Email</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Send Email</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Compose and send emails to members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <Card className="border-0 shadow-md shadow-primary/5">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" /> Compose
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">From Name</label>
                <Input
                  placeholder="e.g. Full Send SimSports Committee"
                  value={fromName}
                  onChange={e => setFromName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Email subject..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Message</label>
                <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">
                  The recipient's first name will be added automatically as a greeting.
                </p>
                <Textarea
                  placeholder="Write your message here..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={8}
                  className="min-h-[200px] text-base sm:text-sm"
                />
              </div>

              <div className="border rounded-lg p-3 sm:p-4 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Signature</span>
                  <Button variant="outline" size="sm" onClick={() => setShowSigEditor(!showSigEditor)} className="h-8 text-xs">
                    {showSigEditor ? 'Save & Close' : 'Edit Signature'}
                  </Button>
                </div>
                {showSigEditor ? (
                  <EmailSignatureEditor value={signature} onChange={setSignature} />
                ) : (
                  <div className="p-3 sm:p-4 border rounded bg-slate-50 overflow-x-auto max-w-full">
                    <div
                      className="signature-preview-output text-sm sm:text-base"
                      style={{ lineHeight: '1.4', minHeight: '1em' }}
                      dangerouslySetInnerHTML={{ __html: signature || 'No signature set' }}
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button onClick={handleSend} disabled={sending || recipients.length === 0} className="w-full h-12 text-base font-bold shadow-lg shadow-primary/10">
                  {sending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send to {recipients.length} Recipient{recipients.length !== 1 ? 's' : ''}</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 order-1 lg:order-2">
          <Card className="border-0 shadow-md shadow-primary/5">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Recipients
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Send To</label>
                <Select value={recipientMode} onValueChange={v => { setRecipientMode(v); setSelectedMembers([]); }}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members ({members.length})</SelectItem>
                    <SelectItem value="select">Select Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recipientMode === 'select' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="h-10"
                  />
                  <div className="border rounded-lg overflow-hidden max-h-60 sm:max-h-72 overflow-y-auto text-sm bg-background">
                    {(memberSearch
                      ? [{
                          label: 'Results',
                          status: 'search',
                          members: members.filter(m =>
                            `${getMemberName(m)} ${m.email}`.toLowerCase().includes(memberSearch.toLowerCase())
                          )
                        }]
                      : [
                          { label: 'Active', status: 'active', members: grouped.active, color: 'text-green-600' },
                          { label: 'Pending', status: 'pending', members: grouped.pending, color: 'text-amber-600' },
                          { label: 'Inactive', status: 'inactive', members: grouped.inactive, color: 'text-red-500' },
                        ]
                    ).map(group => (
                      <div key={group.status}>
                        <button
                          onClick={() => group.status === 'search'
                            ? null
                            : setExpandedGroups(p => ({ ...p, [group.status]: !p[group.status] }))
                          }
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 font-medium hover:bg-muted transition-colors sticky top-0 z-10 border-b"
                        >
                          <div className="flex items-center gap-2">
                            {group.status !== 'search' && (
                              <Checkbox
                                checked={group.members.length > 0 && group.members.every(m => selectedMembers.find(s => s.id === m.id))}
                                onCheckedChange={() => toggleGroup(group.status)}
                                onClick={e => e.stopPropagation()}
                              />
                            )}
                            <span className={cn("text-xs uppercase tracking-wider font-bold", group.color)}>{group.label}</span>
                            <span className="text-xs text-muted-foreground font-normal">({group.members.length})</span>
                          </div>
                          {group.status !== 'search' && (
                            expandedGroups[group.status]
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        {(group.status === 'search' || expandedGroups[group.status]) && (
                          <div className="divide-y divide-border/50">
                            {group.members.length === 0 ? (
                              <div className="px-3 py-4 text-center text-muted-foreground italic text-xs">No members found</div>
                            ) : (
                              group.members.map(m => (
                                <label key={m.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors">
                                  <Checkbox
                                    checked={!!selectedMembers.find(s => s.id === m.id)}
                                    onCheckedChange={() => toggleMember(m)}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate text-sm">{getMemberName(m)}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                                  </div>
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-3 sm:pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-dashed">
                  <User className="w-4 h-4 text-primary" />
                  <span><strong className="text-foreground">{recipients.length}</strong> recipient{recipients.length !== 1 ? 's' : ''} selected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}