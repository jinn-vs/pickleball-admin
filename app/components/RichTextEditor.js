"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  BoldIcon,
  ItalicIcon,
  Heading1,
  Heading2,
  Heading3,
  ListIcon,
  ListOrderedIcon,
  ImageIcon,
  LinkIcon,
  Link2OffIcon,
  TableIcon,
  CodeIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  UnderlineIcon,
  HighlighterIcon,
  MaximizeIcon,
  MinimizeIcon,
  Code2Icon,
} from "lucide-react";

// Create the editor component without BubbleMenu initially
const RichTextEditorCore = ({ value, onChange, disabled = false }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkRelOptions, setLinkRelOptions] = useState({
    nofollow: false,
    noopener: false,
    noreferrer: false,
    sponsored: false,
    ugc: false,
  });
  const [linkTarget, setLinkTarget] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isUpdatingFromProps = useRef(false);
  const editorRef = useRef(null);

  // Critical: Only mount after hydration is complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          history: {
            depth: 10,
          },
        }),
        Image.configure({
          inline: true,
          allowBase64: false,
          HTMLAttributes: {
            class: "rounded-lg border max-w-full h-auto",
          },
        }),
        // Custom Link extension with isolated attribute handling
        Link.extend({
          name: "customLink",

          addAttributes() {
            return {
              href: {
                default: null,
                parseHTML: (element) => element.getAttribute("href"),
                renderHTML: (attributes) => {
                  if (!attributes.href) {
                    return {};
                  }
                  return { href: attributes.href };
                },
              },
              target: {
                default: null,
                parseHTML: (element) => element.getAttribute("target"),
                renderHTML: (attributes) => {
                  if (!attributes.target) {
                    return {};
                  }
                  return { target: attributes.target };
                },
              },
              rel: {
                default: null,
                parseHTML: (element) => element.getAttribute("rel"),
                renderHTML: (attributes) => {
                  if (!attributes.rel) {
                    return {};
                  }
                  return { rel: attributes.rel };
                },
              },
            };
          },

          parseHTML() {
            return [
              {
                tag: "a[href]",
                getAttrs: (element) => {
                  const href = element.getAttribute("href");
                  const target = element.getAttribute("target");
                  const rel = element.getAttribute("rel");

                  return {
                    href,
                    target: target || null,
                    rel: rel || null,
                  };
                },
              },
            ];
          },

          renderHTML({ HTMLAttributes }) {
            return ["a", HTMLAttributes, 0];
          },

          addCommands() {
            return {
              setCustomLink:
                (attributes) =>
                ({ chain }) => {
                  return chain()
                    .setMark(this.name, attributes)
                    .setMeta("preventAutolink", true)
                    .run();
                },

              toggleCustomLink:
                (attributes) =>
                ({ chain }) => {
                  return chain()
                    .toggleMark(this.name, attributes, {
                      extendEmptyMarkRange: true,
                    })
                    .setMeta("preventAutolink", true)
                    .run();
                },

              unsetCustomLink:
                () =>
                ({ chain }) => {
                  return chain()
                    .unsetMark(this.name, { extendEmptyMarkRange: true })
                    .setMeta("preventAutolink", true)
                    .run();
                },
            };
          },
        }).configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-600 underline hover:text-blue-800",
          },
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: "border-collapse table-auto w-full",
          },
        }),
        TableRow.configure({
          HTMLAttributes: {
            class: "border",
          },
        }),
        TableHeader.configure({
          HTMLAttributes: {
            class: "border p-2 font-bold bg-gray-100",
          },
        }),
        TableCell.configure({
          HTMLAttributes: {
            class: "border p-2",
          },
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Underline,
        Highlight.configure({
          multicolor: false,
        }),
      ],
      content: "",
      editable: !disabled,
      onUpdate: ({ editor }) => {
        if (onChange && !isUpdatingFromProps.current && isMounted) {
          const html = editor.getHTML();
          onChange(html);
        }
      },
      onCreate: ({ editor }) => {
        editorRef.current = editor;
      },
      onDestroy: () => {
        editorRef.current = null;
      },
      editorProps: {
        attributes: {
          class: isFullscreen
            ? "prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto p-8 focus:outline-none min-h-screen bg-white"
            : "prose prose-sm max-w-none p-4 focus:outline-none min-h-[300px]",
        },
      },
    },
    [isMounted]
  );

  // Set initial content after editor is created and mounted
  useEffect(() => {
    if (editor && isMounted) {
      if (!isUpdatingFromProps.current) {
        isUpdatingFromProps.current = true;
        const contentToSet = value || "";
        editor.commands.setContent(contentToSet, false);

        setTimeout(() => {
          isUpdatingFromProps.current = false;
        }, 100);
      }
    }
  }, [editor, isMounted]);

  // Update content when value prop changes
  useEffect(() => {
    if (editor && isMounted && value !== undefined) {
      const currentContent = editor.getHTML();
      const newValue = value || "";

      if (!isUpdatingFromProps.current && newValue !== currentContent) {
        isUpdatingFromProps.current = true;
        editor.commands.setContent(newValue, false);

        setTimeout(() => {
          isUpdatingFromProps.current = false;
        }, 100);
      }
    }
  }, [editor, value, isMounted]);

  // Additional effect to handle delayed content updates
  useEffect(() => {
    if (editor && isMounted && value) {
      const timer = setTimeout(() => {
        const currentContent = editor.getHTML();
        if (currentContent !== value && !isUpdatingFromProps.current) {
          isUpdatingFromProps.current = true;
          editor.commands.setContent(value, false);
          setTimeout(() => {
            isUpdatingFromProps.current = false;
          }, 50);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [editor, value, isMounted]);

  // Update editable state
  useEffect(() => {
    if (editor && isMounted) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled, isMounted]);

  const uploadImageToServer = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const addImage = useCallback(async () => {
    if (!editor || disabled || !isMounted) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = e.target?.files?.[0];
      if (!file || !editor || !isMounted) return;

      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      setIsUploadingImage(true);

      try {
        const imageUrl = await uploadImageToServer(file);
        if (editor && isMounted) {
          editor.chain().focus().setImage({ src: imageUrl }).run();
        }
      } catch (error) {
        alert("Failed to upload image. Please try again.");
      } finally {
        setIsUploadingImage(false);
      }
    };

    input.click();
  }, [editor, disabled, isMounted]);

  // MUCH SIMPLER APPROACH: Work with TipTap instead of against it
  const resetLinkForm = () => {
    setLinkUrl("");
    setLinkTarget("");
    setLinkRelOptions({
      nofollow: false,
      noopener: false,
      noreferrer: false,
      sponsored: false,
      ugc: false,
    });
  };

  const setLink = useCallback(() => {
    if (!editor || disabled || !isMounted) return;

    if (showLinkInput) {
      setShowLinkInput(false);
      resetLinkForm();
      return;
    }

    // Reset form first
    resetLinkForm();

    // If we're in a link, populate form
    if (editor.isActive("customLink")) {
      const attrs = editor.getAttributes("customLink");
      setLinkUrl(attrs.href || "");
      setLinkTarget(attrs.target || "");

      if (attrs.rel) {
        const relArray = attrs.rel.split(" ").filter(Boolean);
        setLinkRelOptions({
          nofollow: relArray.includes("nofollow"),
          noopener: relArray.includes("noopener"),
          noreferrer: relArray.includes("noreferrer"),
          sponsored: relArray.includes("sponsored"),
          ugc: relArray.includes("ugc"),
        });
      }
    }

    setShowLinkInput(true);
  }, [editor, showLinkInput, disabled, isMounted]);

  const submitLink = useCallback(() => {
    if (!editor || disabled || !isMounted) return;

    // If no URL, remove the link
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetCustomLink().run();
      setShowLinkInput(false);
      resetLinkForm();
      return;
    }

    const selectedRelOptions = Object.entries(linkRelOptions)
      .filter(([, selected]) => selected)
      .map(([key]) => key);

    // Build attributes object with only the necessary attributes
    const attributes = {
      href: linkUrl.trim(),
    };

    // Only add target if it has a value and is not empty
    if (linkTarget && linkTarget.trim()) {
      attributes.target = linkTarget;
    }

    // Only add rel if there are selected options
    if (selectedRelOptions.length > 0) {
      attributes.rel = selectedRelOptions.join(" ");
    }

    console.log("Applying link with attributes:", attributes);

    const { from, to, empty } = editor.state.selection;

    if (empty) {
      // No selection - insert the URL as text and make it a link
      editor
        .chain()
        .focus()
        .insertContent(linkUrl.trim())
        .setTextSelection({ from, to: from + linkUrl.trim().length })
        .setCustomLink(attributes)
        .run();
    } else {
      // Has selection - apply link to selected text
      editor.chain().focus().setCustomLink(attributes).run();
    }

    setShowLinkInput(false);
    resetLinkForm();
  }, [editor, linkUrl, linkRelOptions, linkTarget, disabled, isMounted]);

  const addTable = useCallback(() => {
    if (!editor || disabled || !isMounted) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor, disabled, isMounted]);

  if (!isMounted || !editor) {
    return (
      <div className="border rounded-lg overflow-hidden bg-white relative min-h-[400px]">
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading editor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border rounded-lg overflow-hidden bg-white ${
        isFullscreen ? "fixed inset-0 z-50" : "relative"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Fixed Toolbar - Properly positioned */}
      <div
        className={`
        flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b z-20
        ${isFullscreen ? "fixed top-0 left-0 right-0" : "sticky top-0"}
      `}
      >
        {/* Basic formatting */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("bold") ? "bg-gray-200" : ""
          }`}
          title="Bold"
          disabled={disabled}
        >
          <BoldIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("italic") ? "bg-gray-200" : ""
          }`}
          title="Italic"
          disabled={disabled}
        >
          <ItalicIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("underline") ? "bg-gray-200" : ""
          }`}
          title="Underline"
          disabled={disabled}
        >
          <UnderlineIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHighlight().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("highlight") ? "bg-gray-200" : ""
          }`}
          title="Highlight"
          disabled={disabled}
        >
          <HighlighterIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("heading", { level: 1 }) ? "bg-gray-200" : ""
          }`}
          title="Heading 1"
          disabled={disabled}
        >
          <Heading1 size={18} />
        </button>
        <button
          type="button"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""
          }`}
          title="Heading 2"
          disabled={disabled}
        >
          <Heading2 size={18} />
        </button>
        <button
          type="button"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("heading", { level: 3 }) ? "bg-gray-200" : ""
          }`}
          title="Heading 3"
          disabled={disabled}
        >
          <Heading3 size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("bulletList") ? "bg-gray-200" : ""
          }`}
          title="Bullet List"
          disabled={disabled}
        >
          <ListIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("orderedList") ? "bg-gray-200" : ""
          }`}
          title="Ordered List"
          disabled={disabled}
        >
          <ListOrderedIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Text alignment */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive({ textAlign: "left" }) ? "bg-gray-200" : ""
          }`}
          title="Align Left"
          disabled={disabled}
        >
          <AlignLeftIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive({ textAlign: "center" }) ? "bg-gray-200" : ""
          }`}
          title="Align Center"
          disabled={disabled}
        >
          <AlignCenterIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive({ textAlign: "right" }) ? "bg-gray-200" : ""
          }`}
          title="Align Right"
          disabled={disabled}
        >
          <AlignRightIcon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Code */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("code") ? "bg-gray-200" : ""
          }`}
          title="Inline Code"
          disabled={disabled}
        >
          <CodeIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("codeBlock") ? "bg-gray-200" : ""
          }`}
          title="Code Block"
          disabled={disabled}
        >
          <Code2Icon size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Tables */}
        <button
          type="button"
          onClick={addTable}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor?.isActive("table") ? "bg-gray-200" : ""
          }`}
          title="Insert Table"
          disabled={disabled}
        >
          <TableIcon size={18} />
        </button>

        {/* Images */}
        <button
          type="button"
          onClick={addImage}
          disabled={isUploadingImage || disabled}
          className={`p-2 rounded hover:bg-gray-200 ${
            isUploadingImage || disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={isUploadingImage ? "Uploading..." : "Insert Image"}
        >
          <ImageIcon size={18} />
        </button>

        {/* Links */}
        <div className="relative">
          <button
            type="button"
            onClick={setLink}
            className={`p-2 rounded hover:bg-gray-200 ${
              editor?.isActive("customLink") ? "bg-gray-200" : ""
            }`}
            title="Insert Link"
            disabled={disabled}
          >
            {editor?.isActive("customLink") ? (
              <Link2OffIcon size={18} />
            ) : (
              <LinkIcon size={18} />
            )}
          </button>
          {showLinkInput && !disabled && (
            <div className="absolute top-full left-0 mt-1 p-4 bg-white border rounded shadow-lg z-30 min-w-96 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    {editor?.isActive("customLink")
                      ? "Edit Link"
                      : "Create New Link"}
                  </h3>
                  <div className="text-xs text-gray-500">
                    T: {linkTarget || "none"} | R:{" "}
                    {Object.values(linkRelOptions).some(Boolean)
                      ? Object.entries(linkRelOptions)
                          .filter(([, v]) => v)
                          .map(([k]) => k)
                          .join(",")
                      : "none"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    URL *
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitLink();
                      if (e.key === "Escape") setLink();
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target
                  </label>
                  <select
                    value={linkTarget}
                    onChange={(e) => setLinkTarget(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Same window (default)</option>
                    <option value="_blank">New window (_blank)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Rel Attributes (SEO)
                  </label>
                  <div className="space-y-2">
                    {Object.entries({
                      nofollow:
                        "Don't follow this link for SEO (blocks link juice)",
                      noopener:
                        "Security for new windows (recommended with target='_blank')",
                      noreferrer: "Don't send referrer information",
                      sponsored: "Sponsored/paid content",
                      ugc: "User-generated content",
                    }).map(([key, description]) => (
                      <label
                        key={key}
                        className="flex items-start space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={linkRelOptions[key]}
                          onChange={(e) => {
                            setLinkRelOptions((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }));
                          }}
                          className="mt-0.5 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{key}</div>
                          <div className="text-gray-500">{description}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {Object.values(linkRelOptions).some(Boolean) && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <span className="font-medium">Preview:</span> rel="
                      {Object.entries(linkRelOptions)
                        .filter(([, selected]) => selected)
                        .map(([key]) => key)
                        .join(" ")}
                      "
                    </div>
                  )}

                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    <strong>ℹ️ Default behavior:</strong> Links are followed by
                    search engines by default. Only add rel attributes when you
                    need to change this behavior.
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={submitLink}
                    disabled={!linkUrl.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Link
                  </button>
                  <button
                    type="button"
                    onClick={setLink}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  {editor?.isActive("customLink") && (
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().unsetCustomLink().run();
                        setLink();
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
                    >
                      Remove Link
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded hover:bg-gray-200 ml-auto"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <MinimizeIcon size={18} />
          ) : (
            <MaximizeIcon size={18} />
          )}
        </button>
      </div>

      {/* Editor Content */}
      <div
        className={
          isFullscreen ? "mt-[60px] h-[calc(100vh-120px)] overflow-y-auto" : ""
        }
      >
        <EditorContent editor={editor} />
      </div>

      {/* Status Bar */}
      <div
        className={`
        bg-gray-50 border-t p-2 text-xs text-gray-500 flex justify-between items-center
        ${isFullscreen ? "fixed bottom-0 left-0 right-0" : ""}
      `}
      >
        <div>
          <span>
            {editor?.getCharacterCount() || 0} characters,{" "}
            {editor?.getText().split(/\s+/).filter(Boolean).length || 0} words
            {isUploadingImage && (
              <span className="ml-2 text-blue-500">Uploading image...</span>
            )}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const testContent = `
                <p>Testing different link behaviors:</p>
                <p><a href="https://example.com">Link 1 - Normal link (no attributes)</a></p>
                <p><a href="https://google.com" target="_blank">Link 2 - Opens in new window (target only)</a></p>
                <p><a href="https://test.com" rel="nofollow">Link 3 - No follow (rel only)</a></p>
                <p><a href="https://sponsor.com" target="_blank" rel="sponsored noopener">Link 4 - New window + multiple rel attributes</a></p>
                <p><a href="https://normal.com">Link 5 - Another normal link</a></p>
              `;
              editor?.commands.setContent(testContent);
            }}
            className="text-xs text-green-500 hover:text-green-700 underline"
            title="Insert test links"
          >
            Test Links
          </button>

          <button
            type="button"
            onClick={() => {
              // Test creating a normal link programmatically
              editor
                ?.chain()
                .focus()
                .insertContent("Normal Link")
                .setTextSelection({
                  from: editor.state.selection.from - 11,
                  to: editor.state.selection.from,
                })
                .setCustomLink({ href: "https://example.com" })
                .run();
            }}
            className="text-xs text-purple-500 hover:text-purple-700 underline"
            title="Add normal link"
            disabled={disabled}
          >
            Add Normal Link
          </button>

          <button
            type="button"
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .clearContent()
                .insertContent("<p>Start writing here...</p>")
                .run()
            }
            className="text-xs text-gray-500 hover:text-gray-700"
            disabled={disabled}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => {
              console.log("=== LINK DEBUG INFO ===");
              console.log("Current HTML:", editor?.getHTML());
              console.log("Active marks:", editor?.getAttributes());
              console.log(
                "Is customLink active:",
                editor?.isActive("customLink")
              );
              console.log(
                "CustomLink attributes:",
                editor?.getAttributes("customLink")
              );
              console.log("Selection:", editor?.state.selection);
              console.log("=======================");
            }}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
            title="Log detailed debug info to console"
          >
            Debug HTML
          </button>
        </div>
      </div>
    </div>
  );
};

// Use dynamic import to prevent SSR issues
const RichTextEditor = dynamic(() => Promise.resolve(RichTextEditorCore), {
  ssr: false,
  loading: () => (
    <div className="border rounded-lg overflow-hidden bg-white relative min-h-[400px]">
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading editor...</span>
        </div>
      </div>
    </div>
  ),
});

export default RichTextEditor;
