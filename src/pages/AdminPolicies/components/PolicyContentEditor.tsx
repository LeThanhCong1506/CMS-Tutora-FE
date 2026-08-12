import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import {
    Bold as BoldIcon,
    Italic as ItalicIcon,
    Link2,
    List,
    ListOrdered,
    Redo2,
    Table as TableIcon,
    Undo2,
} from 'lucide-react';
import { htmlToMarkdown, markdownToHtml } from './policyMarkdown';

interface PolicyContentEditorProps {
    /** Markdown — đúng thứ lưu xuống DB. */
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

/** Kiểu khối văn bản. Không có Tiêu đề 1: tiêu đề văn bản đã là trường riêng, trang công khai
 *  render nó thành h1 nên trong nội dung chỉ dùng từ cấp 2 trở xuống. */
const BLOCK_STYLES = [
    { key: 'paragraph', label: 'Văn bản thường' },
    { key: 'heading-2', label: 'Tiêu đề mục' },
    { key: 'heading-3', label: 'Tiêu đề phụ' },
] as const;

type BlockStyle = (typeof BLOCK_STYLES)[number]['key'];

const currentBlockStyle = (editor: Editor): BlockStyle => {
    if (editor.isActive('heading', { level: 2 })) return 'heading-2';
    if (editor.isActive('heading', { level: 3 })) return 'heading-3';
    return 'paragraph';
};

/**
 * Ô soạn nội dung văn bản chính sách — gõ thấy ngay định dạng, giống Google Docs.
 *
 * Nội dung vẫn LƯU dưới dạng Markdown: trang công khai render bằng `react-markdown` không bật
 * raw HTML, và Markdown là thứ diff/review được khi tranh chấp câu chữ điều khoản. Việc quy
 * đổi nằm gọn trong `policyMarkdown.ts`.
 *
 * Chỉ phát `onChange` khi người dùng thật sự sửa: mở một văn bản rồi bấm Lưu mà không đụng gì
 * thì Markdown gốc giữ nguyên từng ký tự, không bị vòng quy đổi viết lại.
 *
 * Cố ý TẮT gạch chân: Markdown không có cú pháp gạch chân, bật lên thì lúc lưu sẽ đẻ ra thẻ
 * `<u>` mà trang công khai in ra thành chữ thô.
 */
const PolicyContentEditor = ({ value, onChange, disabled = false }: PolicyContentEditorProps) => {
    const [linkDraft, setLinkDraft] = useState<string | null>(null);
    /** Bản Markdown do chính editor này phát ra — dùng để bỏ qua lượt `value` dội ngược lại. */
    const lastEmitted = useRef<string | null>(null);

    const editor = useEditor({
        editable: !disabled,
        immediatelyRender: false,
        // Nút trên thanh công cụ phải sáng/tắt theo vị trí con trỏ, nên cần render lại mỗi lượt.
        shouldRerenderOnTransaction: true,
        extensions: [
            StarterKit.configure({
                underline: false,
                heading: { levels: [2, 3] },
                link: { openOnClick: false, autolink: false, linkOnPaste: true },
            }),
            TableKit.configure({ table: { resizable: false } }),
        ],
        content: markdownToHtml(value),
        onUpdate: ({ editor: instance }) => {
            const markdown = htmlToMarkdown(instance.getHTML());
            lastEmitted.current = markdown;
            onChange(markdown);
        },
    });

    // Nạp nội dung khi modal tải xong văn bản từ API. Bỏ qua lượt `value` do chính mình vừa
    // phát ra — nạp lại sẽ nhảy con trỏ về đầu bài giữa lúc đang gõ.
    useEffect(() => {
        if (!editor || value === lastEmitted.current) return;
        editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
        lastEmitted.current = value;
    }, [editor, value]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [editor, disabled]);

    if (!editor) return <div className="policy-editor__loading">Đang mở trình soạn thảo…</div>;

    const openLinkBox = () => {
        setLinkDraft(editor.isActive('link') ? (editor.getAttributes('link').href ?? '') : '');
    };

    const applyLink = () => {
        const href = (linkDraft ?? '').trim();
        if (!href) {
            editor.chain().focus().unsetLink().run();
        } else if (editor.state.selection.empty) {
            // Không bôi đen chữ nào thì chèn chính đường dẫn làm chữ hiển thị, như Google Docs.
            editor.chain().focus().insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
        }
        setLinkDraft(null);
    };

    const setBlockStyle = (style: BlockStyle) => {
        const chain = editor.chain().focus();
        if (style === 'paragraph') chain.setParagraph().run();
        else chain.setHeading({ level: style === 'heading-2' ? 2 : 3 }).run();
    };

    const inTable = editor.isActive('table');

    return (
        <div className={`policy-editor ${disabled ? 'is-readonly' : ''}`}>
            {!disabled && (
                <div className="policy-editor__toolbar">
                    <button
                        type="button"
                        title="Hoàn tác (Ctrl+Z)"
                        disabled={!editor.can().undo()}
                        onClick={() => editor.chain().focus().undo().run()}
                    >
                        <Undo2 size={15} aria-hidden />
                    </button>
                    <button
                        type="button"
                        title="Làm lại (Ctrl+Shift+Z)"
                        disabled={!editor.can().redo()}
                        onClick={() => editor.chain().focus().redo().run()}
                    >
                        <Redo2 size={15} aria-hidden />
                    </button>

                    <span className="policy-editor__divider" />

                    <select
                        className="policy-editor__style"
                        value={currentBlockStyle(editor)}
                        onChange={(event) => setBlockStyle(event.target.value as BlockStyle)}
                        title="Kiểu đoạn"
                    >
                        {BLOCK_STYLES.map((style) => (
                            <option key={style.key} value={style.key}>
                                {style.label}
                            </option>
                        ))}
                    </select>

                    <span className="policy-editor__divider" />

                    <button
                        type="button"
                        title="In đậm (Ctrl+B)"
                        className={editor.isActive('bold') ? 'is-active' : ''}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                        <BoldIcon size={15} aria-hidden />
                    </button>
                    <button
                        type="button"
                        title="In nghiêng (Ctrl+I)"
                        className={editor.isActive('italic') ? 'is-active' : ''}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                    >
                        <ItalicIcon size={15} aria-hidden />
                    </button>

                    <span className="policy-editor__divider" />

                    <button
                        type="button"
                        title="Gạch đầu dòng"
                        className={editor.isActive('bulletList') ? 'is-active' : ''}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                    >
                        <List size={15} aria-hidden />
                    </button>
                    <button
                        type="button"
                        title="Danh sách đánh số"
                        className={editor.isActive('orderedList') ? 'is-active' : ''}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    >
                        <ListOrdered size={15} aria-hidden />
                    </button>

                    <span className="policy-editor__divider" />

                    <button
                        type="button"
                        title="Chèn hoặc sửa liên kết (Ctrl+K)"
                        className={editor.isActive('link') ? 'is-active' : ''}
                        onClick={openLinkBox}
                    >
                        <Link2 size={15} aria-hidden />
                    </button>
                    <button
                        type="button"
                        title="Chèn bảng"
                        onClick={() =>
                            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                        }
                    >
                        <TableIcon size={15} aria-hidden />
                    </button>
                </div>
            )}

            {linkDraft !== null && (
                <div className="policy-editor__linkbar">
                    <input
                        autoFocus
                        value={linkDraft}
                        placeholder="https://… hoặc /about/privacy cho trang nội bộ"
                        onChange={(event) => setLinkDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                applyLink();
                            }
                            if (event.key === 'Escape') setLinkDraft(null);
                        }}
                    />
                    <button type="button" className="admin-ui-button admin-ui-button-primary" onClick={applyLink}>
                        Áp dụng
                    </button>
                    {editor.isActive('link') && (
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-secondary"
                            onClick={() => {
                                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                                setLinkDraft(null);
                            }}
                        >
                            Bỏ liên kết
                        </button>
                    )}
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={() => setLinkDraft(null)}
                    >
                        Huỷ
                    </button>
                </div>
            )}

            {/* Chỉ hiện khi con trỏ đang ở trong bảng — để thanh công cụ chính khỏi dài lê thê. */}
            {inTable && !disabled && (
                <div className="policy-editor__tablebar">
                    <span>Bảng:</span>
                    <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>
                        + Hàng
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>
                        − Hàng
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                        + Cột
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>
                        − Cột
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().deleteTable().run()}>
                        Xoá bảng
                    </button>
                </div>
            )}

            <EditorContent editor={editor} className="policy-editor__surface" />
        </div>
    );
};

export default PolicyContentEditor;
