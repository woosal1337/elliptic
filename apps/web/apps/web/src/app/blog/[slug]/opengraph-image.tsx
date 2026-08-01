import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { POSTS, getPost } from "../_content/posts";

export const alt = "Elliptic Blog";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  return ogImage({
    eyebrow: "Elliptic Blog",
    title: post?.title ?? "Elliptic Blog",
    subtitle: "company.chele.bi",
  });
}
