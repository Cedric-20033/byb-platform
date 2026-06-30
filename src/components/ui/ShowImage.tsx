import Image from 'next/image'

interface ShowImageProps {
  width?: number
  height?: number
  size?: number
  src?: string
  alt?: string
  className?: string
  fill?: boolean
}

export function ShowImage({
  width,
  height,
  size,
  src = '/Images/logo.png',
  alt = "Photo d'une panthère",
  className = '',
  fill = false,
}: ShowImageProps) {
  const imageWidth = size ?? width ?? 260
  const imageHeight = size ?? height ?? 260

  // MODE FILL
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes="100%"
      />
    )
  }

  // MODE CLASSIQUE
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