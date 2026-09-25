import { addTransitionType, startTransition, ViewTransition, type ReactNode } from 'react'
import { Link, useNavigate, type LinkProps } from 'react-router'

export type NavType = 'nav-forward' | 'nav-back'

/** Navigate inside a transition tagged with a direction, so page VTs pick the matching slide. */
export function useNavigateWithType() {
  const navigate = useNavigate()
  return (to: string, type: NavType) =>
    startTransition(() => {
      addTransitionType(type)
      navigate(to)
    })
}

/** A real <a href> (keyboard, middle-click, copy link) that animates on plain left clicks. */
export function TypedLink({ type, to, onClick, ...props }: LinkProps & { to: string; type: NavType }) {
  const go = useNavigateWithType()
  return (
    <Link
      to={to}
      {...props}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        go(to, type)
      }}
    />
  )
}

/** Page-level slide: forward goes deeper (library → player), back returns. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      {children}
    </ViewTransition>
  )
}
