import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  REGEX_IDENTIFIER,
  REGEX_IDENTIFIER_MESSAGE,
  cn,
  hasUniqueName,
  toastSomethingWentWrong,
  toastSuccess,
  trimString,
} from "@/lib/utils"
import useEnvironments from "@/hooks/useEnvironments"
import apiBaseUrl from "@/lib/api-base-url"
import SpinnerIcon from "@/components/widgets/spinner-icon"

import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

export default function EnvironmentAddDialog() {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"add" | "import">("add")
  const [isParsing, setIsParsing] = useState(false)
  const [importedEnvs, setImportedEnvs] = useState<{ name: string, valid: boolean }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutateEnvironments } = useEnvironments()

  const getFormSchema = (mode: "add" | "import") => {
    if (mode === "add") {
      return z.object({
        name: z.preprocess(
          trimString,
          z
            .string()
            .min(1, "Name is required")
            .max(20)
            .regex(REGEX_IDENTIFIER, REGEX_IDENTIFIER_MESSAGE)
            .refine(
              async (value) =>
                hasUniqueName(
                  `${apiBaseUrl()}/environments/uniquename?value=${value}`
                ),
              "Another environment with this name already exists"
            )
        ),
        envFile: z.string().optional(),
      });
    } else {
      return z.object({
        name: z.string().optional(),
        envFile: z.string().min(1, "Please upload a valid .env file"),
      });
    }
  };

  const formSchema = getFormSchema(activeTab);
  type FormSchemaType = z.infer<typeof formSchema>

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      envFile: ""
    },
  })

  const handleCloseForm = () => {
    setOpen(false)
    setActiveTab("add")
    setImportedEnvs([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    form.reset()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      form.setValue("envFile", content)
      parseEnvFile(content)
      setIsParsing(false)
    }
    reader.onerror = () => {
      toastSomethingWentWrong("Failed to read file")
      setIsParsing(false)
    }
    reader.readAsText(file)
  }

  const parseEnvFile = (content: string) => {
    const lines = content.split('\n');
    const envs: { name: string, valid: boolean }[] = [];

    lines.forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const name = line.split('=')[0]?.trim();
        if (name) {
          const isValid = REGEX_IDENTIFIER.test(name) && name.length <= 20;
          envs.push({ name, valid: isValid });
        }
      }
    });
    setImportedEnvs(envs);
  };

  const onSubmit: SubmitHandler<FormSchemaType> = async (data) => {
    setIsSaving(true);

    try {
      if (activeTab === "add") {
        const response = await fetch(`${apiBaseUrl()}/environments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.name }),
        });

        if (!response.ok) throw new Error("Failed to create environment");

        mutateEnvironments();
        toastSuccess("New environment has been added.");
      } else {
        if (importedEnvs.length === 0) {
          toastSomethingWentWrong("No environments found to import");
          setIsSaving(false);
          return;
        }

        const validEnvs = importedEnvs.filter(env => env.valid);
        const invalidEnvs = importedEnvs.filter(env => !env.valid);

        if (validEnvs.length === 0) {
          toastSomethingWentWrong("No valid environments to import");
          setIsSaving(false);
          return;
        }

        if (invalidEnvs.length > 0) {
          toastSomethingWentWrong(
            `Skipping invalid environment names: ${invalidEnvs.map(e => e.name).join(', ')}`
          );
        }
        const creationPromises = validEnvs.map(env =>
          fetch(`${apiBaseUrl()}/environments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: env.name }),
          })
        );

        const results = await Promise.all(creationPromises);
        const allSuccessful = results.every(result => result.ok);

        if (!allSuccessful) {
          throw new Error("Some environments failed to create");
        }

        mutateEnvironments();
        toastSuccess(`Successfully imported ${validEnvs.length} environments.`);
      }
    } catch (error) {
      console.error("Environment creation error:", error);
      toastSomethingWentWrong(
        error instanceof Error ? error.message : "Failed to create environments"
      );
    } finally {
      setIsSaving(false);
      handleCloseForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex gap-2">
        <DialogTrigger asChild>
          <Button onClick={() => {
            setActiveTab("add");
            setImportedEnvs([]);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }}>Add Environment</Button>
        </DialogTrigger>
        <DialogTrigger asChild>
          <Button onClick={() => {
            setActiveTab("import");
            form.reset({ name: "", envFile: "" });
          }}>
            Import Environments
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <fieldset className={cn("group")} disabled={isSaving}>
              <DialogHeader>
                <DialogTitle>
                  {activeTab === "add" ? "Add Environment" : "Import Environments"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4 group-disabled:opacity-50">
                {activeTab === "add" ? (
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <>
                    <div className="space-y-2">
                      <FormLabel>Upload .env file</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept=".env"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="cursor-pointer"
                          disabled={isParsing}
                        />
                      </FormControl>

                      {isParsing && <p className="text-sm text-muted-foreground">Parsing file...</p>}
                      <p className="text-sm text-muted-foreground">
                        Environment names will be extracted from variable names
                      </p>
                    </div>

                    {form.watch("envFile") && (
                      <div className="space-y-2">
                        <FormLabel>Preview</FormLabel>
                        <Textarea
                          value={form.watch("envFile")}
                          readOnly
                          rows={5}
                          className="font-mono text-sm"
                        />
                      </div>
                    )}

                    {importedEnvs.length > 0 && (
                      <div className="space-y-2">
                        <FormLabel>Environments to create</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {importedEnvs.map((env, index) => (
                            <Badge
                              key={index}
                              variant={env.valid ? "default" : "destructive"}
                            >
                              {env.name}
                            </Badge>
                          ))}
                        </div>
                        {importedEnvs.some(env => !env.valid) && (
                          <p className="text-sm text-destructive">
                            Some environment names are invalid
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  className={cn(
                    "relative w-24",
                    isSaving && "opacity-50 pointer-events-none"
                  )}
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <SpinnerIcon />
                      {activeTab === "add" ? "Saving..." : "Importing..."}
                    </>
                  ) : (
                    activeTab === "add" ? "Save" : "Import"
                  )}
                </Button>
                <Button
                  type="button"
                  className="w-24"
                  variant={"secondary"}
                  onClick={handleCloseForm}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
