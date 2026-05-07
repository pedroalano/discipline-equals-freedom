'use client';

interface ImageFaderProps {
  url: string;
}

const ALLOWED_HOSTS = new Set(['images.unsplash.com']);

function safeBackgroundImage(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;
    return `url("${encodeURI(parsed.toString()).replace(/"/g, '%22')}")`;
  } catch {
    return null;
  }
}

export function ImageFader({ url }: ImageFaderProps) {
  const backgroundImage = safeBackgroundImage(url);
  if (!backgroundImage) {
    return <div className="absolute inset-0 bg-neutral-900" />;
  }
  return <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage }} />;
}
