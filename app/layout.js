import './globals.css'

export const metadata = {
  title: 'Admin — Rent a Tutor',
  description: 'Rent a Tutor administration console',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
