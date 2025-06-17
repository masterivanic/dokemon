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
import useVariables from "@/hooks/useVariables"
import VariableAddDialog from "./variable-add-dialog"
import { useState } from "react"
import { IVariableHead } from "@/lib/api-models"
import useEnvironmentsMap from "@/hooks/useEnvironmentsMap"
import { Checkbox } from "@/components/ui/checkbox"
import VariableEditDialog from "./variable-edit-dialog"
import VariableValueEditDialog from "./variable-value-edit-dialog"
import TableButtonDelete from "@/components/widgets/table-button-delete"
import TableButtonEdit from "@/components/widgets/table-button-edit"
import { TableNoData } from "@/components/widgets/table-no-data"
import DeleteDialog from "@/components/delete-dialog"
import apiBaseUrl from "@/lib/api-base-url"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function VariableList() {
  const { isLoading: mapIsLoading, environmentsMap } = useEnvironmentsMap()
  const { isLoading, variables, mutateVariables } = useVariables()
  const [editVariableOpen, setEditVariableOpen] = useState(false)
  const [editVariableValueOpen, setEditVariableValueOpen] = useState(false)
  const [editVariableValueEnvironmentId, setEditVariableValueEnvironmentId] =
    useState<string | null>(null)
  const [variableHead, setVariableHead] = useState<IVariableHead | null>(null)
  const [deleteVariableOpenConfirmation, setDeleteVariableOpenConfirmation] =
    useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])
  const [bulkDeleteOpenConfirmation, setBulkDeleteOpenConfirmation] = useState(false)
  const { toast } = useToast()

  if (mapIsLoading || isLoading) return <Loading />

  const handleEditVariable = (variableHead: IVariableHead) => {
    setVariableHead({ ...variableHead })
    setEditVariableOpen(true)
  }

  const handleEditVariableValue = (
    variableHead: IVariableHead,
    envId: string
  ) => {
    setVariableHead({ ...variableHead })
    setEditVariableValueOpen(true)
    setEditVariableValueEnvironmentId(envId)
  }

  const handleDeleteVariableConfirmation = (variableHead: IVariableHead) => {
    setVariableHead({ ...variableHead })
    setDeleteVariableOpenConfirmation(true)
  }

  const handleDelete = async () => {
    setDeleteInProgress(true)
    const response = await fetch(
      `${apiBaseUrl()}/variables/${variableHead?.id}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    )
    if (!response.ok) {
      setDeleteVariableOpenConfirmation(false)
    } else {
      mutateVariables()
      setTimeout(() => {
        setDeleteVariableOpenConfirmation(false)
      }, 500)
    }
    setDeleteInProgress(false)
  }

  const handleBulkDelete = async () => {
    setDeleteInProgress(true)
    try {
      const responses = await Promise.all(
        selectedVariables.map(id =>
          fetch(`${apiBaseUrl()}/variables/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          })
        )
      )

      const allSuccess = responses.every(response => response.ok)
      if (!allSuccess) {
        throw new Error("Some deletions failed")
      }

      mutateVariables()
      setSelectedVariables([])
      toast({
        title: "Success",
        description: `${selectedVariables.length} variables deleted successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete some variables",
        variant: "destructive",
      })
    } finally {
      setDeleteInProgress(false)
      setBulkDeleteOpenConfirmation(false)
    }
  }

  const toggleVariableSelection = (variableId: string) => {
    setSelectedVariables(prev =>
      prev.includes(variableId)
        ? prev.filter(id => id !== variableId)
        : [...prev, variableId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedVariables.length === variables?.items?.length) {
      setSelectedVariables([])
    } else {
      setSelectedVariables(variables?.items?.map(v => v.id!.toString()) || [])
    }
  }

  return (
    <MainArea>
      {editVariableOpen && (
        <VariableEditDialog
          openState={editVariableOpen}
          setOpenState={setEditVariableOpen}
          variableHead={variableHead!}
        />
      )}
      {editVariableValueOpen && (
        <VariableValueEditDialog
          openState={editVariableValueOpen}
          setOpenState={setEditVariableValueOpen}
          variableHead={variableHead!}
          environmentId={editVariableValueEnvironmentId!}
        />
      )}
      {deleteVariableOpenConfirmation && (
        <DeleteDialog
          openState={deleteVariableOpenConfirmation}
          setOpenState={setDeleteVariableOpenConfirmation}
          deleteCaption=""
          deleteHandler={handleDelete}
          isProcessing={deleteInProgress}
          title="Delete Variable"
          message={`Are you sure you want to delete variable '${variableHead?.name}?'`}
        />
      )}
      {bulkDeleteOpenConfirmation && (
        <DeleteDialog
          openState={bulkDeleteOpenConfirmation}
          setOpenState={setBulkDeleteOpenConfirmation}
          deleteCaption=""
          deleteHandler={handleBulkDelete}
          isProcessing={deleteInProgress}
          title="Delete Variables"
          message={`Are you sure you want to delete ${selectedVariables.length} selected variables?`}
        />
      )}
      <TopBar>
        <Breadcrumb>
          <BreadcrumbCurrent>Variables</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          {selectedVariables.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteOpenConfirmation(true)}
              disabled={deleteInProgress}
            >
              Delete Selected ({selectedVariables.length})
            </Button>
          )}
          <VariableAddDialog />
        </TopBarActions>
      </TopBar>
      <MainContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-[30px]">
                <Checkbox
                  checked={
                    (variables?.items?.length ?? 0) > 0 &&
                    selectedVariables.length === (variables?.items?.length ?? 0)
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead scope="col" className="w-[10px]">
                <span className="sr-only">Actions</span>
              </TableHead>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Secret</TableHead>
              <TableHead scope="col">Values</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variables?.totalRows === 0 && <TableNoData colSpan={5} />}
            {variables?.items &&
              variables?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedVariables.includes(item.id!.toString())}
                      onCheckedChange={() => toggleVariableSelection(item.id!.toString())}
                    />
                  </TableCell>
                  <TableCell>
                    <TableButtonEdit onClick={() => handleEditVariable(item)} />
                    <TableButtonDelete
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteVariableConfirmation(item)
                      }}
                    />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={item.isSecret}
                      aria-readonly
                      className="cursor-default"
                    />
                  </TableCell>
                  <TableCell>
                    {Object.keys(item.values!).map((environmentId) => (
                      <VariableValue
                        key={environmentId}
                        envName={environmentsMap![environmentId]}
                        isSecret={item.isSecret!}
                        value={item.values![environmentId]}
                        onClick={() => {
                          handleEditVariableValue(item, environmentId)
                        }}
                      />
                    ))}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </MainContent>
    </MainArea>
  )
}

function truncateVariableValue(value: string, chars = 20) {
  if (value && value.length > chars) {
    return value.substring(0, chars) + " ..."
  }
  return value
}

function VariableValue({
  envName,
  value,
  isSecret,
  onClick,
}: {
  envName: string
  value: string
  isSecret: boolean
  onClick: React.MouseEventHandler
}) {
  return (
    <div
      key={envName}
      className="mr-4 inline-flex cursor-pointer items-center rounded-md text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/40 hover:shadow-md dark:text-gray-50 dark:ring-gray-500 dark:hover:underline dark:hover:underline-offset-2"
      onClick={onClick}
    >
      <span className="rounded-l-md bg-gray-100 px-3 py-2 font-bold ring-1 ring-inset ring-gray-500/40 dark:bg-slate-700 dark:ring-gray-500">
        {envName}
      </span>
      <span className="px-3 text-slate-900 dark:text-slate-50">
        {value === null ? (
          <i>Unspecified</i>
        ) : isSecret ? (
          "*****"
        ) : (
          truncateVariableValue(value)
        )}
      </span>
    </div>
  )
}
