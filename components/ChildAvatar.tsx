import Image from "next/image";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
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
          sizes={size === "lg" ? "64px" : size === "md" ? "40px" : "28px"}
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
