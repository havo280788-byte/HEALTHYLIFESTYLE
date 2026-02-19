import React, { useState, useRef, useEffect, memo } from 'react';
import { PenTool, Eraser, Highlighter } from 'lucide-react';

interface ReadingPassageProps {
    content: string;
}

const ReadingPassage: React.FC<ReadingPassageProps> = ({ content }) => {
    const [isHighlightMode, setIsHighlightMode] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    // Initialize content ONCE (or when content prop changes)
    useEffect(() => {
        if (!contentRef.current) return;

        // Parse Markdown
        const initialHtml = content.split('\n').map(line => {
            if (line.startsWith('## ')) return `<h2 class="text-lg md:text-xl font-bold text-[#0F766E] mt-6 mb-3 border-b border-green-200 pb-2">${line.replace('## ', '')}</h2>`;
            if (line.startsWith('**')) return `<h3 class="text-base md:text-lg font-bold text-[#0d9488] mt-4 mb-2">${line.replace(/\*\*/g, '')}</h3>`;
            if (line.trim() === '') return `<div class="h-4"></div>`;
            return `<p class="mb-2 text-slate-700 leading-relaxed text-base md:text-lg">${line}</p>`;
        }).join('');

        // Set innerHTML directly - React doesn't manage this anymore
        contentRef.current.innerHTML = initialHtml;
    }, [content]); // Only re-run if PROP content changes (which is static)

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
            } catch (e) {
                console.warn("Cannot highlight across different block elements", e);
                // Optionally alert user, but console warn is less intrusive
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
            // No dangerouslySetInnerHTML - we manage content manually!
            />
        </div>
    );
};

// MEMOIZE to prevent re-renders from parent (Timer in App.tsx)
export default memo(ReadingPassage);
