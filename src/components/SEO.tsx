import React from "react";
import { Helmet } from "react-helmet-async";

export type SEOProps = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
  ogImage?: string;
};

const BASE_URL = "https://www.algovx.me";

const DEFAULT_TITLE = "Algovx – Interactive DSA Visualizer | Built by Kabiraj Rana";

const DEFAULT_DESCRIPTION =
  "Algovx is an interactive Data Structures and Algorithms visualizer built by Kabiraj Rana, an AI & Machine Learning student. Learn sorting and searching algorithms visually.";

function safePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname.startsWith("/")) return pathname;
  return `/${pathname}`;
}

function resolveOgImageUrl(value: string | undefined): string {
  const fallback = `${BASE_URL}/og.png`;
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${BASE_URL}${value}`;
  return `${BASE_URL}/${value}`;
}

export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  noindex,
  ogImage,
}: SEOProps) {
  const resolvedPath = safePath(
    canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/")
  );

  const canonicalUrl = `${BASE_URL}${resolvedPath}`;
  const imageUrl = resolveOgImageUrl(ogImage);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalApplication",
    name: "Algovx",
    description,
    applicationCategory: "Education",
    operatingSystem: "Web",
    url: canonicalUrl,
    creator: {
      "@type": "Person",
      name: "Kabiraj Rana",
      jobTitle: "AI & Machine Learning Student",
    },
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="author" content="Kabiraj Rana" />

      <link rel="canonical" href={canonicalUrl} />

      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Algovx" />
      <meta property="og:image" content={imageUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
