import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Send, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import EmailSignatureEditor from './EmailSignatureEditor';

const DEFAULT_SIGNATURE = `Kind regards,`;

export default function SendEmailDialog({ member, trigger }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState(DEFAULT_SIGNATURE);
  const [showSig, setShowSig] = useState(false);
  const [sending, setSending] = useState(false);

  if (!member) return null;

  const handleSend = async () => {
    // 1. Validation
    if (!subject.trim() || !body.trim()) {
      toast.error('Please fill in subject and message.');
      return;
    }

    setSending(true);

    // 2. Format the message
    // Note: We keep the "Hi Name" here, and the PHP will append the Revolgy footer
    const recipientName = member.display_name || member.first_name || 'Member';
    const fullBody = `Hi ${recipientName},\n\n${body}${signature ? `\n\n---\n${signature}` : ''}`;

    try {
      // 3. API Call
      // We send [member.email] as an array.
      // Because the array length is 1, the new PHP logic will put them in the "To" field.
      await base44.post('/admin/send-email', {
        to_emails: [member.email],
        from_name: 'Full Send SimSport', // Matches your branded "From" name
        subject: subject,
        body: fullBody,
      });

      // 4. Success Handling
      toast.success(`Email sent to ${recipientName}!`);
      setOpen(false);
      setSubject('');
      setBody('');
    } catch (error) {
      console.error('Email Error:', error);
      toast.error('Failed to send email. Please check the system logs.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Mail className="w-4 h-4 mr-2" /> Email
          </Button>
        )}
      </DialogTrigger>
      {/* Responsive Adjustments:
        - Max-width restricted on large screens, full width minus margins on small.
        - Padding optimized for mobile.
      */}
      <DialogContent className="w-[95vw] max-w-lg p-4 sm:p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl truncate pr-6">
            Email {member.display_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground ml-1">Subject</label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Enter subject"
              className="h-11 sm:h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground ml-1">Message</label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              className="min-h-[120px] text-base sm:text-sm"
            />
          </div>

          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signature</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary"
                onClick={() => setShowSig(!showSig)}
              >
                {showSig ? 'Done' : 'Edit'}
              </Button>
            </div>
            {showSig ? (
              <div className="animate-in fade-in duration-200">
                <EmailSignatureEditor value={signature} onChange={setSignature} />
              </div>
            ) : (
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans italic">
                {signature}
              </pre>
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full h-12 sm:h-11 font-bold shadow-lg shadow-primary/10"
            >
              {sending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Send Now</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}