import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  MagnifyingGlassIcon,
  PencilIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid"
import { RefreshCw } from "lucide-react"

import Loading from "@/components/widgets/loading"
import { Breadcrumb, BreadcrumbCurrent } from "@/components/widgets/breadcrumb"
import TableButtonDelete from "@/components/widgets/table-button-delete"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import NodeAddDialog from "./node-add-dialog"
import { Button } from "@/components/ui/button"
import NodeRegisterDialog from "./node-register-dialog"
import ServerUrlEditDialog from "./serverurl-edit-dialog"
import DeleteDialog from "@/components/delete-dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { INodeHead } from "@/lib/api-models"
import { apiNodesDelete, apiNodesGenerateToken } from "@/lib/api"
import {
  cn,
  getAgentVersion,
  isDokemonNode,
  toastFailed,
  toastSomethingWentWrong,
  toastSuccess,
} from "@/lib/utils"
import useNodes from "@/hooks/useNodes"
import useSetting from "@/hooks/useSetting"
import { useFilterAndSort } from "@/hooks/useFilterAndSort"
import { usePagination } from "@/lib/pagination"
import { useContainerContext } from "@/contexts/container-context"
import { useRefresh } from "@/hooks/useRefresh"
import { NodeIPsDisplay } from "@/components/ui/node-ips-display"
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

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
  const { dispatch, fetchNodeContainers } = useContainerContext()
  const { refreshInterval, setLastRefreshTime, setCurrentTime } = useRefresh(60)

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedNodes = [],
  } = useFilterAndSort<INodeHead>(nodes?.items || [], {
    initialSortKey: "name",
    initialSortDirection: "asc",
    filterKeys: ["name", "environment", "agentVersion"],
  })

  const [paginationConfig, paginationFunctions, paginatedNodes] = usePagination(
    sortedNodes,
    10,
    "nodes"
  )

  const fetchNodesCounts = useCallback(async () => {
    const refreshTime = Date.now()
    setLastRefreshTime(refreshTime)
    setCurrentTime(refreshTime)

    if (!nodes?.items) return

    for (const node of nodes.items) {
      try {
        dispatch({
          type: "UPDATE_NODE",
          nodeId: node.id,
          data: { loading: true, hasData: false },
        })

        const result = await fetchNodeContainers(node.id, node.online)
        dispatch({
          type: "UPDATE_NODE",
          nodeId: node.id,
          data: result,
        })
      } catch (error) {
        console.error(`Error processing node ${node.id}:`, error)
        dispatch({
          type: "UPDATE_NODE",
          nodeId: node.id,
          data: {
            loading: false,
            error: "Fetch error",
            lastUpdated: Date.now(),
            hasData: false,
          },
        })
      }
    }
  }, [dispatch, fetchNodeContainers, nodes?.items, setLastRefreshTime, setCurrentTime])

  useEffect(() => {
    fetchNodesCounts()
    let refreshIntervalId: ReturnType<typeof setInterval>
    if (refreshInterval > 0) {
      refreshIntervalId = setInterval(fetchNodesCounts, refreshInterval * 1000)
    }
    return () => {
      refreshIntervalId && clearInterval(refreshIntervalId)
    }
  }, [fetchNodesCounts, refreshInterval])

  const handleNodeRefreshCounts = (nodeId: number, nodeOnline: boolean) => {
    dispatch({
      type: "UPDATE_NODE",
      nodeId,
      data: { loading: true, hasData: false },
    })
    fetchNodeContainers(nodeId, nodeOnline).then((result) => {
      dispatch({
        type: "UPDATE_NODE",
        nodeId,
        data: result,
      })
    })
  }

  const handleNodeRegister = async (nodeId: number, update: boolean) => {
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
    setNodeHead(nodeHead)
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

  // --- Define DataTable Columns ---
  const columns: ColumnDef<INodeHead>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center">
            <span
              className={cn(
                "-ml-2 mr-3 text-lg",
                item.online ? "text-green-600" : "text-red-600"
              )}
              title={item.online ? "Online" : "Offline"}
            >
              ●
            </span>
            <span
              className="cursor-pointer hover:text-blue-600 hover:underline"
              onClick={() => navigate(`/nodes/${item.id}/compose`)}
            >
              {item.name}
            </span>
          </div>
        )
      },
    },
    {
      id: "containers",
      header: "Containers",
      cell: ({ row }) => {
        const item = row.original
        return (
          <NodeContainersDisplay
            nodeId={item.id}
            nodeOnline={item.online}
            onRefresh={() => handleNodeRefreshCounts(item.id, item.online)}
          />
        )
      },
    },
    {
      accessorKey: "environment",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Environment" />
      ),
      cell: ({ row }) => row.original.environment || "-",
    },
    {
      accessorKey: "agentVersion",
      header: "Agent Version",
      cell: ({ row }) => getAgentVersion(row.original),
    },
    {
      id: "network",
      header: "Network",
      cell: ({ row }) => <NodeIPsDisplay nodeHead={row.original} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-1">
            {!item.registered ? (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNodeRegister(item.id, false)
                  }}
                >
                  Register
                </Button>
                {!isDokemonNode(item) && (
                  <Button
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNodeConfirmation(item)
                    }}
                  >
                    Delete
                  </Button>
                )}
              </>
            ) : (
              <>
                <button
                  className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Edit"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/nodes/${item.id}/details`)
                  }}
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                {!isDokemonNode(item) && (
                  <TableButtonDelete
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNodeConfirmation(item)
                    }}
                  />
                )}
              </>
            )}
          </div>
        )
      },
    },
  ]

  if (isLoading) return <Loading />

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
        {/* Search bar */}
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
            {searchTerm && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setSearchTerm("")}
              >
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* DataTable */}
        <DataTable
          columns={columns}
          data={paginatedNodes}
          paginationConfig={paginationConfig}
          paginationFunctions={paginationFunctions}
          noDataMessage="No nodes found"
        />
      </MainContent>
    </MainArea>
  )
}

