import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { NavigationProvider } from "@/contexts/NavigationContext.tsx"
import { AdminAuthGate } from "@/components/AdminAuthGate.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AdminAuthGate>
        <NavigationProvider>
          <App />
        </NavigationProvider>
      </AdminAuthGate>
    </ThemeProvider>
  </StrictMode>
)
