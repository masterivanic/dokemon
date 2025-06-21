import {
  ArchiveBoxIcon,
  LifebuoyIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  BugAntIcon
} from "@heroicons/react/24/outline"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { useNavigate } from "react-router-dom"
import apiBaseUrl from "@/lib/api-base-url"
import axios from "axios"
import { cn, toastFailed } from "@/lib/utils"

export function SideNavLeftBottom() {
  const navigate = useNavigate()

  async function handleSignout() {
    try {
      await axios(`${apiBaseUrl()}/users/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      navigate("/login")
    } catch (e) {
      if (axios.isAxiosError(e)) {
        toastFailed(e.response?.data.errors?.body)
      }
    }
  }

  return (
    <ul role="list" className="-mx-2 space-y-1">
      <li>
        <a
          href="https://github.com/dokemon-ng"
          target="_blank"
          className={cn(
            "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-200 hover:bg-gray-800 hover:text-white"
          )}
        >
          <ArchiveBoxIcon
            className="h-6 w-6 shrink-0 text-gray-400"
            aria-hidden="true"
          />
          Our GitHub
        </a>
      </li>
      <li>
        <a
          href="https://github.com/dokemon-ng/dokemon/issues/new"
          target="_blank"
          className={cn(
            "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white"
          )}
        >
          <ExclamationTriangleIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          Report Issue
        </a>
      </li>
      <li>
        <a
          href="https://github.com/dokemon-ng/dokemon/issues"
          target="_blank"
          className={cn(
            "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white"
          )}
        >
          <BugAntIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          Open Issues
        </a>
      </li>
      <li>
        <a
          href="https://discord.gg/Nfevu4gJVG"
          target="_blank"
          className={cn(
            "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white"
          )}
        >
          <LifebuoyIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          Discord Support
        </a>
      </li>
      <li>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <a
              href="#"
              className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:text-white focus:outline-none"
            >
              <UserCircleIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
              {localStorage.getItem("userName")}
            </a>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem
              onClick={() => {
                navigate("/changepassword")
              }}
            >
              Change Password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignout}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    </ul>
  )
}
