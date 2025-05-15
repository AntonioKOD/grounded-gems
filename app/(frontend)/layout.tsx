
import React from 'react'
import "./globals.css"; 
import NavBar from '@/components/NavBar'
import Footer from '@/components/footer';
import MobileNavigation from '@/components/mobile-navigation';
import {Toaster} from 'sonner'
import {GoogleAnalytics} from '@next/third-parties/google'





export const metadata = {
  description: 'Find the hidden gems around you',
  title: 'Grounded Gems',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
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

