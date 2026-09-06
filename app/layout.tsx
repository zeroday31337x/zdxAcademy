import "./globals.css";
import Link from "next/link";
import AuthStatus from "../components/AuthStatus";

export const metadata = {
  metadataBase: new URL("https://academy.zerodrivex.com"),
  title: {
    default: "ZeroDriveX Academy",
    template: "%s | ZeroDriveX Academy"
  },
  description: "Real technical education. Free learning. Verifiable credentials.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "https://academy.zerodrivex.com",
    siteName: "ZeroDriveX Academy",
    title: "ZeroDriveX Academy",
    description: "Real technical education. Free learning. Verifiable credentials.",
    images: [
      {
        url: "/og-image.png",
        width: 1536,
        height: 1024,
        alt: "ZeroDriveX Academy"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "ZeroDriveX Academy",
    description: "Real technical education. Free learning. Verifiable credentials.",
    images: ["/og-image.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link className="brand" href="/">ZDX ACADEMY</Link>
          <nav>
            <Link href="/courses">Courses</Link>
            <Link href="/verify">Verify certificate</Link>
            <Link href="/about">About</Link>
            <Link href="/dashboard">Dashboard</Link>
            <AuthStatus />
          </nav>
        </header>
        {children}
        <footer>
          <strong>ZeroDriveX Academy</strong>
          <span>Real systems. Real mechanisms. Reproducible evidence.</span>
          <a href="https://zerodrivex.com">ZeroDriveX</a>
        </footer>
      </body>
    </html>
  );
}
