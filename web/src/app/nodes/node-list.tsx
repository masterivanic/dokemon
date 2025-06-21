import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

// Import components
import Loading from "@/components/widgets/loading";
import { Breadcrumb, BreadcrumbCurrent } from "@/components/widgets/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TableButtonDelete from "@/components/widgets/table-button-delete";
import MainArea from "@/components/widgets/main-area";
import TopBar from "@/components/widgets/top-bar";
import TopBarActions from "@/components/widgets/top-bar-actions";
import MainContent from "@/components/widgets/main-content";
import NodeAddDialog from "./node-add-dialog";
import { Button } from "@/components/ui/button";
import NodeRegisterDialog from "./node-register-dialog";
import ServerUrlEditDialog from "./serverurl-edit-dialog";
import { TableNoData } from "@/components/widgets/table-no-data";
import DeleteDialog from "@/components/delete-dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import models and utilities
import { INodeHead } from "@/lib/api-models";
import { apiNodesDelete, apiNodesGenerateToken } from "@/lib/api";
import { VERSION } from "@/lib/version";
import { cn, toastFailed, toastSomethingWentWrong, toastSuccess } from "@/lib/utils";
import useNodes from "@/hooks/useNodes";
import useSetting from "@/hooks/useSetting";
import { useFilterAndSort } from "@/lib/useFilterAndSort";
import apiBaseUrl from "@/lib/api-base-url";

