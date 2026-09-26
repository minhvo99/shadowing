import { useNavigateWithType, type NavType } from '@hooks'
import { Link, type LinkProps } from 'react-router'

/** A real <a href> (keyboard, middle-click, copy link) that animates on plain left clicks. */
const TypedLink = ({ type, to, onClick, ...props }: LinkProps & { to: string; type: NavType }) => {
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

export default TypedLink
