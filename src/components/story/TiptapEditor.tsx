
'use client';

import type { Editor } from '@tiptap/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import type { Content } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect }
 from 'react';

interface TiptapEditorProps {
  content: Content;
  onChange: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
  onEditorChange?: (editor: Editor | null) => void; // Callback to pass editor instance
}

const TiptapToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const iconSize = 'h-4 w-4';

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-muted/50 sticky top-0 z-10">
      <Button
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className={iconSize} />
      </Button>
      <Button
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className={iconSize} />
      </Button>
      <Button
        variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className={iconSize} />
      </Button>
      <Button
        variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className={iconSize} />
      </Button>

      <div className="h-6 border-l mx-1" />

      <Button
        variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 className={iconSize} />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 className={iconSize} />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <Heading3 className={iconSize} />
      </Button>

      <div className="h-6 border-l mx-1" />
      
      <Button
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className={iconSize} />
      </Button>
      <Button
        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered List"
      >
        <ListOrdered className={iconSize} />
      </Button>

      <div className="h-6 border-l mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className={iconSize} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="Redo (Ctrl+Y)"
      >
        <Redo className={iconSize} />
      </Button>
    </div>
  );
};


const TiptapEditor: React.FC<TiptapEditorProps> = ({ content, onChange, editable = true, placeholder, onEditorChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default history to use custom undo/redo buttons if needed,
        // or keep it if you prefer browser's native undo/redo.
        // history: false, 
        // Customize heading levels if needed
        heading: {
          levels: [1, 2, 3],
        },
        // Using default paragraph configuration by not specifying it here.
        // Tailwind prose class will handle styling.
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder || "Start writing your chapter...",
      }),
    ],
    content: content,
    editable: editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    // Pass editor instance creation/update via onCreate or onTransaction
    onCreate: ({ editor }) => {
      if (onEditorChange) {
        onEditorChange(editor);
      }
    },
    // onSelectionUpdate could also be used if needed for specific features reacting to selection
  });

  // Effect to pass editor instance when it changes (e.g., re-initialization)
  useEffect(() => {
    if (onEditorChange) {
      onEditorChange(editor);
    }
    // Cleanup: pass null when component unmounts or editor is destroyed
    return () => {
      if (onEditorChange) {
        onEditorChange(null);
      }
    };
  }, [editor, onEditorChange]);


  return (
    <div className={cn("flex flex-col h-full border rounded-md", { 'bg-muted/30': !editable })}>
      {editable && <TiptapToolbar editor={editor} />}
      <ScrollArea className="flex-1">
        <EditorContent
          editor={editor}
          className={cn(
            "p-4 h-full prose dark:prose-invert max-w-none focus:outline-none story-content", // Ensure `prose` and `dark:prose-invert` are applied for styling
            { 'cursor-not-allowed': !editable }
          )}
        />
      </ScrollArea>
    </div>
  );
};

export default TiptapEditor;
