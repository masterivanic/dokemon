import Loading from "@/components/widgets/loading"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Breadcrumb,
  BreadcrumbCurrent,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/widgets/breadcrumb"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { INetwork } from "@/lib/api-models"
import { useState } from "react"
import useNetworks from "@/hooks/useNetworks"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import { useParams } from "react-router-dom"
import useNodeHead from "@/hooks/useNodeHead"
import TableButtonDelete from "@/components/widgets/table-button-delete"
import { TableNoData } from "@/components/widgets/table-no-data"
import { toastFailed, toastSuccess } from "@/lib/utils"
import apiBaseUrl from "@/lib/api-base-url"
import DeleteDialog from "@/components/delete-dialog"
import { useFilterAndSort } from "@/lib/useFilterAndSort"
import { Input } from "@/components/ui/input"
import { MagnifyingGlassIcon } from "@heroicons/react/16/solid"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const systemNetworks = [
  "none",
  "bridge",
  "host",
  "ingress",
  "docker_gwbridge",
  "docker_volumes-backup-extension-desktop-extension_default",
]

const NETWORK_DRIVERS = [
  { value: "bridge", label: "Bridge" },
  { value: "host", label: "Host" },
  { value: "overlay", label: "Overlay" },
  { value: "macvlan", label: "Macvlan" },
  { value: "ipvlan", label: "IPvlan" },
  { value: "none", label: "None" },
]

export default function NetworkList() {
  const { nodeId } = useParams()
  const { nodeHead } = useNodeHead(nodeId!)
  const { isLoading, networks, mutateNetworks } = useNetworks(nodeId!)

  const [network, setNetwork] = useState<INetwork | null>(null)
  const [deleteNetworkOpenConfirmation, setDeleteNetworkOpenConfirmation] =
    useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [pruneInProgress, setPruneInProgress] = useState(false)
  const [createNetworkOpen, setCreateNetworkOpen] = useState(false)
  const [createInProgress, setCreateInProgress] = useState(false)
  const [networkName, setNetworkName] = useState("")
  const [driver, setDriver] = useState("bridge")
  const [internal, setInternal] = useState(false)
  const [attachable, setAttachable] = useState(false)
  const [ingress, setIngress] = useState(false)

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedNetworks = [],
    requestSort,
    sortConfig
  } = useFilterAndSort<INetwork>(networks?.items || [], {
    initialSortKey: "name",
    initialSortDirection: "asc",
    filterKeys: ['name', 'driver', 'inUse'] as (keyof INetwork)[]
  });

  if (isLoading) return <Loading />

  const handleDeleteNetworkConfirmation = (network: INetwork) => {
    setNetwork({ ...network })
    setDeleteNetworkOpenConfirmation(true)
  }

  const handleDelete = async () => {
    setDeleteInProgress(true)
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/networks/remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: network?.id, force: true }),
      }
    )
    if (!response.ok) {
      const r = await response.json()
      setDeleteNetworkOpenConfirmation(false)
      toastFailed(r.errors?.body)
    } else {
      mutateNetworks()
      setTimeout(() => {
        setDeleteNetworkOpenConfirmation(false)
        toastSuccess("Network deleted.")
      }, 500)
    }
    setDeleteInProgress(false)
  }

  const handlePrune = async () => {
    setPruneInProgress(true)
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/networks/prune`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      }
    )
    if (!response.ok) {
      const r = await response.json()
      toastFailed(r.errors?.body)
    } else {
      mutateNetworks()
      const r = await response.json()
      let description = "Nothing found to delete"
      if (r.networksDeleted?.length > 0) {
        description = `${r.networksDeleted.length} unused networks deleted`
      }
      setTimeout(async () => {
        toastSuccess(description)
      }, 500)
    }
    setPruneInProgress(false)
  }

  const handleCreateNetwork = async () => {
    setCreateInProgress(true)
    try {
      const response = await fetch(
        `${apiBaseUrl()}/nodes/${nodeId}/networks/create`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ 
            name: networkName,
            driver: driver,
            internal: internal,
            attachable: attachable,
            ingress: ingress,
            ipam: {
              driver: "default",
              config: []
            }
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create network")
      }

      mutateNetworks()
      setCreateNetworkOpen(false)
      setNetworkName("")
      setDriver("bridge")
      setInternal(false)
      setAttachable(false)
      setIngress(false)
      toastSuccess("Network created successfully")
    } catch (error: unknown) {
      if (error instanceof Error) {
        toastFailed(error.message)
      } else {
        toastFailed("An unknown error occurred")
      }
    } finally {
      setCreateInProgress(false)
    }
  }

  return (
    <MainArea>
      {deleteNetworkOpenConfirmation && (
        <DeleteDialog
          openState={deleteNetworkOpenConfirmation}
          setOpenState={setDeleteNetworkOpenConfirmation}
          deleteCaption=""
          deleteHandler={handleDelete}
          isProcessing={deleteInProgress}
          title="Delete Network"
          message={`Are you sure you want to delete network '${network?.name}'?`}
        />
      )}

      <Dialog open={createNetworkOpen} onOpenChange={setCreateNetworkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Network</DialogTitle>
            <DialogDescription>
              Create a new Docker network
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={networkName}
                onChange={(e) => setNetworkName(e.target.value)}
                className="col-span-3"
                placeholder="network-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="driver" className="text-right">
                Driver
              </Label>
              <Select 
                value={driver} 
                onValueChange={setDriver}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORK_DRIVERS.map((driver) => (
                    <SelectItem key={driver.value} value={driver.value}>
                      {driver.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="internal" className="text-right">
                Internal
              </Label>
              <Checkbox
                id="internal"
                checked={internal}
                onCheckedChange={(checked) => setInternal(checked === true)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="attachable" className="text-right">
                Attachable
              </Label>
              <Checkbox
                id="attachable"
                checked={attachable}
                onCheckedChange={(checked) => setAttachable(checked === true)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ingress" className="text-right">
                Ingress
              </Label>
              <Checkbox
                id="ingress"
                checked={ingress}
                onCheckedChange={(checked) => setIngress(checked === true)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleCreateNetwork}
              disabled={createInProgress || !networkName}
            >
              {createInProgress ? "Creating..." : "Create Network"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{nodeHead?.name}</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Networks</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <Button 
            variant="default" 
            className="mr-2"
            onClick={() => setCreateNetworkOpen(true)}
          >
            Create Network
          </Button>
          <DeleteDialog
            widthClass="w-42"
            deleteCaption="Delete Unused (Prune All)"
            deleteHandler={handlePrune}
            isProcessing={pruneInProgress}
            title="Delete Unused"
            message={`Are you sure you want to delete all unused networks?`}
          />
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
              placeholder="Search networks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Id</TableHead>
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
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("driver")}
              >
                <div className="flex items-center">
                  Driver
                  {sortConfig.key === "driver" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">Scope</TableHead>
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("inUse")}
              >
                <div className="flex items-center">
                  Status
                  {sortConfig.key === "inUse" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedNetworks.length === 0 ? (
              <TableNoData colSpan={6} />
            ) : (
              sortedNetworks.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id.substring(0, 12)}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.driver}</TableCell>
                  <TableCell>{item.scope}</TableCell>
                  <TableCell>{item.inUse ? "In use" : "Unused"}</TableCell>
                  <TableCell className="text-right">
                    {!systemNetworks.includes(item.name) && !item.inUse && (
                      <TableButtonDelete
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNetworkConfirmation(item)
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