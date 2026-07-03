const SUPPORTED_PLATFORMS = {
  leetcode: 'leetcode',
  codechef: 'codechef',
  github: 'github',
  hackerrank: 'hackerrank',
};

const normalizePlatform = (platform) => {
  if (typeof platform !== 'string') return null;

  const normalized = platform.trim().toLowerCase();
  return SUPPORTED_PLATFORMS[normalized] || null;
};

const trimInput = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const extractUsername = (platform, input) => {
  try {
    const normalizedPlatform = normalizePlatform(platform);
    if (!normalizedPlatform) return null;

    const rawValue = trimInput(input);
    if (!rawValue) return null;

    const cleanedValue = rawValue.replace(/\/+$/, '').trim();
    if (!cleanedValue) return null;

    const lowerValue = cleanedValue.toLowerCase();

    if (lowerValue.startsWith('http://') || lowerValue.startsWith('https://')) {
      const url = new URL(cleanedValue);
      const hostname = (url.hostname || '').toLowerCase();
      const pathname = (url.pathname || '').replace(/\/+$/, '');

      if (normalizedPlatform === 'leetcode') {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 0) return null;
        if (segments[0] === 'u' && segments[1]) return decodeURIComponent(segments[1]);
        if (segments[0] && segments[0] !== 'u') return decodeURIComponent(segments[0]);
        return null;
      }

      if (normalizedPlatform === 'codechef') {
        const segments = pathname.split('/').filter(Boolean);
        const userIndex = segments.indexOf('users');
        if (userIndex !== -1 && segments[userIndex + 1]) return decodeURIComponent(segments[userIndex + 1]);
        return segments[segments.length - 1] || null;
      }

      if (normalizedPlatform === 'github') {
        const segments = pathname.split('/').filter(Boolean);
        return segments[0] || null;
      }

      if (normalizedPlatform === 'hackerrank') {
        const segments = pathname.split('/').filter(Boolean);
        const profileIndex = segments.indexOf('profile');
        if (profileIndex !== -1 && segments[profileIndex + 1]) return decodeURIComponent(segments[profileIndex + 1]);
        return segments[segments.length - 1] || null;
      }
    }

    return decodeURIComponent(cleanedValue);
  } catch (error) {
    return null;
  }
};

module.exports = {
  SUPPORTED_PLATFORMS,
  normalizePlatform,
  extractUsername,
};
