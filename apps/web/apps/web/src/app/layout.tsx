import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@elliptic/ui";
import { QueryProvider } from "@/lib/query";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { SITE_URL } from "@/lib/seo";
import { OA_COLLECTOR_URL, OA_TRACKING_KEY } from "@/lib/analytics";
import "@elliptic/ui/styles.css";

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
        {/*
         * Self-hosted Open Analytics. In the root layout it loads once and
         * survives client-side navigation: it patches the history API, so every
         * App Router route change is counted without a reload, and it reports
         * Core Web Vitals on the first hidden without help.
         *
         * It sits above the marketing pages, the docs and /app alike, because
         * the three share this layout and one site covers all three hostnames.
         * The key is public and write-only — see lib/analytics.ts.
         */}
        <script
          async
          src={`${OA_COLLECTOR_URL}/oa.js`}
          data-key={OA_TRACKING_KEY}
          data-collector={OA_COLLECTOR_URL}
        />
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
