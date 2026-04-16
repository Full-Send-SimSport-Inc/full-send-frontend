import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Send } from 'lucide-react';
import { toast } from "sonner";
import EmailSignatureEditor from './EmailSignatureEditor';

const DEFAULT_SIGNATURE = `Kind regards,
Full Send SimSports Committee
https://fullsendsims.com.au`;

export default function SendEmailDialog({ member, trigger }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [fromName, setFromName] = useState('Full Send SimSports');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState(DEFAULT_SIGNATURE);
  const [showSig, setShowSig] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in subject and message.', variant: 'destructive' });
      return;
    }
    setSending(true);
    const fullBody = `Hi ${member.first_name},\n\n${body}${signature ? `\n\n---\n${signature}` : ''}`;
    await base44.integrations.Core.SendEmail({
      to: member.email,
      from_name: fromName || 'Full Send SimSports',
      subject,
      body: fullBody,
    });
    setSending(false);
    toast({ title: `Email sent to ${member.first_name} ${member.last_name}!` });
    setOpen(false);
    setSubject('');
    setBody('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" /> Send Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" /> Email {member.first_name} {member.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            To: <strong className="text-foreground">{member.email}</strong>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">From Name</label>
            <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Full Send SimSports" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Subject</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Message</label>
            <p className="text-xs text-muted-foreground">"{member.first_name}" will be added as a greeting automatically.</p>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." rows={5} />
          </div>
          <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Signature</span>
              <Button variant="ghost" size="sm" onClick={() => setShowSig(!showSig)}>
                {showSig ? 'Done' : 'Edit'}
              </Button>
            </div>
            {showSig ? (
              <EmailSignatureEditor value={signature} onChange={setSignature} />
            ) : (
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{signature || 'No signature set'}</pre>
            )}
          </div>
          <Button onClick={handleSend} disabled={sending} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}