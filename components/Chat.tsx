'use client';

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I can help you with job scheduling, installer assignments, and more. How can I assist you today?',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Add empty assistant message that will be streamed into
    const assistantMessageIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in buffer
        buffer = lines[lines.length - 1] || '';

        for (let i = 0; i < lines.length - 1; i++) {
          const line = (lines[i] || '').trim();
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              if (data.type === 'chunk' && typeof data.content === 'string') {
                fullContent += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: 'assistant',
                    content: fullContent,
                  };
                  return updated;
                });
              } else if (data.type === 'done') {
                setIsLoading(false);
                break;
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Unknown streaming error');
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Final buffer flush
      const trimmedBuffer = buffer.trim();
      if (trimmedBuffer.startsWith('data: ')) {
        try {
          const jsonStr = trimmedBuffer.slice(6);
          const data = JSON.parse(jsonStr);
          if (data.type === 'error') {
            throw new Error(data.error || 'Unknown streaming error');
          }
        } catch (e) {
          console.error('Error parsing final SSE data:', e);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMessageIndex] = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-section dashboard-chat">
      <div className="section-header">AI Assistant</div>
      <div className="section-content" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: msg.role === 'user' ? '#0066cc' : '#f0f0f0',
                  color: msg.role === 'user' ? 'white' : '#333',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  wordWrap: 'break-word',
                }}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p style={{ margin: '0.5em 0' }} {...props} />,
                      strong: ({ node, ...props }) => <strong style={{ fontWeight: 'bold' }} {...props} />,
                      em: ({ node, ...props }) => <em style={{ fontStyle: 'italic' }} {...props} />,
                      ul: ({ node, ...props }) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }} {...props} />,
                      ol: ({ node, ...props }) => <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em' }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ margin: '0.25em 0' }} {...props} />,
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
                        ) : (
                          <code
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.1)',
                              padding: '0.8em',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              display: 'block',
                              margin: '0.5em 0',
                            }}
                            {...props}
                          />
                        );
                      },
                      a: ({ node, ...props }) => <a style={{ color: '#0066cc', textDecoration: 'underline' }} {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#999', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#999', animation: 'pulse 1.5s infinite 0.2s' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#999', animation: 'pulse 1.5s infinite 0.4s' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 16px',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#fafafa',
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about jobs, installers..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !inputValue.trim() ? 0.6 : 1,
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Send
          </button>
        </form>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
