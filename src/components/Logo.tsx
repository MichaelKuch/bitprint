import { useState } from 'react';

import ErrorIcon from '../assets/exclamation-circle.svg?react';

interface LogoProps {
  alt: string;
  /** Omit to show the placeholder without requesting anything */
  src?: string;
  className?: string;
}

export default function Logo({ alt, src, className }: LogoProps) {
  const [error, setError] = useState(false);

  return error || !src ? (
    <ErrorIcon className={className} />
  ) : (
    <img alt={alt} src={src} className={className} onError={() => setError(true)} />
  );
}
