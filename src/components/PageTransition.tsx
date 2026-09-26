import { ViewTransition, type ReactNode } from 'react'

/** Page-level slide: forward goes deeper (library → player), back returns. */
const PageTransition = ({ children }: { children: ReactNode }) => {
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

export default PageTransition
