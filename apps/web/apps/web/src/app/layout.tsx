import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@companyos/ui";
import { QueryProvider } from "@/lib/query";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { SITE_URL } from "@/lib/seo";
import "@companyos/ui/styles.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-custom",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Elliptic",
    template: "%s · Elliptic",
  },
  description: "Jira for your agents. The agent-native work platform you self-host on your own keys.",
  applicationName: "Elliptic",
  openGraph: {
    type: "website",
    siteName: "Elliptic",
    title: "Elliptic",
    description: "Jira for your agents. The agent-native work platform you self-host on your own keys.",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elliptic",
    description: "Jira for your agents. The agent-native work platform you self-host on your own keys.",
    creator: "@woosal1337",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <QueryProvider>
          <I18nProvider>
            {children}
            <Toaster />
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
