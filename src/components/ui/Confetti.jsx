import { useEffect, useRef } from 'react'

const COLORS = ['#FF5722', '#FF6E40', '#22C55E', '#3B82F6', '#FACC15', '#1A1A2E']

/**
 * Self-contained canvas confetti burst — no dependencies.
 * Renders a fixed full-screen canvas and animates for ~`duration` ms.
 */
export default function Confetti({ duration = 2600, pieces = 140 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let w = (canvas.width = window.innerWidth * dpr)
    let h = (canvas.height = window.innerHeight * dpr)
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'

    const confetti = Array.from({ length: pieces }).map(() => ({
      x: w / 2 + (Math.random() - 0.5) * 120 * dpr,
      y: h * 0.3 + (Math.random() - 0.5) * 60 * dpr,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (Math.random() * -10 - 4) * dpr,
      size: (Math.random() * 6 + 4) * dpr,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }))

    const gravity = 0.32 * dpr
    const start = performance.now()
    let raf

    const tick = (now) => {
      const elapsed = now - start
      ctx.clearRect(0, 0, w, h)
      confetti.forEach((p) => {
        p.vy += gravity
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, 1 - elapsed / duration)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      })
      if (elapsed < duration) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onResize = () => {
      w = canvas.width = window.innerWidth * dpr
      h = canvas.height = window.innerHeight * dpr
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [duration, pieces])

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[120]" aria-hidden="true" />
}
