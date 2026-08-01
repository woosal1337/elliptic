import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Elliptic — Activity & live sync";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    eyebrow: "Elliptic",
    title: "Activity & live sync",
    subtitle: "An audit trail and a workspace that stays live.",
  });
}
