import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import AdminNavigation from "./admin-navigation";
import "./globals.css";
import "./admin-redesign.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Superior Touch Admin",
  description: "Superior Touch administration",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="admin-frame">
          <aside className="sidebar">
            <Link className="admin-brand" href="/dashboard" aria-label="Superior Touch Admin home">
              <span className="brand-mark" aria-hidden="true">ST</span>
              <span className="admin-brand-copy">
                <strong>SUPERIOR TOUCH</strong>
                <small>Store administration</small>
              </span>
            </Link>
            <p className="sidebar-caption">WORKSPACE</p>
            <AdminNavigation />
            <div className="sidebar-footer">
              <span className="sidebar-footer-mark" aria-hidden="true">ST</span>
              <span>Superior Touch<br /><small>Admin workspace</small></span>
            </div>
          </aside>
          <div className="main-column">
            <header className="topbar">
              <div className="topbar-brand">
                <span className="mobile-brand-mark" aria-hidden="true">ST</span>
                <span className="topbar-label">Store workspace</span>
              </div>
              <span className="topbar-context"><span className="topbar-dot" aria-hidden="true" />ADMINISTRATION</span>
            </header>
            <div className="mobile-navigation">
              <AdminNavigation />
            </div>
            <main className="page-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
