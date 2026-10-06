"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

type Order = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryInstructions: string | null;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

type CustomerDeliveryForm = Pick<
  Order,
  | "customerName"
  | "customerPhone"
  | "customerEmail"
  | "deliveryAddress"
  | "deliveryCity"
  | "deliveryState"
  | "deliveryInstructions"
>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});
const orderDate = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
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
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
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

function formatOrderDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : orderDate.format(date);
}

function statusLabel(status: OrderStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formFromOrder(order: Order): CustomerDeliveryForm {
  return {
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    deliveryAddress: order.deliveryAddress,
    deliveryCity: order.deliveryCity,
    deliveryState: order.deliveryState,
    deliveryInstructions: order.deliveryInstructions,
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [editingCustomerDelivery, setEditingCustomerDelivery] = useState(false);
  const [customerDeliveryForm, setCustomerDeliveryForm] = useState<CustomerDeliveryForm | null>(null);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const detailRequestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    request<Order[]>("/orders")
      .then((result) => {
        if (!cancelled) setOrders(result);
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

  async function refreshOrders() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await request<Order[]>("/orders");
      setOrders(result);
      if (selectedOrderId && !result.some((order) => order.id === selectedOrderId)) {
        setSelectedOrderId("");
        setSelectedOrder(null);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function selectOrder(orderId: string) {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setSelectedOrderId(orderId);
    setSelectedOrder(null);
    setDetailLoading(true);
    setDetailError("");
    setEditingCustomerDelivery(false);
    setCustomerDeliveryForm(null);

    try {
      const result = await request<Order>(`/orders/${orderId}`);
      if (detailRequestId.current === requestId) setSelectedOrder(result);
    } catch (loadError) {
      if (detailRequestId.current === requestId) setDetailError(getErrorMessage(loadError));
    } finally {
      if (detailRequestId.current === requestId) setDetailLoading(false);
    }
  }

  async function updateStatus(status: OrderStatus) {
    if (!selectedOrder) return;
    setSavingStatus(true);
    setError("");
    setNotice("");
    try {
      const updated = await request<Order>(`/orders/${selectedOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSelectedOrder(updated);
      setOrders((current) => current.map((order) => order.id === updated.id ? { ...order, ...updated } : order));
      setNotice("Order status updated.");
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setSavingStatus(false);
    }
  }

  function beginCustomerDeliveryEdit() {
    if (!selectedOrder) return;
    setCustomerDeliveryForm(formFromOrder(selectedOrder));
    setEditingCustomerDelivery(true);
    setError("");
    setNotice("");
  }

  function updateCustomerDeliveryField(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setCustomerDeliveryForm((current) => current ? { ...current, [name]: value } : current);
  }

  async function saveCustomerDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder || !customerDeliveryForm) return;

    setSavingDelivery(true);
    setError("");
    setNotice("");
    try {
      const updated = await request<Order>(`/orders/${selectedOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          customerName: customerDeliveryForm.customerName.trim(),
          customerPhone: customerDeliveryForm.customerPhone.trim(),
          customerEmail: customerDeliveryForm.customerEmail?.trim() || null,
          deliveryAddress: customerDeliveryForm.deliveryAddress.trim(),
          deliveryCity: customerDeliveryForm.deliveryCity.trim(),
          deliveryState: customerDeliveryForm.deliveryState.trim(),
          deliveryInstructions: customerDeliveryForm.deliveryInstructions?.trim() || null,
        }),
      });
      setSelectedOrder(updated);
      setOrders((current) => current.map((order) => order.id === updated.id ? { ...order, ...updated } : order));
      setEditingCustomerDelivery(false);
      setNotice("Customer and delivery details updated.");
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setSavingDelivery(false);
    }
  }

  return (
    <>
      <div className="orders-heading page-heading">
        <div>
          <p className="eyebrow">Fulfillment</p>
          <h1 className="page-title">Orders</h1>
          <p className="page-description">Review customer orders and coordinate delivery.</p>
        </div>
        <button className="button-secondary" type="button" onClick={() => void refreshOrders()} disabled={loading}>
          Refresh
        </button>
      </div>

      {notice && <p className="orders-alert orders-success" role="status">{notice}</p>}
      {error && <p className="orders-alert orders-error" role="alert">{error}</p>}

      <div className="orders-layout">
        <section className="orders-panel orders-list-panel" aria-label="Orders list">
          <div className="orders-panel-heading">
            <div>
              <h2>All orders</h2>
              <p>{loading ? "Loading orders" : `${orders.length} ${orders.length === 1 ? "order" : "orders"}`}</p>
            </div>
          </div>

          {loading ? (
            <div className="orders-state" role="status">Loading orders…</div>
          ) : error && orders.length === 0 ? (
            <div className="orders-state orders-load-error">
              Orders could not be loaded. Check the API connection and CORS configuration, then refresh.
            </div>
          ) : orders.length === 0 ? (
            <div className="orders-state orders-empty">
              <span className="orders-empty-mark" aria-hidden="true">O</span>
              <h3>No orders yet</h3>
              <p>New customer orders will appear here.</p>
            </div>
          ) : (
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Total</th>
                    <th scope="col">Status</th>
                    <th scope="col">Delivery area</th>
                    <th scope="col">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className={selectedOrderId === order.id ? "selected" : undefined}>
                      <td data-label="Order">
                        <button
                          className="order-select-button order-id"
                          type="button"
                          onClick={() => void selectOrder(order.id)}
                          aria-current={selectedOrderId === order.id ? "true" : undefined}
                        >
                          {order.id.slice(0, 8).toUpperCase()}
                        </button>
                      </td>
                      <td data-label="Customer">
                        <button className="order-select-button customer-select" type="button" onClick={() => void selectOrder(order.id)}>
                          {order.customerName}
                          <small>{order.customerPhone}</small>
                        </button>
                      </td>
                      <td data-label="Total" className="orders-money">{naira.format(order.totalAmount)}</td>
                      <td data-label="Status">
                        <span className={`order-status-badge order-status-${order.status.toLowerCase()}`}>
                          <span aria-hidden="true" />{statusLabel(order.status)}
                        </span>
                      </td>
                      <td data-label="Delivery area">{order.deliveryCity}, {order.deliveryState}</td>
                      <td data-label="Created" className="orders-date">{formatOrderDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="orders-panel orders-detail-panel" aria-label="Order details" aria-live="polite">
          {!selectedOrderId ? (
            <div className="orders-state orders-select-prompt">
              <span className="orders-detail-mark" aria-hidden="true">↗</span>
              <h2>Select an order</h2>
              <p>Choose an order from the list to view its customer, delivery, and item details.</p>
            </div>
          ) : detailLoading ? (
            <div className="orders-state" role="status">Loading order details…</div>
          ) : detailError ? (
            <div className="orders-state orders-load-error" role="alert">{detailError}</div>
          ) : selectedOrder ? (
            <>
              <div className="order-detail-header">
                <div className="order-detail-title">
                  <p className="eyebrow">Order details</p>
                  <h2 title={selectedOrder.id}>#{selectedOrder.id.slice(0, 8).toUpperCase()}</h2>
                  <p>Placed {formatOrderDate(selectedOrder.createdAt)}</p>
                </div>
                <span className={`order-status-badge order-status-${selectedOrder.status.toLowerCase()}`}>
                  <span aria-hidden="true" />{statusLabel(selectedOrder.status)}
                </span>
              </div>

              <div className="order-detail-controls">
                <label className="order-status-control">
                  <span>Update status</span>
                  <select
                    value={selectedOrder.status}
                    onChange={(event) => void updateStatus(event.target.value as OrderStatus)}
                    disabled={savingStatus}
                    aria-label="Update order status"
                  >
                    {ORDER_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </select>
                  {savingStatus && <small>Saving status…</small>}
                </label>
                <button className="button-secondary" type="button" onClick={beginCustomerDeliveryEdit}>
                  Edit customer &amp; delivery
                </button>
              </div>

              {editingCustomerDelivery && customerDeliveryForm ? (
                <form className="order-edit-form" onSubmit={saveCustomerDelivery}>
                  <div className="order-section-heading">
                    <h3>Customer and delivery</h3>
                    <button className="orders-text-button" type="button" onClick={() => setEditingCustomerDelivery(false)} disabled={savingDelivery}>
                      Cancel
                    </button>
                  </div>
                  <label className="orders-field">
                    <span>Customer name</span>
                    <input name="customerName" value={customerDeliveryForm.customerName} onChange={updateCustomerDeliveryField} maxLength={180} required />
                  </label>
                  <div className="orders-field-row">
                    <label className="orders-field">
                      <span>Phone</span>
                      <input name="customerPhone" value={customerDeliveryForm.customerPhone} onChange={updateCustomerDeliveryField} maxLength={40} required />
                    </label>
                    <label className="orders-field">
                      <span>Email</span>
                      <input name="customerEmail" type="email" value={customerDeliveryForm.customerEmail ?? ""} onChange={updateCustomerDeliveryField} maxLength={254} />
                    </label>
                  </div>
                  <label className="orders-field">
                    <span>Delivery address</span>
                    <input name="deliveryAddress" value={customerDeliveryForm.deliveryAddress} onChange={updateCustomerDeliveryField} maxLength={255} required />
                  </label>
                  <div className="orders-field-row">
                    <label className="orders-field">
                      <span>City</span>
                      <input name="deliveryCity" value={customerDeliveryForm.deliveryCity} onChange={updateCustomerDeliveryField} maxLength={120} required />
                    </label>
                    <label className="orders-field">
                      <span>State</span>
                      <input name="deliveryState" value={customerDeliveryForm.deliveryState} onChange={updateCustomerDeliveryField} maxLength={120} required />
                    </label>
                  </div>
                  <label className="orders-field">
                    <span>Delivery instructions</span>
                    <textarea name="deliveryInstructions" value={customerDeliveryForm.deliveryInstructions ?? ""} onChange={updateCustomerDeliveryField} rows={2} />
                  </label>
                  <button className="button-primary" type="submit" disabled={savingDelivery}>
                    {savingDelivery ? "Saving…" : "Save delivery details"}
                  </button>
                </form>
              ) : (
                <>
                  <div className="order-info-grid">
                    <section className="order-info-section">
                      <div className="order-section-heading"><h3>Customer</h3></div>
                      <dl className="order-info-list">
                        <div><dt>Name</dt><dd>{selectedOrder.customerName}</dd></div>
                        <div><dt>Phone</dt><dd><a href={`tel:${selectedOrder.customerPhone}`}>{selectedOrder.customerPhone}</a></dd></div>
                        <div><dt>Email</dt><dd>{selectedOrder.customerEmail ? <a href={`mailto:${selectedOrder.customerEmail}`}>{selectedOrder.customerEmail}</a> : "Not provided"}</dd></div>
                      </dl>
                    </section>
                    <section className="order-info-section">
                      <div className="order-section-heading"><h3>Delivery</h3></div>
                      <dl className="order-info-list">
                        <div><dt>Address</dt><dd>{selectedOrder.deliveryAddress}</dd></div>
                        <div><dt>City / State</dt><dd>{selectedOrder.deliveryCity}, {selectedOrder.deliveryState}</dd></div>
                        <div><dt>Instructions</dt><dd>{selectedOrder.deliveryInstructions || "None"}</dd></div>
                      </dl>
                    </section>
                  </div>

                  <section className="order-items-section">
                    <div className="order-section-heading">
                      <h3>Items</h3>
                      <span>{selectedOrder.items.length} {selectedOrder.items.length === 1 ? "item" : "items"}</span>
                    </div>
                    <div className="order-items-list">
                      {selectedOrder.items.map((item) => (
                        <article className="order-item-row" key={item.id}>
                          <div className="order-item-copy">
                            <h4>{item.productName}</h4>
                            <p>{item.quantity} × {naira.format(item.unitPrice)}</p>
                          </div>
                          <strong>{naira.format(item.lineTotal)}</strong>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="order-totals" aria-label="Order totals">
                    <div><dt>Subtotal</dt><dd>{naira.format(selectedOrder.subtotal)}</dd></div>
                    <div><dt>Discount</dt><dd>−{naira.format(selectedOrder.discount)}</dd></div>
                    <div><dt>Delivery fee</dt><dd>{naira.format(selectedOrder.deliveryFee)}</dd></div>
                    <div className="order-grand-total"><dt>Total</dt><dd>{naira.format(selectedOrder.totalAmount)}</dd></div>
                  </section>
                </>
              )}
            </>
          ) : null}
        </section>
      </div>
    </>
  );
}