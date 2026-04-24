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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // 1. Get the current selection/cursor position
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);

      // 2. Create a <br> element and a dummy text node to force visibility
      const br = document.createElement('br');
      const extraBr = document.createElement('br'); // Browsers often need a trailing BR to show the line

      range.deleteContents();
      range.insertNode(br);

      // 3. Move cursor after the new break
      range.setStartAfter(br);
      range.setEndAfter(br);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      // 4. Force React to recognize the change immediately
      handleInput();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
          Visual Editor (Click to edit text)
        </label>
        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
          LIVE PREVIEW MODE
        </span>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="p-4 border-2 border-dashed border-primary/20 rounded-lg bg-white min-h-[150px] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
        style={{
          lineHeight: '1.4',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
        spellCheck="false"
      />

      <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Note:</strong>  You can edit the text above. The main signature is added automatically by default.
        </p>
      </div>
    </div>
  );
}