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
import Loading from "@/components/widgets/loading"
import SpinnerIcon from "@/components/widgets/spinner-icon"
import apiBaseUrl from "@/lib/api-base-url"
import { cn, toastFailed, trimString } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useEffect, useMemo, useState } from "react"
import { SubmitHandler, useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { Eye, EyeOff } from "lucide-react"
import { VERSION } from "@/lib/version"

export default function Login() {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const { theme } = useTheme()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    async function setupComplete() {
      try {
        const response = await axios(`${apiBaseUrl()}/users/count`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (response.data.count === 0) {
          navigate("/setup")
        } else {
          setLoaded(true)
        }
      } catch (e) {
        if (axios.isAxiosError(e)) {
          toastFailed(e.response?.data.errors?.body)
        }
      }
    }
    setupComplete()
  }, [])

  const formSchema = z.object({
    userName: z.preprocess(
      trimString,
      z
        .string()
        .min(1, "Username is required")
        .max(20, "Username should not be over 20 characters in length")
    ),
    password: z.string().min(1, "Password is required"),
  })

  type FormSchemaType = z.infer<typeof formSchema>

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => {
      return { userName: "", password: "" }
    }, []),
  })

  const onSubmit: SubmitHandler<FormSchemaType> = async (data) => {
    setIsSaving(true)

    try {
      const response = await axios(`${apiBaseUrl()}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify(data),
      })

      if (response?.status === 204) {
        localStorage.setItem("userName", data.userName)
        navigate("/nodes")
      } else {
        toastFailed("Invalid username or password")
      }
    } catch (e) {
      if (axios.isAxiosError(e)) {
      }
    }

    setIsSaving(false)
  }

  if (!loaded) return <Loading />

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
            Sign In
          </h3>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <fieldset className={cn("group")} disabled={isSaving}>
                <div className="max-w-2xl pb-4">
                  <FormField
                    control={form.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="max-w-2xl pb-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                            />
                          </FormControl>
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
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
                    "flex w-full justify-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                  )}
                  disabled={isSaving}
                >
                  <SpinnerIcon />
                  <span className={cn("group-disabled:opacity-0")}>
                    Sign In
                  </span>
                </Button>
              </fieldset>
            </form>
          </Form>
        </div>
      </div>
      <center>
	<span className="ml-3 mr-5 pt-[3px] text-sm text-center">Version: {VERSION}</span>
      </center>
    </>
  )
}
