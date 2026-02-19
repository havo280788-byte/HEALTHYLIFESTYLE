import React, { useState, useRef, useEffect } from 'react';
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

    useEffect(() => {
        // Parse the initial content (Markdown-ish to HTML)
        const parsed = content.split('\n').map(line => {
            if (line.startsWith('## ')) return `<h2 class="text-lg md:text-xl font-bold text-[#0F766E] mt-6 mb-3 border-b border-green-200 pb-2">${line.replace('## ', '')}</h2>`;
            if (line.startsWith('**')) return `<h3 class="text-base md:text-lg font-bold text-[#0d9488] mt-4 mb-2">${line.replace(/\*\*/g, '')}</h3>`;
            if (line.trim() === '') return `<div class="h-4"></div>`;
            return `<p class="mb-2 text-slate-700 leading-relaxed text-base md:text-lg">${line}</p>`;
        }).join('');
        setHtmlContent(parsed);
    }, [content]);

    const handleMouseUp = () => {
        if (!isHighlightMode) return;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);

        // Check if selection is within our content
        if (contentRef.current && contentRef.current.contains(range.commonAncestorContainer)) {
            try {
                const span = document.createElement('span');
                span.className = 'bg-yellow-200/50 border-b-2 border-yellow-400 cursor-pointer transition-colors hover:bg-yellow-300/50';
                span.onclick = (e) => {
                    if (isHighlightMode) {
                        // Remove highlight on click if in mode (optional, or separate eraser)
                        // For now, let's just allow adding. Implementation of removal needs careful DOM manipulation.
                        // Let's keep it simple: Select to highlight.
                    }
                };
                range.surroundContents(span);
                selection.removeAllRanges();
            } catch (e) {
                console.warn("Cannot highlight across different block elements", e);
                // Fallback or ignore complex multi-block selections for this simple implementation
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
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {isHighlightMode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none animate-fade-in opacity-80">
                    Select text to highlight
                </div>
            )}
        </div>
    );
};

export default ReadingPassage;
