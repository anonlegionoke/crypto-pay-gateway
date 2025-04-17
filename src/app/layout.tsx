import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientWalletProvider as WalletProvider } from "@/components/WalletProvider";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crypto Payment Gateway",
  description: "Accept any token, receive USDC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          {children}
          <Toaster position="bottom-right" />
        </WalletProvider>
      </body>
    </html>
  );
}
