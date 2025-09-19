import Loading from "@/components/widgets/loading"
import {
  Breadcrumb,
  BreadcrumbCurrent,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/widgets/breadcrumb"
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
import apiBaseUrl from "@/lib/api-base-url"
import DeleteDialog from "@/components/delete-dialog"
import { useFilterAndSort } from "@/hooks/useFilterAndSort"
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid"
import { Input } from "@/components/ui/input"
import { usePagination } from "@/lib/pagination"
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

export default function ImageList() {
  const { nodeId } = useParams()
  const { nodeHead } = useNodeHead(nodeId!)
  const { isLoading, images, mutateImages } = useImages(nodeId!)
  const [image, setImage] = useState<IImage | null>(null)
  const [deleteImageConfirmationOpen, setDeleteImageConfirmationOpen] =
    useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [pruneInProgress, setPruneInProgress] = useState(false)

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedImages = [],
  } = useFilterAndSort<IImage>(images?.items || [], {
    initialSortKey: "name",
    initialSortDirection: "asc",
    filterKeys: ['name', 'status', 'inUse'] as (keyof IImage)[]
  });

  const [paginationConfig, paginationFunctions, paginatedImages] = usePagination(
    sortedImages,
    10,
    `images_${nodeId}`
  )

  if (isLoading) return <Loading />

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

  const columns: ColumnDef<IImage>[] = [
    {
      accessorKey: "id",
      header: "Id",
      cell: ({ row }) => {
        const item = row.original;
        return item.id.substring(7, 19);
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return item.name;
      },
    },
    {
      accessorKey: "tag",
      header: "Tag",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <>
            {item.tag}
            {item.dangling && (
              <span className="text-xs text-red-400"> (Dangling)</span>
            )}
          </>
        );
      },
    },
    {
      accessorKey: "inUse",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return item.inUse ? "In use" : "Unused";
      },
    },
    {
      accessorKey: "size",
      header: "Size",
      cell: ({ row }) => {
        const item = row.original;
        return convertByteToMb(item.size);
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right">
            {!item.inUse && (
              <TableButtonDelete
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteImageConfirmation(item);
                }}
              />
            )}
          </div>
        );
      },
    },
  ];

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
        <DataTable
          columns={columns}
          data={paginatedImages}
          paginationConfig={paginationConfig}
          paginationFunctions={paginationFunctions}
          noDataMessage="No images found"
        />
      </MainContent>
    </MainArea>
  )
}
