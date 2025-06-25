export interface IContainerCount {
  running?: number;
  stopped?: number;
  loading: boolean;
  error?: string;
  lastUpdated?: number;
  hasData: boolean;
}
