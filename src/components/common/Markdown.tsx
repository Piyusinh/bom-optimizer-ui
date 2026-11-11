import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Renders LLM/rule-based explanation text (GitHub-flavored Markdown: #
 * headers, **bold**, - lists) as styled HTML instead of literal
 * "### Heading" / "**bold**" characters.
 *
 * Both /api/explain and /api/agent/chat return Markdown-formatted prose
 * (see api/app/routes/explain.py _rule_based_explain and _build_explain_prompt) —
 * this is the single place that renders it consistently across the app
 * (Decisions page explanation panel + AI Assistant chat).
 */
export const Markdown: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => (
  <div className={`markdown-body text-sm ${className}`}>
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h3 className="text-base font-bold text-gray-900 mt-3 mb-1.5 first:mt-0">{children}</h3>,
        h2: ({ children }) => <h3 className="text-base font-bold text-gray-900 mt-3 mb-1.5 first:mt-0">{children}</h3>,
        h3: ({ children }) => <h4 className="text-sm font-semibold text-gray-900 mt-3 mb-1 first:mt-0">{children}</h4>,
        p: ({ children }) => <p className="text-sm text-gray-700 leading-relaxed mb-1.5">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-1.5 text-sm text-gray-700">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-1.5 text-sm text-gray-700">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children }) => <code className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-800">{children}</code>,
        hr: () => <hr className="my-2 border-gray-200" />,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-primary-600 underline">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
