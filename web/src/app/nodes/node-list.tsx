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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
              className="pl-10"
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

              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("environment")}
              >
                <div className="flex items-center ml-3">
                  Environment
                  {sortConfig.key === "environment" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">Agent Version</TableHead>
              <TableHead scope="col">Network</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedNodes.length === 0 ? (
              <TableNoData colSpan={5} />
            ) : (
              sortedNodes.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>
                    <div className="flex items-center">
                      <NodeStatusIcon nodeHead={item} />
                      <span 
                        className="cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => navigate(`/nodes/${item.id}/containers`)}
                      >
                        {item.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.environment ? item.environment : "-"}
                  </TableCell>
                  <TableCell>
                    {getAgentVersion(item)}
                  </TableCell>
                  <TableCell>
                    <NodeIPsDisplay nodeHead={item} />
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

function NodeIPsDisplay({ nodeHead }: { nodeHead: INodeHead }) {
  if (!nodeHead.agentVersion) return <span>-</span>;

  const ips = extractIPs(nodeHead.agentVersion);
  
  if (!ips || (!ips.ip && !ips.zt && !ips.ts)) {
    return <span>-</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {ips.ip && <span className="mr-2">ip:{ips.ip}</span>}
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex gap-1">
            {ips.zt && (
              <span 
                className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300 cursor-pointer"
              >
                ZT
              </span>
            )}
            {ips.ts && (
              <span 
                className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-300 cursor-pointer"
              >
                TS
              </span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <div className="grid gap-2">
            <h4 className="font-medium leading-none">Network Addresses</h4>
            <div className="text-sm">
              {ips.ip && <div>Primary: {ips.ip}</div>}
              {ips.zt && <div>ZeroTier: {ips.zt}</div>}
              {ips.ts && <div>Tailscale: {ips.ts}</div>}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function extractIPs(agentVersion: string): { ip?: string; zt?: string; ts?: string } | null {
  if (!agentVersion) return null;
  
  const mainParts = agentVersion.split('-');
  const rest = mainParts.length > 1 ? mainParts[1] : '';
  const ips = rest.split('@').length > 1 ? rest.split('@')[1] : null;

  if (!ips) return null;

  const result: { ip?: string; zt?: string; ts?: string } = {};
  const ipComponents = ips.split('+');
  
  for (const component of ipComponents) {
    if (component.includes('.')) {
      if (component.startsWith('zt:')) {
        result.zt = component.substring(3);
      } else if (component.startsWith('ts:')) {
        result.ts = component.substring(3);
      } else {
        result.ip = component;
      }
    }
  }

  return result;
}