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
import type { TestimonialRow } from "../page";

// ── Shared UI atoms ────────────────────────────────────────────────────────────

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

function Stars({ value, onPick }: { value: number; onPick?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick?.(n)}
          onMouseEnter={() => onPick && setHover(n)}
          onMouseLeave={() => onPick && setHover(0)}
          className={onPick ? "cursor-pointer" : "cursor-default"}
        >
          <svg className={`h-4 w-4 transition-colors ${
            n <= (hover || value) ? "fill-gold text-gold" : "fill-none text-gray-300"
          }`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={hover ? 0 : 1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0
                 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755
                 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197
                 -1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81
                 .588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200" />;
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blush text-xs font-semibold text-terracotta">
      {initials}
    </div>
  );
}

// ── Sortable row ───────────────────────────────────────────────────────────────

function SortableRow({
  item,
  onToggle,
  onEdit,
  onDeleted,
}: {
  item: TestimonialRow;
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
    await fetch(`/api/admin/testimonials/${item.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
      <button {...attributes} {...listeners}
        className="mt-1 touch-none cursor-grab text-gray-300 hover:text-gray-500" tabIndex={-1}>
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="8" cy="5" r="1.5" /><circle cx="12" cy="5" r="1.5" />
          <circle cx="8" cy="10" r="1.5" /><circle cx="12" cy="10" r="1.5" />
          <circle cx="8" cy="15" r="1.5" /><circle cx="12" cy="15" r="1.5" />
        </svg>
      </button>
      <Avatar url={item.customer_photo_url} name={item.customer_name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{item.customer_name}</p>
          <span className="text-xs text-gray-400">{item.customer_city}</span>
        </div>
        <Stars value={item.rating} />
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.review_text}</p>
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

type Draft = {
  id?: string;
  customer_name: string;
  customer_city: string;
  rating: number;
  review_text: string;
  customer_photo_url: string;
};

const BLANK: Draft = { customer_name: "", customer_city: "", rating: 5, review_text: "", customer_photo_url: "" };

function TestimonialForm({
  draft,
  onChange,
  onSaved,
  onCancel,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSaved: (t: TestimonialRow) => void;
  onCancel?: () => void;
}) {
  const [photoFile, setPhotoFile]     = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(draft.customer_photo_url);
  const [uploading, setUploading]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.customer_name.trim() || !draft.customer_city.trim() || !draft.review_text.trim()) {
      setError("Name, city, and review text are required."); return;
    }
    setSaving(true); setError(null);

    let photo_url = draft.customer_photo_url;
    if (photoFile) {
      setUploading(true);
      try {
        photo_url = await uploadToStorage(photoFile, "avatars");
      } catch (upErr) {
        setError(upErr instanceof Error ? upErr.message : "Photo upload failed.");
        setSaving(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const payload = {
      customer_name: draft.customer_name.trim(),
      customer_city: draft.customer_city.trim(),
      rating: draft.rating,
      review_text: draft.review_text.trim(),
      customer_photo_url: photo_url || null,
    };

    const url    = draft.id ? `/api/admin/testimonials/${draft.id}` : "/api/admin/testimonials";
    const method = draft.id ? "PATCH" : "POST";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data   = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }

    const saved = draft.id
      ? { ...draft, ...payload, is_active: true, sort_order: 0 } as TestimonialRow
      : data.testimonial as TestimonialRow;
    onSaved(saved);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">{draft.id ? "Edit Testimonial" : "Add Testimonial"}</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Name *</label>
          <input value={draft.customer_name} onChange={(e) => onChange({ ...draft, customer_name: e.target.value })}
            placeholder="Priya Sharma"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">City *</label>
          <input value={draft.customer_city} onChange={(e) => onChange({ ...draft, customer_city: e.target.value })}
            placeholder="Mumbai"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Rating *</label>
        <Stars value={draft.rating} onPick={(n) => onChange({ ...draft, rating: n })} />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Review *</label>
        <textarea value={draft.review_text} onChange={(e) => onChange({ ...draft, review_text: e.target.value })}
          rows={3} placeholder="Absolutely love my Eco-Resin tray…"
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40" />
      </div>

      {/* Photo upload */}
      <div className="flex items-center gap-3">
        {photoPreview ? (
          <img src={photoPreview} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <label className="cursor-pointer text-sm font-medium text-terracotta hover:underline">
          {uploading ? "Uploading…" : photoPreview ? "Change photo" : "Upload photo"} (optional)
          <input ref={fileRef} type="file" accept="image/*" className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setPhotoFile(f);
              setPhotoPreview(URL.createObjectURL(f));
            }} />
        </label>
        {photoPreview && (
          <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(""); onChange({ ...draft, customer_photo_url: "" }); }}
            className="text-xs text-gray-400 hover:text-red-400">Remove</button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-terracotta px-5 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50">
          {saving ? "Saving…" : draft.id ? "Save changes" : "Add Testimonial"}
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

export function TestimonialManager({ initialItems }: { initialItems: TestimonialRow[] }) {
  const [items, setItems]   = useState<TestimonialRow[]>(initialItems);
  const [draft, setDraft]   = useState<Draft>(BLANK);
  const formRef             = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((t) => t.id === String(active.id));
      const newIdx = prev.findIndex((t) => t.id === String(over.id));
      const next = arrayMove(prev, oldIdx, newIdx);
      fetch("/api/admin/testimonials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((t) => t.id) }),
      }).catch(console.error);
      return next;
    });
  }

  async function handleToggle(id: string, value: boolean) {
    setItems((prev) => prev.map((t) => t.id === id ? { ...t, is_active: value } : t));
    const res = await fetch(`/api/admin/testimonials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: value }),
    });
    if (!res.ok) setItems((prev) => prev.map((t) => t.id === id ? { ...t, is_active: !value } : t));
  }

  function handleEdit(item: TestimonialRow) {
    setDraft({
      id: item.id,
      customer_name: item.customer_name,
      customer_city: item.customer_city,
      rating: item.rating,
      review_text: item.review_text,
      customer_photo_url: item.customer_photo_url ?? "",
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSaved(saved: TestimonialRow) {
    if (draft.id) {
      setItems((prev) => prev.map((t) => t.id === saved.id ? saved : t));
    } else {
      setItems((prev) => [...prev, saved]);
    }
    setDraft(BLANK);
  }

  return (
    <div className="space-y-4">
      {/* List */}
      {items.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
          No testimonials yet.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  onToggle={(v) => handleToggle(item.id, v)}
                  onEdit={() => handleEdit(item)}
                  onDeleted={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Form */}
      <div ref={formRef}>
        <TestimonialForm
          draft={draft}
          onChange={setDraft}
          onSaved={handleSaved}
          onCancel={draft.id ? () => setDraft(BLANK) : undefined}
        />
      </div>
    </div>
  );
}
