const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";

interface AvatarProps {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  rounded?: "full" | "xl" | "2xl";
  gradient?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

export default function Avatar({
  firstName,
  lastName,
  photoUrl,
  size = "md",
  className = "",
  rounded = "xl",
  gradient = "from-primary-400 to-purple-500",
}: AvatarProps) {
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
  const imgUrl = photoUrl ? `${API_BASE}${photoUrl}` : null;
  const roundedClass = rounded === "full" ? "rounded-full" : rounded === "2xl" ? "rounded-2xl" : "rounded-xl";

  return (
    <div className={`${sizeClasses[size]} ${roundedClass} flex items-center justify-center font-bold flex-shrink-0 overflow-hidden shadow-sm ${
      imgUrl ? "" : `bg-gradient-to-br ${gradient} text-white`
    } ${className}`}>
      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgUrl} alt={`${firstName} ${lastName}`} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
