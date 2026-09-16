import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/useAuth";
import { ToastProvider } from "@/lib/useToast";
import { ThemeProvider } from "@/lib/useTheme";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fairo",
  description: "Control de gastos compartidos, con reparto proporcional a los ingresos.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Fairo",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // Nombre "legado" del mismo meta tag: algunas versiones de iOS todavía
    // lo requieren (junto con el estándar "mobile-web-app-capable" que
    // Next ya genera a partir de `appleWebApp.capable`) para que Safari
    // abra la app instalada a pantalla completa, sin su barra.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1512" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          // Evita el parpadeo de tema: aplica la preferencia guardada
          // antes de que el navegador pinte la primera vez.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("gastos-pareja:tema");if(t==="claro")document.documentElement.dataset.theme="light";else if(t==="oscuro")document.documentElement.dataset.theme="dark";}catch(e){}`,
          }}
        />
        <ServiceWorkerRegister />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
