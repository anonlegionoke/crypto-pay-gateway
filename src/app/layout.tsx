import type { Metadata } from "next";
import "./globals.css";
import '@solana/wallet-adapter-react-ui/styles.css';
import { ClientWalletProvider as WalletProvider } from "@/components/WalletProvider";
import { Toaster } from 'react-hot-toast';
import NextTopLoader from 'nextjs-toploader';
import { Analytics } from '@vercel/analytics/next';

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
      <body className="antialiased">
        <NextTopLoader color="#f59e0b" shadow="0 0 10px #f59e0b,0 0 5px #f59e0b" showSpinner={false} />
        <WalletProvider>
          {children}
          <Toaster position="bottom-right" />
        </WalletProvider>
        <Analytics />
      </body>
    </html>
  );
}
