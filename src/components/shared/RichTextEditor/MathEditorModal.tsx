import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
}

const MATH_GROUPS = [
  {
    name: 'CƠ BẢN',
    items: [
      { label: 'a/b', latex: '\\frac{a}{b}' },
      { label: '()', latex: '\\left( \\right)' },
      { label: 'x²', latex: 'x^2' },
      { label: 'x³', latex: 'x^3' },
      { label: 'xⁿ', latex: 'x^{n}' },
      { label: 'xₙ', latex: 'x_{n}' },
      { label: '=', latex: '=' },
      { label: 'π', latex: '\\pi' },
      { label: '∞', latex: '\\infty' },
      { label: 'Σ', latex: '\\sum' },
      { label: '∫', latex: '\\int' },
      { label: 'dx/dy', latex: '\\frac{dx}{dy}' },
      { label: 'f(x)', latex: 'f(x)' },
      { label: 'lim', latex: '\\lim_{x \\to \\infty}' },
    ],
  },
  {
    name: 'PHÉP TOÁN',
    items: [
      { label: '+', latex: '+' },
      { label: '-', latex: '-' },
      { label: '×', latex: '\\times' },
      { label: '÷', latex: '\\div' },
      { label: '⋅', latex: '\\cdot' },
      { label: '/', latex: '/' },
      { label: '±', latex: '\\pm' },
      { label: '~', latex: '\\sim' },
      { label: '√', latex: '\\sqrt{}' },
      { label: '∛', latex: '\\sqrt[3]{}' },
      { label: 'ⁿ√', latex: '\\sqrt[n]{}' },
    ],
  },
  {
    name: 'SO SÁNH',
    items: [
      { label: '<', latex: '<' },
      { label: '>', latex: '>' },
      { label: '≤', latex: '\\le' },
      { label: '≥', latex: '\\ge' },
      { label: '≠', latex: '\\ne' },
      { label: '≈', latex: '\\approx' },
      { label: '≪', latex: '\\ll' },
      { label: '≫', latex: '\\gg' },
    ],
  },
  {
    name: 'MŨI TÊN',
    items: [
      { label: '→', latex: '\\rightarrow' },
      { label: '←', latex: '\\leftarrow' },
      { label: '↔', latex: '\\leftrightarrow' },
      { label: '⇒', latex: '\\Rightarrow' },
      { label: '⇐', latex: '\\Leftarrow' },
      { label: '⇔', latex: '\\Leftrightarrow' },
    ],
  },
  {
    name: 'LƯỢNG GIÁC & LOG',
    items: [
      { label: 'sin', latex: '\\sin' },
      { label: 'cos', latex: '\\cos' },
      { label: 'tan', latex: '\\tan' },
      { label: '°', latex: '^\\circ' },
      { label: 'log', latex: '\\log' },
      { label: 'log₁₀', latex: '\\log_{10}' },
      { label: 'ln', latex: '\\ln' },
      { label: 'cot', latex: '\\cot' },
    ],
  },
  {
    name: 'TẬP HỢP',
    items: [
      { label: '⊂', latex: '\\subset' },
      { label: '⊃', latex: '\\supset' },
      { label: '∩', latex: '\\cap' },
      { label: '∪', latex: '\\cup' },
      { label: '∅', latex: '\\emptyset' },
      { label: '∈', latex: '\\in' },
      { label: '∉', latex: '\\notin' },
      { label: '∀', latex: '\\forall' },
      { label: '∃', latex: '\\exists' },
      { label: 'ℝ', latex: '\\mathbb{R}' },
      { label: 'ℕ', latex: '\\mathbb{N}' },
      { label: 'ℤ', latex: '\\mathbb{Z}' },
      { label: 'ℚ', latex: '\\mathbb{Q}' },
    ],
  },
  {
    name: 'HY LẠP',
    items: [
      { label: 'α', latex: '\\alpha' },
      { label: 'β', latex: '\\beta' },
      { label: 'γ', latex: '\\gamma' },
      { label: 'Δ', latex: '\\Delta' },
      { label: 'δ', latex: '\\delta' },
      { label: 'ε', latex: '\\varepsilon' },
      { label: 'θ', latex: '\\theta' },
      { label: 'λ', latex: '\\lambda' },
      { label: 'μ', latex: '\\mu' },
      { label: 'π', latex: '\\pi' },
      { label: 'σ', latex: '\\sigma' },
      { label: 'ω', latex: '\\omega' },
      { label: 'Ω', latex: '\\Omega' },
    ],
  },
];

export const MathEditorModal: React.FC<Props> = ({ isOpen, onClose, onInsert }) => {
  const [latex, setLatex] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset when open
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLatex('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const insertLatex = (str: string) => {
    const el = textareaRef.current;
    if (!el) {
      setLatex((prev) => prev + str);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = latex;
    const next = current.slice(0, start) + str + current.slice(end);
    setLatex(next);

    // Reposition cursor
    setTimeout(() => {
      el.focus();
      const newPos = start + str.length;
      // If it contains empty braces {}, put cursor inside them
      const braceOffset = str.indexOf('{}');
      if (braceOffset !== -1) {
        el.setSelectionRange(start + braceOffset + 1, start + braceOffset + 1);
      } else {
        el.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl! bg-slate-50 z-100 flex flex-col backdrop-blur-sm backdrop-brightness-75 overflow-hidden">
        <DialogHeader>
          <DialogTitle>Nhập công thức toán</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-125">
          {/* Left: Preview & Input */}
          <div className="flex flex-col gap-4 border-r pr-4">
            <div className="flex-1 rounded-xl border bg-slate-50 p-6 flex items-center justify-center overflow-auto min-h-[200px]">
              {latex.trim() ? (
                <div className="text-xl">
                  <BlockMath math={latex} errorColor="#cc0000" />
                </div>
              ) : (
                <p className="text-sm text-slate-400">Xem trước công thức</p>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <label className="text-xs font-semibold text-slate-500">Mã LaTeX</label>
              <Textarea
                ref={textareaRef}
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                placeholder="Nhập mã LaTeX ở đây..."
                className="h-28 font-mono text-sm"
              />
            </div>
          </div>

          {/* Right: Buttons Grid */}
          <div className="overflow-y-auto pr-2 pb-4">
            <div className="flex flex-col gap-6">
              {MATH_GROUPS.map((group) => (
                <div key={group.name}>
                  <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                    {group.name}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <Button
                        key={item.label}
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 text-sm font-medium hover:bg-slate-100"
                        onClick={() => insertLatex(item.latex)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 mt-2">
          <Button variant="urgent" onClick={onClose}>
            Hủy
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              if (latex.trim()) {
                onInsert(latex);
              }
              onClose();
            }}
          >
            Chèn công thức
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
