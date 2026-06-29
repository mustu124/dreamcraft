"use client";

import { useState } from "react";
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
import type { SubcategoryRow } from "../page";

function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortableRow({
  sub,
  categoryId,
  onUpdated,
  onDeleted,
}: {
  sub: SubcategoryRow;
  categoryId: string;
  onUpdated: (s: SubcategoryRow) => void;
  onDeleted: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sub.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(sub.name);
  const [editSlug, setEditSlug] = useState(sub.slug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete state
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openEdit() {
    setEditName(sub.name);
    setEditSlug(sub.slug);
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
    const res = await fetch(
      `/api/admin/categories/${categoryId}/subcategories/${sub.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
      },
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(data.error); return; }
    onUpdated({ ...sub, name: editName.trim(), slug: editSlug.trim() });
    setIsEditing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(
      `/api/admin/categories/${categoryId}/subcategories/${sub.id}`,
      { method: "DELETE" },
    );
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(data.error);
      setConfirming(false);
      return;
    }
    onDeleted(sub.id);
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

        {/* Name / slug */}
        {isEditing ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <input
              className="rounded-lg border border-gray-300 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              value={editName}
              onChange={(e) => handleEditNameChange(e.target.value)}
              placeholder="Subcategory name"
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
            <p className="truncate text-sm font-medium text-gray-900">{sub.name}</p>
            <p className="truncate font-mono text-xs text-gray-400">/{sub.slug}</p>
          </div>
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

      {deleteError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{deleteError}</p>
      )}
    </div>
  );
}

// ── Add subcategory form ──────────────────────────────────────────────────────

function AddSubcategoryForm({
  categoryId,
  onAdded,
}: {
  categoryId: string;
  onAdded: (s: SubcategoryRow) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(toSlug(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) { setError("Name and slug are required."); return; }
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/admin/categories/${categoryId}/subcategories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }

    onAdded({
      id:         data.subcategory.id,
      name:       data.subcategory.name,
      slug:       data.subcategory.slug,
      sort_order: data.subcategory.sort_order,
    });

    setName(""); setSlug(""); setSlugTouched(false);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Add Subcategory</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Name</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Jar Candles"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Slug</label>
            <input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              placeholder="jar-candles"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !slug.trim()}
          className="rounded-xl bg-terracotta px-5 py-2 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-40"
        >
          {submitting ? "Adding…" : "Add Subcategory"}
        </button>
      </form>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SubcategoryManager({
  categoryId,
  initialSubcategories,
}: {
  categoryId: string;
  initialSubcategories: SubcategoryRow[];
}) {
  const [subs, setSubs] = useState<SubcategoryRow[]>(initialSubcategories);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSubs((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === String(active.id));
      const newIdx = prev.findIndex((s) => s.id === String(over.id));
      const next = arrayMove(prev, oldIdx, newIdx);

      fetch(`/api/admin/categories/${categoryId}/subcategories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((s) => s.id) }),
      }).catch(console.error);

      return next;
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {subs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            No subcategories yet — add one below.
          </p>
        ) : (
          <div className="p-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={subs.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {subs.map((sub) => (
                    <SortableRow
                      key={sub.id}
                      sub={sub}
                      categoryId={categoryId}
                      onUpdated={(updated) =>
                        setSubs((prev) =>
                          prev.map((s) => (s.id === updated.id ? updated : s)),
                        )
                      }
                      onDeleted={(id) =>
                        setSubs((prev) => prev.filter((s) => s.id !== id))
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </section>

      <AddSubcategoryForm
        categoryId={categoryId}
        onAdded={(sub) => setSubs((prev) => [...prev, sub])}
      />
    </div>
  );
}
