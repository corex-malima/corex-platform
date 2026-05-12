"use client"

import * as React from "react"

import { ThemeProviderContext } from "@/contexts/theme-context"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  // Lazy init: lee localStorage solo en cliente. El server siempre arranca
  // con `defaultTheme` porque `typeof window === "undefined"`. Esto elimina
  // la cadena de useEffects (no-effect-chain): antes había un effect que
  // leía localStorage y seteaba `theme`, y otro que reaccionaba a `theme`
  // para tocar el DOM. Ahora un solo effect aplica el className.
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    const storedTheme = localStorage.getItem(storageKey)
    return isTheme(storedTheme) ? storedTheme : defaultTheme
  })

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (nextTheme: Theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, nextTheme)
      }
      setTheme(nextTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
