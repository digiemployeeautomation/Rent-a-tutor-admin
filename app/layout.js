import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'

export const metadata = {
  title: 'Admin — Rent a Tutor',
  description: 'Rent a Tutor administration console',
}

// Runs before React hydration to prevent dark mode flash
const DARK_MODE_INIT = `
(function(){
  try {
    var saved = localStorage.getItem('rat-admin-dark');
    if (saved === 'dark') document.documentElement.setAttribute('data-dark', 'true');
    else if (saved === 'light') document.documentElement.setAttribute('data-dark', 'false');
  } catch(e) {}
})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-dark="auto" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_INIT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
