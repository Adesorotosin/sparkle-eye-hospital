import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import IdleTimer from "@/components/IdleTimer";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Sparkle Eye Specialist Hospital",
  description: "Hospital Security & Audit Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} font-sans antialiased`}
        suppressHydrationWarning={true}
      >
        <IdleTimer timeoutMinutes={5}>
          {children}
        </IdleTimer>
      </body>
    </html>
  );
}