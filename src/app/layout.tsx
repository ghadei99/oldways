import type { Metadata } from "next";
import {
  Instrument_Sans,
  Source_Serif_4,
  Noto_Serif_Devanagari,
  Noto_Sans_Oriya,
  Noto_Sans_Bengali,
} from "next/font/google";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import "./globals.css";

const ui = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

const read = Source_Serif_4({
  variable: "--font-read",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});

const deva = Noto_Serif_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: ["400", "600"],
});

const orya = Noto_Sans_Oriya({
  variable: "--font-orya",
  subsets: ["oriya"],
  weight: ["400", "600"],
});

const beng = Noto_Sans_Bengali({
  variable: "--font-beng",
  subsets: ["bengali"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "The Vedic Library",
    template: "%s · The Vedic Library",
  },
  description:
    "Read ancient texts. Follow the source. A structured library of Vedic literature with canonical references.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${ui.variable} ${read.variable} ${deva.variable} ${orya.variable} ${beng.variable} h-full`}
    >
      <body className="min-h-full flex flex-col text-ink antialiased">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper-raised focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="content" className="relative z-10 flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
