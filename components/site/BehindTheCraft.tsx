"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProcessClip = {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url: string;
};

type VideoKind = "youtube" | "vimeo" | "mp4";

// ── URL helpers ───────────────────────────────────────────────────────────────

function detectKind(url: string): VideoKind {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  return "mp4";
}

function buildEmbedUrl(url: string, kind: VideoKind): string {
  if (kind === "youtube") {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/\s]+)/);
    const id = m?.[1] ?? "";
    return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  }
  if (kind === "vimeo") {
    const m = url.match(/vimeo\.com\/(\d+)/);
    const id = m?.[1] ?? "";
    return `https://player.vimeo.com/video/${id}?autoplay=1`;
  }
  return url; // mp4 — use src directly on <video>
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BehindTheCraft({ clips }: { clips: ProcessClip[] }) {
  const [activeClip, setActiveClip] = useState<ProcessClip | null>(null);

  const close = useCallback(() => setActiveClip(null), []);

  // Escape key + body scroll lock while lightbox is open
  useEffect(() => {
    if (!activeClip) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [activeClip, close]);

  if (!clips.length) return null;

  return (
    <>
      {/* ── Section band ───────────────────────────────────────────── */}
      {/*
       * bg-terracotta/10 over the ivory page gives a warm peachy-cream band
       * (~#F8E8DF) that clearly separates this section from the ivory above.
       */}
      <section className="bg-terracotta/10 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* ── Heading + intro ─────────────────────────────────────── */}
          <div className="mb-12 text-center">
            <h2 className="font-heading italic text-3xl text-navy md:text-4xl">
              Behind the Craft
            </h2>
            <p className="mx-auto mt-4 max-w-2xl font-body text-sm leading-relaxed text-navy/65 md:text-base">
              Every piece begins as an idea — poured by hand in eco-resin, cured for
              24&nbsp;hours, and sealed for a lasting finish. Here&apos;s a peek behind
              the process.
            </p>
          </div>

          {/* ── Card grid ───────────────────────────────────────────── */}
          {/*
           * Mobile: horizontal snap-scroll row (same pattern as Bestsellers).
           * Desktop (≥ md): 3-column CSS grid.
           */}
          <div
            className={[
              "flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2",
              "md:grid md:grid-cols-3 md:gap-7 md:overflow-visible md:pb-0",
            ].join(" ")}
          >
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="w-[280px] flex-none snap-start md:w-auto"
              >
                <ClipCard clip={clip} onPlay={() => setActiveClip(clip)} />
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Lightbox ────────────────────────────────────────────────── */}
      {activeClip && (
        <Lightbox clip={activeClip} onClose={close} />
      )}
    </>
  );
}

// ── Clip card ─────────────────────────────────────────────────────────────────

function ClipCard({
  clip,
  onPlay,
}: {
  clip: ProcessClip;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group w-full text-left outline-none"
      aria-label={`Play: ${clip.title}`}
    >
      {/* Thumbnail with play overlay */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-blush/40 shadow-sm transition-shadow duration-300 group-hover:shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={clip.thumbnail_url}
          alt={clip.title}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />

        {/* Gradient tint so play button pops against light thumbnails */}
        <div className="absolute inset-0 bg-black/15 transition-colors duration-300 group-hover:bg-black/28" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ivory/90 shadow-lg transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110">
            <PlayIcon />
          </div>
        </div>
      </div>

      {/* Title */}
      <p className="mt-3 font-heading italic text-base leading-snug text-navy transition-colors duration-200 group-hover:text-terracotta">
        {clip.title}
      </p>
    </button>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  clip,
  onClose,
}: {
  clip: ProcessClip;
  onClose: () => void;
}) {
  const kind = detectKind(clip.video_url);
  const embedUrl = buildEmbedUrl(clip.video_url, kind);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button — sits outside video so it's always tappable */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/15 text-ivory transition-colors hover:bg-ivory/30"
      >
        <XIcon />
      </button>

      {/* Video container — stop propagation so clicking video doesn't close modal */}
      <div
        className="relative w-full max-w-4xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title above player */}
        <p className="mb-3 text-center font-heading italic text-lg text-ivory/90">
          {clip.title}
        </p>

        {/* 16:9 player */}
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
          {kind === "mp4" ? (
            <video
              src={clip.video_url}
              autoPlay
              controls
              className="h-full w-full"
              title={clip.title}
            />
          ) : (
            <iframe
              src={embedUrl}
              title={clip.title}
              className="h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      // ml-0.5 optically centres the asymmetric triangle
      className="ml-0.5 h-6 w-6 text-terracotta"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
