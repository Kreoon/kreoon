import { useMemo, useCallback, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

type TokenType =
  | 'text'
  | 'bold'
  | 'italic'
  | 'code'
  | 'codeblock'
  | 'link'
  | 'listItem'
  | 'orderedListItem'
  | 'quote'
  | 'hr'
  | 'newline';

interface Token {
  type: TokenType;
  content: string;
  extra?: string; // Para links (URL) o código (lenguaje)
  index?: number; // Para listas ordenadas
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE DE BLOQUE DE CÓDIGO CON BOTÓN COPIAR
// ═══════════════════════════════════════════════════════════════════════════

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn('[MarkdownRenderer] Error copiando código:', error);
    }
  }, [code]);

  return (
    <div className="relative group my-2">
      {/* Header con lenguaje y botón copiar */}
      <div
        className={cn(
          'flex items-center justify-between',
          'px-3 py-1.5 rounded-t-lg',
          'bg-muted border-b border-violet-500/20'
        )}
      >
        <span className="text-[10px] text-violet-400 font-mono uppercase">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded',
            'text-[10px] font-medium transition-all duration-150',
            copied
              ? 'text-green-400 bg-green-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-violet-500/10'
          )}
          aria-label={copied ? 'Copiado' : 'Copiar código'}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copiar
            </>
          )}
        </button>
      </div>

      {/* Código */}
      <pre
        className={cn(
          'overflow-x-auto p-3 rounded-b-lg',
          'bg-muted/80',
          'border-l-[3px] border-l-violet-600',
          'text-[12px] leading-relaxed',
          'font-mono text-foreground/80'
        )}
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSER DE MARKDOWN (LIVIANO, SIN LIBRERÍAS EXTERNAS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parser de markdown liviano que convierte texto en tokens.
 * NO usa librerías externas pesadas.
 * Soporta: bold, italic, code, codeblocks, links, listas, quotes, hr
 */
function parseMarkdown(text: string): Token[] {
  const tokens: Token[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bloque de código (```)
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }

      tokens.push({
        type: 'codeblock',
        content: codeLines.join('\n'),
        extra: language || undefined,
      });
      i++;
      continue;
    }

    // Línea horizontal (---)
    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      tokens.push({ type: 'hr', content: '' });
      i++;
      continue;
    }

    // Blockquote (>)
    if (line.trim().startsWith('>')) {
      tokens.push({
        type: 'quote',
        content: line.trim().slice(1).trim(),
      });
      i++;
      continue;
    }

    // Lista desordenada (- o *)
    if (/^[\s]*[-*]\s/.test(line)) {
      tokens.push({
        type: 'listItem',
        content: line.replace(/^[\s]*[-*]\s/, ''),
      });
      i++;
      continue;
    }

    // Lista ordenada (1. 2. etc)
    const orderedMatch = line.match(/^[\s]*(\d+)\.\s(.*)$/);
    if (orderedMatch) {
      tokens.push({
        type: 'orderedListItem',
        content: orderedMatch[2],
        index: parseInt(orderedMatch[1], 10),
      });
      i++;
      continue;
    }

    // Línea vacía → newline
    if (line.trim() === '') {
      tokens.push({ type: 'newline', content: '' });
      i++;
      continue;
    }

    // Texto con formato inline
    tokens.push({ type: 'text', content: line });
    i++;
  }

  return tokens;
}

/**
 * Parsea formato inline (bold, italic, code, links) dentro de una línea de texto.
 * Retorna un array de ReactNodes.
 */
function parseInlineFormatting(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Regex para encontrar formatos inline
  // Orden: codeblocks inline, bold, italic, links
  const patterns = [
    { regex: /`([^`]+)`/, type: 'code' as const },
    { regex: /\*\*([^*]+)\*\*/, type: 'bold' as const },
    { regex: /\*([^*]+)\*/, type: 'italic' as const },
    { regex: /__([^_]+)__/, type: 'bold' as const },
    { regex: /_([^_]+)_/, type: 'italic' as const },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, type: 'link' as const },
  ];

  while (remaining.length > 0) {
    let earliestMatch: {
      index: number;
      match: RegExpMatchArray;
      type: 'code' | 'bold' | 'italic' | 'link';
    } | null = null;

    // Encontrar el match más temprano
    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && match.index !== undefined) {
        if (earliestMatch === null || match.index < earliestMatch.index) {
          earliestMatch = { index: match.index, match, type: pattern.type };
        }
      }
    }

    if (earliestMatch === null) {
      // No hay más formatos, agregar el resto como texto
      if (remaining.length > 0) {
        nodes.push(remaining);
      }
      break;
    }

    // Agregar texto antes del match
    if (earliestMatch.index > 0) {
      nodes.push(remaining.slice(0, earliestMatch.index));
    }

    // Agregar el elemento formateado
    const { match, type } = earliestMatch;
    const key = `${keyPrefix}-${keyIndex++}`;

    switch (type) {
      case 'code':
        nodes.push(
          <code
            key={key}
            className={cn(
              'px-1.5 py-0.5 rounded',
              'bg-violet-500/20 text-violet-200',
              'font-mono text-[11px]'
            )}
          >
            {match[1]}
          </code>
        );
        break;

      case 'bold':
        nodes.push(
          <strong key={key} className="font-semibold text-foreground">
            {match[1]}
          </strong>
        );
        break;

      case 'italic':
        nodes.push(
          <em key={key} className="italic text-foreground/80">
            {match[1]}
          </em>
        );
        break;

      case 'link':
        nodes.push(
          <a
            key={key}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'text-[#c084fc] hover:underline',
              'transition-colors duration-150'
            )}
          >
            {match[1]}
          </a>
        );
        break;
    }

    // Continuar con el resto del texto
    remaining = remaining.slice(earliestMatch.index + match[0].length);
  }

  return nodes;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Renderizador de Markdown para las respuestas de KIRO.
 * Implementación liviana sin librerías externas.
 * Soporta: bold, italic, inline code, code blocks, links, listas, quotes, hr
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Memoizar el parsing para evitar re-parsear en cada render
  const renderedContent = useMemo(() => {
    // Sanitizar el contenido con DOMPurify (protección completa contra XSS)
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true,
    });

    const tokens = parseMarkdown(sanitized);
    const elements: ReactNode[] = [];
    let listItems: ReactNode[] = [];
    let orderedItems: ReactNode[] = [];
    let isInList = false;
    let isInOrderedList = false;

    tokens.forEach((token, index) => {
      const key = `md-${index}`;

      // Cerrar lista si cambia el tipo
      if (token.type !== 'listItem' && isInList) {
        elements.push(
          <ul key={`ul-${index}`} className="my-2 ml-4 space-y-1">
            {listItems}
          </ul>
        );
        listItems = [];
        isInList = false;
      }

      if (token.type !== 'orderedListItem' && isInOrderedList) {
        elements.push(
          <ol key={`ol-${index}`} className="my-2 ml-4 space-y-1 list-decimal list-inside">
            {orderedItems}
          </ol>
        );
        orderedItems = [];
        isInOrderedList = false;
      }

      switch (token.type) {
        case 'codeblock':
          elements.push(
            <CodeBlock key={key} code={token.content} language={token.extra} />
          );
          break;

        case 'hr':
          elements.push(
            <hr
              key={key}
              className="my-3 border-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent"
            />
          );
          break;

        case 'quote':
          elements.push(
            <blockquote
              key={key}
              className={cn(
                'my-2 pl-3 py-1',
                'border-l-2 border-violet-500/50',
                'bg-violet-500/5 rounded-r',
                'text-muted-foreground italic text-[12px]'
              )}
            >
              {parseInlineFormatting(token.content, key)}
            </blockquote>
          );
          break;

        case 'listItem':
          isInList = true;
          listItems.push(
            <li key={key} className="flex items-start gap-2 text-[12px]">
              <span className="text-violet-400 mt-1.5">•</span>
              <span>{parseInlineFormatting(token.content, key)}</span>
            </li>
          );
          break;

        case 'orderedListItem':
          isInOrderedList = true;
          orderedItems.push(
            <li key={key} className="text-[12px] text-foreground/80">
              {parseInlineFormatting(token.content, key)}
            </li>
          );
          break;

        case 'newline':
          elements.push(<div key={key} className="h-2" />);
          break;

        case 'text':
        default:
          elements.push(
            <p key={key} className="text-[12px] leading-relaxed text-foreground/80">
              {parseInlineFormatting(token.content, key)}
            </p>
          );
          break;
      }
    });

    // Cerrar listas pendientes al final
    if (isInList && listItems.length > 0) {
      elements.push(
        <ul key="ul-final" className="my-2 ml-4 space-y-1">
          {listItems}
        </ul>
      );
    }

    if (isInOrderedList && orderedItems.length > 0) {
      elements.push(
        <ol key="ol-final" className="my-2 ml-4 space-y-1 list-decimal list-inside">
          {orderedItems}
        </ol>
      );
    }

    return elements;
  }, [content]);

  return <div className={cn('space-y-1', className)}>{renderedContent}</div>;
}
