// context/ThemeContext.js
'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext({ darkMode: false, toggleDark: () => {} })

function getSystemDark() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readDarkPref() {
  if (typeof document === 'undefined') return false
  try {
    const saved = localStorage.getItem('rat-admin-dark')
    if (saved === 'dark') return true
    if (saved === 'light') return false
  } catch {}
  const attr = document.documentElement.getAttribute('data-dark')
  if (attr === 'true') return true
  if (attr === 'auto') return getSystemDark()
  return false
}

function applyDarkToDOM(isDark) {
  document.documentElement.setAttribute('data-dark', isDark ? 'true' : 'false')
  try { localStorage.setItem('rat-admin-dark', isDark ? 'dark' : 'light') } catch {}
}

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false)

  const toggleDark = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev
      applyDarkToDOM(next)
      return next
    })
  }, [])

  useEffect(() => {
    setDarkMode(readDarkPref())

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function onSystemChange(e) {
      try {
        const saved = localStorage.getItem('rat-admin-dark')
        if (!saved) {
          setDarkMode(e.matches)
          applyDarkToDOM(e.matches)
        }
      } catch {}
    }
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [])

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
