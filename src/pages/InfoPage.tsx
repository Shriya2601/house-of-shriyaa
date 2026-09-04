import React, { createElement, type CSSProperties, type ElementType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

type BuilderTextProps = {
  key?: React.Key;
  as?: ElementType;
  text?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

function BuilderText({ as: Tag = "span", text, className, style, children }: BuilderTextProps) {
  return createElement(
    Tag,
    { className, style, "data-editable": "true" },
    text !== undefined ? text : children,
  );
}

type InfoPageContent = {
  label: string;
  title: string;
  intro: string;
  paragraphs: string[];
  closingLabel: string;
  closing: string;
};

const pageContent: Record<string, InfoPageContent> = {
  "/our-story": {
    label: "Our Story",
    title: "OUR STORY",
    intro: "HOUSE OF SHRIYA, where timeless Indian artistry meets modern elegance.",
    paragraphs: [
      "House of Shriya was created with a love for beautifully crafted Indian wear and the stories woven into every fabric.",
      "We curate elegant unstitched suits and festive textiles inspired by India’s rich textile heritage, bringing together traditional craftsmanship and a refined contemporary aesthetic.",
      "Every piece is thoughtfully selected for its fabric, detail, texture, and timeless appeal—made for women who appreciate clothing that feels personal, graceful, and effortlessly beautiful.",
    ],
    closingLabel: "Our Philosophy",
    closing: "Our philosophy is simple: preserve the beauty of tradition while making it entirely yours.",
  },
  "/craftsmanship": {
    label: "Craftsmanship",
    title: "CRAFTSMANSHIP",
    intro: "Crafted with intention—tradition in every thread, elegance in every detail.",
    paragraphs: [
      "At House of Shriya, craftsmanship is at the heart of everything we curate, from hand-spun Chanderi and Banarasi-inspired textiles to intricate Zardozi details.",
      "Each fabric carries its own character. Its texture, weave, and subtle variations are part of what makes it beautifully unique.",
      "We believe true luxury isn’t about excess. It is about quality, detail, and the hands behind the craft.",
    ],
    closingLabel: "The House Standard",
    closing: "Every detail is chosen with intention, so the finished piece feels as considered as it is beautiful.",
  },
  "/journal": {
    label: "Journal",
    title: "THE HOUSE OF SHRIYA JOURNAL",
    intro: "Stories, style, and inspiration.",
    paragraphs: [
      "A space dedicated to everything we love about Indian fashion.",
      "Discover styling inspiration, festive edits, fabric stories, craftsmanship, seasonal trends, and thoughtful ways to style your favorite House of Shriya pieces.",
      "From everyday elegance to celebrations worth remembering, discover new ways to dress beautifully, thoughtfully, and entirely yourself.",
    ],
    closingLabel: "Keep Exploring",
    closing: "Explore. Discover. Style. Repeat.",
  },
};

const pageLinks = [
  { to: "/our-story", label: "Our Story" },
  { to: "/craftsmanship", label: "Craftsmanship" },
  { to: "/journal", label: "Journal" },
];

export default function InfoPage({ path }: { path: string }) {
  const content = pageContent[path] ?? pageContent["/our-story"];

  return (
    <div className="info-page">
      <header className="info-header">
        <Link to="/" className="info-brand" aria-label="House of Shriya home">
          <BuilderText as="span" text="House of Shriya" />
        </Link>
        <nav className="info-nav" aria-label="Editorial pages">
          {pageLinks.map((page) => (
            <Link className={page.to === path ? "active" : ""} key={page.to} to={page.to}>
              <BuilderText as="span" text={page.label} />
            </Link>
          ))}
        </nav>
        <Link className="info-home-link" to="/">
          <ArrowLeft size={14} />
          <BuilderText as="span" text="Back to store" />
        </Link>
      </header>

      <main className="info-main">
        <div className="info-kicker">
          <Sparkles size={14} />
          <BuilderText as="span" text={content.label} />
        </div>
        <BuilderText as="h1" className="info-title" text={content.title} />
        <BuilderText as="p" className="info-intro" text={content.intro} />
        <div className="info-divider" />
        <div className="info-copy">
          {content.paragraphs.map((paragraph) => (
            <BuilderText as="p" key={paragraph} text={paragraph} />
          ))}
        </div>
        <section className="info-closing">
          <BuilderText as="span" className="info-closing-label" text={content.closingLabel} />
          <BuilderText as="p" text={content.closing} />
        </section>
        <Link className="info-cta" to="/">
          <BuilderText as="span" text="Return to the edit" />
          <ArrowRight size={16} />
        </Link>
      </main>
    </div>
  );
}
