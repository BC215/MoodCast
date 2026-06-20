export const defaultAvatarSrc =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff7a8f"/>
          <stop offset="55%" stop-color="#b59cff"/>
          <stop offset="100%" stop-color="#5ac8ff"/>
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="40" fill="url(#g)"/>
      <circle cx="40" cy="31" r="12" fill="#fff" opacity=".9"/>
      <path d="M22 63c4-11 12-16 18-16s14 5 18 16" fill="#fff" opacity=".9"/>
    </svg>
  `);
