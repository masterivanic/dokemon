import Loading from "@/components/widgets/loading"
import { Breadcrumb, BreadcrumbCurrent } from "@/components/widgets/breadcrumb"
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import TableButtonDelete from "@/components/widgets/table-button-delete"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import NodeAddDialog from "./node-add-dialog"
import { Button } from "@/components/ui/button"
import NodeRegisterDialog from "./node-register-dialog"
import ServerUrlEditDialog from "./serverurl-edit-dialog"
import { INodeHead } from "@/lib/api-models"
import { apiNodesDelete, apiNodesGenerateToken } from "@/lib/api"
import { VERSION } from "@/lib/version"
import {
  CLASSES_CLICKABLE_TABLE_ROW,
  cn,
  toastFailed,
  toastSomethingWentWrong,
  toastSuccess,
} from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import useNodes from "@/hooks/useNodes"
import { useState } from "react"
import useSetting from "@/hooks/useSetting"
import { TableNoData } from "@/components/widgets/table-no-data"
import DeleteDialog from "@/components/delete-dialog"
import { useFilterAndSort } from "@/lib/useFilterAndSort"
import { Input } from "@/components/ui/input"

export default function NodeList() {
  const navigate = useNavigate()
  const { isLoading, nodes, mutateNodes } = useNodes()
  const { setting } = useSetting("SERVER_URL")
  const [token, setToken] = useState("")
  const [updateAgent, setUpdateAgent] = useState(false)
  const [registerNodeOpen, setRegisterNodeOpen] = useState(false)
  const [nodeHead, setNodeHead] = useState<INodeHead | null>(null)
  const [deleteNodeOpenConfirmation, setDeleteNodeOpenConfirmation] =
    useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedNodes = [],
    requestSort,
    sortConfig
  } = useFilterAndSort<INodeHead>(nodes?.items || [], {
    initialSortKey: "name",
    initialSortDirection: "asc",
    filterKeys: ['name', 'environment', 'agentVersion'] as (keyof INodeHead)[]
  });

  if (isLoading) return <Loading />
  console.log("Node data structure:", nodes?.items[0])

  const handleRegister = async (nodeId: number, update: boolean) => {
    const response = await apiNodesGenerateToken(nodeId)

    if (!response.ok) {
      toastSomethingWentWrong(
        "There was a problem when generating the registration token. Try again!"
      )
    } else {
      const data: { token: string } = await response.json()
      setToken(data.token)
      setUpdateAgent(update)
      setRegisterNodeOpen(true)
    }
  }

  const handleDeleteNodeConfirmation = (nodeHead: INodeHead) => {
    setNodeHead({ ...nodeHead })
    setDeleteNodeOpenConfirmation(true)
  }

  const handleDelete = async () => {
    setDeleteInProgress(true)
    const response = await apiNodesDelete(Number(nodeHead?.id))
    if (!response.ok) {
      const r = await response.json()
      setDeleteNodeOpenConfirmation(false)
      toastFailed(r.errors?.body)
    } else {
      mutateNodes()
      setTimeout(() => {
        setDeleteNodeOpenConfirmation(false)
        toastSuccess("Node deleted.")
      }, 500)
    }
    setDeleteInProgress(false)
  }

  return (
    <MainArea>
      {deleteNodeOpenConfirmation && (
        <DeleteDialog
          openState={deleteNodeOpenConfirmation}
          setOpenState={setDeleteNodeOpenConfirmation}
          deleteCaption=""
          deleteHandler={handleDelete}
          isProcessing={deleteInProgress}
          title="Delete Node"
          message={`Are you sure you want to delete node '${nodeHead?.name}?'`}
        />
      )}
      <TopBar>
        <Breadcrumb>
          <BreadcrumbCurrent>Nodes</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <NodeRegisterDialog
            open={registerNodeOpen}
            setOpen={setRegisterNodeOpen}
            token={token}
            updateAgent={updateAgent}
          />
          <NodeAddDialog disabled={!setting?.value} />
          <ServerUrlEditDialog />
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
              className="pl-10 pl-10"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("name")}
              >
                <div className="flex items-center ml-3">
                  Name
                  {sortConfig.key === "name" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">Environment</TableHead>
              <TableHead scope="col">Agent Version</TableHead>
              <TableHead scope="col">Network</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedNodes.length === 0 ? (
              <TableNoData colSpan={4} />
            ) : (
              sortedNodes.map((item) => (
                <TableRow
                  key={item.name}
                  className={CLASSES_CLICKABLE_TABLE_ROW}
                  onClick={() => {
                    if (item.registered) {
                      navigate(`/nodes/${item.id}/compose`)
                    }
                  }}
                >
                  <TableCell>
                    <NodeStatusIcon nodeHead={item} />
                    {item.name}
                  </TableCell>
                  <TableCell>
                    {item.environment ? item.environment : "-"}
                  </TableCell>
		  <TableCell>
		    {getAgentVersion(item)}
                  </TableCell>
		  <TableCell>
		    {getAgentIPs(item)}
		  </TableCell>
                  <TableCell className="text-right">
                    {!item.registered && (
                      <Button
                        className="mr-4"
                        size={"sm"}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRegister(item.id, false)
                        }}
                      >
                        Register
                      </Button>
                    )}
                    {!isDokemonNode(item) && (
                      <TableButtonDelete
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNodeConfirmation(item)
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </MainContent>
    </MainArea>
  )
}

function isDokemonNode(nodeHead: INodeHead) {
  return nodeHead.id === 1
}

function NodeStatusIcon({ nodeHead }: { nodeHead: INodeHead }) {
  const statusClassName = nodeHead.online ? "text-green-600" : "text-slate-300"
  const title = nodeHead.online ? "Online" : "Offline"

  return (
    <span className={cn("-ml-2 mr-3 text-lg", statusClassName)} title={title}>
      ●
    </span>
  )
}



// Returns version and architecture only
function getAgentVersion(nodeHead: INodeHead): string {
  if (isDokemonNode(nodeHead)) {
    const arch = (nodeHead as any).architecture;
    return `Dokémon Server v${VERSION}` + (arch ? ` (${arch})` : "");
  }

  if (nodeHead.agentVersion) {
    const mainParts = nodeHead.agentVersion.split('-');
    const version = mainParts[0] || '';
    const rest = mainParts.length > 1 ? mainParts[1] : '';
    const arch = rest.split('@')[0] || null;
    
    let formatted = `v${version}`;
    if (arch) formatted += ` (${arch})`;
    return formatted;
  }

  return "-";
}

// Returns only the IP addresses
function getAgentIPs(nodeHead: INodeHead): string {
  if (!nodeHead.agentVersion) return "-";
  
  const mainParts = nodeHead.agentVersion.split('-');
  const rest = mainParts.length > 1 ? mainParts[1] : '';
  const ips = rest.split('@').length > 1 ? rest.split('@')[1] : null;

  let ipDisplay = '';
  if (ips) {
    const ipComponents = ips.split('+');
    for (const component of ipComponents) {
      if (component.includes('.') && !component.startsWith('zt:') && !component.startsWith('ts:')) {
        ipDisplay += ` ip:${component}`;
      } else {
        ipDisplay += ` ${component}`;
      }
    }
  }

  return ipDisplay.trim();
}

