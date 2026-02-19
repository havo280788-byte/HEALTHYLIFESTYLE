import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { PenTool, Eraser, Highlighter } from 'lucide-react';

interface ReadingPassageProps {
    content: string;
}

interface Highlight {
    id: string; // unique ID for key
    text: string;
    range: Range; // Store the range to re-apply or checking overlap (complex to persist)
    // For simpler persistence in this demo, we might just store text + index if we parse it,
    // but standard DOM range styling is easier with `CSS.highlights` or wrapping in spans.
    // Given the constraints and likely "react-way", wrapping text in <span> is best.
}

// Simple approach: Split content by lines, render each line.
// Highlighting across elements is hard.
// BETTER APPROACH: Render the full markdown text in a preservable way, and use a library or manual span wrapping.
// FOR THIS TASK: The user wants "Highlight right corner".
// We will implement a "Highlight Mode" that when active, allows selecting text to wrap it in a <mark> tag.

const ReadingPassage: React.FC<ReadingPassageProps> = ({ content }) => {
    const [isHighlightMode, setIsHighlightMode] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // We need to store html content to allow modifying it with highlights
    // Initial parsing of markdown-like syntax to HTML
    const [htmlContent, setHtmlContent] = useState<string>('');

    // Storage Key
    const STORAGE_KEY = 'healthylife_reading_highlights';

    useEffect(() => {
        // Try to load from local storage first
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setHtmlContent(saved);
        } else {
            // Parse the initial content (Markdown-ish to HTML)
            const parsed = content.split('\n').map(line => {
                if (line.startsWith('## ')) return `<h2 class="text-lg md:text-xl font-bold text-[#0F766E] mt-6 mb-3 border-b border-green-200 pb-2">${line.replace('## ', '')}</h2>`;
                if (line.startsWith('**')) return `<h3 class="text-base md:text-lg font-bold text-[#0d9488] mt-4 mb-2">${line.replace(/\*\*/g, '')}</h3>`;
                if (line.trim() === '') return `<div class="h-4"></div>`;
                return `<p class="mb-2 text-slate-700 leading-relaxed text-base md:text-lg">${line}</p>`;
            }).join('');
            setHtmlContent(parsed);
        }
    }, [content]);

    // To prevent scroll jumping when updating innerHTML
    const savedScrollTop = useRef(0);

    useLayoutEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = savedScrollTop.current;
            // Double insurance: sometimes browsers reset scroll after layout calc
            requestAnimationFrame(() => {
                if (contentRef.current) {
                    contentRef.current.scrollTop = savedScrollTop.current;
                }
            });
        }
    }, [htmlContent]);

    const saveContent = () => {
        if (contentRef.current) {
            savedScrollTop.current = contentRef.current.scrollTop; // Capture current scroll
            const newHtml = contentRef.current.innerHTML;
            localStorage.setItem(STORAGE_KEY, newHtml);
            setHtmlContent(newHtml); // Sync state
        }
    };

    const handleContainerClick = (e: React.MouseEvent) => {
        if (!isHighlightMode) return;

        const target = e.target as HTMLElement;
        // Check if clicked element is a highlight span
        if (target.tagName === 'SPAN' && target.classList.contains('bg-yellow-300')) {
            e.stopPropagation();
            // Unwrap
            const parent = target.parentNode;
            while (target.firstChild) {
                parent?.insertBefore(target.firstChild, target);
            }
            parent?.removeChild(target);
            saveContent();
        }
    };

    const handleMouseUp = () => {
        if (!isHighlightMode) return;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);

        // Check if selection is within our content
        if (contentRef.current && contentRef.current.contains(range.commonAncestorContainer)) {
            try {
                const span = document.createElement('span');
                // Use a stronger yellow and ensure it's visible
                span.className = 'bg-yellow-300 text-slate-900 px-1 rounded-sm cursor-pointer hover:bg-yellow-400 transition-colors shadow-sm';
                span.title = "Click to remove highlight"; // Tooltip

                range.surroundContents(span);
                selection.removeAllRanges();
                saveContent(); // Save immediately
            } catch (e) {
                console.warn("Cannot highlight across different block elements", e);
                alert("Please select text within a single paragraph to highlight.");
            }
        }
    };

    return (
        <div className="relative h-full flex flex-col">
            {/* Floating Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/90 backdrop-blur p-1.5 rounded-lg shadow-md border border-slate-200">
                <button
                    onClick={() => setIsHighlightMode(!isHighlightMode)}
                    className={`p-2 rounded-md transition-all ${isHighlightMode
                        ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400 shadow-inner'
                        : 'hover:bg-slate-100 text-slate-500'
                        }`}
                    title={isHighlightMode ? "Disable Highlight Mode" : "Enable Highlight Mode"}
                >
                    <Highlighter size={20} />
                </button>
            </div>

            <div
                ref={contentRef}
                className={`flex-1 overflow-y-auto p-4 md:p-6 transition-colors duration-300 ${isHighlightMode ? 'cursor-text selection:bg-yellow-100 selection:text-yellow-900' : ''}`}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleMouseUp} // Basic touch support
                onClick={handleContainerClick}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />


        </div>
    );
};

export default ReadingPassage;
