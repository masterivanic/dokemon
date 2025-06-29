import {
  Breadcrumb,
  BreadcrumbCurrent,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/widgets/breadcrumb"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import { useParams } from "react-router-dom"
import useNodeComposeContainers from "@/hooks/useNodeComposeContainers"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  INodeComposeContainer,
  INodeHead,
  IPageResponse,
} from "@/lib/api-models"
import Loading from "@/components/widgets/loading"
import { getContainerUrlFromPortMapping } from "@/lib/utils"
import useNodeHead from "@/hooks/useNodeHead"
import useNodeComposeItem from "@/hooks/useNodeComposeItem"
import { ArrowUpRight } from "lucide-react"
import EditContainerBaseUrlDialog from "@/app/nodes/containerbaseurl-edit-dialog"
import { TableNoData } from "@/components/widgets/table-no-data"
import { StaleStatusIcon } from "../containers/container-list"
import { Badge } from "@/components/ui/badge"

export default function ComposeContainerList() {
  const { nodeId, composeProjectId } = useParams()
  const { nodeHead } = useNodeHead(nodeId!)
  const { nodeComposeItem } = useNodeComposeItem(nodeId!, composeProjectId!)
  const { isLoading, composeContainers } = useNodeComposeContainers(
    nodeId!,
    composeProjectId!
  )

  if (isLoading) return <Loading />

  return (
    <MainArea>
      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{nodeHead?.name}</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbLink to={`/nodes/${nodeId}/compose`}>
            Compose
          </BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>
            {nodeComposeItem?.projectName}{" "}
            {nodeComposeItem?.status?.startsWith("running")
              ? "(Running)"
              : "(Not running)"}
          </BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Containers</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <EditContainerBaseUrlDialog />
        </TopBarActions>
      </TopBar>
      <MainContent>
        <ContainersTable
          composeContainers={composeContainers!}
          nodeHead={nodeHead!}
        />
      </MainContent>
    </MainArea>
  )
}

function ContainersTable({
  composeContainers,
  nodeHead,
}: {
  composeContainers: IPageResponse<INodeComposeContainer>
  nodeHead: INodeHead
}) {
  // Sorting and filtering logic for parity with container-list.tsx
  // For now, just static sort by name asc for visual parity
  const sortedItems = (composeContainers?.items || []).slice().sort((a, b) => a.name.localeCompare(b.name))

  function getPortsHtml(ports: string) {
    const arr = ports.split(", ").map((p, i) => {
      let url: string | null = ""
      try {
        url = getContainerUrlFromPortMapping(p, nodeHead?.containerBaseUrl)
      } catch (e) {
        console.log(e)
      }
      return (
        <div key={i}>
          {url ? (
            <a
              className="inline-block p-1 text-amber-600 hover:underline hover:underline-offset-2"
              target="_blank"
              href={url}
              onClick={(e) => e.stopPropagation()}
            >
              {p}
              <ArrowUpRight className="ml-1 inline w-4" />
            </a>
          ) : (
            <span>{p}</span>
          )}
          <br />
        </div>
      )
    })
    return arr
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            scope="col"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex items-center">
              State
              {/* No sort indicator for now */}
            </div>
          </TableHead>
          <TableHead
            scope="col"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex items-center">
              Name
              {/* No sort indicator for now */}
            </div>
          </TableHead>
          <TableHead scope="col">Image</TableHead>
          <TableHead scope="col">Ports</TableHead>
          <TableHead scope="col">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedItems.length === 0 ? (
          <TableNoData colSpan={5} />
        ) : (
          sortedItems.map((item) => (
            <TableRow key={item.name}>
              <TableCell>
                {item.state == "exited" ? (
                  <Badge title={item.status} className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
                    {item.state}
                  </Badge>
                ) : (
                  <Badge title={item.status} className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    {item.state}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <button
                  className="font-bold hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                  title={`Image: ${item.image}`}
                  // No logs navigation for compose containers for now
                  style={{ cursor: 'default' }}
                >
                  {item.name}
                </button>
                <br />
                <span className="ml-4 text-xs">
                  {item.id.substring(0, 12)}
                </span>
              </TableCell>
              <TableCell>
                <StaleStatusIcon status={item.stale} />
                {item.image}
              </TableCell>
              <TableCell>{getPortsHtml(item.ports)}</TableCell>
              <TableCell className="text-left">
                {/* No actions for compose containers for now, but keep cell for layout parity */}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}