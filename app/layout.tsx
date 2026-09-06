import "./globals.css";
import Link from "next/link";
import AuthStatus from "../components/AuthStatus";

export const metadata = {
  metadataBase: new URL("https://academy.zerodrivex.com"),
  title: { default: "ZeroDriveX Academy", template: "%s | ZeroDriveX Academy" },
  description: "Free technical education. Real systems, real mechanisms, optional verifiable credentials.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "https://academy.zerodrivex.com", siteName: "ZeroDriveX Academy", title: "ZeroDriveX Academy", description: "Free technical education. Real systems, real mechanisms, optional verifiable credentials.", images: [{ url: "/og-image.png", width: 1536, height: 1024, alt: "ZeroDriveX Academy" }] },
  twitter: { card: "summary_large_image", title: "ZeroDriveX Academy", description: "Free technical education. Real systems, real mechanisms, optional verifiable credentials.", images: ["/og-image.png"] }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>
    <header className="topbar"><Link className="brand" href="/">ZDX ACADEMY</Link><nav>
      <Link href="/courses">Courses</Link><Link href="/scoreboard">Scoreboard</Link><Link href="/verify">Verify</Link><Link href="/about">About</Link><Link href="/dashboard">Dashboard</Link><AuthStatus /><Link className="nav-register" href="/login?mode=signup">Register free</Link>
    </nav></header>
    {children}
    <footer><strong>ZeroDriveX Academy</strong><span>Free learning. Real systems. Verifiable credentials.</span><Link href="/scoreboard">Scoreboard</Link><a href="https://zerodrivex.com">ZeroDriveX</a></footer>
  </body></html>;
}
