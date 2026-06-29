"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BannerRow } from "../page";

const SOFT_LIMIT = 5;

// ── Main component ────────────────────────────────────────────────────────────

export function BannerManager({ initialBanners }: { initialBanners: BannerRow[] }) {
  const [banners, setBanners] = useState<BannerRow[]>(initialBanners);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Drag end — reorder list + persist ────────────────────────
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBanners((prev) => {
      const oldIdx = prev.findIndex((b) => b.id === String(active.id));
      const newIdx = prev.findIndex((b) => b.id === String(over.id));
      const next = arrayMove(prev, oldIdx, newIdx);

      // Persist asynchronously — optimistic update already applied above
      fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((b) => b.id) }),
      }).catch(console.error);

      return next;
    });
  }

  // ── Toggle is_active ─────────────────────────────────────────
  async function handleToggle(id: string, newValue: boolean) {
    // Optimistic
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_active: newValue } : b)),
    );

    const res = await fetch(`/api/admin/banners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newValue }),
    });

    if (!res.ok) {
      // Revert on error
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: !newValue } : b)),
      );
    }
  }

  // ── Delete ───────────────────────────────────────────────────
  async function handleDelete(id: string) {
    // Optimistic remove
    setBanners((prev) => prev.filter((b) => b.id !== id));

    const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });

    if (!res.ok) {
      // Restore on error — re-fetch would be cleaner but this is fine for a small list
      window.location.reload();
    }
  }

  // ── Add banner callback ──────────────────────────────────────
  function handleAdded(banner: BannerRow) {
    setBanners((prev) => [...prev, banner]);
  }

  const activeCount = banners.filter((b) => b.is_active).length;

  return (
    <div className="space-y-6">

      {/* ── Soft-limit note ─────────────────────────────────── */}
      <div
        className={[
          "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
          activeCount >= SOFT_LIMIT
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-blue-100 bg-blue-50/60 text-blue-600",
        ].join(" ")}
      >
        <InfoIcon className={activeCount >= SOFT_LIMIT ? "text-amber-400" : "text-blue-400"} />
        <p>
          {activeCount >= SOFT_LIMIT
            ? `You have ${activeCount} active banners. `
            : ""}
          Recommended: up to {SOFT_LIMIT} banners for the best homepage experience.{" "}
          <span className="opacity-70">
            Currently {activeCount} active of {banners.length} total.
          </span>
        </p>
      </div>

      {/* ── Sortable banner list ─────────────────────────────── */}
      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
          <div className="grid grid-cols-[32px_1fr_1fr_minmax(0,200px)_80px_100px] gap-4 items-center">
            <div />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Desktop
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Mobile
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Link URL
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-center">
              Active
            </span>
            <div />
          </div>
        </div>

        {banners.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            No banners yet. Add one below.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={banners.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-gray-50">
                {banners.map((banner) => (
                  <SortableRow
                    key={banner.id}
                    banner={banner}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* ── Add banner form ──────────────────────────────────── */}
      <AddBannerForm onAdded={handleAdded} />
    </div>
  );
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortableRow({
  banner,
  onToggle,
  onDelete,
}: {
  banner:   BannerRow;
  onToggle: (id: string, v: boolean) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: banner.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex:  isDragging ? 50 : "auto",
    position: isDragging ? "relative" : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="bg-white">
      <div className="grid grid-cols-[32px_1fr_1fr_minmax(0,200px)_80px_100px] gap-4 items-center px-5 py-3">

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
          tabIndex={0}
        >
          <GripIcon />
        </button>

        {/* Desktop thumbnail */}
        <div className="h-12 w-full max-w-[120px] rounded-lg overflow-hidden bg-gray-100 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.image_url}
            alt="Desktop banner"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Mobile thumbnail */}
        <div className="h-12 w-9 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.mobile_image_url}
            alt="Mobile banner"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Link URL */}
        <span
          className="truncate font-mono text-xs text-gray-400"
          title={banner.link_url ?? ""}
        >
          {banner.link_url ?? "—"}
        </span>

        {/* Active toggle */}
        <div className="flex justify-center">
          <Toggle
            checked={banner.is_active}
            onChange={(v) => onToggle(banner.id, v)}
          />
        </div>

        {/* Delete */}
        <div className="flex items-center justify-end gap-1.5">
          {confirmDelete ? (
            <>
              <button
                onClick={() => onDelete(banner.id)}
                className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// ── Add banner form ───────────────────────────────────────────────────────────

function AddBannerForm({ onAdded }: { onAdded: (banner: BannerRow) => void }) {
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile,  setMobileFile]  = useState<File | null>(null);
  const [linkUrl,     setLinkUrl]     = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [progress,    setProgress]    = useState("");

  const desktopPreview = desktopFile ? URL.createObjectURL(desktopFile) : null;
  const mobilePreview  = mobileFile  ? URL.createObjectURL(mobileFile)  : null;

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef  = useRef<HTMLInputElement>(null);

  function pickFile(
    e: ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
  ) {
    setter(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desktopFile || !mobileFile) return;

    setUploading(true);
    setError(null);

    try {
      // ── Upload both images via server Route Handler (uses service role) ──
      // Avoids the need for Storage INSERT policies on the 'banners' bucket.
      setProgress("Uploading images…");

      const uploadFile = async (file: File, label: string): Promise<string> => {
        const fd = new FormData();
        fd.append("file",   file);
        fd.append("bucket", "banners");
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(`${label}: ${json.error ?? "upload failed"}`);
        return json.url as string;
      };

      const [desktopUrl, mobileUrl] = await Promise.all([
        uploadFile(desktopFile, "Desktop"),
        uploadFile(mobileFile,  "Mobile"),
      ]);

      // ── Write the DB row via server Route Handler ──────────────
      setProgress("Saving banner…");
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url:        desktopUrl,
          mobile_image_url: mobileUrl,
          link_url:         linkUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save banner");

      // ── Success — reset form ───────────────────────────────────
      onAdded(data.banner as BannerRow);
      setDesktopFile(null);
      setMobileFile(null);
      setLinkUrl("");
      if (desktopInputRef.current) desktopInputRef.current.value = "";
      if (mobileInputRef.current)  mobileInputRef.current.value  = "";

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
      setProgress("");
    }
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold text-gray-900">Add New Banner</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset disabled={uploading} className="contents">

          {/* ── Image upload fields ─────────────────────────────── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            {/* Desktop */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Desktop Image
                <span className="ml-1.5 font-normal text-gray-400">
                  (landscape, e.g. 1920×900px)
                </span>
              </label>
              <label
                className={[
                  "group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center",
                  "overflow-hidden rounded-xl border-2 border-dashed transition-colors",
                  desktopPreview
                    ? "border-terracotta/40"
                    : "border-gray-200 hover:border-terracotta/40",
                ].join(" ")}
              >
                {desktopPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={desktopPreview}
                    alt="Desktop preview"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-terracotta/70">
                    <UploadIcon />
                    <span className="text-sm font-medium">Click to upload</span>
                    <span className="text-xs">PNG, JPG, WebP</span>
                  </div>
                )}
                <input
                  ref={desktopInputRef}
                  type="file"
                  accept="image/*"
                  required
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => pickFile(e, setDesktopFile)}
                />
              </label>
              {desktopFile && (
                <p className="mt-1 truncate text-xs text-gray-400">{desktopFile.name}</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Mobile Image
                <span className="ml-1.5 font-normal text-gray-400">
                  (portrait/square, e.g. 1080×1350px)
                </span>
              </label>
              <label
                className={[
                  "group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center",
                  "overflow-hidden rounded-xl border-2 border-dashed transition-colors",
                  mobilePreview
                    ? "border-terracotta/40"
                    : "border-gray-200 hover:border-terracotta/40",
                ].join(" ")}
              >
                {mobilePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mobilePreview}
                    alt="Mobile preview"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-terracotta/70">
                    <UploadIcon />
                    <span className="text-sm font-medium">Click to upload</span>
                    <span className="text-xs">PNG, JPG, WebP</span>
                  </div>
                )}
                <input
                  ref={mobileInputRef}
                  type="file"
                  accept="image/*"
                  required
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => pickFile(e, setMobileFile)}
                />
              </label>
              {mobileFile && (
                <p className="mt-1 truncate text-xs text-gray-400">{mobileFile.name}</p>
              )}
            </div>
          </div>

          {/* ── Optional link URL ───────────────────────────────── */}
          <div>
            <label
              htmlFor="link-url"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Link URL
              <span className="ml-1.5 font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="link-url"
              type="url"
              placeholder="https://dreamcraft.in/shop/candles"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
                         text-gray-900 placeholder:text-gray-400 transition-colors
                         focus:border-navy focus:bg-white focus:outline-none disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-400">
              Where should clicking this banner take the visitor? Leave blank for no link.
            </p>
          </div>

          {/* ── Error ───────────────────────────────────────────── */}
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          {/* ── Submit ──────────────────────────────────────────── */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={uploading || !desktopFile || !mobileFile}
              className="rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white
                         transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? progress || "Uploading…" : "Upload & Save Banner"}
            </button>
            {(desktopFile || mobileFile) && !uploading && (
              <button
                type="button"
                onClick={() => {
                  setDesktopFile(null);
                  setMobileFile(null);
                  setError(null);
                  if (desktopInputRef.current) desktopInputRef.current.value = "";
                  if (mobileInputRef.current)  mobileInputRef.current.value  = "";
                }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked:  boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full",
        "transition-colors duration-200 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-navy/30",
        checked ? "bg-terracotta" : "bg-gray-200",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm",
          "transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg
      viewBox="0 0 16 24"
      fill="currentColor"
      className="h-5 w-3.5"
      aria-hidden
    >
      {[5, 10, 15, 20].map((cy) =>
        [4, 12].map((cx) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.5} />
        )),
      )}
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`mt-0.5 h-4 w-4 shrink-0 ${className ?? ""}`}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
