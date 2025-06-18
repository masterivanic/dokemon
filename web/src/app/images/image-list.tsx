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
import { IImage } from "@/lib/api-models"
import { useState } from "react"
import useImages from "@/hooks/useImages"
import { convertByteToMb, toastFailed, toastSuccess } from "@/lib/utils"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import { useParams } from "react-router-dom"
import useNodeHead from "@/hooks/useNodeHead"
import TableButtonDelete from "@/components/widgets/table-button-delete"
import { TableNoData } from "@/components/widgets/table-no-data"
import apiBaseUrl from "@/lib/api-base-url"
import DeleteDialog from "@/components/delete-dialog"
import { useFilterAndSort } from "@/lib/useFilterAndSort"
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export default function ImageList() {
  const { nodeId } = useParams()
  const { nodeHead } = useNodeHead(nodeId!)
  const { isLoading, images, mutateImages } = useImages(nodeId!)
  const [image, setImage] = useState<IImage | null>(null)
  const [deleteImageConfirmationOpen, setDeleteImageConfirmationOpen] =
    useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [pruneInProgress, setPruneInProgress] = useState(false)
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedImages = [],
    requestSort,
    sortConfig
  } = useFilterAndSort<IImage>(images?.items || [], {
    initialSortKey: "name",
    initialSortDirection: "asc",
    filterKeys: ['name', 'status', 'inUse'] as (keyof IImage)[]
  });

  const totalItems = sortedImages.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const paginatedImages = sortedImages.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  if (isLoading) return <Loading />

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value))
    setCurrentPage(1)
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleDeleteImageConfirmation = (image: IImage) => {
    setImage({ ...image })
    setDeleteImageConfirmationOpen(true)
  }

  const handleDelete = async () => {
    setDeleteInProgress(true)
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/images/remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: image?.id, force: false }),
      }
    )
    if (!response.ok) {
      const r = await response.json()
      setDeleteImageConfirmationOpen(false)
      toastFailed(r.errors?.body)
    } else {
      mutateImages()
      setTimeout(() => {
        setDeleteImageConfirmationOpen(false)
        toastSuccess("Image deleted.")
      }, 500)
    }
    setDeleteInProgress(false)
  }

  const handlePrune = async () => {
    setPruneInProgress(true)
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/images/prune`,
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
      mutateImages()
      const r = await response.json()
      let description = "Nothing found to delete"
      if (r.imagesDeleted?.length > 0) {
        description = `Unused images deleted. Space reclaimed: ${convertByteToMb(
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
      {deleteImageConfirmationOpen && (
        <DeleteDialog
          openState={deleteImageConfirmationOpen}
          setOpenState={setDeleteImageConfirmationOpen}
          deleteCaption=""
          deleteHandler={handleDelete}
          isProcessing={deleteInProgress}
          title="Delete Image"
          message={`Are you sure you want to delete image '${image?.name}?'`}
        />
      )}
      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{nodeHead?.name}</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Images</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <DeleteDialog
            widthClass="w-42"
            deleteCaption="Delete Unused (Prune All)"
            deleteHandler={handlePrune}
            isProcessing={pruneInProgress}
            title="Delete Unused"
            message={`Are you sure you want to delete all unused images?`}
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
              placeholder="Search images..."
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
              <TableHead scope="col">Tag</TableHead>
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
              <TableHead scope="col">Size</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedImages.length === 0 ? (
              <TableNoData colSpan={5} />
            ) : (
              paginatedImages.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id.substring(7, 19)}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {item.tag}{" "}
                    {item.dangling && (
                      <span className="text-xs text-red-400"> (Dangling)</span>
                    )}
                  </TableCell>
                  <TableCell>{item.inUse ? "In use" : "Unused"}</TableCell>
                  <TableCell>{convertByteToMb(item.size)}</TableCell>
                  <TableCell className="text-right">
                    {!item.inUse && (
                      <TableButtonDelete
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteImageConfirmation(item)
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
            </span>

            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
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
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page number buttons - show up to 5 pages around current */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      </MainContent>
    </MainArea>
  )
}