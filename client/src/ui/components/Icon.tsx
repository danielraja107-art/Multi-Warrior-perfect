import React from 'react'

/**
 * Central icon set for Storm Arena.
 *
 * Why this exists: the UI previously leaned on raw emoji (👊🥢🏏🪓🔨🪨🔊🔇⚠⚔)
 * for weapons, audio, and status glyphs. Emoji render inconsistently across
 * OS/browser (different weight, different color, no way to theme them), and
 * read as a placeholder rather than a finished icon set. These are simple
 * single-color line icons that inherit `currentColor`, so they always match
 * whatever text/accent color surrounds them and stay crisp at any size.
 */

export type IconName =
  | 'fist'
  | 'stick'
  | 'baseball-bat'
  | 'axe'
  | 'hammer'
  | 'rock'
  | 'volume-on'
  | 'volume-off'
  | 'warning'
  | 'crossed-swords'
  | 'trophy'
  | 'skull'
  | 'shield'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName
  size?: number | string
}

const paths: Record<IconName, React.ReactNode> = {
  fist: (
    <path
      d="M7 10V8a2 2 0 0 1 4 0v-.5a2 2 0 0 1 4 0V8a2 2 0 0 1 4 0v3.5a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 7 11.5V10Zm0 0a2 2 0 0 0-2 2v.5c0 .9.4 1.7 1 2.3M9 8V6a1 1 0 1 1 2 0v2"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  stick: (
    <path
      d="M6 18 17.5 6.5a1.8 1.8 0 0 0-2.55-2.55L3.4 15.45a1.5 1.5 0 0 0 0 2.1l1.05 1.05a1.5 1.5 0 0 0 2.1 0Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'baseball-bat': (
    <>
      <path
        d="M4.5 19.5 15 9a2.5 2.5 0 0 0 0-3.5 2.5 2.5 0 0 0-3.5 0L1 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="6" r="3.2" fill="none" stroke="currentColor" strokeWidth={1.6} />
    </>
  ),
  axe: (
    <>
      <path
        d="M13 11 20 4c-3.2-.6-6.2.4-8 2.2C10.2 8 9.2 11 9.8 14.2L13 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path
        d="M12.3 11.7 4.6 19.4a1.4 1.4 0 0 0 2 2l7.7-7.7"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </>
  ),
  hammer: (
    <>
      <path
        d="m14.5 6.5 3-3 3.5 3.5-3 3m-3.5-3.5 3.5 3.5m-3.5-3.5L8 13"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 13 4.4 16.6a1.7 1.7 0 0 0 0 2.4l.6.6a1.7 1.7 0 0 0 2.4 0L11 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  rock: (
    <path
      d="M12 4 5 9l1.5 9h11L19 9l-7-5Zm0 0v6m0 0-4.5 3M12 10l4.5 3"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'volume-on': (
    <path
      d="M4 10v4h3.5L12 17.5v-11L7.5 10H4Zm12.5-2a4.5 4.5 0 0 1 0 8m1.5-11a8 8 0 0 1 0 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'volume-off': (
    <path
      d="M4 10v4h3.5L12 17.5v-11L7.5 10H4Zm13 0 4 4m0-4-4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  warning: (
    <path
      d="M12 3.5 22 20H2L12 3.5Zm0 6.5v4.5m0 3.01.01-.01"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'crossed-swords': (
    <path
      d="M4 4l7 7m9-7-7 7M4 20l6-6m10 6-6-6M9.5 9.5 4 4m10.5 10.5L20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  trophy: (
    <path
      d="M7 4h10v3a5 5 0 0 1-10 0V4Zm0 1H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3m-5 3v4m0 0H9.5a1.5 1.5 0 0 0-1.5 1.5V20h8v-1.5a1.5 1.5 0 0 0-1.5-1.5H12Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  skull: (
    <path
      d="M12 3a7 7 0 0 0-7 7c0 2.2 1 4 2.5 5.3V18a1 1 0 0 0 1 1H10v2h4v-2h1.5a1 1 0 0 0 1-1v-2.7A6.98 6.98 0 0 0 19 10a7 7 0 0 0-7-7ZM9.5 12a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm5 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  shield: (
    <path
      d="M12 3 5 5.5V11c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V5.5L12 3Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

export function Icon({ name, size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}

export const WEAPON_ICON: Record<string, IconName> = {
  fist: 'fist',
  stick: 'stick',
  baseball_bat: 'baseball-bat',
  axe: 'axe',
  hammer: 'hammer',
  rock: 'rock',
}
