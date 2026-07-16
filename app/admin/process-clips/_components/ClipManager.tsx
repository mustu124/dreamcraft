"use client";

import { useRef, useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { uploadToStorage } from "@/lib/admin/upload";
import type { ClipRow } from "../page";

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors focus:outline-none focus:ring-2 focus:ring-terracotta/40
        ${checked ? "bg-terracotta" : "bg-gray-200"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
        ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

// ── Video type badge ───────────────────────────────────────────────────────────

function VideoBadge({ url }: { url: string }) {
  const type = url.includes("youtube") || url.includes("youtu.be") ? "YouTube"
             : url.includes("vimeo") ? "Vimeo"
             : "Uploaded";
  const colours: Record<string, string> = {
    YouTube:  "bg-red-50 text-red-500",
    Vimeo:    "bg-blue-50 text-blue-500",
    Uploaded: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${colours[type]}`}>{type}</span>
  );
}

// ── Sortable clip row ──────────────────────────────────────────────────────────

function SortableClipRow({
  item,
  onToggle,
  onEdit,
  onDeleted,
}: {
  item: ClipRow;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/admin/process-clips/${item.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <button {...attributes} {...listeners}
        className="touch-none cursor-grab text-gray-300 hover:text-gray-500" tabIndex={-1}>
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="8" cy="5" r="1.5" /><circle cx="12" cy="5" r="1.5" />
          <circle cx="8" cy="10" r="1.5" /><circle cx="12" cy="10" r="1.5" />
          <circle cx="8" cy="15" r="1.5" /><circle cx="12" cy="15" r="1.5" />
        </svg>
      </button>

      {/* Thumbnail */}
      <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Title + badge */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
        <VideoBadge url={item.video_url} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Toggle checked={item.is_active} onChange={onToggle} />
        <button onClick={onEdit}
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
          Edit
        </button>
        {confirming ? (
          <>
            <button onClick={handleDelete} disabled={deleting}
              className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
              {deleting ? "…" : "Sure?"}
            </button>
            <button onClick={() => setConfirming(false)} className="text-xs text-gray-400">✕</button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50">
            Del
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add / Edit form ────────────────────────────────────────────────────────────

type Draft = { id?: string; title: string; video_url: string; thumbnail_url: string };
const BLANK: Draft = { title: "", video_url: "", thumbnail_url: "" };

function isExternalUrl(url: string) {
  return url.includes("youtube") || url.includes("youtu.be") || url.includes("vimeo");
}

function ClipForm({
  draft,
  onChange,
  onSaved,
  onCancel,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSaved: (clip: ClipRow) => void;
  onCancel?: () => void;
}) {
  const [videoMode, setVideoMode] = useState<"upload" | "url">(
    draft.video_url ? (isExternalUrl(draft.video_url) ? "url" : "upload") : "upload",
  );
  const [videoFile, setVideoFile]         = useState<File | null>(null);
  const [thumbFile, setThumbFile]         = useState<File | null>(null);
  const [thumbPreview, setThumbPreview]   = useState(draft.thumbnail_url);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) { setError("Title is required."); return; }
    if (videoMode === "url" && !draft.video_url.trim()) { setError("Video URL is required."); return; }
    if (videoMode === "upload" && !videoFile && !draft.video_url) { setError("Please select a video file."); return; }
    if (!thumbFile && !draft.thumbnail_url) { setError("Thumbnail image is required."); return; }

    setSaving(true); setError(null);

    let video_url     = draft.video_url;
    let thumbnail_url = draft.thumbnail_url;

    // Upload video if file mode
    if (videoMode === "upload" && videoFile) {
      try {
        video_url = await uploadToStorage(videoFile, "clips");
      } catch (upErr) {
        setError(`Video upload failed: ${upErr instanceof Error ? upErr.message : "unknown"}`);
        setSaving(false);
        return;
      }
    }

    // Upload thumbnail
    if (thumbFile) {
      try {
        thumbnail_url = await uploadToStorage(thumbFile, "clips");
      } catch (upErr) {
        setError(`Thumbnail upload failed: ${upErr instanceof Error ? upErr.message : "unknown"}`);
        setSaving(false);
        return;
      }
    }

    const payload = { title: draft.title.trim(), video_url, thumbnail_url };
    const url    = draft.id ? `/api/admin/process-clips/${draft.id}` : "/api/admin/process-clips";
    const method = draft.id ? "PATCH" : "POST";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data   = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }

    const saved = draft.id
      ? { id: draft.id, ...payload, sort_order: 0, is_active: true } as ClipRow
      : data.clip as ClipRow;
    onSaved(saved);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">{draft.id ? "Edit Clip" : "Add Clip"}</h2>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Title *</label>
        <input value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="Pouring the ocean Eco-Resin base"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
      </div>

      {/* Video mode toggle */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-gray-600">Video source *</label>
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1">
          {(["upload", "url"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setVideoMode(mode)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                videoMode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {mode === "upload" ? "Upload file" : "YouTube / Vimeo URL"}
            </button>
          ))}
        </div>

        {videoMode === "upload" ? (
          <div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-4 hover:border-terracotta/40">
              <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {videoFile ? videoFile.name : draft.video_url ? "Replace video file" : "Choose video file"}
                </p>
                <p className="text-xs text-gray-400">MP4, MOV, WEBM</p>
              </div>
              <input type="file" accept="video/*" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }} />
            </label>
            {draft.video_url && !videoFile && !isExternalUrl(draft.video_url) && (
              <p className="mt-1 text-xs text-gray-400">Existing video will be kept if no new file is selected.</p>
            )}
          </div>
        ) : (
          <input value={draft.video_url} onChange={(e) => onChange({ ...draft, video_url: e.target.value })}
            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
        )}
      </div>

      {/* Thumbnail */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600">Thumbnail image *</label>
        <div className="flex items-center gap-3">
          {thumbPreview ? (
            <img src={thumbPreview} alt="" className="h-12 w-20 rounded-lg object-cover ring-1 ring-gray-200" />
          ) : (
            <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-gray-100 ring-1 ring-gray-200">
              <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <label className="cursor-pointer text-sm font-medium text-terracotta hover:underline">
            {thumbPreview ? "Change thumbnail" : "Upload thumbnail"}
            <input type="file" accept="image/*" className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setThumbFile(f);
                setThumbPreview(URL.createObjectURL(f));
              }} />
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-terracotta px-5 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50">
          {saving ? "Saving…" : draft.id ? "Save changes" : "Add Clip"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ClipManager({ initialItems }: { initialItems: ClipRow[] }) {
  const [items, setItems] = useState<ClipRow[]>(initialItems);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const formRef           = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((c) => c.id === String(active.id));
      const newIdx = prev.findIndex((c) => c.id === String(over.id));
      const next = arrayMove(prev, oldIdx, newIdx);
      fetch("/api/admin/process-clips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((c) => c.id) }),
      }).catch(console.error);
      return next;
    });
  }

  async function handleToggle(id: string, value: boolean) {
    setItems((prev) => prev.map((c) => c.id === id ? { ...c, is_active: value } : c));
    const res = await fetch(`/api/admin/process-clips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: value }),
    });
    if (!res.ok) setItems((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !value } : c));
  }

  function handleEdit(item: ClipRow) {
    setDraft({ id: item.id, title: item.title, video_url: item.video_url, thumbnail_url: item.thumbnail_url });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSaved(saved: ClipRow) {
    if (draft.id) {
      setItems((prev) => prev.map((c) => c.id === saved.id ? { ...c, ...saved } : c));
    } else {
      setItems((prev) => [...prev, saved]);
    }
    setDraft(BLANK);
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
          No process clips yet.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableClipRow
                  key={item.id}
                  item={item}
                  onToggle={(v) => handleToggle(item.id, v)}
                  onEdit={() => handleEdit(item)}
                  onDeleted={() => setItems((prev) => prev.filter((c) => c.id !== item.id))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div ref={formRef}>
        <ClipForm
          draft={draft}
          onChange={setDraft}
          onSaved={handleSaved}
          onCancel={draft.id ? () => setDraft(BLANK) : undefined}
        />
      </div>
    </div>
  );
}
