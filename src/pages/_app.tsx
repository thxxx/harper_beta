// src/pages/_app.tsx
import ToastProvider from "@/components/toast/ToastProvider";
import "@/globals.css";
import type { AppProps } from "next/app";
import ReactQueryProvider from "@/components/Provider";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";

const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

const garamond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-garamond",
});

export default function App({ Component, pageProps }: AppProps) {
  const init = useAuthStore((s) => s.init);
  const { user, loading } = useAuthStore();
  const {
    companyUser,
    load,
    loading: companyUserLoading,
  } = useCompanyUserStore();

  useEffect(() => {
    if (!loading && user && !companyUser && !companyUserLoading) {
      load(user.id);
    }
  }, [loading, user, load, companyUser, companyUserLoading]);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <ReactQueryProvider>
      <div
        className={`${inter.className} ${inter.variable} ${garamond.className} ${garamond.variable}`}
      >
        <Analytics />
        <Component {...pageProps} />
        <ToastProvider />
      </div>
    </ReactQueryProvider>
  );
}
