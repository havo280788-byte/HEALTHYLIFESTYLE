import React, { useState, useRef, useEffect, memo } from 'react';
import { Eraser, Highlighter, Palette } from 'lucide-react';

interface ReadingPassageProps {
    content: string;
}

const ReadingPassage: React.FC<ReadingPassageProps> = ({ content }) => {
    const [isHighlightMode, setIsHighlightMode] = useState(false);
    const [highlightColor, setHighlightColor] = useState('#FFF3B0'); // yellow default, toggle to #CFFAFE cyan
    const contentRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    // Initialize content ONCE (or when content prop changes)
    useEffect(() => {
        if (!contentRef.current) return;

        // Parse Markdown
        const initialHtml = content.split('\n').map(line => {
            if (line.startsWith('## ')) return `<h2 class="text-lg md:text-xl font-bold text-[#4ade80] mt-6 mb-3 border-b border-white/10 pb-2">${line.replace('## ', '')}</h2>`;
            if (line.startsWith('**')) return `<h3 class="text-base md:text-lg font-bold text-[#5eead4] mt-4 mb-2">${line.replace(/\*\*/g, '')}</h3>`;
            if (line.trim() === '') return `<div class="h-4"></div>`;
            return `<p class="mb-2 text-slate-300 text-sm md:text-lg" style="line-height:1.6">${line}</p>`;
        }).join('');

        // Set innerHTML directly - React doesn't manage this anymore
        contentRef.current.innerHTML = initialHtml;
    }, [content]); // Only re-run if PROP content changes (which is static)

    const handleContainerClick = (e: React.MouseEvent) => {
        if (!isHighlightMode) return;

        const target = e.target as HTMLElement;
        // Check if clicked element is a highlight span
        if (target.tagName === 'SPAN' && target.style.backgroundColor) {
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
                span.style.backgroundColor = highlightColor;
                span.className = 'text-slate-900 px-1 rounded-sm cursor-pointer transition-colors shadow-sm';
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
        <div className="relative flex flex-col">
            {/* Floating Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex gap-1.5 backdrop-blur p-1.5 rounded-lg shadow-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <button
                    onClick={() => setIsHighlightMode(!isHighlightMode)}
                    className={`p-2 rounded-md transition-all ${isHighlightMode
                        ? 'bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/50 shadow-inner'
                        : 'hover:bg-white/5 text-slate-400'
                        }`}
                    title={isHighlightMode ? "Disable Highlight Mode" : "Enable Highlight Mode"}
                >
                    <Highlighter size={18} />
                </button>
                <button
                    onClick={() => setHighlightColor(highlightColor === '#FFF3B0' ? '#CFFAFE' : '#FFF3B0')}
                    className="p-2 rounded-md hover:bg-white/5 text-slate-400 transition-all"
                    title={`Switch color (${highlightColor === '#FFF3B0' ? 'Yellow → Cyan' : 'Cyan → Yellow'})`}
                >
                    <Palette size={18} style={{ color: highlightColor === '#FFF3B0' ? '#fbbf24' : '#38bdf8' }} />
                </button>
                <button
                    onClick={() => {
                        if (contentRef.current) {
                            const spans = contentRef.current.querySelectorAll('span[style*="background-color"]');
                            spans.forEach(span => {
                                const parent = span.parentNode;
                                while (span.firstChild) parent?.insertBefore(span.firstChild, span);
                                parent?.removeChild(span);
                            });
                        }
                    }}
                    className="p-2 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                    title="Clear all highlights"
                >
                    <Eraser size={18} />
                </button>
            </div>

            <div
                ref={contentRef}
                className={`flex-1 transition-colors duration-300 ${isHighlightMode ? 'cursor-text selection:bg-yellow-100 selection:text-yellow-900' : ''}`}
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