const NodeContainersDisplay = React.memo(
  ({
    nodeId,
    nodeOnline,
    onRefresh,
  }: {
    nodeId: number
    nodeOnline: boolean
    onRefresh: () => void
  }) => {
    const { state } = useContainerContext()
    const counts = state[nodeId] || { loading: false, hasData: false }

    if (!nodeOnline) {
      return (
        <div className="flex items-center gap-1">
          <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">Offline</span>
        </div>
      )
    }

    if (counts.error) {
      return (
        <div className="flex items-center gap-1">
          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
          <span className="text-xs text-yellow-600">{counts.error}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRefresh()
            }}
            className="text-gray-400 hover:text-gray-600 ml-1"
            title="Retry"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      )
    }

    if (counts.loading) {
      return (
        <div className="flex items-center gap-1">
          <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      )
    }

    if (!counts.hasData) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRefresh()
          }}
          className="text-gray-400 hover:text-gray-600"
          title="Load counts"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )
    }

    return (
      <div className="flex items-center gap-1">
        {counts.running !== undefined && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300 cursor-pointer w-[85px] justify-between">
                <span className="text-left">Running</span>
                <span className="font-mono text-right">{counts.running}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto">
              <div className="grid gap-2">
                <h4 className="font-medium leading-none">Running Containers</h4>
                <div className="text-sm">
                  {counts.running} container
                  {counts.running !== 1 ? "s" : ""} running
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {counts.stopped !== undefined && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-300 cursor-pointer w-[85px] justify-between ml-1">
                <span className="text-left">Stopped</span>
                <span className="font-mono text-right">{counts.stopped}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto">
              <div className="grid gap-2">
                <h4 className="font-medium leading-none">Stopped Containers</h4>
                <div className="text-sm">
                  {counts.stopped} container
                  {counts.stopped !== 1 ? "s" : ""} stopped
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRefresh()
          }}
          className="text-gray-400 hover:text-gray-600 ml-1"
          title="Refresh counts"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    )
  }
)
