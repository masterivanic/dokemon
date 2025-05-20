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
import { useState, useMemo } from "react"
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

type SortConfig = {
  key: string
  direction: 'ascending' | 'descending'
}

export default function ImageList() {
  const { nodeId } = useParams()
  const { nodeHead } = useNodeHead(nodeId!)
  const { isLoading, images, mutateImages } = useImages(nodeId!)
  const [image, setImage] = useState<IImage | null>(null)
  const [deleteImageConfirmationOpen, setDeleteImageConfirmationOpen] =
    useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [pruneInProgress, setPruneInProgress] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'name',
    direction: 'ascending'
  })

  if (isLoading) return <Loading>()

  const sortedImages = useMemo(() => {
    if (!images?.items) return []
    
    const sortableItems = [...images.items]
    sortableItems.sort((a, b) => {
      let aValue, bValue

      switch (sortConfig.key) {
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'tag':
          aValue = a.tag
          bValue = b.tag
          break
        case 'status':
          aValue = a.inUse ? 'In use' : 'Unused'
          bValue = b.inUse ? 'In use' : 'Unused'
          break
        case 'size':
          aValue = a.size
          bValue = b.size
          break
        default:
          return 0
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1
      }
      return 0
    })

    return sortableItems
  }, [images, sortConfig])

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const handleDeleteImageConfirmation = (image: IImage) => {
    setImage({ ...image })
    setDeleteImageConfirmationOpen(true)
  }

  // ... rest of your existing handlers remain the same ...

  return (
    <MainArea>
      {/* ... existing DeleteDialog and TopBar code remains the same ... */}
      
      <MainContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('id')}
                  className="p-0 hover:bg-transparent"
                >
                  Id
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead scope="col">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('name')}
                  className="p-0 hover:bg-transparent"
                >
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead scope="col">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('tag')}
                  className="p-0 hover:bg-transparent"
                >
                  Tag
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead scope="col">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('status')}
                  className="p-0 hover:bg-transparent"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead scope="col">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('size')}
                  className="p-0 hover:bg-transparent"
                >
                  Size
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedImages?.length === 0 && <TableNoData colSpan={5} />}
            {sortedImages?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id.substring(7, 19)}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  {item.tag}{" "}
                  {item.dangling ? (
                    <span className="text-xs text-red-400"> (Dangling)</span>
                  ) : (
                    ""
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
            ))}
          </TableBody>
        </Table>
      </MainContent>
    </MainArea>
  )
}
