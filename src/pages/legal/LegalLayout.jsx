import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'

// Tailwind class map so the markdown matches the SociaMart design system.
const components = {
  h1: ({ children }) => <h1 className="mb-4 text-2xl font-extrabold font-display tracking-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-7 text-lg font-bold font-display">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-5 text-base font-semibold font-display">{children}</h3>,
  p: ({ children }) => <p className="mb-4 text-[15px] leading-relaxed text-[var(--color-text-muted)]">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 space-y-2">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5">{children}</ol>,
  li: ({ children }) => <li className="ml-5 list-disc text-[15px] leading-relaxed text-[var(--color-text-muted)]">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[var(--color-text)]">{children}</strong>,
  em: ({ children }) => <em className="text-[var(--color-text-muted)]">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} className="font-medium text-primary underline" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-[var(--color-border)]" />,
}

/** Shared shell for the markdown-driven legal pages (/terms, /privacy). */
export default function LegalLayout({ content, lastUpdated = 'June 2026' }) {
  const navigate = useNavigate()

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-text)] hover:bg-navy/5 dark:hover:bg-white/10 tactile-press"
        >
          <span className="text-xl leading-none">‹</span>
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo/logo-icon.svg" alt="" className="h-7 w-7" />
          <span className="font-extrabold font-display">
            Socia<span className="text-primary">Mart</span>
          </span>
        </div>
      </header>

      <main className="px-5 pb-24 pt-5">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Last updated: {lastUpdated}
        </p>
        <article className="max-w-prose">
          <ReactMarkdown components={components}>{content}</ReactMarkdown>
        </article>
      </main>
    </div>
  )
}
