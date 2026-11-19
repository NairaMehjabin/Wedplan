import type { Metadata } from "next";
import localFont from "next/font/local";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import Navbar, { type NavbarUser } from "./components/Navbar";
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

async function getSessionUser(): Promise<NavbarUser | null> {
  return null;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();

  return (
    <html
      lang="en"
      className={`${curlyTitle.variable} ${cormorant.variable} ${jakarta.variable}`}
    >
      <body className="min-h-screen bg-[#F4E2E6] font-[var(--font-jakarta)] text-[#24020E] antialiased">
        <Navbar user={user} />
        <main className="w-full">{children}</main>
      </body>
    </html>
  );
}