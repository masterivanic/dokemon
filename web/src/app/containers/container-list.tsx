import { PlayIcon, StopIcon, ArrowPathIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { Terminal, ScrollText, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Loading from "@/components/widgets/loading";
import {
  Breadcrumb,
  BreadcrumbCurrent,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/widgets/breadcrumb";
import useContainers from "@/hooks/useContainers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiBaseUrl from "@/lib/api-base-url";
import { IContainer, IPort } from "@/lib/api-models";
import { useState } from "react";
import TopBar from "@/components/widgets/top-bar";
import TopBarActions from "@/components/widgets/top-bar-actions";
import MainArea from "@/components/widgets/main-area";
import MainContent from "@/components/widgets/main-content";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import useNodeHead from "@/hooks/useNodeHead";
import EditContainerBaseUrlDialog from "../nodes/containerbaseurl-edit-dialog";
import {
  cn,
  toastFailed,
  toastSuccess,
} from "@/lib/utils";
import TableButtonDelete from "@/components/widgets/table-button-delete";
import { TableNoData } from "@/components/widgets/table-no-data";
import DeleteDialog from "@/components/delete-dialog";
import { Input } from "@/components/ui/input";
import { useFilterAndSort } from "@/lib/useFilterAndSort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/lib/pagination"

export default function ContainerList() {
  const { nodeId } = useParams();
  const { nodeHead } = useNodeHead(nodeId!);
  const navigate = useNavigate();
  const { isLoading, mutateContainers, containers } = useContainers(nodeId!);
  const [container, setContainer] = useState<IContainer | null>(null);
  const [deleteContainerConfirmationOpen, setDeleteContainerConfirmationOpen] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedContainers = [],
    requestSort,
    sortConfig
  } = useFilterAndSort<IContainer>(containers?.items || [], {
    initialSortKey: "name",
    initialSortDirection: "asc",
    filterKeys: ['name', 'image', 'state', 'id'] as (keyof IContainer)[]
  });

  const [paginationConfig, paginationFunctions, paginatedContainers] = usePagination(
    sortedContainers,
    10
  );

  if (isLoading) return <Loading />;

  const handleStartContainer = async (id: string) => {
    try {
      await axios(`${apiBaseUrl()}/nodes/${nodeId}/containers/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ id: id }),
      });

      mutateContainers();
      toastSuccess("Container started.");
    } catch (e) {
      if (axios.isAxiosError(e)) {
        toastFailed(e.response?.data);
      }
    }
  };

  const handleStopContainer = async (id: string) => {
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/containers/stop`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id }),
      }
    );
    if (!response.ok) {
      const r = await response.json();
      toastFailed(r.errors?.body);
    } else {
      mutateContainers();
      toastSuccess("Container stopped.");
    }
  };

  const handleRestartContainer = async (id: string) => {
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/containers/restart`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id }),
      }
    );
    if (!response.ok) {
      const r = await response.json();
      toastFailed(r.errors?.body);
    } else {
      mutateContainers();
      toastSuccess("Container restarted.");
    }
  };

  const handleDeleteContainerConfirmation = (container: IContainer) => {
    setContainer({ ...container });
    setDeleteContainerConfirmationOpen(true);
  };

  const handleDeleteContainer = async () => {
    setDeleteInProgress(true);

    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/containers/remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: container?.id, force: true }),
      }
    );
    if (!response.ok) {
      const r = await response.json();
      setDeleteContainerConfirmationOpen(false);
      toastFailed(r.errors?.body);
    } else {
      mutateContainers();
      setTimeout(() => {
        setDeleteContainerConfirmationOpen(false);
        toastSuccess("Container deleted.");
      }, 500);
    }
    setDeleteInProgress(false);
  };

  function getPortsHtml(ports: IPort[]) {
    const arr = ports.map((p, i) => {
      let ret = "";

      if (p.ip) ret += `${p.ip}:`;
      if (p.publicPort) ret += `${p.publicPort}->`;
      if (p.privatePort) ret += `${p.privatePort}`;
      if (p.type) ret += `/${p.type}`;

      let baseUrl = nodeHead?.containerBaseUrl;
      if (p.ip === "0.0.0.0" || p.ip == "::") {
        if (!baseUrl) {
          baseUrl = `${location.protocol}//${location.hostname}`;
        }
      } else {
        baseUrl = `${location.protocol}//${p.ip}`;
      }

      const url = `${baseUrl}:${p.publicPort}`;

      return (
        <div key={i}>
          {p.publicPort ? (
            <a
              className="inline-block p-1 text-amber-600 hover:underline hover:underline-offset-2"
              target="_blank"
              href={url}
              onClick={(e) => e.stopPropagation()}
            >
              {ret}
              <ArrowUpRight className="ml-1 inline w-4" />
            </a>
          ) : (
            <span>{ret}</span>
          )}
          <br />
        </div>
      );
    });
    return arr;
  }

  return (
    <MainArea>
      {deleteContainerConfirmationOpen && (
        <DeleteDialog
          openState={deleteContainerConfirmationOpen}
          setOpenState={setDeleteContainerConfirmationOpen}
          deleteCaption=""
          deleteHandler={handleDeleteContainer}
          isProcessing={deleteInProgress}
          title="Delete Container"
          message={`Are you sure you want to delete container '${container?.name}?'`}
        />
      )}
      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{nodeHead?.name}</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Containers</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <EditContainerBaseUrlDialog />
        </TopBarActions>
      </TopBar>
      <MainContent>
        <div className="mb-4 flex items-center justify-end">
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              className="pl-10"
              placeholder="Search containers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setSearchTerm('')}
              >
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("state")}
              >
                <div className="flex items-center">
                  State
                  {sortConfig.key === "state" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("name")}
              >
                <div className="flex items-center">
                  Name
                  {sortConfig.key === "name" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">Image</TableHead>
              <TableHead scope="col">Ports</TableHead>
              <TableHead scope="col">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedContainers.length === 0 ? (
              <TableNoData colSpan={5} />
            ) : (
              paginatedContainers.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.state == "exited" ? (
                      <Badge variant="destructive" title={item.status}>
                        {item.state}
                      </Badge>
                    ) : (
                      <Badge variant="default" title={item.status}>
                        {item.state}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      className="font-bold hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/nodes/${nodeId}/containers/${item.name}/logs`);
                      }}
                      title={`View logs for ${item.name}`}
                    >
                      {item.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <StaleStatusIcon status={item.stale} />
                    {item.image.startsWith("sha256:")
                      ? item.image.replace("sha256:", "").slice(0, 10)
                      : item.image}
                  </TableCell>
                  <TableCell>{getPortsHtml(item.ports)}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1">
                      {item.state === "running" ? (
                        <>
                          <button
                            className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Terminal"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/nodes/${nodeId}/containers/${item.name}/terminal`);
                            }}
                          >
                            <Terminal className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Logs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/nodes/${nodeId}/containers/${item.name}/logs`);
                            }}
                          >
                            <ScrollText className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 rounded text-amber-500 dark:text-amber-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Restart"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestartContainer(item.id);
                            }}
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 rounded text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Stop"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopContainer(item.id);
                            }}
                          >
                            <StopIcon className="w-4 h-4" />
                          </button>
                          <div className="inline-flex text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                            <TableButtonDelete
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContainerConfirmation(item);
                              }}
                            />
                          </div>
                        </>
                      ) : item.state === "exited" ? (
                        <>
                          <button
                            className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Logs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/nodes/${nodeId}/containers/${item.name}/logs`);
                            }}
                          >
                            <ScrollText className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 rounded text-green-600 dark:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Start"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartContainer(item.id);
                            }}
                          >
                            <PlayIcon className="w-4 h-4" />
                          </button>
                          <div className="inline-flex text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                            <TableButtonDelete
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContainerConfirmation(item);
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <button
                            className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Logs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/nodes/${nodeId}/containers/${item.name}/logs`);
                            }}
                          >
                            <ScrollText className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 rounded text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Stop"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopContainer(item.id);
                            }}
                          >
                            <StopIcon className="w-4 h-4" />
                          </button>
                          <div className="inline-flex text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                            <TableButtonDelete
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContainerConfirmation(item);
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(paginationConfig.currentPage - 1) * paginationConfig.pageSize + 1}-
              {Math.min(paginationConfig.currentPage * paginationConfig.pageSize, paginationConfig.totalItems)} of {paginationConfig.totalItems} items
            </span>
            <Select
             value={paginationConfig.pageSize.toString()}
              onValueChange={(value) => paginationFunctions.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={paginationConfig.pageSize} />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={paginationFunctions.goToFirstPage}
              disabled={paginationConfig.currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={paginationFunctions.prevPage}
              disabled={paginationConfig.currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page number buttons - show up to 5 pages around current */}
            {Array.from({ length: Math.min(5, paginationConfig.totalPages) }, (_, i) => {
              let pageNum
              if (paginationConfig.totalPages <= 5) {
                pageNum = i + 1
              } else if (paginationConfig.currentPage <= 3) {
                pageNum = i + 1
              } else if (paginationConfig.currentPage >= paginationConfig.totalPages - 2) {
                pageNum = paginationConfig.totalPages - 4 + i
              } else {
                pageNum = paginationConfig.currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={paginationConfig.currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => paginationFunctions.goToPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={paginationFunctions.nextPage}
              disabled={paginationConfig.currentPage === paginationConfig.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={paginationFunctions.goToLastPage}
              disabled={paginationConfig.currentPage === paginationConfig.totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      </MainContent>
    </MainArea>
  );
}

export function StaleStatusIcon({ status }: { status: string }) {
  let statusClassName = "";
  let title = "";

  switch (status) {
    case "no":
      statusClassName = "text-green-600";
      title = "Image(s) up-to-date";
      break;
    case "yes":
      statusClassName = "text-red-500";
      title = "New image available";
      break;
    case "error":
      statusClassName = "text-slate-300";
      title = "Unable to check if image is up-to-date";
      break;
    case "processing":
      statusClassName = "text-amber-300";
      title = "Image staleness check pending. It might take an hour to update.";
      break;
  }

  return (
    <span className={cn("-ml-2 mr-3 text-lg", statusClassName)} title={title}>
      ●
    </span>
  );
}
