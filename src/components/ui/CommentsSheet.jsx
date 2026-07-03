import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sheet from './Sheet'
import Avatar from './Avatar'
import { timeAgo } from '../../lib/format'
import { listComments, addComment } from '../../lib/comments'
import { useAuth } from '../../context/AuthContext'

/** Slide-up comments thread with an auth-guarded composer. */
export default function CommentsSheet({ open, onClose, product, onCountChange }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listComments(product.id).then((data) => {
      setComments(data)
      setLoading(false)
      onCountChange?.(data.length)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product.id])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [comments])

  const submit = async (e) => {
    e.preventDefault()
    if (!user) {
      onClose()
      navigate('/auth', { state: { from: `/product/${product.id}` } })
      return
    }
    if (!text.trim()) return
    setSending(true)
    const { data, error } = await addComment(product.id, user.id, text)
    setSending(false)
    if (!error && data) {
      const next = [...comments, data]
      setComments(next)
      setText('')
      onCountChange?.(next.length)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Comments">
      <div ref={scrollRef} className="max-h-[55vh] space-y-4 overflow-y-auto pb-2">
        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No comments yet. Say something!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar src={c.user?.avatar_url} name={c.user?.business_name || c.user?.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{c.user?.business_name || c.user?.full_name || 'User'}</span>{' '}
                  <span className="text-[var(--color-text-muted)]">· {timeAgo(c.created_at)}</span>
                </p>
                <p className="text-sm text-[var(--color-text)]">{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="mt-2 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            if (!user) {
              onClose()
              navigate('/auth', { state: { from: `/product/${product.id}` } })
            }
          }}
          placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
          className="h-11 flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[15px] outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white tactile-press disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </Sheet>
  )
}
