import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RefreshControls({
  refreshInterval,
  setRefreshInterval,
  secondsSinceLastRefresh
}: {
  refreshInterval: number;
  setRefreshInterval: (value: number) => void;
  secondsSinceLastRefresh: number;
}) {
  return (
    <div className="flex items-center gap-5">
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
  );
}
