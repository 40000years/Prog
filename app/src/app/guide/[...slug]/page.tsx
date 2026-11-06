import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article";
import { wiki } from "@/lib/wiki";

export function generateStaticParams() { return Object.keys(wiki.pages).map(path => ({ slug: path.split("/") })); }
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = wiki.pages[slug.join("/")];
  return { title: article?.title || "ไม่พบบทความ", description: article?.lead?.replace(/\*\*|`/g, "") };
}

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join("/");
  if (!wiki.pages[path]) notFound();
  return <ArticleView path={path}/>;
}
