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
  const [recipientMode, setRecipientMode] = useState('all'); // all | group | individual
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
    queryKey: ['admin-users'], // Reusing the same query key to save bandwidth!
    queryFn: () => base44.get('/admin/users'),
  });

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

  const searchResults = memberSearch.length > 1
    ? members.filter(m =>
        `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(memberSearch.toLowerCase()) &&
        !selectedMembers.find(s => s.id === m.id)
      ).slice(0, 6)
    : [];

  const recipients = recipientMode === 'all'
    ? members
    : selectedMembers;

  const fullBody = body + (signature ? `\n\n---\n${signature}` : '');

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || recipients.length === 0) {
      toast.error('Please fill in subject, body and select at least one recipient.');
      return;
    }
    setSending(true);
    try {
      // Create an array of email addresses
      const emailList = recipients.map(m => m.email);

      // Send ONE request to PHP, let PHP handle the loop and wp_mail
      await base44.post('/admin/send-email', {
        to_emails: recipients, // This will be a large array, triggering the PHP BCC logic
        from_name: 'Full Send SimSport',
        subject: subject,
        body: fullBody,
      });

      setSent(true);
      toast.success(`Emails successfully queued for sending!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send emails. Check server logs.');
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
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-bold">Emails Sent!</h2>
        <p className="text-muted-foreground">Successfully sent to {recipients.length} member{recipients.length !== 1 ? 's' : ''}.</p>
        <Button onClick={resetForm}>Send Another Email</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Send Email</h1>
        <p className="text-muted-foreground mt-1">Compose and send emails to members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-md shadow-primary/5">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail className="w-5 h-5" /> Compose</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">From Name</label>
                <Input
                  placeholder="e.g. Full Send SimSports Committee"
                  value={fromName}
                  onChange={e => setFromName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Email subject..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Message</label>
                <p className="text-xs text-muted-foreground">The recipient's first name will be added automatically as a greeting.</p>
                <Textarea
                  placeholder="Write your message here..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={8}
                />
              </div>

				{/* Signature Section in AdminEmail.jsx */}
				<div className="border rounded-lg p-4 bg-white space-y-3">
				  <div className="flex items-center justify-between border-b pb-2">
					<span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Email Signature</span>
					<Button variant="outline" size="sm" onClick={() => setShowSigEditor(!showSigEditor)}>
					  {showSigEditor ? 'Save & Close' : 'Edit Signature'}
					</Button>
				  </div>
				  
				  {showSigEditor ? (
					<EmailSignatureEditor value={signature} onChange={setSignature} />
				  ) : (
					<div className="p-4 border rounded bg-slate-50 overflow-x-auto">
					  {/* Static Preview for when not editing */}
					  <div dangerouslySetInnerHTML={{ __html: signature || 'No signature set' }} />
					</div>
				  )}
				</div>

              <Button onClick={handleSend} disabled={sending || recipients.length === 0} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Sending...' : `Send to ${recipients.length} Recipient${recipients.length !== 1 ? 's' : ''}`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recipients */}
        <div className="space-y-4">
          <Card className="border-0 shadow-md shadow-primary/5">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Recipients</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Send To</label>
                <Select value={recipientMode} onValueChange={v => { setRecipientMode(v); setSelectedMembers([]); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members ({members.length})</SelectItem>
                    <SelectItem value="select">Select Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recipientMode === 'select' && (
                <div className="space-y-2">
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                  />
                  <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto text-sm">
                    {(memberSearch
                      ? [{ label: 'Results', status: 'search', members: members.filter(m =>
                          `${m.display_name} ${m.email}`.toLowerCase().includes(memberSearch.toLowerCase())
                        )}]
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
                          className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 font-medium hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {group.status !== 'search' && (
                              <Checkbox
                                checked={group.members.length > 0 && group.members.every(m => selectedMembers.find(s => s.id === m.id))}
                                onCheckedChange={() => toggleGroup(group.status)}
                                onClick={e => e.stopPropagation()}
                              />
                            )}
                            <span className={group.color}>{group.label}</span>
                            <span className="text-xs text-muted-foreground font-normal">({group.members.length})</span>
                          </div>
                          {group.status !== 'search' && (
                            expandedGroups[group.status]
                              ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
                              : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                        {(group.status === 'search' || expandedGroups[group.status]) && group.members.map(m => (
                          <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer border-t">
                            <Checkbox
                              checked={!!selectedMembers.find(s => s.id === m.id)}
                              onCheckedChange={() => toggleMember(m)}
                            />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{m.display_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  {selectedMembers.length > 0 && (
                    <button onClick={() => setSelectedMembers([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      Clear all ({selectedMembers.length} selected)
                    </button>
                  )}
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
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