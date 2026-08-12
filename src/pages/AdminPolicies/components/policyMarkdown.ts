import { Marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * Cầu nối giữa editor WYSIWYG (làm việc trên HTML) và kho lưu trữ (Markdown).
 *
 * Vẫn lưu Markdown chứ không lưu HTML: trang công khai render bằng `react-markdown` không bật
 * raw HTML, và Markdown là thứ diff/review được khi có tranh chấp về câu chữ điều khoản.
 *
 * Đã đối chiếu vòng Markdown → HTML → Markdown trên cả 6 văn bản đang có: HTML render ra giống
 * hệt, và vòng thứ hai cho kết quả y vòng đầu. Khác biệt còn lại thuần hình thức — một dòng
 * trống chèn trước danh sách, và `|---|` giãn thành `| --- |`.
 */

const marked = new Marked({ gfm: true, breaks: true });

// GFM tự biến "support@tutora.vn" thành liên kết mailto. Văn bản pháp lý cố ý để email dạng
// chữ thường; tự gắn link là sửa nội dung của người soạn. Liên kết viết tay `[chữ](url)` do
// tokenizer `link` xử lý nên không ảnh hưởng.
marked.use({ tokenizer: { autolink: () => undefined, url: () => undefined } });

const turndown = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
});

turndown.use(gfm);

const isInsideTableCell = (node: Node): boolean => {
    for (let current = node.parentNode; current; current = current.parentNode) {
        if (current.nodeName === 'TD' || current.nodeName === 'TH') return true;
        if (current.nodeName === 'TABLE') return false;
    }
    return false;
};

// Trang công khai bật `remark-breaks`, nên một dấu xuống dòng đã đủ là ngắt dòng. Mặc định của
// turndown là hai dấu cách cuối dòng — thứ rác vô hình trong văn bản pháp lý.
turndown.addRule('hardBreak', {
    filter: 'br',
    // Trong ô bảng thì không được xuống dòng: một dấu \n là vỡ luôn cú pháp bảng Markdown.
    replacement: (_content, node) => (isInsideTableCell(node) ? ' ' : '\n'),
});

// Ô trống trong bảng: mặc định turndown bỏ hẳn cell rỗng, đọc lại là lệch số cột.
turndown.addRule('emptyTableCell', {
    filter: (node) => (node.nodeName === 'TD' || node.nodeName === 'TH') && !node.textContent?.trim(),
    replacement: () => ' ',
});

// Mặc định turndown thụt "-   " (ba dấu cách). Ghi đè để ra "- " đúng như nội dung đang lưu,
// nếu không thì mỗi lần lưu là toàn bộ dòng danh sách hiện lên trong diff.
turndown.addRule('listItem', {
    filter: 'li',
    replacement: (content, node, options) => {
        const body = content
            .replace(/^\n+/, '')
            .replace(/\n+$/, '\n')
            .replace(/\n/gm, '\n  ');

        const parent = node.parentNode as HTMLElement | null;
        let marker = `${options.bulletListMarker} `;

        if (parent?.nodeName === 'OL') {
            const start = parent.getAttribute('start');
            const index = Array.prototype.indexOf.call(parent.children, node);
            marker = `${(start ? Number(start) : 1) + index}. `;
        }

        return marker + body + (node.nextSibling && !/\n$/.test(body) ? '\n' : '');
    },
});

/** Trong dòng tiêu đề, "## 1. Giới thiệu" không thể bị hiểu thành danh sách nên đừng escape. */
const unescapeHeadings = (markdown: string) =>
    markdown.replace(/^(#{1,6} .*)$/gm, (line) => line.replace(/\\([.)\-*_[\]#])/g, '$1'));

/**
 * Gỡ những thứ Tiptap tự thêm vào cấu trúc, làm trước khi đưa cho turndown.
 *
 * Cả ba đều đã đối chiếu trên 6 văn bản thật: thiếu bước này thì 12 bảng trong Chính sách bảo
 * mật, Cookie và Quy tắc cộng đồng biến thành khối HTML thô giữa trang, còn mọi danh sách thì
 * bị giãn thêm khoảng trống giữa các gạch đầu dòng.
 */
const stripEditorArtifacts = (html: string) =>
    html
        // <colgroup> đứng trước <tbody> khiến turndown không nhận ra hàng tiêu đề, và nó bỏ qua
        // luôn cả bảng — giữ nguyên dạng HTML thay vì đổi sang Markdown.
        .replace(/<colgroup[\s\S]*?<\/colgroup>/gi, '')
        // Tiptap bọc nội dung mỗi ô trong <p>. Để nguyên thì turndown chèn dòng trống giữa ô,
        // mà một dấu xuống dòng là vỡ cú pháp bảng.
        .replace(/(<(?:th|td)\b[^>]*>)([\s\S]*?)(<\/(?:th|td)>)/gi, (_match, open, inner, close) => {
            const merged = (inner as string)
                .replace(/<\/p>\s*<p\b[^>]*>/gi, ' ')
                .replace(/<\/?p\b[^>]*>/gi, '');
            return `${open}${merged}${close}`;
        })
        // <li><p>chữ</p></li> → <li>chữ</li>. Có <p> thì turndown sinh danh sách "lỏng" (mỗi
        // mục cách nhau một dòng trống), render ra thưa hơn hẳn bản gốc. Chỉ gỡ khi <p> là con
        // duy nhất — mục có nhiều đoạn thì giữ nguyên vì đó là ý người soạn.
        .replace(/(<li\b[^>]*>)\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*(<\/li>)/gi, '$1$2$3');

export const markdownToHtml = (markdown: string): string => marked.parse(markdown ?? '', { async: false });

export const htmlToMarkdown = (html: string): string =>
    unescapeHeadings(turndown.turndown(stripEditorArtifacts(html ?? '')))
        .replace(/\n{3,}/g, '\n\n')
        .trim();
