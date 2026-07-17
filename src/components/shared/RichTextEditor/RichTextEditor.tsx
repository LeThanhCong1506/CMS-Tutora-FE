import React, { useState, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { MathEditorModal } from './MathEditorModal';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Renders content that mixes HTML and LaTeX delimited by $...$ / $$...$$.
 * Same storage model used by VietJack/Khan-style platforms: the source of
 * truth is plain text/HTML with LaTeX delimiters, and KaTeX renders it
 * one-way for preview. Nothing is converted back, so formulas never get lost.
 */
export function renderMathHtml(raw: string): string {
  if (!raw) return '';
  const render = (tex: string, displayMode: boolean) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode,
        throwOnError: false,
        errorColor: '#cc0000',
      });
    } catch {
      return `<span style="color:#cc0000">${tex}</span>`;
    }
  };
  // $$...$$ first (block), then $...$ (inline). Non-greedy, no nesting.
  return raw
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => render(tex, true))
    .replace(/\$([^$\n]+?)\$/g, (_, tex) => render(tex, false));
}

export const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder, className }) => {
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);

  const previewHtml = useMemo(() => renderMathHtml(value), [value]);

  const insertFormula = (latex: string) => {
    // Append the formula (wrapped in $...$) to the current content.
    const snippet = `$${latex}$`;
    const next = value ? `${value} ${snippet}` : snippet;
    onChange(next);
  };

  return (
    <div className={`rich-text-editor-container ${className || ''}`}>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsMathModalOpen(true)}
          className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          <span className="font-serif italic">∑</span> Chèn nhanh công thức
        </button>
        <span className="text-xs text-slate-400">
          Gõ trực tiếp hoặc dùng <code className="rounded bg-slate-100 px-1">$...$</code> cho công thức
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Soạn thảo */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Soạn thảo</label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-40 w-full resize-y rounded-md border border-slate-300 bg-white p-3 font-mono text-sm leading-relaxed focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* Xem trước (KaTeX) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Xem trước</label>
          <div
            className="markdown-body min-h-40 w-full overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: previewHtml || '<span class="text-slate-400">Xem trước nội dung…</span>' }}
          />
        </div>
      </div>

      <MathEditorModal
        isOpen={isMathModalOpen}
        onClose={() => setIsMathModalOpen(false)}
        onInsert={insertFormula}
      />
    </div>
  );
};
