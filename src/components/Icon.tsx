// One consistent minimal line-icon system (24x24, stroke-based).
import type { CSSProperties, ReactElement } from 'react'

export type IconName =
  | 'home' | 'calendar' | 'check' | 'timer' | 'user' | 'sparkle' | 'flower' | 'leaf' | 'book'
  | 'star' | 'clock' | 'plus' | 'close' | 'chevron-left' | 'chevron-right' | 'trash' | 'edit'
  | 'bell' | 'moon' | 'sun' | 'music' | 'play' | 'pause' | 'send' | 'brain' | 'target'
  | 'trophy' | 'flame' | 'droplet' | 'copy' | 'list' | 'external'

const P: Record<IconName, ReactElement> = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="3" />
      <path d="M8 3.5v4M16 3.5v4M4 10.5h16" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4.5l3 2M9.5 3h5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4" />
    </>
  ),
  sparkle: <path d="M12 4l1.8 4.7L18.5 10.5l-4.7 1.8L12 17l-1.8-4.7L5.5 10.5l4.7-1.8zM18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />,
  flower: (
    <>
      <circle cx="12" cy="9" r="2.1" />
      <path d="M12 6.9c-2.6 0-3.4-3.4-.6-3.9 1.4-.3 2.4 1.2 1.6 2.4M12 6.9c2.6 0 3.4-3.4.6-3.9-1.4-.3-2.4 1.2-1.6 2.4" transform="rotate(72 12 9)" />
      <path d="M12 6.9c-2.6 0-3.4-3.4-.6-3.9 1.4-.3 2.4 1.2 1.6 2.4M12 6.9c2.6 0 3.4-3.4.6-3.9-1.4-.3-2.4 1.2-1.6 2.4" transform="rotate(144 12 9)" />
      <path d="M12 6.9c-2.6 0-3.4-3.4-.6-3.9 1.4-.3 2.4 1.2 1.6 2.4M12 6.9c2.6 0 3.4-3.4.6-3.9-1.4-.3-2.4 1.2-1.6 2.4" transform="rotate(216 12 9)" />
      <path d="M12 6.9c-2.6 0-3.4-3.4-.6-3.9 1.4-.3 2.4 1.2 1.6 2.4M12 6.9c2.6 0 3.4-3.4.6-3.9-1.4-.3-2.4 1.2-1.6 2.4" transform="rotate(288 12 9)" />
      <path d="M12 11.2V20M12 15.5c-1.8 0-3.2-1.2-3.4-3M12 17.5c1.8 0 3.2-1.2 3.4-3" />
    </>
  ),
  leaf: <path d="M5 19C5 9 12 4 20 4c0 8-5 15-15 15zM5 19c2.5-5 6-8.5 10-10.5" />,
  book: <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5zM5 18.5V5.5M19 18v3H7.5" />,
  star: <path d="M12 4l2.4 5 5.6.7-4.1 3.9 1 5.4-4.9-2.7L7.1 19l1-5.4L4 9.7 9.6 9z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  'chevron-left': <path d="M14.5 5.5 8 12l6.5 6.5" />,
  'chevron-right': <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13M10 11v5M14 11v5" />,
  edit: <path d="M5 19h3L19 8l-3-3L5 16zM14 6l3 3" />,
  bell: <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2.5H4.5zM10 19a2 2 0 0 0 4 0" />,
  moon: <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
    </>
  ),
  music: (
    <>
      <path d="M9 18.5V6l10-2v12.5" />
      <circle cx="6.8" cy="18.5" r="2.2" />
      <circle cx="16.8" cy="16.5" r="2.2" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  send: <path d="M4.5 12 20 4.5 15 20l-4.5-6.5L4.5 12z" />,
  brain: <path d="M9.5 4.5A3 3 0 0 0 6 7.4 3.2 3.2 0 0 0 4 10.4a3 3 0 0 0 1.7 2.7A3 3 0 0 0 9 17.5c.8 0 1.5-.3 2-.8V4.9a2.6 2.6 0 0 0-1.5-.4zM14.5 4.5A3 3 0 0 1 18 7.4a3.2 3.2 0 0 1 2 3 3 3 0 0 1-1.7 2.7A3 3 0 0 1 15 17.5c-.8 0-1.5-.3-2-.8M12 4.9v11.8M10 20h4" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </>
  ),
  trophy: <path d="M8 4h8v6a4 4 0 0 1-8 0zM8 5.5H5a3 3 0 0 0 3 4.5M16 5.5h3a3 3 0 0 1-3 4.5M12 14v3.5M8.5 20h7M10 17.5h4" />,
  flame: <path d="M12 3.5c.5 3-3.5 5-3.5 9a5.5 5.5 0 0 0 11 0c0-2.5-1.5-4.5-3-6-.3 1.4-1 2-2 2.5.4-2-.5-4.5-2.5-5.5z" />,
  droplet: <path d="M12 3.5S6.5 10 6.5 14a5.5 5.5 0 0 0 11 0c0-4-5.5-10.5-5.5-10.5z" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  list: <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  external: <path d="M14 5h5v5M19 5l-8 8M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />,
}

export function Icon({ name, size = 22, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  )
}
