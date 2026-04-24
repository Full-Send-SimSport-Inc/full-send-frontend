import React, { useRef, useEffect } from 'react';

export default function EmailSignatureEditor({ value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
          Visual Editor
        </label>
        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
          PROTECTED LAYOUT
        </span>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>Tip:</strong> You may edit the text below to apply a personalised salutation. Please don't adjust the main body of the signature without prior approval from the Executive Committee.
        </p>
      </div>

      {/* Note: We've removed the global contentEditable here.
          Instead, we rely on the HTML in your constant having
          contenteditable="true" on specific parts if you want
          surgical precision, OR we keep the table clean with CSS.
      */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-2 border-2 border-dashed border-primary/20 rounded-lg bg-white min-h-[150px] focus:outline-none transition-all overflow-x-auto"
        style={{
          lineHeight: '1.4',
          // This CSS prevents the table from expanding weirdly in the editor
          display: 'block',
          width: '100%'
        }}
        spellCheck="false"
      />

    </div>
  );
}