
import React from 'react'
import "./globals.css"; 
import NavBar from '@/components/NavBar'
import Footer from '@/components/footer';
import MobileNavigation from '@/components/mobile-navigation';


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
        <div className="md:hidden">
        <MobileNavigation />
      </div>
      </body>
    </html>
  )
}

