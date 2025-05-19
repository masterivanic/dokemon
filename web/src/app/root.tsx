import { Outlet } from "react-router-dom"
import SideNav from "../components/side-nav/side-nav"
import { VERSION } from "@/lib/version"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { SideNavLeftBottom } from "@/components/side-nav/side-nav-left-bottom"
import { useState } from "react"
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline"

export default function Root() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <div>
        {/* Mobile sidebar toggle button */}
        <button
          type="button"
          className="lg:hidden fixed top-4 left-4 z-50 rounded-md bg-gray-900 p-2 text-gray-400 hover:text-white focus:outline-none"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 z-40 flex w-72 flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-0 dark:bg-gray-950">
            {/* Close button for mobile */}
            <div className="flex h-16 shrink-0 items-center">
              <button
                type="button"
                className="lg:hidden ml-2 mr-1 rounded-md p-2 text-gray-400 hover:text-white focus:outline-none"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
              
              <img
                className="ml-4 w-24"
                src="/assets/images/dokemon-dark-small.svg"
                alt="Dokémon"
              />
              <span className="ml-3 mr-5 pt-[3px] text-sm text-white">v{VERSION}</span>
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

        {/* Main content area */}
        <div className="lg:pl-72">
          <main className="py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
