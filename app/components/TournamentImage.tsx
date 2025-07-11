'use client'

import Image from 'next/image';
import { useState } from 'react';

interface TournamentImageProps {
  src: string;
  alt: string;
  title: string;
}

export default function TournamentImage({ src, alt, title }: TournamentImageProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return null; // Don't render anything if image fails to load
  }

  return (
    <div className="mb-4">
      <Image
        src={src}
        alt={alt}
        width={300}
        height={200}
        className="w-full h-48 object-cover rounded-lg"
        onError={() => setImageError(true)}
      />
    </div>
  );
} 