import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta name="description" content="Harper — AI recruiter" />

        <meta
          property="og:title"
          content="Harper — Discover world-class opportunities"
        />
        <meta
          property="og:description"
          content="Connect AI/ML researchers & engineers with world-class tech startups."
        />
        <meta property="og:url" content="https://matchharper.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Harper — AI Recruiter" />

        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
