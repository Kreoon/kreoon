import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';

interface ParsedTextProps {
  text: string;
  className?: string;
  onHashtagClick?: (hashtag: string) => void;
  onMentionClick?: (username: string) => void;
}

interface TextPart {
  type: 'text' | 'mention' | 'hashtag';
  value: string;
  raw: string;
}

/**
 * Parses text and converts @mentions and #hashtags into clickable elements
 */
export function parseTextParts(text: string): TextPart[] {
  if (!text) return [];
  
  const parts: TextPart[] = [];
  // Regex to match @mentions and #hashtags
  const regex = /(@[\w._]+|#[\w]+)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
        raw: text.slice(lastIndex, match.index)
      });
    }
    
    const matched = match[0];
    if (matched.startsWith('@')) {
      parts.push({
        type: 'mention',
        value: matched.slice(1), // Remove @
        raw: matched
      });
    } else if (matched.startsWith('#')) {
      parts.push({
        type: 'hashtag',
        value: matched.slice(1), // Remove #
        raw: matched
      });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      value: text.slice(lastIndex),
      raw: text.slice(lastIndex)
    });
  }
  
  return parts;
}

/**
 * Extracts all hashtags from text
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[\w]+/g);
  return matches ? matches.map(h => h.slice(1).toLowerCase()) : [];
}

/**
 * Extracts all mentions from text
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/@[\w._]+/g);
  return matches ? matches.map(m => m.slice(1).toLowerCase()) : [];
}

export function ParsedText({ 
  text, 
  className = '',
  onHashtagClick,
  onMentionClick 
}: ParsedTextProps) {
  const navigate = useNavigate();
  const parts = parseTextParts(text);
  
  const handleMentionClick = (username: string) => {
    if (onMentionClick) {
      onMentionClick(username);
    } else {
      // Navigate to the user's profile page
      navigate('/social#profile');
    }
  };
  
  const handleHashtagClick = (hashtag: string) => {
    if (onHashtagClick) {
      onHashtagClick(hashtag);
    } else {
      // Default: could filter by hashtag in portfolio
      console.log('Hashtag clicked:', hashtag);
    }
  };
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                handleMentionClick(part.value);
              }}
              className="text-primary hover:underline font-medium"
            >
              @{part.value}
            </button>
          );
        }
        
        if (part.type === 'hashtag') {
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                handleHashtagClick(part.value);
              }}
              className="text-primary hover:underline"
            >
              #{part.value}
            </button>
          );
        }
        
        return <Fragment key={index}>{part.value}</Fragment>;
      })}
    </span>
  );
}
