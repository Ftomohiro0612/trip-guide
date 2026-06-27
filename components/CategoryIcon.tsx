import Image from "next/image";
import { categoryIcon, categoryIconImages } from "@/lib/icons";

type CategoryIconProps = {
  categoryId: string;
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export default function CategoryIcon({
  categoryId,
  className,
  width = 64,
  height = 64,
  alt = "",
}: CategoryIconProps) {
  const imageSrc = categoryIconImages[categoryId];

  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={["object-contain", className].filter(Boolean).join(" ")}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={["inline-flex items-center justify-center leading-none", className]
        .filter(Boolean)
        .join(" ")}
      style={{ fontSize: Math.min(width, height) * 0.75 }}
      aria-hidden
    >
      {categoryIcon(categoryId)}
    </span>
  );
}
