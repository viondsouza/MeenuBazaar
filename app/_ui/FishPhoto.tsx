import Image from "next/image";
import type { Fish } from "@/lib/catalog";

// A real photo of the fish (public/fish/<key>.jpg, credited on /credits), framed the same
// way everywhere. Photos shot on a plain background are shown whole; market photos fill the frame.
export default function FishPhoto({ fish, sizes, priority = false, className = "" }: {
  fish: Fish;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const { fit = "cover", pos = "center", bg } = fish.photo;
  return (
    <div className={`photo ${className}`} style={bg ? { background: bg } : undefined}>
      <Image
        src={`/fish/${fish.key}.jpg`}
        alt={`${fish.name} (${fish.english})`}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectFit: fit, objectPosition: pos, padding: fit === "contain" ? "6%" : undefined }}
      />
    </div>
  );
}

// A small square photo for cart rows and lists.
export function FishThumb({ fishKey }: { fishKey: string }) {
  return (
    <div className="thumb">
      <Image src={`/fish/${fishKey}.jpg`} alt="" fill sizes="64px" />
    </div>
  );
}
