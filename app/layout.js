import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "../lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
      </head>
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <AuthProvider>
          <div id="root">{children}</div>

          {/* Global Loading Overlay */}
          <div
            id="loading-overlay"
            className="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <div className="loading-spinner"></div>
              <span className="text-gray-700">Loading...</span>
            </div>
          </div>

          {/* Global Notification Container */}
          <div
            id="notifications"
            className="fixed top-4 right-4 z-40 space-y-2"
          ></div>

          {/* Global Modal Container */}
          <div id="modal-root"></div>
        </AuthProvider>
      </body>
    </html>
  );
}
