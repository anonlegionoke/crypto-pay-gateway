import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientWalletProvider as WalletProvider } from "@/components/WalletProvider";
import { Toaster } from 'react-hot-toast';
import NextTopLoader from 'nextjs-toploader';

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
        <NextTopLoader color="#f59e0b" shadow="0 0 10px #f59e0b,0 0 5px #f59e0b" showSpinner={false} />
        <WalletProvider>
          {children}
          <Toaster position="bottom-right" />
        </WalletProvider>
      </body>
    </html>
  );
}
