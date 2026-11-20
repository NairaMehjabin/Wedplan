import type { Metadata } from "next";
import localFont from "next/font/local";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import "./globals.css";

const curlyTitle = localFont({
  src: "../public/fonts/Curly.ttf",
  variable: "--font-curly",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "WedPlan — Wedding Planning Platform",
  description:
    "Discover wedding services, manage bookings, and plan every celebration moment with WedPlan.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${curlyTitle.variable} ${cormorant.variable} ${jakarta.variable}`}
    >
      <body className="min-h-screen bg-[#F4E2E6] font-[var(--font-jakarta)] text-[#24020E] antialiased">
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3800,
            style: {
              background: "#FCF9F4",
              color: "#24020E",
              border: "2.5px solid #24020E",
              borderRadius: "24px",
              boxShadow: "6px 6px 0px 0px #24020E",
              fontWeight: 600,
              fontSize: "13px",
              padding: "12px 16px",
            },
            success: {
              iconTheme: {
                primary: "#15803d",
                secondary: "#FCF9F4",
              },
            },
            error: {
              style: {
                background: "#FFEDF1",
                color: "#24020E",
              },
              iconTheme: {
                primary: "#C84B31",
                secondary: "#FCF9F4",
              },
            },
          }}
        />
        <Navbar />
        <main className="w-full">{children}</main>
      </body>
    </html>
  );
}