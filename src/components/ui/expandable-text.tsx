import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ExpandableTextProps {
  text: string;
  className?: string;
  maxLines?: number;
  expandLabel?: string;
  collapseLabel?: string;
}

export const ExpandableText = ({
  text,
  className,
  maxLines = 2,
  expandLabel = 'ver más',
  collapseLabel = 'ver menos'
}: ExpandableTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight) || 16;
        const maxHeight = lineHeight * maxLines;
        setIsTruncated(textRef.current.scrollHeight > maxHeight + 4);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [text, maxLines]);

  const lineClampClass = maxLines === 2 ? 'line-clamp-2' : maxLines === 3 ? 'line-clamp-3' : 'line-clamp-4';

  return (
    <div className="relative">
      <p
        ref={textRef}
        className={cn(
          className,
          !isExpanded && isTruncated && lineClampClass
        )}
      >
        {text}
      </p>
      {isTruncated && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-primary hover:text-primary/80 text-xs font-medium mt-0.5 transition-colors"
        >
          {isExpanded ? collapseLabel : expandLabel}
        </button>
      )}
    </div>
  );
};
