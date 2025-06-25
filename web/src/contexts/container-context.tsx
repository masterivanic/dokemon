import React, { createContext, useCallback, useContext, useReducer } from 'react';
import { IContainerCount } from '@/lib/generic-type';
import axios from 'axios';
import apiBaseUrl from '@/lib/api-base-url';

type ContainerCountsState = Record<number, IContainerCount>;

type ContainerCountsAction =
    | { type: 'UPDATE_NODE'; nodeId: number; data: IContainerCount }
    | { type: 'BATCH_UPDATE'; updates: Record<number, IContainerCount> }
    | { type: 'RESET' };

const ContainerContext = createContext<{
    state: ContainerCountsState;
    dispatch: React.Dispatch<ContainerCountsAction>;
    fetchNodeContainers: (nodeId: number, nodeOnline: boolean) => Promise<IContainerCount>;
} | undefined>(undefined);


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

export function ContainerProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(containerCountsReducer, {});

    const fetchNodeContainers = useCallback(async (nodeId: number, nodeOnline: boolean): Promise<IContainerCount> => {
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

    const contextValue = React.useMemo(() => ({
        state,
        dispatch,
        fetchNodeContainers
    }), [state, fetchNodeContainers]);
    return (
        <ContainerContext.Provider value={contextValue}>
            {children}
        </ContainerContext.Provider>
    );
}

export function useContainerContext() {
    const context = useContext(ContainerContext);
    if (context === undefined) {
        throw new Error('useContainerContext must be used within a ContainerProvider');
    }
    return context;
}
