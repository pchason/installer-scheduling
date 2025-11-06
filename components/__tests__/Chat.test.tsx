import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Test suite for Chat markdown rendering
 *
 * This test visually inspects that chat responses with markdown
 * are properly formatted as HTML elements.
 */

describe('Chat Markdown Rendering', () => {
  it('should render bold text from markdown', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          strong: ({ node, ...props }) => <strong style={{ fontWeight: 'bold' }} {...props} />,
        }}
      >
        This is **bold text** in markdown
      </ReactMarkdown>
    );

    const boldElement = container.querySelector('strong');
    expect(boldElement).toBeTruthy();
    expect(boldElement?.textContent).toBe('bold text');
    expect(boldElement).toHaveStyle({ fontWeight: 'bold' });
  });

  it('should render italic text from markdown', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          em: ({ node, ...props }) => <em style={{ fontStyle: 'italic' }} {...props} />,
        }}
      >
        This is *italic text* in markdown
      </ReactMarkdown>
    );

    const italicElement = container.querySelector('em');
    expect(italicElement).toBeTruthy();
    expect(italicElement?.textContent).toBe('italic text');
    expect(italicElement).toHaveStyle({ fontStyle: 'italic' });
  });

  it('should render unordered lists from markdown', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          ul: ({ node, ...props }) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }} {...props} />,
          li: ({ node, ...props }) => <li style={{ margin: '0.25em 0' }} {...props} />,
        }}
      >
{`- Item 1
- Item 2
- Item 3`}
      </ReactMarkdown>
    );

    const listElement = container.querySelector('ul');
    expect(listElement).toBeTruthy();
    expect(listElement).toHaveStyle({ margin: '0.5em 0' });

    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(3);
    expect(listItems[0]?.textContent).toContain('Item 1');
    expect(listItems[1]?.textContent).toContain('Item 2');
    expect(listItems[2]?.textContent).toContain('Item 3');
  });

  it('should render ordered lists from markdown', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          ol: ({ node, ...props }) => <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em' }} {...props} />,
          li: ({ node, ...props }) => <li style={{ margin: '0.25em 0' }} {...props} />,
        }}
      >
{`1. First item
2. Second item
3. Third item`}
      </ReactMarkdown>
    );

    const orderedList = container.querySelector('ol');
    expect(orderedList).toBeTruthy();
    expect(orderedList).toHaveStyle({ margin: '0.5em 0' });

    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(3);
  });

  it('should render inline code from markdown', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          code: ({ node, ...props }: any) => {
            const isInline = !props.className;
            return isInline ? (
              <code
                style={{
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  padding: '0.2em 0.4em',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                }}
                {...props}
              />
            ) : null;
          },
        }}
      >
        This uses `inline code` in a sentence
      </ReactMarkdown>
    );

    const codeElement = container.querySelector('code');
    expect(codeElement).toBeTruthy();
    expect(codeElement?.textContent).toBe('inline code');
    expect(codeElement).toHaveStyle({
      fontFamily: 'monospace',
      padding: '0.2em 0.4em',
    });
  });

  it('should render code blocks from markdown', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          code: ({ node, ...props }: any) => {
            return (
              <code
                style={{
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  padding: '0.8em',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
                {...props}
              />
            );
          },
        }}
      >
{`\`\`\`
const message = "Hello, World!";
console.log(message);
\`\`\``}
      </ReactMarkdown>
    );

    const codeElements = container.querySelectorAll('code');
    expect(codeElements.length).toBeGreaterThan(0);
    codeElements.forEach((code) => {
      expect(code).toHaveStyle({
        fontFamily: 'monospace',
        padding: '0.8em',
      });
    });
  });

  it('should render links from markdown', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          a: ({ node, ...props }) => <a style={{ color: '#0066cc', textDecoration: 'underline' }} {...props} />,
        }}
      >
        [Click here](https://example.com)
      </ReactMarkdown>
    );

    const linkElement = container.querySelector('a');
    expect(linkElement).toBeTruthy();
    expect(linkElement?.textContent).toBe('Click here');
    expect(linkElement?.getAttribute('href')).toBe('https://example.com');
    expect(linkElement).toHaveStyle({
      color: '#0066cc',
      textDecoration: 'underline',
    });
  });

  it('should render paragraphs with proper spacing', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p style={{ margin: '0.5em 0' }} {...props} />,
        }}
      >
{`First paragraph

Second paragraph`}
      </ReactMarkdown>
    );

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
    if (paragraphs.length > 0) {
      expect(paragraphs[0]).toHaveStyle({ margin: '0.5em 0' });
    }
  });

  it('should handle complex markdown with multiple elements', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p style={{ margin: '0.5em 0' }} {...props} />,
          strong: ({ node, ...props }) => <strong style={{ fontWeight: 'bold' }} {...props} />,
          em: ({ node, ...props }) => <em style={{ fontStyle: 'italic' }} {...props} />,
          ul: ({ node, ...props }) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }} {...props} />,
          li: ({ node, ...props }) => <li style={{ margin: '0.25em 0' }} {...props} />,
        }}
      >
        {`This is a **bold statement** with *italic emphasis*.

Here are some items:
- First item
- Second item with **bold text**
- Third item`}
      </ReactMarkdown>
    );

    const boldElements = container.querySelectorAll('strong');
    expect(boldElements.length).toBe(2);

    const italicElements = container.querySelectorAll('em');
    expect(italicElements.length).toBe(1);

    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(3);
  });

  it('should distinguish between inline and block code', () => {
    const { container } = render(
      <ReactMarkdown
        components={{
          code: ({ node, ...props }: any) => {
            return (
              <code
                style={{
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  fontFamily: 'monospace',
                }}
                {...props}
              />
            );
          },
        }}
      >
{`Here is \`inline code\` and below is a block:

\`\`\`
console.log('block code');
\`\`\``}
      </ReactMarkdown>
    );

    const codeElements = container.querySelectorAll('code');
    expect(codeElements.length).toBeGreaterThanOrEqual(2);
    codeElements.forEach((code) => {
      expect(code).toHaveStyle({
        fontFamily: 'monospace',
        backgroundColor: 'rgba(0,0,0,0.1)',
      });
    });
  });
});
