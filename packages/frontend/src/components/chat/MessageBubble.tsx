import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { User, Bot } from 'lucide-react';
import { DisplayMessage } from '../../types/chat.types';
import { ToolCallDisplay } from './ToolCallDisplay';
import { StreamingIndicator } from './StreamingIndicator';
import { linkifyPaths } from '../../utils/path-linkify';

function processChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      const parts = linkifyPaths(child);
      return parts.length === 1 && typeof parts[0] === 'string' ? child : <>{parts}</>;
    }
    // Recursively process nested React elements (e.g. <strong>, <em>, <a>)
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.props.children) {
      return React.cloneElement(child, {}, processChildren(child.props.children));
    }
    return child;
  });
}

const markdownComponents: Components = {
  p({ children }) {
    return <p>{processChildren(children)}</p>;
  },
  li({ children }) {
    return <li>{processChildren(children)}</li>;
  },
  strong({ children }) {
    return <strong>{processChildren(children)}</strong>;
  },
  em({ children }) {
    return <em>{processChildren(children)}</em>;
  },
  td({ children }) {
    return <td>{processChildren(children)}</td>;
  },
  th({ children }) {
    return <th>{processChildren(children)}</th>;
  },
  blockquote({ children }) {
    return <blockquote>{processChildren(children)}</blockquote>;
  },
  h1({ children }) {
    return <h1>{processChildren(children)}</h1>;
  },
  h2({ children }) {
    return <h2>{processChildren(children)}</h2>;
  },
  h3({ children }) {
    return <h3>{processChildren(children)}</h3>;
  },
  code({ children, className }) {
    // Block code (has language class) — don't linkify
    if (className) {
      return <code className={className}>{children}</code>;
    }
    // Inline code — linkify paths
    return <code>{processChildren(children)}</code>;
  },
};

export function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 min-w-0 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`flex-1 max-w-[80%] min-w-0 ${isUser ? 'text-right' : ''}`}>
        {isUser ? (
          <div className="inline-block px-4 py-2 bg-blue-600 text-white rounded-2xl rounded-tr-sm break-words">
            {message.content}
          </div>
        ) : (
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
            {message.toolCalls.map((tc) => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
            {message.content && (
              <div className="prose prose-sm max-w-none break-words overflow-wrap-anywhere">
                <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
              </div>
            )}
            {message.isStreaming && !message.content && message.toolCalls.length === 0 && (
              <StreamingIndicator />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
