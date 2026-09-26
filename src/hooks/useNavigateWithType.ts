import { addTransitionType, startTransition } from 'react'
import { useNavigate } from 'react-router'

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
