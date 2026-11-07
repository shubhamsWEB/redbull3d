import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CANS, getCan } from "@/data/cans";
import Product from "@/slices/Product";

export const dynamicParams = false;

export const generateStaticParams = () => CANS.map(({ slug }) => ({ slug }));

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const can = getCan(params.slug);
  return { title: can ? `${can.name}: ${can.world.name} (unofficial concept)` : undefined };
}

export default function Page({ params }: { params: { slug: string } }) {
  if (!getCan(params.slug)) notFound();
  return <Product slug={params.slug} />;
}
