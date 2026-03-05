import { avatarColor } from "../utils/personality";

interface MemberAvatarProps {
  readonly name: string;
  readonly size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
} as const;

export function MemberAvatar({ name, size = "md" }: MemberAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const color = avatarColor(name);

  return (
    <div
      className={`${sizeClasses[size]} ${color} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
    >
      {initial}
    </div>
  );
}
