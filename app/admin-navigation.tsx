"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Products", href: "/products" },
  { label: "Orders", href: "/orders" },
  { label: "Customers", href: "/customers" },
];

export default function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="navigation" aria-label="Main navigation">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;
        const marker = item.label === "Dashboard" ? "01" : item.label === "Products" ? "02" : item.label === "Orders" ? "03" : "04";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`navigation-link${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="navigation-indicator" aria-hidden="true">{marker}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}