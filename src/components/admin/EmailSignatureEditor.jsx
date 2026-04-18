import React from 'react';
import { Textarea } from '@/components/ui/textarea';

/**
 * A dedicated component for editing email signatures.
 * Used by AdminEmail.jsx and SendEmailDialog.
 */
export default function EmailSignatureEditor({ value, onChange }) {
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your email signature..."
        className="min-h-[120px] font-mono text-sm bg-white text-slate-900 border-primary/20 focus:border-primary"
      />
      <p className="text-[10px] text-muted-foreground italic">
        Tip: Use standard text. HTML is not supported in this simple editor.
      </p>
    </div>
  );
}