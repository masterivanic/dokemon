import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useTheme } from "@/components/ui/theme-provider"
import SpinnerIcon from "@/components/widgets/spinner-icon"
import apiBaseUrl from "@/lib/api-base-url"
import { cn, toastFailed, trimString } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useMemo, useState } from "react"
import { SubmitHandler, useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { Eye, EyeOff } from "lucide-react"

export default function ChangePassword() {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const { theme } = useTheme()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const formSchema = z.object({
    currentPassword: z.preprocess(trimString, z.string()),
    newPassword: z.preprocess(
      trimString,
      z.string().min(8, "Should be at least 8 characters long")
    ),
  })

  type FormSchemaType = z.infer<typeof formSchema>

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => {
      return { currentPassword: "", newPassword: "" }
    }, []),
  })

  const onSubmit: SubmitHandler<FormSchemaType> = async (data) => {
    setIsSaving(true)

    try {
      const response = await axios(`${apiBaseUrl()}/changepassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify(data),
      })

      if (response?.status === 204) {
        navigate("/nodes")
      } else {
        toastFailed("Password update failed")
      }
    } catch (e) {
      if (axios.isAxiosError(e)) {
        toastFailed(e.response?.data)
      }
    }

    setIsSaving(false)
  }

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            <img
              className="mx-auto"
              src={`/assets/images/${
                theme === "light"
                  ? "dokemon-light.png"
                  : "dokemon-dark-small.png"
              }`}
              alt="Dokémon"
            />
          </h2>
          <h3 className="mt-10 text-center text-xl font-bold leading-9 tracking-tight text-foreground">
            Change Password
          </h3>
        </div>

        <div className="mt-10  sm:mx-auto sm:w-full sm:max-w-sm sm:rounded-xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <fieldset className={cn("group")} disabled={isSaving}>
                <div className="max-w-2xl pb-4">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              autoFocus
                              {...field}
                              type={showCurrentPassword ? "text" : "password"}
                            />
                          </FormControl>
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="max-w-2xl pb-4">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              {...field}
                              type={showNewPassword ? "text" : "password"}
                            />
                          </FormControl>
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className={cn(
                    "mb-3 flex w-full justify-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                  )}
                  disabled={isSaving}
                >
                  <SpinnerIcon />
                  <span className={cn("group-disabled:opacity-0")}>
                    Change Password
                  </span>
                </Button>
                <Button
                  variant={"secondary"}
                  type="button"
                  className={cn(
                    "flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  )}
                  disabled={isSaving}
                  onClick={() => navigate("/nodes")}
                >
                  <SpinnerIcon />
                  <span className={cn("group-disabled:opacity-0")}>Cancel</span>
                </Button>
              </fieldset>
            </form>
          </Form>
        </div>
      </div>
    </>
  )
}
