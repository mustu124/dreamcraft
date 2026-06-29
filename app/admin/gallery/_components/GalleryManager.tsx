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
import type { GalleryRow } from "../page";

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

// ── Sortable image row ─────────────────────────────────────────────────────────

function SortableImageRow({
  item,
  onToggle,
  onCaptionSave,
  onDeleted,
}: {
  item: GalleryRow;
  onToggle: (v: boolean) => void;
  onCaptionSave: (caption: string) => void;
  onDeleted: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [editing, setEditing]         = useState(false);
  const [caption, setCaption]         = useState(item.caption ?? "");
  const [confirming, setConfirming]   = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [saving, setSaving]           = useState(false);

  async function saveCaption() {
    setSaving(true);
    await fetch(`/api/admin/gallery/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption }),
    });
    setSaving(false);
    setEditing(false);
    onCaptionSave(caption);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/admin/gallery/${item.id}`, { method: "DELETE" });
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

      <img src={item.image_url} alt={item.caption ?? ""}
        className="h-12 w-16 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />

      {/* Caption */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <input value={caption} onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveCaption(); if (e.key === "Escape") setEditing(false); }}
              placeholder="Add a caption…" autoFocus
              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
            <button onClick={saveCaption} disabled={saving}
              className="rounded-lg bg-terracotta px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
              {saving ? "…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400">✕</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="group flex items-center gap-1.5 text-left">
            <p className="text-sm text-gray-600">{item.caption || <span className="italic text-gray-300">No caption</span>}</p>
            <svg className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Toggle checked={item.is_active} onChange={onToggle} />
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

// ── Staging row (before upload) ────────────────────────────────────────────────

type StagingItem = { _key: string; file: File; preview: string; caption: string };

function StagingRow({
  item,
  onChange,
  onRemove,
}: {
  item: StagingItem;
  onChange: (caption: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
      <img src={item.preview} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
      <input value={item.caption} onChange={(e) => onChange(e.target.value)}
        placeholder="Caption (optional)"
        className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
      <button onClick={onRemove} className="text-gray-400 hover:text-red-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

let _k = 0;
const nk = () => String(++_k);

export function GalleryManager({ initialItems }: { initialItems: GalleryRow[] }) {
  const [items, setItems]     = useState<GalleryRow[]>(initialItems);
  const [staging, setStaging] = useState<StagingItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dropRef = useRef<HTMLLabelElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newItems: StagingItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ _key: nk(), file: f, preview: URL.createObjectURL(f), caption: "" }));
    setStaging((prev) => [...prev, ...newItems]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((g) => g.id === String(active.id));
      const newIdx = prev.findIndex((g) => g.id === String(over.id));
      const next = arrayMove(prev, oldIdx, newIdx);
      fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((g) => g.id) }),
      }).catch(console.error);
      return next;
    });
  }

  async function handleToggle(id: string, value: boolean) {
    setItems((prev) => prev.map((g) => g.id === id ? { ...g, is_active: value } : g));
    const res = await fetch(`/api/admin/gallery/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: value }),
    });
    if (!res.ok) setItems((prev) => prev.map((g) => g.id === id ? { ...g, is_active: !value } : g));
  }

  async function handleUploadAll() {
    if (!staging.length) return;
    setUploading(true); setUploadError(null);

    const uploaded: { image_url: string; caption: string }[] = [];

    for (const item of staging) {
      try {
        const publicUrl = await uploadToStorage(item.file, "gallery");
        uploaded.push({ image_url: publicUrl, caption: item.caption });
      } catch (err) {
        setUploadError(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
        setUploading(false);
        return;
      }
    }

    const res = await fetch("/api/admin/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: uploaded }),
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setUploadError(data.error); return; }

    setItems((prev) => [...prev, ...(data.images as GalleryRow[])]);
    setStaging([]);
  }

  return (
    <div className="space-y-4">
      {/* Existing images */}
      {items.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
          No gallery images yet.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableImageRow
                  key={item.id}
                  item={item}
                  onToggle={(v) => handleToggle(item.id, v)}
                  onCaptionSave={(cap) => setItems((prev) => prev.map((g) => g.id === item.id ? { ...g, caption: cap } : g))}
                  onDeleted={() => setItems((prev) => prev.filter((g) => g.id !== item.id))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Staging area */}
      {staging.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-gray-700">Ready to upload ({staging.length})</p>
          <div className="space-y-2">
            {staging.map((item) => (
              <StagingRow
                key={item._key}
                item={item}
                onChange={(cap) => setStaging((prev) => prev.map((s) => s._key === item._key ? { ...s, caption: cap } : s))}
                onRemove={() => setStaging((prev) => prev.filter((s) => s._key !== item._key))}
              />
            ))}
          </div>
          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          <div className="flex gap-2">
            <button onClick={handleUploadAll} disabled={uploading}
              className="rounded-xl bg-terracotta px-5 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50">
              {uploading ? "Uploading…" : `Upload ${staging.length} image${staging.length !== 1 ? "s" : ""}`}
            </button>
            <button onClick={() => setStaging([])} disabled={uploading}
              className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Clear all
            </button>
          </div>
        </section>
      )}

      {/* Drop zone */}
      <label
        ref={dropRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 hover:border-terracotta/40 hover:bg-terracotta/5"
      >
        <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01
               M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-gray-500">Drag &amp; drop images here, or click to browse</p>
        <p className="text-xs text-gray-400">Multiple files supported — add captions before saving</p>
        <input type="file" accept="image/*" multiple className="sr-only"
          onChange={(e) => addFiles(e.target.files)} />
      </label>
    </div>
  );
}
