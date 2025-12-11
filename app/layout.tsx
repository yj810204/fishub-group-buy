import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/components/auth/AuthContext";
import { Navbar } from "@/components/common/Navbar";
import { Container } from "react-bootstrap";

export const metadata: Metadata = {
  title: "공동구매 플랫폼",
  description: "온라인 공동구매 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <main className="py-4">
            <Container>
              {children}
            </Container>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
