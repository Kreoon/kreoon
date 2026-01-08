import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Only allows safe tags commonly used in rich text content.
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'div', 'span',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'br', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img',
      'blockquote', 'code', 'pre',
      'sup', 'sub',
    ],
    ALLOWED_ATTR: [
      'class', 'id', 
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'style',
      'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    // Force all links to open in new tab safely
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
  });
}

/**
 * Sanitizes HTML and converts newlines to <br> tags
 */
export function sanitizeHTMLWithBreaks(html: string | null | undefined): string {
  if (!html) return '';
  const sanitized = sanitizeHTML(html);
  return sanitized.replace(/\n/g, '<br>');
}
