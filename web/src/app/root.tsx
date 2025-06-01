import { Outlet } from "react-router-dom"
import SideNav from "../components/side-nav/side-nav"
import { VERSION } from "@/lib/version"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { SideNavLeftBottom } from "@/components/side-nav/side-nav-left-bottom"
import { useState } from "react"
import { Bars3Icon } from "@heroicons/react/24/outline"

export default function Root() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <div>
        {/* Mobile sidebar toggle button */}
        <button
          type="button"
          className="lg:hidden fixed top-4 left-4 z-50 rounded-md bg-gray-900 p-2 text-gray-400 hover:text-white focus:outline-none"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span className="sr-only">Toggle sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 z-40 flex w-72 flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-0 dark:bg-gray-950">
            <div className="flex h-16 shrink-0 items-center text-white">
              <img
                className="ml-9 w-24"
                src="/assets/images/dokemon-dark-small.png"
                alt="Dokémon"
              />
              <span className="ml-3 mr-5 pt-[3px] text-sm">v{VERSION}</span>
              <ModeToggle />
            </div>

            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <SideNav />
                </li>
                <li className="mt-auto pb-2">
                  <SideNavLeftBottom />
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content area with mobile padding adjustment */}
        <div className="lg:pl-72">
          <main className="py-10 lg:pt-10 pt-16"> {/* Added lg:pt-10 pt-16 for different padding on mobile */}
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
