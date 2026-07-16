"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProductFormInitialData = {
  id:             string;
  name:           string;
  sku:            string;
  category_id:    string;
  subcategory_id: string;
  description:    string;
  is_active:      boolean;
  is_bestseller:  boolean;
  variants:       { id: string; label: string; price: number }[];
  images:         { id: string; url: string; sort_order: number }[];
};

type Category    = { id: string; name: string; slug: string };
type Subcategory = { id: string; category_id: string; name: string; slug: string };

type VariantItem = { _key: string; id?: string; label: string; price: string };
type ImageItem   = { _key: string; id?: string; url?: string; file?: File; preview: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

let _keyCounter = 0;
const nextKey = () => String(++_keyCounter);

// ── Image row (sortable) ──────────────────────────────────────────────────────

function SortableImage({
  item,
  index,
  onDelete,
}: {
  item: ImageItem;
  index: number;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item._key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      {/* Grip */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-300 hover:text-gray-500"
        tabIndex={-1}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="8" cy="5" r="1.5" /><circle cx="12" cy="5" r="1.5" />
          <circle cx="8" cy="10" r="1.5" /><circle cx="12" cy="10" r="1.5" />
          <circle cx="8" cy="15" r="1.5" /><circle cx="12" cy="15" r="1.5" />
        </svg>
      </button>

      {/* Thumbnail */}
      <img src={item.preview} alt="" className="h-12 w-12 rounded-lg object-cover ring-1 ring-gray-200" />

      {/* Primary badge */}
      {index === 0 && (
        <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-xs font-medium text-terracotta">
          Primary
        </span>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg border border-gray-200 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-500"
        title="Remove image"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent",
          "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-terracotta/40",
          checked ? "bg-terracotta" : "bg-gray-200",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {icon}
        {label}
      </span>
    </label>
  );
}

// ── Star icon ─────────────────────────────────────────────────────────────────

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${filled ? "fill-gold text-gold" : "fill-none text-gray-400"}`}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

// ── Main form component ───────────────────────────────────────────────────────

export function ProductForm({
  initialData,
  categories,
  allSubcategories,
}: {
  initialData?:     ProductFormInitialData;
  categories:       Category[];
  allSubcategories: Subcategory[];
}) {
  const router  = useRouter();
  const isEdit  = !!initialData;
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Core fields ─────────────────────────────────────────────────────────────
  const [name,          setName]          = useState(initialData?.name           ?? "");
  const [sku,           setSku]           = useState(initialData?.sku            ?? "");
  const [categoryId,    setCategoryId]    = useState(initialData?.category_id    ?? "");
  const [subcategoryId, setSubcategoryId] = useState(initialData?.subcategory_id ?? "");
  const [description,   setDescription]  = useState(initialData?.description     ?? "");
  const [isActive,      setIsActive]      = useState(initialData?.is_active       ?? true);
  const [isBestseller,  setIsBestseller]  = useState(initialData?.is_bestseller  ?? false);

  // ── Variants ─────────────────────────────────────────────────────────────────
  const [variants, setVariants] = useState<VariantItem[]>(
    initialData?.variants.length
      ? initialData.variants.map((v) => ({
          _key: nextKey(),
          id:    v.id,
          label: v.label,
          price: String(v.price),
        }))
      : [{ _key: nextKey(), label: "", price: "" }],
  );

  // ── Images ────────────────────────────────────────────────────────────────────
  const [images, setImages] = useState<ImageItem[]>(
    (initialData?.images ?? []).map((img) => ({
      _key:    nextKey(),
      id:      img.id,
      url:     img.url,
      preview: img.url,
    })),
  );

  // ── SKU auto-suggest ──────────────────────────────────────────────────────────
  const skuAutoRef = useRef(false); // true if SKU was auto-filled and not manually edited

  useEffect(() => {
    if (!categoryId || isEdit) return;
    // Only auto-suggest if SKU is empty or was previously auto-suggested
    if (sku && !skuAutoRef.current) return;

    fetch(`/api/admin/products/sku-suggest?category_id=${categoryId}`)
      .then((r) => r.json())
      .then(({ suggestion }) => {
        if (suggestion) {
          setSku(suggestion);
          skuAutoRef.current = true;
        }
      })
      .catch(() => {});
  }, [categoryId, isEdit, sku]);

  // ── Subcategory filtering ─────────────────────────────────────────────────────
  const filteredSubs = allSubcategories.filter((s) => s.category_id === categoryId);

  function handleCategoryChange(newCatId: string) {
    setCategoryId(newCatId);
    setSubcategoryId("");
    skuAutoRef.current = true; // allow auto-suggest on category change
  }

  // ── Variant handlers ──────────────────────────────────────────────────────────
  function updateVariant(key: string, field: "label" | "price", value: string) {
    setVariants((prev) => prev.map((v) => v._key === key ? { ...v, [field]: value } : v));
  }

  function removeVariant(key: string) {
    setVariants((prev) => prev.length > 1 ? prev.filter((v) => v._key !== key) : prev);
  }

  function addVariant() {
    setVariants((prev) => [...prev, { _key: nextKey(), label: "", price: "" }]);
  }

  // ── Image handlers ────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleImageFiles(files: FileList | null) {
    if (!files) return;
    const items: ImageItem[] = Array.from(files).map((f) => ({
      _key:    nextKey(),
      file:    f,
      preview: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...items]);
  }

  function removeImage(key: string) {
    setImages((prev) => prev.filter((img) => img._key !== key));
  }

  function handleImageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImages((prev) => {
      const oldIdx = prev.findIndex((img) => img._key === String(active.id));
      const newIdx = prev.findIndex((img) => img._key === String(over.id));
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Name is required."); return; }
    if (!sku.trim())  { setError("SKU is required."); return; }
    const validVariants = variants.filter((v) => v.label.trim() && v.price.trim());
    if (!validVariants.length) { setError("At least one variant with a label and price is required."); return; }

    setSubmitting(true);

    // Upload any new image files
    const finalImages: { id?: string; url: string; sort_order: number }[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.file) {
        try {
          const publicUrl = await uploadToStorage(img.file, "product-images");
          finalImages.push({ url: publicUrl, sort_order: i });
        } catch (uploadErr) {
          setError(`Image upload failed: ${uploadErr instanceof Error ? uploadErr.message : "unknown error"}`);
          setSubmitting(false);
          return;
        }
      } else if (img.url) {
        finalImages.push({ id: img.id, url: img.url, sort_order: i });
      }
    }

    const payload = {
      name:           name.trim(),
      sku:            sku.trim(),
      category_id:    categoryId    || null,
      subcategory_id: subcategoryId || null,
      description:    description.trim() || null,
      is_active:      isActive,
      is_bestseller:  isBestseller,
      variants: validVariants.map((v, i) => ({
        ...(v.id ? { id: v.id } : {}),
        label: v.label.trim(),
        price: parseInt(v.price, 10),
        sort_order: i,
      })),
      images: finalImages,
    };

    const url    = isEdit ? `/api/admin/products/${initialData!.id}` : "/api/admin/products";
    const method = isEdit ? "PATCH" : "POST";

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    setSubmitting(false);

    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }

    router.push("/admin/products");
    router.refresh();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Core fields ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-gray-600">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ocean Shell Eco-Resin Tray"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>

          {/* SKU */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">SKU *</label>
            <input
              value={sku}
              onChange={(e) => { setSku(e.target.value); skuAutoRef.current = false; }}
              placeholder="DC-TR-001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
            <p className="text-[11px] text-gray-400">
              Auto-suggested from category — edit freely.
            </p>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Category</label>
            <select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            >
              <option value="">— Select category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Subcategory</label>
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!categoryId || filteredSubs.length === 0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {!categoryId
                  ? "Pick a category first"
                  : filteredSubs.length === 0
                  ? "No subcategories"
                  : "— Select subcategory —"}
              </option>
              {filteredSubs.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product — materials, dimensions, care instructions…"
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-4 sm:col-span-2">
            <Toggle
              checked={isActive}
              onChange={setIsActive}
              label="Active (visible in shop)"
            />
            <Toggle
              checked={isBestseller}
              onChange={setIsBestseller}
              label="Bestseller"
              icon={<StarIcon filled={isBestseller} />}
            />
          </div>
        </div>
      </section>

      {/* ── Variants ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Sizes / Variants *</h2>
          <span className="text-xs text-gray-400">At least one required</span>
        </div>

        <div className="space-y-2">
          {variants.map((v) => (
            <div key={v._key} className="flex items-center gap-2">
              <input
                value={v.label}
                onChange={(e) => updateVariant(v._key, "label", e.target.value)}
                placeholder="Label (e.g. Small / 100ml)"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              />
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={v.price}
                  onChange={(e) => updateVariant(v._key, "price", e.target.value)}
                  placeholder="Price"
                  className="w-28 rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                />
              </div>
              <button
                type="button"
                onClick={() => removeVariant(v._key)}
                disabled={variants.length === 1}
                className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                title="Remove variant"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addVariant}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-terracotta hover:underline"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add another size
        </button>
      </section>

      {/* ── Images ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Images</h2>
          <span className="text-xs text-gray-400">First image = primary thumbnail</span>
        </div>

        {/* Sortable image list */}
        {images.length > 0 && (
          <div className="mb-3 space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleImageDragEnd}
            >
              <SortableContext
                items={images.map((img) => img._key)}
                strategy={verticalListSortingStrategy}
              >
                {images.map((img, i) => (
                  <SortableImage
                    key={img._key}
                    item={img}
                    index={i}
                    onDelete={() => removeImage(img._key)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Upload drop zone */}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 hover:border-terracotta/40 hover:bg-terracotta/5">
          <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-sm text-gray-500">
            Click to upload images, or drag &amp; drop
          </span>
          <span className="text-xs text-gray-400">PNG, JPG, WEBP — multiple OK</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => handleImageFiles(e.target.files)}
          />
        </label>
      </section>

      {/* ── Error + Submit ────────────────────────────────────────── */}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-terracotta px-6 py-2.5 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
        >
          {submitting
            ? isEdit ? "Saving…" : "Creating…"
            : isEdit ? "Save changes" : "Add Product"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
