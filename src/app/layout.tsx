import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CryoLeads",
  description: "WhatsApp-first solo sales command centre for cryotherapy equipment outreach."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
