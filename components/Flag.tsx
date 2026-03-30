'use client';

import { useState } from 'react';
import { getFlagUrl } from '@/lib/flag-codes';

interface FlagProps {
  code: string; // FIFA 3-letter code
  size?: number; // pixel width: 16, 20, 24, 32, 40
  emoji?: string; // fallback emoji
  className?: string;
}

export default function Flag({ code, size = 24, emoji, className = '' }: FlagProps) {
  const [error, setError] = useState(false);
  const url = getFlagUrl(code, size);

  if (!url || error) {
    return <span className={className} style={{ fontSize: size * 0.7 }}>{emoji || '🏳️'}</span>;
  }

  return (
    <img
      src={url}
      alt={code}
      width={size}
      height={Math.round(size * 0.67)}
      onError={() => setError(true)}
      className={`inline-block rounded-sm shadow-sm ${className}`}
      style={{ width: size, height: 'auto' }}
    />
  );
}
