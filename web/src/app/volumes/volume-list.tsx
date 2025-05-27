import Loading from "@/components/widgets/loading"
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
import { IVolume } from "@/lib/api-models"
import { useState } from "react"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import useVolumes from "@/hooks/useVolumes"
import { useParams } from "react-router-dom"
import useNodeHead from "@/hooks/useNodeHead"
import TableButtonDelete from "@/components/widgets/table-button-delete"
import { TableNoData } from "@/components/widgets/table-no-data"
import { Input } from "@/components/ui/input"
import DeleteDialog from "@/components/delete-dialog"
import { convertByteToMb, toastFailed, toastSuccess } from "@/lib/utils"
import apiBaseUrl from "@/lib/api-base-url"
import { useFilterAndSort } from "@/lib/useFilterAndSort"
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid"

export default function VolumeList() {
  const { nodeId } = useParams()
  const { nodeHead } = useNodeHead(nodeId!)
  const { isLoading, volumes, mutateVolumes } = useVolumes(nodeId!)

  const [volume, setVolume] = useState<IVolume | null>(null)
  const [deleteVolumeOpenConfirmation, setDeleteVolumeOpenConfirmation] =
    useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [pruneInProgress, setPruneInProgress] = useState(false)

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedVolumes = [],
    requestSort,
    sortConfig
  } = useFilterAndSort<IVolume>(volumes?.items || [], {
    initialSortKey: "driver",
    initialSortDirection: "asc",
    filterKeys: ['driver', 'name', 'inUse'] as (keyof IVolume)[]
  });


  if (isLoading) return <Loading />

  const handleDeleteVolumeConfirmation = (volume: IVolume) => {
    setVolume({ ...volume })
    setDeleteVolumeOpenConfirmation(true)
  }

  const handleDelete = async () => {
    setDeleteInProgress(true)
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/volumes/remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: volume?.name }),
      }
    )
    if (!response.ok) {
      const r = await response.json()
      setDeleteVolumeOpenConfirmation(false)
      toastFailed(r.errors?.body)
    } else {
      mutateVolumes()
      setTimeout(() => {
        setDeleteVolumeOpenConfirmation(false)
        toastSuccess("Volume deleted.")
      }, 500)
    }
    setDeleteInProgress(false)
  }

  const handlePrune = async () => {
    setPruneInProgress(true)
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/volumes/prune`,
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
      mutateVolumes()
      const r = await response.json()
      let description = "Nothing found to delete"
      if (r.volumesDeleted?.length > 0) {
        description = `${r.volumesDeleted.length
          } unused volumes deleted. Space reclaimed: ${convertByteToMb(
            r.spaceReclaimed
          )}`
      }
      setTimeout(async () => {
        toastSuccess(description)
      }, 500)
    }
    setPruneInProgress(false)
  }

  return (
    <MainArea>
      {deleteVolumeOpenConfirmation && (
        <DeleteDialog
          openState={deleteVolumeOpenConfirmation}
          setOpenState={setDeleteVolumeOpenConfirmation}
          deleteCaption=""
          deleteHandler={handleDelete}
          isProcessing={deleteInProgress}
          title="Delete Volume"
          message={`Are you sure you want to delete volume '${volume?.name}?'`}
        />
      )}
      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{nodeHead?.name}</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Volumes</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <DeleteDialog
            widthClass="w-42"
            deleteCaption="Delete Unused (Prune All)"
            deleteHandler={handlePrune}
            isProcessing={pruneInProgress}
            title="Delete Unused"
            message={`Are you sure you want to delete all unused volumes?`}
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
              className="pl-10 pl-10"
              placeholder="Search volumes..."
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
            {sortedVolumes.length === 0 ? (
              <TableNoData colSpan={4} />
            ) : (
              sortedVolumes.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>{item.driver}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.inUse ? "In use" : "Unused"}</TableCell>
                  <TableCell className="text-right">
                    {!item.inUse && (
                      <TableButtonDelete
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteVolumeConfirmation(item)
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
