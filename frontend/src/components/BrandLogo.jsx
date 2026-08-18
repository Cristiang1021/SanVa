export default function BrandLogo({ className = 'h-16 w-auto object-contain', alt = 'Sanva Shows' }) {
  return (
    <img
      src="/logo/sanva-shows-ink.png"
      alt={alt}
      className={className}
    />
  );
}
