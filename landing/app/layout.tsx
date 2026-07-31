import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Brief Delights White-Label Signal Engine & B2B Studio Layout
export const metadata: Metadata = {
  title: "Brief Delights - Daily AI Intelligence for Builders, Leaders & Innovators",
  description: "Get the top 14 tech stories that matter to your role—curated daily. Plus weekly strategic insights. Join builders, leaders, and innovators getting Brief Delights.",
  openGraph: {
    title: "Brief Delights - Daily AI Intelligence & White-Label Signal Engine",
    description: "Autonomous co-branded newsletter preview generator & outreach platform for any business, VC, or brand.",
    url: "https://brief.delights.pro",
    siteName: "Brief Delights",
    images: [
      {
        url: "https://brief.delights.pro/bd_seal_logo.png",
        width: 1200,
        height: 1200,
        alt: "Brief Delights Official Wax Seal Logo Mark",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brief Delights - Daily AI Intelligence & White-Label Signal Engine",
    description: "Autonomous co-branded newsletter preview generator & outreach platform.",
    images: ["https://brief.delights.pro/bd_seal_logo.png"],
  },
  icons: {
    icon: "/bd_seal_logo.png",
    apple: "/bd_seal_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <script src="https://improve.delights.pro/api/sdk?key=brief-delights-pro" async defer></script>
      </body>
    </html>
  );
}
