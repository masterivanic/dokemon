import { useNavigate, useParams } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbCurrent,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/widgets/breadcrumb";
import apiBaseUrl from "@/lib/api-base-url";
import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/widgets/top-bar";
import TopBarActions from "@/components/widgets/top-bar-actions";
import MainArea from "@/components/widgets/main-area";
import MainContent from "@/components/widgets/main-content";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import {
  REGEX_IDENTIFIER,
  REGEX_IDENTIFIER_MESSAGE,
  cn,
  hasUniqueName,
  initMonaco,
  toastFailed,
  toastSuccess,
} from "@/lib/utils";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  MainContainer,
  Section,
  SectionBody,
} from "@/components/widgets/main-container";
import Editor, { OnMount } from "@monaco-editor/react";
import type monaco from "monaco-editor";
import { Input } from "@/components/ui/input";
import useFileSystemComposeLibraryItem from "@/hooks/useFileSystemComposeLibraryItem";
import useComposeLibraryItemList from "@/hooks/useComposeLibraryItemList";
import { useTheme } from "@/components/ui/theme-provider";
import DeleteDialog from "@/components/delete-dialog";
import { parse, stringify } from "yaml";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export default function ComposeLibraryEditFileSystemProject() {
  const { composeProjectName } = useParams();
  const {
    fileSystemComposeLibraryItem: composeLibraryItem,
    isLoading,
    mutateFileSystemComposeLibraryItem,
  } = useFileSystemComposeLibraryItem(composeProjectName!);
  const { mutateComposeLibraryItemList } = useComposeLibraryItemList();
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const [editorMounted, setEditorMounted] = useState(1);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("yaml");
  const [composeData, setComposeData] = useState<any>(null);

  initMonaco();

  const formSchema = z.object({
    newProjectName: z
      .string()
      .min(1, "Name is required")
      .max(20)
      .regex(REGEX_IDENTIFIER, REGEX_IDENTIFIER_MESSAGE)
      .refine(
        async (value) =>
          hasUniqueName(
            `${apiBaseUrl()}/composelibrary/uniquenameexcludeitself?newvalue=${value}&currentvalue=${composeLibraryItem?.projectName}`
          ),
        "Another project with this name already exists"
      ),
    definition: z.string().optional(),
  });

  type FormSchemaType = z.infer<typeof formSchema>;

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => {
      if (!composeLibraryItem || !composeLibraryItem.projectName)
        return { newProjectName: "", definition: "" };

      try {
        const parsed = parse(composeLibraryItem.definition || "{}");
        setComposeData(parsed);
      } catch (e) {
        console.error("Failed to parse YAML", e);
        setComposeData({});
      }

      if (editorRef.current) {
        editorRef.current.setValue(composeLibraryItem.definition || "");
      }

      return {
        newProjectName: composeLibraryItem.projectName,
        definition: composeLibraryItem.definition,
      };
    }, [composeLibraryItem]),
  });

  useEffect(() => {
    if (!isLoading && composeLibraryItem) {
      form.reset({
        newProjectName: composeLibraryItem.projectName,
        definition: composeLibraryItem.definition,
      });

      try {
        const parsed = parse(composeLibraryItem.definition || "{}");
        setComposeData(parsed);
      } catch (e) {
        console.error("Failed to parse YAML", e);
        setComposeData({});
      }

      if (editorRef.current) {
        editorRef.current.setValue(composeLibraryItem.definition || "");
      }
    }
  }, [composeLibraryItem, isLoading, form]);

  const onSubmit: SubmitHandler<FormSchemaType> = async (data) => {
    data.definition = activeTab === "form" 
      ? stringify(composeData || {})
      : editorRef.current?.getValue() || "";
      
    setIsSaving(true);
    try {
      const response = await fetch(
        `${apiBaseUrl()}/composelibrary/filesystem/${composeProjectName}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to save");
      }
      mutateFileSystemComposeLibraryItem();
      mutateComposeLibraryItemList();
      toastSuccess("Definition has been saved.");
      navigate(`/composelibrary/filesystem/${data.newProjectName}/edit`);
    } catch (error) {
      toastFailed("There was a problem when saving the definition. Try again!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditorDidMount: OnMount = (editor, _monaco) => {
    editorRef.current = editor;
    setEditorMounted(editorMounted + 1);
    if (composeLibraryItem?.definition) {
      editor.setValue(composeLibraryItem.definition);
    }
  };

  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const handleDelete = async () => {
    setDeleteInProgress(true);
    try {
      const response = await fetch(
        `${apiBaseUrl()}/composelibrary/filesystem/${composeProjectName}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        const r = await response.json();
        throw new Error(r.errors?.body || "Failed to delete");
      }
      mutateComposeLibraryItemList();
      toastSuccess("Compose project deleted.");
      navigate("/composelibrary");
    } catch (error) {
      toastFailed(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setDeleteInProgress(false);
    }
  };

  const handleFormDataChange = (newData: any) => {
    setComposeData(newData);
  };

  if (isLoading || !composeLibraryItem) {
    return (
      <MainArea>
        <TopBar>
          <Breadcrumb>
            <BreadcrumbLink to="/composelibrary">Compose Library</BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbCurrent>Loading...</BreadcrumbCurrent>
          </Breadcrumb>
        </TopBar>
        <MainContent>
          <MainContainer>
            <Section>
              <SectionBody>
                <div className="space-y-4">
                  <div className="h-10 w-[200px] bg-gray-200 rounded animate-pulse" />
                  <div className="h-[50vh] w-full bg-gray-200 rounded animate-pulse" />
                </div>
              </SectionBody>
            </Section>
          </MainContainer>
        </MainContent>
      </MainArea>
    );
  }

  const DockerServiceForm = ({ data, onChange }: { data: any; onChange: (data: any) => void }) => {
    const [services, setServices] = useState<any[]>([]);
    const [selectedService, setSelectedService] = useState<string | null>(null);

    useEffect(() => {
      if (data?.services) {
        const serviceEntries = Object.entries(data.services).map(([name, config]) => ({
          name,
          ...(config as object)
        }));
        setServices(serviceEntries);
        if (serviceEntries.length > 0 && !selectedService) {
          setSelectedService(serviceEntries[0].name);
        }
      } else {
        setServices([]);
        setSelectedService(null);
      }
    }, [data]);

    const currentService = services.find(s => s.name === selectedService) || {};

    const handleServiceChange = (field: string, value: any) => {
      const updated = services.map(s => 
        s.name === selectedService ? { ...s, [field]: value } : s
      );
      setServices(updated);
      updateComposeData(updated);
    };

    const updateComposeData = (servicesList: any[]) => {
      const newData = {
        ...data,
        services: servicesList.reduce((acc, service) => {
          const { name, ...config } = service;
          acc[name] = config;
          return acc;
        }, {})
      };
      onChange(newData);
    };

    const addNewService = () => {
      const newService = {
        name: `service-${services.length + 1}`,
        image: "",
        ports: [],
        environment: [],
        volumes: []
      };
      const updatedServices = [...services, newService];
      setServices(updatedServices);
      setSelectedService(newService.name);
      updateComposeData(updatedServices);
    };

    const removeService = (name: string) => {
      const updated = services.filter(s => s.name !== name);
      setServices(updated);
      updateComposeData(updated);
      if (selectedService === name) {
        setSelectedService(updated[0]?.name || null);
      }
    };

    const addPort = () => {
      handleServiceChange("ports", [...(currentService.ports || []), ""]);
    };

    const removePort = (index: number) => {
      handleServiceChange("ports", (currentService.ports || []).filter((_: any, i: number) => i !== index));
    };

    const addEnvironment = () => {
      handleServiceChange("environment", [...(currentService.environment || []), ""]);
    };

    const removeEnvironment = (index: number) => {
      handleServiceChange("environment", (currentService.environment || []).filter((_: any, i: number) => i !== index));
    };

    const addVolume = () => {
      handleServiceChange("volumes", [...(currentService.volumes || []), ""]);
    };

    const removeVolume = (index: number) => {
      handleServiceChange("volumes", (currentService.volumes || []).filter((_: any, i: number) => i !== index));
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[50vh] overflow-y-auto">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {services.map(service => (
                <div 
                  key={service.name} 
                  className={`p-2 rounded cursor-pointer ${selectedService === service.name ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                  onClick={() => setSelectedService(service.name)}
                >
                  <div className="flex justify-between items-center">
                    <span>{service.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeService(service.name);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2" onClick={addNewService}>
                <Plus className="h-4 w-4 mr-2" /> Add Service
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedService ? (
          <div className="col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{currentService.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Image</FormLabel>
                  <Input
                    value={currentService.image || ""}
                    onChange={(e) => handleServiceChange("image", e.target.value)}
                    placeholder="e.g. nginx:latest"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <FormLabel>Ports</FormLabel>
                    <Button variant="ghost" size="sm" onClick={addPort}>
                      <Plus className="h-4 w-4 mr-2" /> Add Port
                    </Button>
                  </div>
                  {(currentService.ports || []).map((port: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={port}
                        onChange={(e) => {
                          const newPorts = [...(currentService.ports || [])];
                          newPorts[index] = e.target.value;
                          handleServiceChange("ports", newPorts);
                        }}
                        placeholder="e.g. 8080:80"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removePort(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <FormLabel>Environment Variables</FormLabel>
                    <Button variant="ghost" size="sm" onClick={addEnvironment}>
                      <Plus className="h-4 w-4 mr-2" /> Add Variable
                    </Button>
                  </div>
                  {(currentService.environment || []).map((env: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={env}
                        onChange={(e) => {
                          const newEnv = [...(currentService.environment || [])];
                          newEnv[index] = e.target.value;
                          handleServiceChange("environment", newEnv);
                        }}
                        placeholder="e.g. KEY=value"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeEnvironment(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <FormLabel>Volumes</FormLabel>
                    <Button variant="ghost" size="sm" onClick={addVolume}>
                      <Plus className="h-4 w-4 mr-2" /> Add Volume
                    </Button>
                  </div>
                  {(currentService.volumes || []).map((volume: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={volume}
                        onChange={(e) => {
                          const newVolumes = [...(currentService.volumes || [])];
                          newVolumes[index] = e.target.value;
                          handleServiceChange("volumes", newVolumes);
                        }}
                        placeholder="e.g. ./data:/data"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeVolume(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="col-span-2 flex items-center justify-center">
            <p className="text-muted-foreground">No service selected or available</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <MainArea>
      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/composelibrary">Compose Library</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{composeProjectName}</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Edit</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions></TopBarActions>
      </TopBar>
      <div className="-mb-8 pt-4">
        <Button
          className="mb-4 mr-2 w-24"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <DeleteDialog
          deleteCaption="Delete"
          title="Delete Compose Project"
          message={`Are you sure you want to delete project '${composeProjectName}'?`}
          deleteHandler={handleDelete}
          isProcessing={deleteInProgress}
        />
      </div>
      <MainContent>
        <MainContainer>
          <Section>
            <SectionBody>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <fieldset className={cn("group")} disabled={isSaving}>
                    <div className="max-w-2xl pb-4">
                      <FormField
                        control={form.control}
                        name="newProjectName"
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
                    </div>
                    <div>
                      <FormLabel className="block pb-4">Definition</FormLabel>
                      <div className="flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground mb-4">
                        <button
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                            activeTab === "yaml" ? 'bg-background text-foreground shadow' : 'hover:bg-background/50'
                          }`}
                          onClick={() => setActiveTab("yaml")}
                        >
                          YAML Editor
                        </button>
                        <button
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                            activeTab === "form" ? 'bg-background text-foreground shadow' : 'hover:bg-background/50'
                          }`}
                          onClick={() => setActiveTab("form")}
                        >
                          Form Editor
                        </button>
                      </div>
                      {activeTab === "yaml" ? (
                        <div className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          <Editor
                            theme={theme}
                            height="50vh"
                            defaultLanguage="yaml"
                            defaultValue={composeLibraryItem?.definition || ""}
                            options={{ minimap: { enabled: false } }}
                            onMount={handleEditorDidMount}
                          />
                        </div>
                      ) : (
                        <div className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          {composeData ? (
                            <DockerServiceForm 
                              data={composeData} 
                              onChange={handleFormDataChange} 
                            />
                          ) : (
                            <div className="h-[50vh] flex items-center justify-center">
                              <p className="text-muted-foreground">Loading compose data...</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </fieldset>
                </form>
              </Form>
            </SectionBody>
          </Section>
        </MainContainer>
      </MainContent>
    </MainArea>
  );
}