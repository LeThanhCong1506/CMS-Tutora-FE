import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  /** Text lẫn LaTeX: $inline$ và $$block$$. Phần ngoài $ giữ nguyên. */
  children: string;
  className?: string;
}

/**
 * Render text môn Toán có công thức LaTeX. Tách $...$ (inline) và $$...$$ (block),
 * render bằng KaTeX; phần text thường giữ nguyên. Lỗi cú pháp -> hiện raw (không vỡ UI).
 */
const MathTextImpl: React.FC<MathTextProps> = ({ children, className }) => {
  const html = useMemo(() => renderMathToHtml(children ?? ''), [children]);
  return (
    <span
      // line-height cho .katex nằm ở index.css (cần !important, xem chú thích ở đó).
      className={`leading-relaxed ${className ?? ''}`}
      // KaTeX sinh HTML an toàn từ input toán học; input là nội dung câu hỏi nội bộ.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// memo: nhiều câu × nhiều công thức -> tránh render lại KaTeX khi parent re-render.
export const MathText = React.memo(MathTextImpl);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderOne(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    // Fallback: hiện raw có ký hiệu $ để staff biết chỗ lỗi.
    const wrap = displayMode ? '$$' : '$';
    return escapeHtml(`${wrap}${tex}${wrap}`);
  }
}

/**
 * Quét chuỗi, tách segment $$...$$ và $...$, render KaTeX, còn lại escape HTML.
 * Xử lý tuần tự để không nhầm $$ với 2 lần $.
 */
function renderMathToHtml(input: string): string {
  let out = '';
  let i = 0;
  const n = input.length;

  while (i < n) {
    if (input[i] === '$') {
      const isBlock = input[i + 1] === '$';
      const delim = isBlock ? '$$' : '$';
      const start = i + delim.length;
      const end = input.indexOf(delim, start);
      if (end !== -1) {
        const tex = input.slice(start, end);
        out += renderOne(tex, isBlock);
        i = end + delim.length;
        continue;
      }
      // Không có delimiter đóng -> coi $ là text thường.
    }
    // Gom text thường. Nếu i ĐANG ở '$' (không có delimiter đóng ở trên) thì
    // xuất chính ký tự '$' đó rồi tiến 1 bước — TRÁNH vòng lặp vô hạn khi
    // nextDollar === i (i đứng ngay tại '$'). Nếu không, gom tới '$' kế tiếp.
    if (input[i] === '$') {
      out += '$';
      i += 1;
      continue;
    }
    const nextDollar = input.indexOf('$', i);
    const textEnd = nextDollar === -1 ? n : nextDollar;
    out += escapeHtml(input.slice(i, textEnd)).replace(/\n/g, '<br/>');
    i = textEnd;
  }
  return out;
}
