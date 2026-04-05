// Preset avatar options — SVG data URIs (no external assets needed)
// Each avatar is a colorful gradient circle with a unique icon/initial

const makeAvatar = (bg1, bg2, emoji) =>
  `data:image/svg+xml;utf8,` +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${bg1}"/>
          <stop offset="1" stop-color="${bg2}"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#g)"/>
      <text x="50" y="62" font-size="48" text-anchor="middle" font-family="Arial">${emoji}</text>
    </svg>`
  );

export const PRESET_AVATARS = [
  { id: 'bull',    url: makeAvatar('#7c8cf8', '#4c5ce8', '🐂') },
  { id: 'bear',    url: makeAvatar('#f472b6', '#ec4899', '🐻') },
  { id: 'rocket',  url: makeAvatar('#4ade80', '#22c55e', '🚀') },
  { id: 'chart',   url: makeAvatar('#60a5fa', '#3b82f6', '📈') },
  { id: 'money',   url: makeAvatar('#fbbf24', '#f59e0b', '💰') },
  { id: 'diamond', url: makeAvatar('#a78bfa', '#8b5cf6', '💎') },
  { id: 'fire',    url: makeAvatar('#fb923c', '#f97316', '🔥') },
  { id: 'brain',   url: makeAvatar('#f43f5e', '#e11d48', '🧠') },
  { id: 'target',  url: makeAvatar('#10b981', '#059669', '🎯') },
  { id: 'robot',   url: makeAvatar('#6366f1', '#4f46e5', '🤖') },
  { id: 'crown',   url: makeAvatar('#eab308', '#ca8a04', '👑') },
  { id: 'lightning', url: makeAvatar('#06b6d4', '#0891b2', '⚡') },
];

export const getAvatarUrl = (avatarId) => {
  if (!avatarId) return null;
  // If it's a data URI (uploaded image) or http URL, return as-is
  if (avatarId.startsWith('data:') || avatarId.startsWith('http')) return avatarId;
  // Otherwise look up preset
  const preset = PRESET_AVATARS.find(a => a.id === avatarId);
  return preset?.url || null;
};
