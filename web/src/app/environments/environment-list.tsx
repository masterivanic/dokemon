import Loading from "@/components/widgets/loading"
import { Breadcrumb, BreadcrumbCurrent } from "@/components/widgets/breadcrumb"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import useEnvironments from "@/hooks/useEnvironments"
import EnvironmentAddDialog from "./environment-add-dialog"
import { useState } from "react"
import { IEnvironmentHead } from "@/lib/api-models"
import EnvironmentEditDialog from "./environment-edit-dialog"
import {
  CLASSES_CLICKABLE_TABLE_ROW,
  toastFailed,
  toastSuccess,
} from "@/lib/utils"
import TableButtonDelete from "@/components/widgets/table-button-delete"
import { TableNoData } from "@/components/widgets/table-no-data"
import apiBaseUrl from "@/lib/api-base-url"
import DeleteDialog from "@/components/delete-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

export default function EnvironmentList() {
  const { isLoading, environments, mutateEnvironments } = useEnvironments()
  const [environmentHead, setEnvironmentHead] = useState<IEnvironmentHead | null>(null)
  const [editEnvironmentOpen, setEditEnvironmentOpen] = useState(false)
  const [deleteEnvironmentConfirmationOpen, setDeleteEnvironmentConfirmationOpen] = useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  if (isLoading) return <Loading />

  const handleEditEnvironment = (environmentHead: IEnvironmentHead) => {
    setEnvironmentHead({ ...environmentHead })
    setEditEnvironmentOpen(true)
  }

  const handleDeleteEnvironmentConfirmation = (environmentHead: IEnvironmentHead) => {
    setEnvironmentHead({ ...environmentHead })
    setDeleteEnvironmentConfirmationOpen(true)
  }

  const handleDelete = async () => {
    setDeleteInProgress(true)
    const response = await fetch(
      `${apiBaseUrl()}/environments/${environmentHead?.id}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    )
    if (!response.ok) {
      const r = await response.json()
      setDeleteEnvironmentConfirmationOpen(false)
      toastFailed(r.errors?.body)
    } else {
      mutateEnvironments()
      setTimeout(() => {
        setDeleteEnvironmentConfirmationOpen(false)
        toastSuccess("Environment deleted.")
      }, 500)
    }
    setDeleteInProgress(false)
  }

  const handleBulkDelete = async () => {
    setDeleteInProgress(true)
    try {
      const responses = await Promise.all(
        selectedEnvironments.map(id =>
          fetch(`${apiBaseUrl()}/environments/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          })
        )
      )

      const allSuccessful = responses.every(response => response.ok)
      if (!allSuccessful) {
        toastFailed("Some environments could not be deleted")
      } else {
        mutateEnvironments()
        setSelectedEnvironments([])
        toastSuccess(`${selectedEnvironments.length} environments deleted successfully.`)
      }
    } catch (error) {
      toastFailed("Failed to delete environments")
    } finally {
      setDeleteInProgress(false)
      setBulkDeleteOpen(false)
    }
  }

  const toggleSelectEnvironment = (id: string) => {
    setSelectedEnvironments(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedEnvironments.length === environments?.items?.length) {
      setSelectedEnvironments([])
    } else {
      setSelectedEnvironments(environments?.items?.map(item => item.id.toString()) || [])
    }
  }

  return (
    <MainArea>
      {editEnvironmentOpen && (
        <EnvironmentEditDialog
          openState={editEnvironmentOpen}
          setOpenState={setEditEnvironmentOpen}
          environmentHead={environmentHead!}
        />
      )}
      {deleteEnvironmentConfirmationOpen && (
        <DeleteDialog
          openState={deleteEnvironmentConfirmationOpen}
          setOpenState={setDeleteEnvironmentConfirmationOpen}
          deleteCaption=""
          deleteHandler={handleDelete}
          isProcessing={deleteInProgress}
          title="Delete Environment"
          message={`Are you sure you want to delete environment '${environmentHead?.name}?'`}
        />
      )}
      {bulkDeleteOpen && (
        <DeleteDialog
          openState={bulkDeleteOpen}
          setOpenState={setBulkDeleteOpen}
          deleteCaption=""
          deleteHandler={handleBulkDelete}
          isProcessing={deleteInProgress}
          title="Delete Environments"
          message={`Are you sure you want to delete ${selectedEnvironments.length} selected environments?`}
        />
      )}
      <TopBar>
        <Breadcrumb>
          <BreadcrumbCurrent>Environments</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          {selectedEnvironments.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={deleteInProgress}
            >
              Delete Selected ({selectedEnvironments.length})
            </Button>
          )}
          <EnvironmentAddDialog />
        </TopBarActions>
      </TopBar>
      <MainContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-10">
                <Checkbox
                  checked={
                    (environments?.items?.length ?? 0) > 0 &&
                    selectedEnvironments.length === environments?.items.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {environments?.totalRows === 0 && <TableNoData colSpan={3} />}
            {environments?.items &&
              environments.items.map((item) => (
                <TableRow
                  key={item.id}
                  className={CLASSES_CLICKABLE_TABLE_ROW}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedEnvironments.includes(item.id.toString())}
                      onCheckedChange={() => toggleSelectEnvironment(item.id.toString())}
                    />
                  </TableCell>
                  <TableCell onClick={() => handleEditEnvironment(item)}>
                    {item.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <TableButtonDelete
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteEnvironmentConfirmation(item)
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </MainContent>
    </MainArea>
  )
}
