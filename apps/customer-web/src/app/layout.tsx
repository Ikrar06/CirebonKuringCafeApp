import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

// Load Inter font with optimizations
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Load local fonts if needed for branding (commented out until fonts are available)
// const geistSans = localFont({
//   src: './fonts/GeistVF.woff2',
//   variable: '--font-geist-sans',
//   weight: '100 900',
// })

// const geistMono = localFont({
//   src: './fonts/GeistMonoVF.woff2',
//   variable: '--font-geist-mono',
//   weight: '100 900',
// })

// SEO Metadata optimized for local cafe
export const metadata: Metadata = {
  title: {
    default: 'Menu Digital - Cafe Kita',
    template: '%s | Cafe Kita',
  },
  description: 'Pesan makanan dan minuman favorit Anda langsung dari meja. Tanpa antri, tanpa ribet!',
  keywords: [
    'cafe',
    'menu digital',
    'pesan online',
    'makanan',
    'minuman',
    'coffee shop',
    'Kendari',
    'Sulawesi Tenggara'
  ],
  authors: [{ name: 'Cafe Kita' }],
  creator: 'Cafe Kita',
  publisher: 'Cafe Kita',
  
  // Open Graph for social media sharing
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://menu.cafekita.id',
    siteName: 'Cafe Kita - Menu Digital',
    title: 'Menu Digital Cafe Kita',
    description: 'Pesan makanan dan minuman favorit Anda langsung dari meja',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Cafe Kita - Menu Digital',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Menu Digital Cafe Kita',
    description: 'Pesan makanan dan minuman favorit Anda langsung dari meja',
    images: ['/og-image.jpg'],
    creator: '@cafekita_id',
  },

  // Progressive Web App
  manifest: '/manifest.json',
  
  // Icons and theme
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  
  // Verification for search engines
  verification: {
    google: 'google-site-verification-key-here',
  },

  // Prevent indexing of dynamic table URLs
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    nocache: true,
  },
}

// Viewport configuration for mobile-first design
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zoom on mobile for better UX
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  colorScheme: 'light',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html 
      lang="id" 
      className={`${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Additional meta tags for mobile optimization */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cafe Kita" />
        
        {/* Preload critical resources */}
        {/* <link rel="preload" href="/fonts/GeistVF.woff2" as="font" type="font/woff2" crossOrigin="" /> */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://api.supabase.co" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      </head>
      
      <body 
        className={`
          ${inter.className}
          min-h-screen 
          bg-gray-50 
          font-sans 
          antialiased
          overflow-x-hidden
          touch-manipulation
        `}
        suppressHydrationWarning
      >
        {/* Skip to main content for accessibility */}
        <a 
          href="#main-content" 
          className="
            sr-only 
            focus:not-sr-only 
            focus:absolute 
            focus:top-4 
            focus:left-4 
            focus:z-50 
            focus:px-4 
            focus:py-2 
            focus:bg-blue-600 
            focus:text-white 
            focus:rounded-md
          "
        >
          Lompat ke konten utama
        </a>

        {/* Main application content */}
        <main id="main-content" className="min-h-screen">
          {children}
        </main>

        {/* Global toast notifications */}
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0a0a0a',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              padding: '12px 16px',
            },
            duration: 4000,
          }}
          expand={false}
          richColors
        />

        {/* Service Worker registration for PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                  }).then(function(registration) {
                    console.log('SW registered: ', registration);
                  }).catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
                });
              }
            `,
          }}
        />

        {/* Performance monitoring */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Basic performance monitoring
              window.addEventListener('load', function() {
                if ('performance' in window) {
                  const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                  console.log('Page load time:', loadTime + 'ms');
                  
                  // Report to analytics if configured
                  if (window.gtag) {
                    gtag('event', 'page_load_time', {
                      'value': loadTime,
                      'custom_parameter': 'customer_web'
                    });
                  }
                }
              });
            `,
          }}
        />

        {/* Prevent context menu on mobile for app-like experience */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('contextmenu', function(e) {
                if (window.innerWidth <= 768) {
                  e.preventDefault();
                }
              });
              
              // Prevent text selection on UI elements
              document.addEventListener('selectstart', function(e) {
                if (e.target.tagName === 'BUTTON' || 
                    e.target.closest('button') || 
                    e.target.classList.contains('no-select')) {
                  e.preventDefault();
                }
              });
            `,
          }}
        />
      </body>
    </html>
  )
}