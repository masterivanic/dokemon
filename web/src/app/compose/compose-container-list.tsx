import {
  Breadcrumb,
  BreadcrumbCurrent,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/widgets/breadcrumb"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import { useParams, useNavigate } from "react-router-dom"
import useNodeComposeContainers from "@/hooks/useNodeComposeContainers"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  INodeComposeContainer,
  INodeHead,
  IPageResponse,
} from "@/lib/api-models"
import Loading from "@/components/widgets/loading"
import { getContainerUrlFromPortMapping } from "@/lib/utils"
import useNodeHead from "@/hooks/useNodeHead"
import useNodeComposeItem from "@/hooks/useNodeComposeItem"
import { ArrowUpRight } from "lucide-react"
import EditContainerBaseUrlDialog from "@/app/nodes/containerbaseurl-edit-dialog"
import { TableNoData } from "@/components/widgets/table-no-data"
import { StaleStatusIcon } from "../containers/container-list"
import { Badge } from "@/components/ui/badge"

export default function ComposeContainerList() {
  const { nodeId, composeProjectId } = useParams()
  const { nodeHead } = useNodeHead(nodeId!)
  const { nodeComposeItem } = useNodeComposeItem(nodeId!, composeProjectId!)
  const { isLoading, composeContainers } = useNodeComposeContainers(
    nodeId!,
    composeProjectId!
  )

  if (isLoading) return <Loading />

  return (
    <MainArea>
      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{nodeHead?.name}</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbLink to={`/nodes/${nodeId}/compose`}>
            Compose
          </BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>
            {nodeComposeItem?.projectName}{" "}
            {nodeComposeItem?.status?.startsWith("running")
              ? "(Running)"
              : "(Not running)"}
          </BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Containers</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <EditContainerBaseUrlDialog />
        </TopBarActions>
      </TopBar>
      <MainContent>
        <ContainersTable
          composeContainers={composeContainers!}
          nodeHead={nodeHead!}
        />
      </MainContent>
    </MainArea>
  )
}

function ContainersTable({
  composeContainers,
  nodeHead,
}: {
  composeContainers: IPageResponse<INodeComposeContainer>
  nodeHead: INodeHead
}) {
  const { nodeId, composeProjectId } = useParams()
  const navigate = useNavigate()
  const { mutateComposeContainers } = useNodeComposeContainers(
    nodeId!,
    composeProjectId!
  )

  function getPortsHtml(ports: string) {
    const arr = ports.split(", ").map((p, i) => {
      let url: string | null = ""
      try {
        url = getContainerUrlFromPortMapping(p, nodeHead?.containerBaseUrl)
      } catch (e) {
        console.log(e)
      }
      return (
        <div key={i}>
          {url ? (
            <a
              className="inline-block p-1 text-amber-600 hover:underline hover:underline-offset-2"
              target="_blank"
              href={url}
              onClick={(e) => e.stopPropagation()}
            >
              {p}
              <ArrowUpRight className="ml-1 inline w-4" />
            </a>
          ) : (
            <span>{p}</span>
          )}
          <br />
        </div>
      )
    })
    return arr
  }

  const handleLogs = (name: string) => {
    navigate(`/nodes/${nodeId}/containers/${name}/logs`)
  }
  const handleTerminal = (name: string) => {
    navigate(`/nodes/${nodeId}/containers/${name}/terminal`)
  }

  async function handleStart(id: string) {
    await fetch(`/api/nodes/${nodeId}/compose/${composeProjectId}/containers/${id}/start`, {
      method: "POST",
    })
    mutateComposeContainers()
  }
  async function handleStop(id: string) {
    await fetch(`/api/nodes/${nodeId}/compose/${composeProjectId}/containers/${id}/stop`, {
      method: "POST",
    })
    mutateComposeContainers()
  }
  async function handleRestart(id: string) {
    await fetch(`/api/nodes/${nodeId}/compose/${composeProjectId}/containers/${id}/restart`, {
      method: "POST",
    })
    mutateComposeContainers()
  }
  async function handleDelete(item: INodeComposeContainer) {
    if (!window.confirm(`Delete container ${item.name}?`)) return
    await fetch(`/api/nodes/${nodeId}/compose/${composeProjectId}/containers/${item.id}`, {
      method: "DELETE",
    })
    mutateComposeContainers()
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">State</TableHead>
          <TableHead scope="col">Name</TableHead>
          <TableHead scope="col">Image</TableHead>
          <TableHead scope="col">Ports</TableHead>
          <TableHead scope="col">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!composeContainers?.items && <TableNoData colSpan={5} />}
        {composeContainers?.items &&
          composeContainers?.items.map((item) => (
            <TableRow key={item.name}>
              <TableCell>
                {item.state == "exited" ? (
                  <Badge title={item.status}>{item.state}</Badge>
                ) : (
                  <Badge title={item.status}>{item.state}</Badge>
                )}
              </TableCell>
              <TableCell>
                <button
                  className="font-bold hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLogs(item.name)
                  }}
                  title={`View logs for ${item.name}`}
                >
                  {item.name}
                </button>
                <br />
                <span className="ml-4 text-xs">{item.id.substring(0, 12)}</span>
              </TableCell>
              <TableCell>
                <StaleStatusIcon status={item.stale} />
                {item.image}
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
                          e.stopPropagation()
                          handleTerminal(item.name)
                        }}
                      >
                        <span className="sr-only">Terminal</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 9l4-4 4 4M12 5v14" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Logs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLogs(item.name)
                        }}
                      >
                        <span className="sr-only">Logs</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded text-amber-500 dark:text-amber-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Restart"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestart(item.id)
                        }}
                      >
                        <span className="sr-only">Restart</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M4 4v5h.582M19.418 19.418A9 9 0 116.582 6.582" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Stop"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStop(item.id)
                        }}
                      >
                        <span className="sr-only">Stop</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item)
                        }}
                      >
                        <span className="sr-only">Delete</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : item.state === "exited" ? (
                    <>
                      <button
                        className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Logs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLogs(item.name)
                        }}
                      >
                        <span className="sr-only">Logs</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded text-green-600 dark:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Start"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStart(item.id)
                        }}
                      >
                        <span className="sr-only">Start</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 3v4a1 1 0 001 1h3m10 10v4a1 1 0 01-1 1h-3m-4-4v4a1 1 0 001 1h3m-10-10V5a1 1 0 011-1h3m4 4V5a1 1 0 00-1-1h-3" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item)
                        }}
                      >
                        <span className="sr-only">Delete</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Logs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLogs(item.name)
                        }}
                      >
                        <span className="sr-only">Logs</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Stop"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStop(item.id)
                        }}
                      >
                        <span className="sr-only">Stop</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item)
                        }}
                      >
                        <span className="sr-only">Delete</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  )
}
