
import React from 'react'
import "./globals.css"; 
import NavBar from '@/components/NavBar'
import Footer from '@/components/footer';
import MobileNavigation from '@/components/mobile-navigation';
import {Toaster} from 'sonner'
import {GoogleAnalytics} from '@next/third-parties/google'
import Head  from 'next/head';





export const metadata = {
  description: 'Find the hidden gems around you',
  title: 'Grounded Gems',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="description" content={metadata.description} />
        <title>{metadata.title}</title>
        <meta name="keywords" content="community, local, events, recommendations, hidden gems" />
        <meta name="author" content="Grounded Gems Team" />
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metadata.title} />
        <meta name="twitter:description" content={metadata.description} />
        <meta name="twitter:image" content="/og-image.jpg" />
        <meta name="apple-mobile-web-app-title" content="Grounded Gems" />
      </Head>
      <body>
        <NavBar />
       
        <main>{children}</main>
        
        <Footer/>
        <GoogleAnalytics gaId='G-DM1Y9WQP6R' />
        <div className="md:hidden">
        <MobileNavigation />
        <Toaster/>
        
      </div>
      </body>
    </html>
  )
}

