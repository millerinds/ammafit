import "./globals.css";
import { CartProvider } from "@/components/store/CartProvider";

export const metadata = {
  title: "Amma Fit - Loja Online",
  description: "Loja online oficial da Amma Fit.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
