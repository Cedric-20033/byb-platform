import Image from 'next/image'

interface ShowImageProps {
  width?: number
  height?: number
  size?: number
  src?: string
  alt?: string
  className?: string
}

export function ShowImage({
  width,
  height,
  size,
  src = '/Images/logo.png',
  alt = 'Photo d\'une panthère',
  className = '',
}: ShowImageProps) {
  const imageWidth = size ?? width ?? 260
  const imageHeight = size ?? height ?? 260

  return (
    <Image
      src={src}
      width={imageWidth}
      height={imageHeight}
      alt={alt}
      className={className}
    />
  )
}
