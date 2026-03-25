'use client';

interface ImageFaderProps {
  url: string;
}

export function ImageFader({ url }: ImageFaderProps) {
  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${url})` }}
    />
  );
}
