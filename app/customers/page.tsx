export default function CustomersPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Store management</p>
        <h1 className="page-title">Customers</h1>
        <p className="page-description">Customer information associated with store activity.</p>
      </div>
      <section className="customers-empty-panel" aria-label="Customer records">
        <span className="customers-empty-mark" aria-hidden="true">C</span>
        <div>
          <h2>Customer records are not connected</h2>
          <p>Customer details are currently available on individual order records.</p>
        </div>
      </section>
    </>
  );
}