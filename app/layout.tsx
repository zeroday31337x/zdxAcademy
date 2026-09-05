import "./globals.css";
import Link from "next/link";
import AuthStatus from "../components/AuthStatus";

export const metadata = {
  title: "ZeroDriveX Academy",
  description: "Real technical education. Free learning. Verifiable credentials."
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
