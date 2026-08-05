import { useEffect } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { TableKit } from '@tiptap/extension-table';

interface Props {
  value: string;
  onChange: (html: string) => void;
  /** Visible rows, roughly — matches the old textarea sizing. */
  minRows?: number;
  /**
   * Adds the table tools. Off by default so only Học phí — where tuition
   * varies by faculty — carries the extra toolbar group.
   */
  withTable?: boolean;
}

/** Text colours offered in the toolbar. Kept short: a palette, not a picker. */
const COLORS = [
  { label: 'Mặc định', value: '' },
  { label: 'Đỏ', value: '#dc2626' },
  { label: 'Cam', value: '#c2410c' },
  { label: 'Xanh lá', value: '#15803d' },
  { label: 'Xanh dương', value: '#1d4ed8' },
];

function ToolbarButton({
  editor,
  label,
  title,
  isActive,
  onClick,
}: {
  editor: Editor;
  label: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button" // inside a <form>: without this it would submit the page
      className={`rte-btn${isActive ? ' rte-btn-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      // onMouseDown + preventDefault keeps focus in the editor, so the command
      // applies to the current selection instead of an emptied one.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={!editor.isEditable}
    >
      {label}
    </button>
  );
}

/**
 * TipTap editor for the descriptive university fields. Lazy-loaded by
 * UniversityFormPage so the editor never ships to sale accounts, who cannot
 * reach the admin form at all.
 *
 * Emits HTML, stored as-is in the existing text columns. Everything it can
 * produce is inside the allow-list in `src/lib/sanitize.ts` — keep the two in
 * step if the toolbar grows.
 */
export default function RichTextEditor({
  value,
  onChange,
  minRows = 3,
  withTable = false,
}: Props) {
  const editor = useEditor({
    // Required under React StrictMode (src/main.tsx): with the default,
    // TipTap builds the view during the first render pass, which StrictMode's
    // double-invocation tears down mid-flight — the editor then throws on a
    // null state instead of mounting.
    immediatelyRender: false,
    // v3 defaults this to false, which leaves toolbar isActive() checks stale:
    // buttons would never light up for the current selection. Marked legacy
    // upstream; the eventual replacement is the useEditorState hook.
    shouldRerenderOnTransaction: true,
    extensions: [
      // StarterKit v3 already bundles Underline and Link; registering them
      // separately would duplicate the extension.
      StarterKit.configure({
        heading: { levels: [2, 3] }, // the drawer's school name is the h2 above
        link: { openOnClick: false, autolink: true },
        codeBlock: false,
        horizontalRule: false,
        blockquote: false,
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      // TableKit bundles Table, TableRow, TableHeader and TableCell.
      ...(withTable ? [TableKit.configure({ table: { resizable: true } })] : []),
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      // TipTap emits "<p></p>" for an empty document; store '' so the drawer's
      // `value || '—'` fallback and the `{u.sale_notes && …}` guards still work.
      const html = ed.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Re-sync when the form loads a different university into the same editor
  // instance. Guarded on inequality, otherwise every keystroke resets the
  // cursor to the start of the document.
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    if (incoming !== editor.getHTML() && incoming !== '') {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return <div className="rte" aria-busy="true" />;

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Đường dẫn (để trống để xóa liên kết):', previous ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Định dạng văn bản">
        <ToolbarButton editor={editor} label="B" title="In đậm"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton editor={editor} label="I" title="In nghiêng"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton editor={editor} label="U" title="Gạch chân"
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <ToolbarButton editor={editor} label="S" title="Gạch ngang"
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()} />

        <span className="rte-sep" aria-hidden />

        <ToolbarButton editor={editor} label="H2" title="Tiêu đề lớn"
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolbarButton editor={editor} label="H3" title="Tiêu đề nhỏ"
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />

        <span className="rte-sep" aria-hidden />

        <ToolbarButton editor={editor} label="• Danh sách" title="Danh sách dấu chấm"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarButton editor={editor} label="1. Danh sách" title="Danh sách đánh số"
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} />

        <span className="rte-sep" aria-hidden />

        <ToolbarButton editor={editor} label="🔗" title="Chèn liên kết"
          isActive={editor.isActive('link')} onClick={setLink} />
        <ToolbarButton editor={editor} label="🖍" title="Tô nền vàng"
          isActive={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()} />

        <select
          className="rte-color"
          aria-label="Màu chữ"
          title="Màu chữ"
          value={(editor.getAttributes('textStyle').color as string) ?? ''}
          onChange={(e) => {
            const c = e.target.value;
            if (c) editor.chain().focus().setColor(c).run();
            else editor.chain().focus().unsetColor().run();
          }}
        >
          {COLORS.map((c) => (
            <option key={c.label} value={c.value}>{c.label}</option>
          ))}
        </select>

        {withTable && (
          <>
            <span className="rte-sep" aria-hidden />
            <ToolbarButton editor={editor} label="⊞ Bảng" title="Chèn bảng 3×3"
              isActive={editor.isActive('table')}
              onClick={() =>
                editor.chain().focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              } />
            {/* Row and column tools only bite inside a table; disable them
                elsewhere rather than letting a click do nothing silently. */}
            <ToolbarButton editor={editor} label="+ Hàng" title="Thêm hàng bên dưới"
              isActive={false}
              onClick={() => editor.chain().focus().addRowAfter().run()} />
            <ToolbarButton editor={editor} label="− Hàng" title="Xóa hàng"
              isActive={false}
              onClick={() => editor.chain().focus().deleteRow().run()} />
            <ToolbarButton editor={editor} label="+ Cột" title="Thêm cột bên phải"
              isActive={false}
              onClick={() => editor.chain().focus().addColumnAfter().run()} />
            <ToolbarButton editor={editor} label="− Cột" title="Xóa cột"
              isActive={false}
              onClick={() => editor.chain().focus().deleteColumn().run()} />
            <ToolbarButton editor={editor} label="🗑 Bảng" title="Xóa toàn bộ bảng"
              isActive={false}
              onClick={() => editor.chain().focus().deleteTable().run()} />
          </>
        )}
      </div>

      <EditorContent
        className="rte-content"
        editor={editor}
        style={{ minHeight: `${minRows * 1.6 + 1.2}rem` }}
      />
    </div>
  );
}
