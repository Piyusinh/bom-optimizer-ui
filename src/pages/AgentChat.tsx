import React, { useEffect, useRef, useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Markdown } from '@/components/common/Markdown';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useApiMutation } from '@/hooks/useApiMutation';
import { sendAgentChat, fetchAgentTools } from '@/services/api';
import type { AgentToolsResponse, ChatMessage, ChatResponse } from '@/types';

/**
 * AI Assistant — Phase 2 MVP chat UI.
 *
 * The backend contract (api/app/routes/agent.py) is: the model may ONLY
 * call the 5 read-only tools registered in app.agent.tools. It never
 * ranks, writes, approves, or invents numbers — it narrates what a tool
 * call returned. This page surfaces that contract directly: every
 * assistant turn shows which tools (if any) were actually called, so it's
 * obvious when an answer is grounded vs. a plain conversational reply.
 */

interface DisplayMessage extends ChatMessage {
  toolCallsMade?: string[];
  modelUsed?: string;
  isError?: boolean;
}

const SUGGESTED_PROMPTS = [
  'What was the most recent decision?',
  'Is the data for plant 1000 up to date?',
  'Explain the top-ranked candidate for the latest decision',
];

export const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: toolsInfo } = useApiQuery<AgentToolsResponse>(() => fetchAgentTools(), []);

  const { mutate: chat, loading } = useApiMutation<ChatMessage[], ChatResponse>(
    (history) => sendAgentChat(history),
    {
      onSuccess: (res) => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.reply,
            toolCallsMade: res.tool_calls_made,
            modelUsed: res.model_used,
          },
        ]);
      },
      onError: (err) => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: err instanceof Error ? err.message : 'The AI assistant failed to respond.',
            isError: true,
          },
        ]);
      },
    },
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: DisplayMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    // Send only role+content — toolCallsMade/modelUsed are display-only, the
    // API schema doesn't accept them.
    chat(next.map(({ role, content }) => ({ role, content })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  return (
    <PageLayout pageName="AI Assistant">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Assistant</h2>
          <p className="text-sm text-gray-500 mt-1">
            Ask about decisions, data freshness, or order chains. The assistant only reads
            data the deterministic engine already computed and stored — it never ranks,
            writes, or approves anything. Every reply below shows exactly which tools (if
            any) were called to answer it.
          </p>
        </div>

        {toolsInfo && (
          <details className="card text-xs text-gray-500">
            <summary className="cursor-pointer font-medium text-gray-700">
              {toolsInfo.tool_count} read-only tools available &middot; guardrails
            </summary>
            <div className="mt-2 space-y-2">
              <ul className="space-y-1">
                {toolsInfo.tools.map((t) => (
                  <li key={t.name}>
                    <span className="font-mono text-gray-700">{t.name}</span> — {t.description}
                  </li>
                ))}
              </ul>
              <ul className="space-y-1 pt-2 border-t border-gray-100">
                {toolsInfo.guardrails.map((g, i) => (
                  <li key={i} className="text-amber-700">⚠ {g}</li>
                ))}
              </ul>
            </div>
          </details>
        )}

        <div className="card flex flex-col h-[60vh]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-gray-400">
                <p className="text-sm">Ask a question to get started.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => submit(p)}
                      className="text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white whitespace-pre-wrap'
                      : m.isError
                        ? 'bg-red-50 border border-red-200 text-red-700 whitespace-pre-wrap'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.role === 'assistant' && !m.isError ? (
                    <Markdown content={m.content} />
                  ) : (
                    m.content
                  )}
                  {m.role === 'assistant' && !m.isError && (
                    <div className="mt-1.5 pt-1.5 border-t border-gray-200 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                      {m.toolCallsMade && m.toolCallsMade.length > 0 ? (
                        <>
                          <span>Grounded via:</span>
                          {m.toolCallsMade.map((tc, j) => (
                            <span key={j} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
                              {tc}
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          No tool called — not grounded in stored data
                        </span>
                      )}
                      {m.modelUsed && <span className="ml-auto text-gray-400">{m.modelUsed}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-400">
                  Thinking&hellip;
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 pt-3 mt-2 border-t border-gray-100">
            <input
              className="input-field flex-1"
              placeholder="Ask about a decision, data freshness, or an order chain..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary text-sm">
              Send
            </button>
          </form>
        </div>
      </div>
    </PageLayout>
  );
};
