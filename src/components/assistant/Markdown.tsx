import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-[var(--text-base)] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] underline underline-offset-2"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--border)] pl-3 text-[var(--muted)]">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <pre className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-[var(--text-sm)]">
                  <code className="font-mono">{children}</code>
                </pre>
              );
            }
            return (
              <code
                className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[var(--text-sm)]"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
              <table className="w-full text-[var(--text-sm)]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[var(--muted)]">{children}</th>
          ),
          td: ({ children }) => <td className="border-b border-[var(--border)] px-3 py-2 last:border-0">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
