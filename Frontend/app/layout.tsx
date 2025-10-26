import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import { WalletProvider } from "@/lib/WalletContext";

export const metadata = {
  title: "IntentPay",
  description: "Cross-chain payroll and yield engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 flex flex-col min-h-screen">
        <WalletProvider>
          <Header />
          <main className="flex-grow">
            {children}
            <Toaster position="top-right" richColors />
          </main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
