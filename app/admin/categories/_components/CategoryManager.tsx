"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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
import { uploadToStorage } from "@/lib/admin/upload";
import type { CategoryRow } from "../page";

function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Icon thumbnail with hover-to-change overlay ───────────────────────────────

function IconCell({
  iconUrl,
  name,
  onFile,
  uploading,
}: {
  iconUrl: string | null;
  name: string;
  onFile: (f: File) => void;
  uploading: boolean;
}) {
  return (
    <div className="relative h-9 w-9 shrink-0">
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={name}
          className="h-9 w-9 rounded-lg object-cover ring-1 ring-gray-200"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 ring-1 ring-gray-200">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <label
        className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity hover:opacity-100"
        title="Change icon"
      >
        {uploading ? (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortableRow({
  category,
  onUpdated,
  onDeleted,
}: {
  category: CategoryRow;
  onUpdated: (c: CategoryRow) => void;
  onDeleted: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editSlug, setEditSlug] = useState(category.slug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete state
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Icon upload state
  const [iconUploading, setIconUploading] = useState(false);

  function openEdit() {
    setEditName(category.name);
    setEditSlug(category.slug);
    setSlugTouched(false);
    setSaveError(null);
    setIsEditing(true);
  }

  function handleEditNameChange(v: string) {
    setEditName(v);
    if (!slugTouched) setEditSlug(toSlug(v));
  }

  async function saveEdit() {
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(data.error); return; }
    onUpdated({ ...category, name: editName.trim(), slug: editSlug.trim() });
    setIsEditing(false);
  }

  async function handleIconFile(file: File) {
    setIconUploading(true);
    let publicUrl: string;
    try {
      publicUrl = await uploadToStorage(file, "categories");
    } catch { setIconUploading(false); return; }
    await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon_image_url: publicUrl }),
    });
    onUpdated({ ...category, icon_image_url: publicUrl });
    setIconUploading(false);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(data.error);
      setConfirming(false);
      return;
    }
    onDeleted(category.id);
  }

  return (
    <div ref={setNodeRef} style={style} className="space-y-1">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
        {/* Grip */}
        <button
          {...(isEditing ? {} : { ...attributes, ...listeners })}
          className={`touch-none text-gray-300 ${isEditing ? "cursor-not-allowed" : "cursor-grab hover:text-gray-500"}`}
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="8" cy="5" r="1.5" /><circle cx="12" cy="5" r="1.5" />
            <circle cx="8" cy="10" r="1.5" /><circle cx="12" cy="10" r="1.5" />
            <circle cx="8" cy="15" r="1.5" /><circle cx="12" cy="15" r="1.5" />
          </svg>
        </button>

        {/* Icon */}
        <IconCell
          iconUrl={category.icon_image_url}
          name={category.name}
          onFile={handleIconFile}
          uploading={iconUploading}
        />

        {/* Name / slug — view or edit */}
        {isEditing ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <input
              className="rounded-lg border border-gray-300 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              value={editName}
              onChange={(e) => handleEditNameChange(e.target.value)}
              placeholder="Category name"
            />
            <input
              className="rounded-lg border border-gray-300 px-2.5 py-1 font-mono text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              value={editSlug}
              onChange={(e) => { setEditSlug(e.target.value); setSlugTouched(true); }}
              placeholder="url-slug"
            />
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{category.name}</p>
            <p className="truncate font-mono text-xs text-gray-400">/{category.slug}</p>
          </div>
        )}

        {/* Subcategory count */}
        {!isEditing && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {category.subcategory_count} sub
          </span>
        )}

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {isEditing ? (
            <>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-lg bg-terracotta px-3 py-1 text-xs font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/admin/categories/${category.id}`}
                className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Subs →
              </Link>
              <button
                onClick={openEdit}
                className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Edit
              </button>
              {confirming ? (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? "…" : "Confirm?"}
                </button>
              ) : (
                <button
                  onClick={() => { setConfirming(true); setDeleteError(null); }}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
              {confirming && !deleting && (
                <button
                  onClick={() => { setConfirming(false); setDeleteError(null); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete error shown beneath the row */}
      {deleteError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{deleteError}</p>
      )}
    </div>
  );
}

// ── Add category form ─────────────────────────────────────────────────────────

function AddCategoryForm({ onAdded }: { onAdded: (c: CategoryRow) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(toSlug(v));
  }

  function handleIconPick(file: File) {
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) { setError("Name and slug are required."); return; }
    setSubmitting(true);
    setError(null);

    let icon_image_url: string | undefined;
    if (iconFile) {
      try {
        icon_image_url = await uploadToStorage(iconFile, "categories");
      } catch {
        setError("Icon upload failed. Try again.");
        setSubmitting(false);
        return;
      }
    }

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim(), icon_image_url }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }

    onAdded({
      id: data.category.id,
      name: data.category.name,
      slug: data.category.slug,
      icon_image_url: data.category.icon_image_url ?? null,
      sort_order: data.category.sort_order,
      subcategory_count: 0,
    });

    setName(""); setSlug(""); setSlugTouched(false);
    setIconFile(null); setIconPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Add Category</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Name</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Candles"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Slug</label>
            <input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              placeholder="candles"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>
        </div>

        {/* Icon upload */}
        <div className="flex items-center gap-3">
          {iconPreview ? (
            <img
              src={iconPreview}
              alt=""
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200">
              <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="space-y-0.5">
            <label className="cursor-pointer text-sm font-medium text-terracotta hover:underline">
              {iconPreview ? "Change icon" : "Upload icon"} (optional)
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIconPick(f); }}
              />
            </label>
            <p className="text-xs text-gray-400">PNG or JPG, any square crop</p>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !slug.trim()}
          className="rounded-xl bg-terracotta px-5 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-40"
        >
          {submitting ? "Adding…" : "Add Category"}
        </button>
      </form>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function CategoryManager({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCategories((prev) => {
      const oldIdx = prev.findIndex((c) => c.id === String(active.id));
      const newIdx = prev.findIndex((c) => c.id === String(over.id));
      const next = arrayMove(prev, oldIdx, newIdx);

      fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((c) => c.id) }),
      }).catch(console.error);

      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Category list */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {categories.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">No categories yet.</p>
        ) : (
          <div className="p-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <SortableRow
                      key={cat.id}
                      category={cat}
                      onUpdated={(updated) =>
                        setCategories((prev) =>
                          prev.map((c) => (c.id === updated.id ? updated : c)),
                        )
                      }
                      onDeleted={(id) =>
                        setCategories((prev) => prev.filter((c) => c.id !== id))
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </section>

      {/* Add form */}
      <AddCategoryForm
        onAdded={(cat) => setCategories((prev) => [...prev, cat])}
      />
    </div>
  );
}
