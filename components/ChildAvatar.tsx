import Image from "next/image";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<Size, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-28 w-28 text-4xl sm:h-32 sm:w-32",
};

const colors = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

function colorForId(childId: string): string {
  const total = Array.from(childId).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return colors[total % colors.length];
}

function initialForNickname(nickname: string): string {
  return Array.from(nickname.trim())[0] ?? "?";
}

export default function ChildAvatar({
  childId,
  nickname,
  avatarUrl,
  size = "md",
}: {
  childId: string;
  nickname: string;
  avatarUrl?: string | null;
  size?: Size;
}) {
  const classes = `${sizeClasses[size]} relative shrink-0 overflow-hidden rounded-full`;

  if (avatarUrl) {
    return (
      <span className={classes}>
        <Image
          src={avatarUrl}
          alt={`${nickname}の写真`}
          fill
          sizes={
            size === "xl"
              ? "(min-width: 640px) 128px, 112px"
              : size === "lg"
                ? "64px"
                : size === "md"
                  ? "40px"
                  : "28px"
          }
          className="object-cover"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={`${classes} inline-flex items-center justify-center font-bold ${colorForId(
        childId,
      )}`}
      aria-label={nickname}
    >
      {initialForNickname(nickname)}
    </span>
  );
}
