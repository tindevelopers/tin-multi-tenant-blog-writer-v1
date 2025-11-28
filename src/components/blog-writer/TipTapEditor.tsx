"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import './TipTapEditor.css';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { 
  Bold, 
  Italic, 
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Underline as UnderlineIcon
} from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';
import ImageInsertModal from './ImageInsertModal';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string | null>;
  editable?: boolean;
  className?: string;
  excerpt?: string; // For AI image generation
  showPreview?: boolean; // Show live preview panel
}

// HTML paste cleaner function
function cleanPastedHTML(html: string): string {
  if (typeof window === 'undefined') return html;
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove unwanted attributes and styles
  const elements = tempDiv.querySelectorAll('*');
  elements.forEach((el) => {
    // Remove style attributes (except for specific cases)
    el.removeAttribute('style');
    
    // Remove class attributes that aren't semantic
    const classList = Array.from(el.classList);
    classList.forEach((cls) => {
      // Keep semantic classes like 'prose', 'heading', etc.
      if (!cls.match(/^(prose|heading|paragraph|list|blockquote|code|link|image)/i)) {
        el.classList.remove(cls);
      }
    });
    
    // Remove data attributes
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('data-')) {
        el.removeAttribute(attr.name);
      }
    });
    
    // Normalize whitespace in text nodes
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
      const text = el.textContent || '';
      el.textContent = text.replace(/\s+/g, ' ').trim();
    }
  });
  
  // Clean up empty paragraphs
  const emptyParagraphs = tempDiv.querySelectorAll('p:empty');
  emptyParagraphs.forEach((p) => {
    // Only remove if truly empty (no text, no children)
    if (!p.textContent?.trim() && p.children.length === 0) {
      p.remove();
    }
  });
  
  return tempDiv.innerHTML;
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = 'Start writing your blog post...',
  onImageUpload,
  editable = true,
  className = '',
  excerpt = '',
  showPreview: initialShowPreview = false
}: TipTapEditorProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [showPreview, setShowPreview] = useState(initialShowPreview);
  const [selectedText, setSelectedText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // Exclude Link from StarterKit since we're configuring it separately
        link: false,
        // Configure paragraph with better defaults
        paragraph: {
          HTMLAttributes: {
            class: 'mb-4 leading-relaxed',
          },
        },
        // Configure lists with better spacing
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-6 mb-4 space-y-2',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-6 mb-4 space-y-2',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-blue-500 pl-4 italic my-4 text-gray-700 dark:text-gray-300',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto',
          },
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-lg dark:prose-invert max-w-none focus:outline-none px-6 py-4 min-h-[500px] ${
          !editable ? 'pointer-events-none select-none' : ''
        }`,
      },
      // Enhanced paste handling
      transformPastedHTML(html) {
        return cleanPastedHTML(html);
      },
      // Handle paste events
      handlePaste(view, event) {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;
        
        const html = clipboardData.getData('text/html');
        if (html) {
          const cleaned = cleanPastedHTML(html);
          // Insert cleaned HTML
          const { state, dispatch } = view;
          const { selection } = state;
          const transaction = state.tr.insertText('', selection.from);
          // Use TipTap's command to insert HTML
          return false; // Let TipTap handle it with cleaned HTML
        }
        return false;
      },
    },
  });

  // Track selection for contextual toolbar
  useEffect(() => {
    if (!editor || !editable) return;

    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selected = editor.state.doc.textBetween(from, to);
        setSelectedText(selected);
      } else {
        setSelectedText('');
      }
    };

    editor.on('selectionUpdate', updateSelection);
    editor.on('focus', updateSelection);
    editor.on('blur', () => setSelectedText(''));

    return () => {
      editor.off('selectionUpdate', updateSelection);
      editor.off('focus', updateSelection);
      editor.off('blur', () => setSelectedText(''));
    };
  }, [editor, editable]);

  // Sync content when it changes externally
  useEffect(() => {
    if (!editor) return;
    
    const currentContent = editor.getHTML();
    // Only update if content actually changed and is different from current
    if (content && content !== currentContent) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const handleImageUpload = useCallback(() => {
    if (!editor) return;
    setShowImageModal(true);
  }, [editor]);

  const handleImageSelect = useCallback(async (imageUrl: string) => {
    if (!editor) {
      logger.error('Editor not available for image insertion');
      return;
    }
    
    try {
      editor.chain().focus().setImage({ src: imageUrl, alt: 'Uploaded image' }).run();
      setShowImageModal(false);
      logger.debug('Image inserted successfully', { imageUrl });
    } catch (error) {
      logger.error('Error inserting image:', error);
      alert('Failed to insert image. Please try again.');
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="animate-pulse text-gray-400">Loading editor...</div>
      </div>
    );
  }

  const hasSelection = selectedText.length > 0;
  const isHeading = editor.isActive('heading');
  const isList = editor.isActive('bulletList') || editor.isActive('orderedList');
  const isBlockquote = editor.isActive('blockquote');

  return (
    <div className={`flex flex-col h-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 overflow-hidden ${className}`}>
      {/* Enhanced Toolbar */}
      {editable && !distractionFree && (
        <div className="border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          {/* Main Toolbar */}
          <div className="p-2 flex flex-wrap items-center gap-1">
            {/* Text Formatting */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('bold') 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('italic') 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={!editor.can().chain().focus().toggleUnderline().run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('underline') 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('strike') 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                disabled={!editor.can().chain().focus().toggleCode().run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('code') 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Inline Code"
              >
                <Code className="w-4 h-4" />
              </button>
            </div>

            {/* Headings */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('heading', { level: 1 }) 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('heading', { level: 2 }) 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('heading', { level: 3 }) 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('bulletList') 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('orderedList') 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive('blockquote') 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive({ textAlign: 'left' }) 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive({ textAlign: 'center' }) 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-2 rounded transition-all ${
                  editor.isActive({ textAlign: 'right' }) 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>

            {/* Media */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
              <button
                onClick={setLink}
                className={`p-2 rounded transition-all ${
                  editor.isActive('link') 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Add Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleImageUpload}
                disabled={uploadingImage}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                title="Insert Image"
              >
                {uploadingImage ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Undo/Redo */}
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
              <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`p-2 rounded transition-all ${
                  showPreview 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title={showPreview ? "Hide Preview" : "Show Preview"}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setDistractionFree(!distractionFree)}
                className={`p-2 rounded transition-all ${
                  distractionFree 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title={distractionFree ? "Show Toolbar" : "Distraction-Free Mode"}
              >
                {distractionFree ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Contextual Toolbar - Shows when text is selected */}
          {hasSelection && (
            <div className="px-2 pb-2 border-t border-gray-200 dark:border-gray-700 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Selected:</span>
                <span className="truncate max-w-xs">{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}</span>
                <span className="text-gray-400">({selectedText.length} chars)</span>
              </div>
            </div>
          )}

          {/* Visual Formatting Indicators */}
          <div className="px-2 pb-2 border-t border-gray-200 dark:border-gray-700 pt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {isHeading && (
              <span className="flex items-center gap-1">
                <Heading1 className="w-3 h-3" />
                <span>Heading</span>
              </span>
            )}
            {isList && (
              <span className="flex items-center gap-1">
                <List className="w-3 h-3" />
                <span>List</span>
              </span>
            )}
            {isBlockquote && (
              <span className="flex items-center gap-1">
                <Quote className="w-3 h-3" />
                <span>Quote</span>
              </span>
            )}
            {editor.isActive('link') && (
              <span className="flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                <span>Link</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Editor Content Area - Split View with Preview */}
      <div className={`flex flex-1 overflow-hidden ${showPreview && editable ? 'flex-row' : 'flex-col'}`}>
        {/* Editor */}
        <div className={`flex-1 overflow-y-auto ${showPreview && editable ? 'border-r border-gray-300 dark:border-gray-600' : ''}`}>
          <div className={`min-h-[500px] ${distractionFree ? 'p-8' : 'p-6'}`}>
            <EditorContent 
              editor={editor}
              aria-readonly={!editable}
            />
          </div>
        </div>

        {/* Live Preview Panel */}
        {showPreview && editable && (
          <div className="w-1/2 border-l border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-4 py-2 flex items-center justify-between z-10">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Live Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Close Preview"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div 
                className="prose prose-lg dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar - Fixed at bottom */}
      {editable && editor.storage.characterCount && (
        <div className="border-t border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <span>{editor.storage.characterCount.characters()} characters</span>
            <span>•</span>
            <span>{editor.storage.characterCount.words()} words</span>
            <span>•</span>
            <span>~{Math.ceil(editor.storage.characterCount.words() / 200)} min read</span>
          </div>
          {distractionFree && (
            <button
              onClick={() => setDistractionFree(false)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Show Toolbar
            </button>
          )}
        </div>
      )}

      {/* Image Insert Modal */}
      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onImageSelect={handleImageSelect}
        excerpt={excerpt}
      />
    </div>
  );
}
