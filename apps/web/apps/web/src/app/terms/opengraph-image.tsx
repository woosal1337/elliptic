import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Elliptic — Terms of Service";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    eyebrow: "Elliptic",
    title: "Terms of Service",
    subtitle: "The software is open source under Apache-2.0.",
  });
}
