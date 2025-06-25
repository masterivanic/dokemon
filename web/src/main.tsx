import ReactDOM from "react-dom/client"
import "./index.css"
import { Toaster } from "./components/ui/toaster"
import { RouterProvider } from "react-router-dom"
import router from "./router"
import "./auth.ts"
import { ThemeProvider } from "./components/ui/theme-provider.tsx"
import { ContainerProvider } from "./contexts/container-context.tsx"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    <ContainerProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </ContainerProvider>
  </>
)
