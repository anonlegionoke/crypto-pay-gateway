import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 sm:p-20 bg-gradient-to-br from-background to-gray-100 dark:to-gray-900 text-foreground transition-colors duration-300 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col items-center max-w-4xl w-full">
        <div className="mb-12 font-extrabold text-6xl sm:text-7xl leading-tight text-center tracking-tight">
          <span className="block text-3xl sm:text-5xl mb-4 text-gray-600 dark:text-gray-300 font-bold">Welcome to</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 drop-shadow-sm">Crypto Gate</span>
        </div>
        
        <p className="mb-12 text-center text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
          The most seamless way to accept decentralized crypto payments and get paid directly in stablecoins. Simple, secure, borderless.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center w-full justify-center">
          <Link href={`/dashboard`}
            className="flex items-center justify-center gap-3 w-full sm:w-auto min-w-[200px] h-14 px-8 rounded-xl font-bold transition-all transform active:scale-95 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg hover:shadow-amber-500/25"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
      
      <footer className="absolute bottom-8 text-sm text-gray-500 dark:text-gray-500 font-medium">
        Powered by Solana & Jupiter
      </footer>
    </div>
  );
}
