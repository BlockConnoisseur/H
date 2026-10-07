export function ForgeMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path d="M32 4 56 18 44 25 32 18 20 25 8 18 32 4Z" fill="currentColor" />
      <path d="M56 21v25L34 59V45l10-6V28l12-7Z" fill="currentColor" />
      <path d="m8 21 12 7v11l10 6v14L8 46V21Z" fill="currentColor" />
    </svg>
  );
}

export function MethodShape({ track }: { track: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {track === "S1" ? (
        <>
          <path
            d="M9 17h25v30H9zM30 8h25v30H30z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M21 27h23v30H21z"
            fill="var(--background)"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      ) : track === "S2" ? (
        <>
          <path
            d="M12 12h40v12H12zM12 28h40v12H12zM12 44h40v12H12z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M18 18h9M18 34h9M18 50h9"
            stroke="currentColor"
            strokeWidth="3"
          />
        </>
      ) : (
        <>
          <path
            d="M9 13h46M9 32h46M9 51h46"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="23"
            cy="13"
            r="5"
            fill="var(--background)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="43"
            cy="32"
            r="5"
            fill="var(--background)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="30"
            cy="51"
            r="5"
            fill="var(--background)"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );
}
