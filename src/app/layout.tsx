import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardProvider } from "@/lib/dashboard-context";
import DashboardLayout from "@/components/dashboard-layout";
import { Toaster } from "sonner";
import "./globals.css";


const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: "DealerPulse AI — Intelligent Dealership Operations Platform",
  description: "Executive decision-support platform for dealership CEOs, branch managers, and operational directors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-200">
        <ThemeProvider>
          <DashboardProvider>
            <DashboardLayout>
              {children}
            </DashboardLayout>
            <Toaster position="top-right" />
          </DashboardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
