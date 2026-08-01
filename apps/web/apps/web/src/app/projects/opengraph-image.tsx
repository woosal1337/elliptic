import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Elliptic — Projects & tasks";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    eyebrow: "Elliptic",
    title: "Projects & tasks",
    subtitle: "Linear-style tasks your agents and team run on one board.",
  });
}