// Cookie utilities
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value}; ${expires}; path=/`;
}

// Types for container counts state
interface ContainerCount {
  running?: number;
  stopped?: number;
  loading: boolean;
  error?: string;
  lastUpdated?: number;
  hasData: boolean;
}

type ContainerCountsState = Record<number, ContainerCount>;

type ContainerCountsAction =
  | { type: 'UPDATE_NODE'; nodeId: number; data: ContainerCount }
  | { type: 'BATCH_UPDATE'; updates: Record<number, ContainerCount> }
  | { type: 'RESET' };

// Reducer for container counts
function containerCountsReducer(
  state: ContainerCountsState,
  action: ContainerCountsAction
): ContainerCountsState {
  switch (action.type) {
    case 'UPDATE_NODE':
      return { ...state, [action.nodeId]: action.data };
    case 'BATCH_UPDATE':
      return { ...state, ...action.updates };
    case 'RESET':
      return {};
    default:
      return state;
  }
}

export default function NodeList() {
  const navigate = useNavigate();
  const { isLoading, nodes, mutateNodes } = useNodes();
  const { setting } = useSetting("SERVER_URL");
  const [token, setToken] = useState("");
  const [updateAgent, setUpdateAgent] = useState(false);
  const [registerNodeOpen, setRegisterNodeOpen] = useState(false);
  const [nodeHead, setNodeHead] = useState<INodeHead | null>(null);
  const [deleteNodeOpenConfirmation, setDeleteNodeOpenConfirmation] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [containerCounts, dispatch] = useReducer(containerCountsReducer, {});
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const savedInterval = getCookie('refreshInterval');
    return savedInterval ? parseInt(savedInterval) : 60;
  });
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Save refresh interval to cookie
  useEffect(() => {
    setCookie('refreshInterval', refreshInterval.toString());
  }, [refreshInterval]);

  // Filter and sort nodes
  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedNodes = [],
    requestSort,
    sortConfig
  } = useFilterAndSort<INodeHead>(nodes?.items || [], {
    initialSortKey: "name",
    initialSortDirection: "asc",
    filterKeys: ['name', 'environment', 'agentVersion']
  });

  // Pagination
  const totalItems = sortedNodes.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedNodes = sortedNodes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Update current time every second
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (refreshInterval > 0) {
      intervalId = setInterval(() => setCurrentTime(Date.now()), 1000);
    }
    return () => intervalId && clearInterval(intervalId);
  }, [refreshInterval]);

  const secondsSinceLastRefresh = Math.floor((currentTime - lastRefreshTime) / 1000);

  // Pagination handlers
  const handlePageSizeChange = useCallback((value: string) => {
    const newSize = Number(value);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing size
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // Fetch container counts for a single node
  const fetchNodeContainers = useCallback(async (nodeId: number, nodeOnline: boolean): Promise<ContainerCount> => {
    if (!nodeOnline) {
      return {
        loading: false,
        error: 'Host offline',
        lastUpdated: Date.now(),
        hasData: false
      };
    }

    try {
      const response = await axios.get(`${apiBaseUrl()}/nodes/${nodeId}/containers`, {
        timeout: 15000,
        validateStatus: () => true
      });

      if (response.status >= 400) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const containers = response.data?.items || [];
      const running = containers.filter((c: any) => c.state === 'running').length;
      const stopped = containers.filter((c: any) => c.state === 'exited').length;

      return {
        running,
        stopped,
        loading: false,
        lastUpdated: Date.now(),
        error: undefined,
        hasData: true
      };
    } catch (error) {
      console.error(`Failed to fetch containers for node ${nodeId}:`, error);
      return {
        loading: false,
        error: 'Service unavailable',
        lastUpdated: Date.now(),
        hasData: false
      };
    }
  }, []);

  // Fetch counts for all nodes
  const fetchAllCounts = useCallback(async () => {
    const refreshTime = Date.now();
    setLastRefreshTime(refreshTime);
    setCurrentTime(refreshTime);
    
    if (!nodes?.items) return;

    // Process nodes sequentially to prevent concurrent state updates
    for (const node of nodes.items) {
      try {
        dispatch({
          type: 'UPDATE_NODE',
          nodeId: node.id,
          data: { loading: true, hasData: false }
        });

        const result = await fetchNodeContainers(node.id, node.online);
        dispatch({
          type: 'UPDATE_NODE',
          nodeId: node.id,
          data: result
        });
      } catch (error) {
        console.error(`Error processing node ${node.id}:`, error);
        dispatch({
          type: 'UPDATE_NODE',
          nodeId: node.id,
          data: {
            loading: false,
            error: 'Fetch error',
            lastUpdated: Date.now(),
            hasData: false
          }
        });
      }
    }
  }, [nodes, fetchNodeContainers]);

  // Set up refresh interval
  useEffect(() => {
    const abortController = new AbortController();
    fetchAllCounts();
    
    let refreshIntervalId: NodeJS.Timeout;
    if (refreshInterval > 0) {
      refreshIntervalId = setInterval(fetchAllCounts, refreshInterval * 1000);
    }

    return () => {
      abortController.abort();
      refreshIntervalId && clearInterval(refreshIntervalId);
    };
  }, [fetchAllCounts, refreshInterval]);

  // Handle refresh for a single node
  const handleRefreshCounts = (nodeId: number, nodeOnline: boolean) => {
    dispatch({
      type: 'UPDATE_NODE',
      nodeId,
      data: { loading: true, hasData: false }
    });
    
    fetchNodeContainers(nodeId, nodeOnline)
      .then(result => {
        dispatch({
          type: 'UPDATE_NODE',
          nodeId,
          data: result
        });
      });
  };

  // Handle node registration
  const handleRegister = async (nodeId: number, update: boolean) => {
    const response = await apiNodesGenerateToken(nodeId);
    if (!response.ok) {
      toastSomethingWentWrong("There was a problem when generating the registration token. Try again!");
    } else {
      const data: { token: string } = await response.json();
      setToken(data.token);
      setUpdateAgent(update);
      setRegisterNodeOpen(true);
    }
  };

  // Handle node deletion
  const handleDeleteNodeConfirmation = (nodeHead: INodeHead) => {
    setNodeHead(nodeHead);
    setDeleteNodeOpenConfirmation(true);
  };

  const handleDelete = async () => {
    setDeleteInProgress(true);
    const response = await apiNodesDelete(Number(nodeHead?.id));
    if (!response.ok) {
      const r = await response.json();
      setDeleteNodeOpenConfirmation(false);
      toastFailed(r.errors?.body);
    } else {
      mutateNodes();
      setTimeout(() => {
        setDeleteNodeOpenConfirmation(false);
        toastSuccess("Node deleted.");
      }, 500);
    }
    setDeleteInProgress(false);
  };

  // Helper function to check if node is Dokemon node
  const isDokemonNode = (nodeHead: INodeHead) => nodeHead.id === 1;

  // Helper component for node status icon
  const NodeStatusIcon = ({ nodeHead }: { nodeHead: INodeHead }) => (
    <span 
      className={cn(
        "-ml-2 mr-3 text-lg",
        nodeHead.online ? "text-green-600" : "text-red-600"
      )}
      title={nodeHead.online ? "Online" : "Offline"}
    >
      ●
    </span>
  );

  // Helper function to format agent version
  const getAgentVersion = (nodeHead: INodeHead): string => {
    if (isDokemonNode(nodeHead)) {
      const arch = (nodeHead as any).architecture;
      return `Server v${VERSION}` + (arch ? ` (${arch})` : "");
    }

    if (nodeHead.agentVersion) {
      const mainParts = nodeHead.agentVersion.split('-');
      const version = mainParts[0] || '';
      const rest = mainParts.length > 1 ? mainParts[1] : '';
      const arch = rest.split('@')[0] || null;
      
      return `v${version}` + (arch ? ` (${arch})` : '');
    }

    return "-";
  };

  // Helper component for IPs display
  const NodeIPsDisplay = ({ nodeHead }: { nodeHead: INodeHead }) => {
    if (!nodeHead.agentVersion) return <span>-</span>;

    const extractIPs = (agentVersion: string) => {
      if (!agentVersion) return null;
      const mainParts = agentVersion.split('-');
      const rest = mainParts.length > 1 ? mainParts[1] : '';
      const ips = rest.split('@').length > 1 ? rest.split('@')[1] : null;
      if (!ips) return null;

      const result: { ip?: string[], zt?: string[], ts?: string[] } = {};
      ips.split('+').forEach(component => {
        if (component.includes('.')) {
          if (component.startsWith('zt:')) {
            const ip = component.substring(3);
            result.zt = [...(result.zt || []), ip];
          } else if (component.startsWith('ts:')) {
            const ip = component.substring(3);
            result.ts = [...(result.ts || []), ip];
          } else {
            const ip = component;
            result.ip = [...(result.ip || []), ip];
          }
        }
      });
      return result;
    };

    const ips = extractIPs(nodeHead.agentVersion);
    if (!ips || (!ips.ip?.length && !ips.zt?.length && !ips.ts?.length)) {
      return <span>-</span>;
    }

    return (
      <div className="flex items-center gap-1">
        {ips.ip?.map((ip, index) => (
          <Popover key={`ip-${index}`}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300 cursor-pointer">
                Local
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto">
              <div className="grid gap-2">
                <h4 className="font-medium leading-none">Local IP</h4>
                <div className="text-sm">{ip}</div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
        {ips.zt?.map((ip, index) => (
          <Popover key={`zt-${index}`}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300 cursor-pointer ml-1">
                ZeroTier
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto">
              <div className="grid gap-2">
                <h4 className="font-medium leading-none">ZeroTier IP</h4>
                <div className="text-sm">{ip}</div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
        {ips.ts?.map((ip, index) => (
          <Popover key={`ts-${index}`}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-300 cursor-pointer ml-1">
                Tailscale
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto">
              <div className="grid gap-2">
                <h4 className="font-medium leading-none">Tailscale IP</h4>
                <div className="text-sm">{ip}</div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    );
  };

  // Helper component for containers display
  const NodeContainersDisplay = React.memo(({ 
    counts, 
    onRefresh, 
    nodeOnline 
  }: {
    counts: ContainerCount;
    onRefresh: () => void;
    nodeOnline: boolean;
  }) => {
    if (!nodeOnline) {
      return (
        <div className="flex items-center gap-1">
          <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">Offline</span>
        </div>
      );
    }

    if (counts.error) {
      return (
        <div className="flex items-center gap-1">
          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
          <span className="text-xs text-yellow-600">{counts.error}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            className="text-gray-400 hover:text-gray-600 ml-1"
            title="Retry"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      );
    }

    if (counts.loading) {
      return (
        <div className="flex items-center gap-1">
          <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      );
    }

    if (!counts.hasData) {
      return (
        <button 
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          className="text-gray-400 hover:text-gray-600"
          title="Load counts"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      );
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
                  {counts.running} container{counts.running !== 1 ? 's' : ''} running
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
                  {counts.stopped} container{counts.stopped !== 1 ? 's' : ''} stopped
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          className="text-gray-400 hover:text-gray-600 ml-1"
          title="Refresh counts"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    );
  });

  if (isLoading) return <Loading />;

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
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("name")}
              >
                <div className="flex items-center ml-3">
                  Name
                  {sortConfig.key === "name" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">Containers</TableHead>
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("environment")}
              >
                <div className="flex items-center ml-3">
                  Environment
                  {sortConfig.key === "environment" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">Agent Version</TableHead>
              <TableHead scope="col">Network</TableHead>
              <TableHead scope="col">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedNodes.length === 0 ? (
              <TableNoData colSpan={6} />
            ) : (
              paginatedNodes.map((item) => (
                <TableRow key={`${item.id}-${item.name}`}>
                  <TableCell>
                    <div className="flex items-center">
                      <NodeStatusIcon nodeHead={item} />
                      <span 
                        className="cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => navigate(`/nodes/${item.id}/containers`)}
                      >
                        {item.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NodeContainersDisplay 
                      counts={containerCounts[item.id] || { loading: false, hasData: false }}
                      onRefresh={() => handleRefreshCounts(item.id, item.online)}
                      nodeOnline={item.online}
                    />
                  </TableCell>
                  <TableCell>
                    {item.environment ? item.environment : "-"}
                  </TableCell>
                  <TableCell>
                    {getAgentVersion(item)}
                  </TableCell>
                  <TableCell>
                    <NodeIPsDisplay nodeHead={item} />
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1">
                      {!item.registered ? (
                        <>
                          <Button
                            size={"sm"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegister(item.id, false);
                            }}
                          >
                            Register
                          </Button>
                          {!isDokemonNode(item) && (
                            <Button
                              variant="destructive"
                              size={"sm"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNodeConfirmation(item);
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
                              e.stopPropagation();
                              navigate(`/nodes/${item.id}/details`);
                            }}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {!isDokemonNode(item) && (
                            <TableButtonDelete
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNodeConfirmation(item);
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
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
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems} nodes
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Refresh:</span>
              <Select
                value={refreshInterval.toString()}
                onValueChange={(value) => setRefreshInterval(Number(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="60s" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">60s</SelectItem>
                  <SelectItem value="120">120s</SelectItem>
                  <SelectItem value="180">180s</SelectItem>
                  <SelectItem value="300">300s</SelectItem>
                  <SelectItem value="0">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {refreshInterval > 0 && (
              <div className="text-sm text-gray-500">
                Last refresh: {secondsSinceLastRefresh}s ago
                {secondsSinceLastRefresh < refreshInterval && (
                  <span> (next in {refreshInterval - secondsSinceLastRefresh}s)</span>
                )}
              </div>
            )}
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

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
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
              );
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
  );
}