import Link from "next/link";

const workspaceSections = [
  { number: "01", label: "Products", description: "Manage your catalog and product images.", href: "/products" },
  { number: "02", label: "Orders", description: "Review orders, items, and delivery details.", href: "/orders" },
  { number: "03", label: "Customers", description: "Customer workspace.", href: "/customers" },
];

export default function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Superior Touch</p>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Your store workspace.</p>
      </div>
      <section className="workspace-section" aria-labelledby="workspace-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2 id="workspace-heading">Store management</h2>
          </div>
        </div>
        <div className="workspace-links">
          {workspaceSections.map((section) => (
            <Link className="workspace-link" href={section.href} key={section.href}>
              <span className="workspace-link-number">{section.number}</span>
              <span className="workspace-link-copy">
                <strong>{section.label}</strong>
                <small>{section.description}</small>
              </span>
              <span className="workspace-link-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}