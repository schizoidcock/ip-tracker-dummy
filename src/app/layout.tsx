import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'IP Tracker - Visitor Information Dashboard',
  description: 'Professional visitor tracking and IP analysis tool',
  keywords: 'IP tracker, visitor analytics, browser detection, geolocation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}