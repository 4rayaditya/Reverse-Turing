"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import { SocketProvider } from "@/components/providers/socket-provider"

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <SessionProvider>
      <NextThemesProvider {...props}>
        <SocketProvider>
          {children}
        </SocketProvider>
      </NextThemesProvider>
    </SessionProvider>
  )
}
