"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  imageUrl: string | null;
  isActive?: boolean;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  isActive: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  isActive: true,
};
const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) throw new Error("The backend API URL is not configured.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(" ");
      else if (body.message) message = body.message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const result = await request<Product[]>("/products?includeInactive=true");
      setProducts(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    request<Product[]>("/products?includeInactive=true")
      .then((result) => {
        if (!cancelled) setProducts(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setError("");
    setNotice("");
    setDialogOpen(true);
  }

  async function openEdit(product: Product) {
    setError("");
    setNotice("");
    try {
      const latest = await request<Product>(`/products/${product.id}`);
      setEditingProduct(latest);
      setForm({
        name: latest.name,
        description: latest.description ?? "",
        price: String(latest.price),
        category: latest.category,
        isActive: latest.isActive !== false,
      });
      setImageFile(null);
      setDialogOpen(true);
    } catch (editError) {
      setError(getErrorMessage(editError));
    }
  }

  function updateField(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    setImageFile(event.target.files?.[0] ?? null);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    let savedProduct: Product | null = null;
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        category: form.category.trim(),
        ...(editingProduct ? { isActive: form.isActive } : {}),
        ...(editingProduct ? {} : { stock: 0 }),
      };
      savedProduct = editingProduct
        ? await request<Product>(`/products/${editingProduct.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await request<Product>("/products", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      if (imageFile) {
        const imageData = new FormData();
        imageData.append("file", imageFile);
        await request<Product>(`/products/${savedProduct.id}/image`, {
          method: "POST",
          body: imageData,
        });
      }

      setDialogOpen(false);
      setNotice(editingProduct ? "Product updated." : "Product created.");
      await loadProducts();
    } catch (saveError) {
      if (!editingProduct && savedProduct) {
        setEditingProduct(savedProduct);
        setError(`Product created, but its image could not be uploaded: ${getErrorMessage(saveError)}`);
        await loadProducts();
        setError(`Product created, but its image could not be uploaded: ${getErrorMessage(saveError)}`);
      } else {
        setError(getErrorMessage(saveError));
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(`Delete “${product.name}”? This cannot be undone.`);
    if (!confirmed) return;

    setError("");
    setNotice("");
    try {
      await request<{ id: string; deleted: boolean }>(`/products/${product.id}`, {
        method: "DELETE",
      });
      setNotice("Product deleted.");
      await loadProducts();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  return (
    <>
      <div className="products-heading page-heading">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="page-title">Products</h1>
          <p className="page-description">Manage the products shown in your store.</p>
        </div>
        <button className="button-primary" type="button" onClick={openCreate}>
          <span aria-hidden="true">+</span> Add product
        </button>
      </div>

      {notice && <p className="products-alert products-success" role="status">{notice}</p>}
      {error && <p className="products-alert products-error" role="alert">{error}</p>}

      <section className="products-panel" aria-label="Product catalog">
        <div className="products-panel-heading">
          <div>
            <h2>Product catalog</h2>
            <p>{loading ? "Loading products" : `${products.length} ${products.length === 1 ? "product" : "products"}`}</p>
          </div>
          <button
            className="button-secondary"
            type="button"
            onClick={() => void loadProducts()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="products-state" role="status">Loading products…</div>
        ) : error && products.length === 0 ? (
          <div className="products-state products-load-error">
            Products could not be loaded. Check the API connection and CORS configuration, then refresh.
          </div>
        ) : products.length === 0 ? (
          <div className="products-state products-empty">
            <span className="empty-mark" aria-hidden="true">P</span>
            <h3>No products yet</h3>
            <p>Products you add will appear here.</p>
            <button className="button-secondary" type="button" onClick={openCreate}>Add your first product</button>
          </div>
        ) : (
          <div className="products-table-wrap">
            <table className="products-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Category</th>
                  <th scope="col">Price</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td data-label="Product">
                      <div className="product-cell">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="product-thumbnail" src={product.imageUrl} alt="" />
                        ) : (
                          <span className="product-thumbnail product-thumbnail-empty" aria-hidden="true">—</span>
                        )}
                        <span className="product-name">{product.name}</span>
                      </div>
                    </td>
                    <td data-label="Category"><span className="category-label">{product.category}</span></td>
                    <td data-label="Price" className="price-cell">{naira.format(product.price)}</td>
                    <td data-label="Status">
                      <span className={`status-pill ${product.isActive !== false ? "status-active" : "status-inactive"}`}>
                        <span aria-hidden="true" />{product.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <div className="product-actions">
                        <button className="action-button" type="button" onClick={() => void openEdit(product)}>
                          Edit
                        </button>
                        <button className="action-button action-delete" type="button" onClick={() => void deleteProduct(product)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialogOpen && (
        <div className="product-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setDialogOpen(false);
        }}>
          <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Catalog item</p>
                <h2 id="product-dialog-title">{editingProduct ? "Edit product" : "Add product"}</h2>
              </div>
              <button className="dialog-close" type="button" aria-label="Close dialog" onClick={() => setDialogOpen(false)} disabled={saving}>
                ×
              </button>
            </div>

            <form className="product-form" onSubmit={saveProduct}>
              <label className="form-field">
                <span>Name</span>
                <input name="name" value={form.name} onChange={updateField} maxLength={180} required autoFocus />
              </label>
              <label className="form-field">
                <span>Description <small>Optional</small></span>
                <textarea name="description" value={form.description} onChange={updateField} rows={3} />
              </label>
              <div className="form-row">
                <label className="form-field">
                  <span>Price <small>NGN</small></span>
                  <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={updateField} required />
                </label>
                <label className="form-field">
                  <span>Category</span>
                  <input name="category" value={form.category} onChange={updateField} maxLength={120} required />
                </label>
              </div>
              {editingProduct && (
                <label className="active-toggle">
                  <span className="toggle-copy">
                    <strong>Active</strong>
                    <small>Visible to customers in the store</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  <span className="toggle-track" aria-hidden="true" />
                </label>
              )}
              <label className="form-field image-field">
                <span>Product image <small>{editingProduct?.imageUrl ? "Current image kept unless replaced" : "Optional"}</small></span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={selectImage} />
                {imageFile && <small className="selected-file">Selected: {imageFile.name}</small>}
              </label>
              {error && <p className="products-alert products-error" role="alert">{error}</p>}
              <div className="dialog-actions">
                <button className="button-secondary" type="button" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button className="button-primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingProduct ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}