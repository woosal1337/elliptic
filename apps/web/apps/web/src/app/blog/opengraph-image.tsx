import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "The Elliptic blog";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    eyebrow: "Elliptic Blog",
    title: "The Elliptic blog",
    subtitle: "Product updates and notes on building an agent-native company.",
  });
}
