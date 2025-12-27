import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MentionUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  users: MentionUser[];
  onMention?: (userId: string, name: string) => void;
}

export function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  disabled,
  users,
  onMention
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    // Check for @ trigger
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space after the @ (meaning mention is complete)
      if (!textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        setMentionStart(lastAtIndex);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
    
    onChange(newValue);
  }, [onChange]);

  const insertMention = useCallback((user: MentionUser) => {
    if (mentionStart === -1) return;
    
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + mentionQuery.length + 1);
    const mention = `@${user.full_name} `;
    
    onChange(before + mention + after);
    setShowSuggestions(false);
    setMentionStart(-1);
    setMentionQuery('');
    onMention?.(user.id, user.full_name);
    
    // Focus back to input
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [value, mentionStart, mentionQuery, onChange, onMention]);

  const handleKeyDownInternal = useCallback((e: React.KeyboardEvent) => {
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }
    
    onKeyDown?.(e);
  }, [showSuggestions, filteredUsers, selectedIndex, insertMention, onKeyDown]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
      
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 mb-1 w-full max-w-xs bg-popover border rounded-lg shadow-lg overflow-hidden z-50"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                index === selectedIndex ? 'bg-accent' : 'hover:bg-muted'
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {user.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">
                {user.full_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to extract mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+(?:\s\w+)*)/g;
  const matches = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

// Helper to render text with highlighted mentions
export function renderMentions(text: string, currentUserId?: string): React.ReactNode {
  const parts = text.split(/(@\w+(?:\s\w+)*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-primary font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}
