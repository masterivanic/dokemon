import { INodeHead } from '@/lib/api-models';
import { extractIPs } from '@/lib/utils';
import React, { useState  } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const NodeIPsDisplay = React.memo(({ nodeHead }: { nodeHead: INodeHead }) => {
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  if (!nodeHead.agentVersion) return <span>-</span>;

  const ips = extractIPs(nodeHead.agentVersion);

  if (!ips || (!ips.ip?.length && !ips.zt?.length && !ips.ts?.length)) {
    return <span>-</span>;
  }

  const handlePopoverToggle = (type: string) => {
    setOpenPopover(openPopover === type ? null : type);
  };

  return (
    <div className="flex items-center gap-1">
      {(ips.ip?.length ?? 0) > 0 && (
        <Popover
          open={openPopover === 'ip'}
          onOpenChange={(open) => setOpenPopover(open ? 'ip' : null)}
        >
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handlePopoverToggle('ip');
              }}
            >
              Local{(ips.ip?.length ?? 0) > 1 ? ` (${ips.ip?.length})` : ''}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="grid gap-2">
              <h4 className="font-medium leading-none">Local IP(s)</h4>
              <div className="text-sm space-y-1">
                {ips.ip?.map((ip, index) => (
                  <div key={`ip-${index}`}>{ip}</div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {(ips.zt?.length ?? 0) > 0 && (
        <Popover
          open={openPopover === 'zt'}
          onOpenChange={(open) => setOpenPopover(open ? 'zt' : null)}
        >
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handlePopoverToggle('zt');
              }}
            >
              ZeroTier{(ips.zt?.length ?? 0) > 1 ? ` (${ips.zt?.length})` : ''}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="grid gap-2">
              <h4 className="font-medium leading-none">ZeroTier IP(s)</h4>
              <div className="text-sm space-y-1">
                {ips.zt?.map((ip, index) => (
                  <div key={`zt-ip-${index}`}>{ip}</div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {(ips.ts?.length ?? 0) > 0 && (
        <Popover
          open={openPopover === 'ts'}
          onOpenChange={(open) => setOpenPopover(open ? 'ts' : null)}
        >
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-300 cursor-pointer ml-1"
              onClick={(e) => {
                e.stopPropagation();
                handlePopoverToggle('ts');
              }}
            >
              Tailscale{(ips.ts?.length ?? 0) > 1 ? ` (${ips.ts?.length})` : ''}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="grid gap-2">
              <h4 className="font-medium leading-none">Tailscale IP(s)</h4>
              <div className="text-sm space-y-1">
                {ips.ts?.map((ip, index) => (
                  <div key={`ts-ip-${index}`}>{ip}</div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
});
