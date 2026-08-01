import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Elliptic — Privacy Policy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    eyebrow: "Elliptic",
    title: "Privacy Policy",
    subtitle: "Your data stays on your own infrastructure.",
  });
}
