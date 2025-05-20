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
import { useState, useMemo, useEffect } from "react"
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
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

type SortConfig = {
  key: string
  direction: 'ascending' | 'descending'
}

export default function ImageList() {
  const { toast } = useToast()
  const { nodeId } = useParams()
  const { nodeHead, error: nodeHeadError } = useNodeHead(nodeId!)
  const { isLoading, images, mutateImages, error: imagesError } = useImages(nodeId!)
  const [image, setImage] = useState<IImage | null>(null)
  const [deleteImageConfirmationOpen, setDeleteImageConfirmationOpen] = useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [pruneInProgress, setPruneInProgress] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'name',
    direction: 'ascending'
  })

  useEffect(() => {
    if (nodeHeadError) {
      toast({
        title: "Node Error",
        description: nodeHeadError.message,
        variant: "destructive"
      })
    }
    if (imagesError) {
      toast({
        title: "Images Error",
        description: imagesError.message,
        variant: "destructive"
      })
    }
  }, [nodeHeadError, imagesError, toast])

  if (!nodeId) {
    return (
      <MainArea>
        <div className="p-4 text-red-500">
          Error: Node ID is missing
        </div>
      </MainArea>
    )
  }

  if (isLoading) return <Loading />

  const sortedImages = useMemo(() => {
    try {
      if (!images?.items) return []
      
      const sortableItems = [...images.items]
      return sortableItems.sort((a, b) => {
        let aValue: string | number = ''
        let bValue: string | number = ''

        switch (sortConfig.key) {
          case 'id':
            aValue = a.id?.toLowerCase() || ''
            bValue = b.id?.toLowerCase() || ''
            break
          case 'name':
            aValue = a.name?.toLowerCase() || ''
            bValue = b.name?.toLowerCase() || ''
            break
          case 'tag':
            aValue = a.tag?.toLowerCase() || ''
            bValue = b.tag?.toLowerCase() || ''
            break
          case 'status':
            aValue = a.inUse ? 'in use' : 'unused'
            bValue = b.inUse ? 'in use' : 'unused'
            break
          case 'size':
            aValue = a.size || 0
            bValue = b.size || 0
            return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue
          default:
            return 0
        }

        return sortConfig.direction === 'ascending' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue)
      })
    } catch (error) {
      console.error("Sorting error:", error)
      toast({
        title: "Sorting Error",
        description: "Could not sort images",
        variant: "destructive"
      })
      return images?.items || []
    }
  }, [images, sortConfig, toast])

  const requestSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
    }))
  }

  const handleDeleteImageConfirmation = (image: IImage) => {
    setImage({ ...image })
    setDeleteImageConfirmationOpen(true)
  }

  const handleDelete = async () => {
    try {
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
        throw new Error(r.errors?.body || "Failed to delete image")
      }

      await mutateImages()
      toastSuccess("Image deleted successfully")
    } catch (error) {
      toastFailed(error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setDeleteImageConfirmationOpen(false)
      setDeleteInProgress(false)
    }
  }

  const handlePrune = async () => {
    try {
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
        throw new Error(r.errors?.body || "Failed to prune images")
      }

      const r = await response.json()
      await mutateImages()
      
      const description = r.imagesDeleted?.length > 0
        ? `Unused images deleted. Space reclaimed: ${convertByteToMb(r.spaceReclaimed)}`
        : "Nothing found to delete"
      
      toastSuccess(description)
    } catch (error) {
      toastFailed(error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setPruneInProgress(false)
    }
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
          message={`Are you sure you want to delete image '${image?.name}'?`}
        />
      )}
      
      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{nodeHead?.name || 'Unknown Node'}</BreadcrumbCurrent>
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
            message="Are you sure you want to delete all unused images?"
          />
        </TopBarActions>
      </TopBar>

      <MainContent>
        <Table>
          <TableHeader>
            <TableRow>
              {['id', 'name', 'tag', 'status', 'size'].map((key) => (
                <TableHead key={key} scope="col">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort(key)}
                    className="p-0 hover:bg-transparent flex items-center"
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              ))}
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedImages.length === 0 ? (
              <TableNoData colSpan={6} />
            ) : (
              sortedImages.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id.substring(7, 19)}</TableCell>
                  <TableCell>{item.name || '-'}</TableCell>
                  <TableCell>
                    {item.tag || '-'}
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
      </MainContent>
    </MainArea>
  )
}
