import { useState } from "react"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toastFailed, toastSuccess } from "@/lib/utils"
import apiBaseUrl from "@/lib/api-base-url"
import useNetworks from "@/hooks/useNetworks"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { DialogFooter, DialogHeader } from "@/components/ui/dialog"

const NETWORK_DRIVERS = [
  { value: "bridge", label: "Bridge" },
  { value: "host", label: "Host" },
  { value: "overlay", label: "Overlay" },
  { value: "macvlan", label: "Macvlan" },
  { value: "ipvlan", label: "IPvlan" },
  { value: "none", label: "None" },
]

const IPAM_DRIVERS = [
  { value: "default", label: "Default" },
  { value: "dhcp", label: "DHCP" },
]

export default function NetworkCreateDialog({
  open,
  onOpenChange
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void
}) {
  const { nodeId } = useParams()
  const { mutateNetworks } = useNetworks(nodeId!)

  const [networkName, setNetworkName] = useState("")
  const [driver, setDriver] = useState("bridge")
  const [internal, setInternal] = useState(false)
  const [attachable, setAttachable] = useState(false)
  const [ingress, setIngress] = useState(false)
  const [enableIPv6, setEnableIPv6] = useState(false)
  const [ipamDriver, setIpamDriver] = useState("default")
  const [subnet, setSubnet] = useState("")
  const [gateway, setGateway] = useState("")
  const [createInProgress, setCreateInProgress] = useState(false)

  const handleCreateNetwork = async () => {
    if (!networkName) {
      toastFailed("Network name cannot be empty")
      return
    }

    setCreateInProgress(true)

    try {
      const ipamConfig = []
      if (subnet) {
        ipamConfig.push({
          subnet,
          gateway: gateway || undefined
        })
      }

      const response = await fetch(
        `${apiBaseUrl()}/nodes/${nodeId}/networks/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: networkName,
            driver,
            internal,
            attachable,
            ingress,
            enableIPv6,
            ipam: {
              driver: ipamDriver,
              config: ipamConfig
            }
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create network")
      }

      mutateNetworks()
      onOpenChange(false)
      resetForm()
      toastSuccess("Network created successfully")
    } catch (error: unknown) {
      if (error instanceof Error) {
        toastFailed(error.message)
      } else {
        toastFailed("An unknown error occurred")
      }
    } finally {
      setCreateInProgress(false)
    }
  }

  const resetForm = () => {
    setNetworkName("")
    setDriver("bridge")
    setInternal(false)
    setAttachable(false)
    setIngress(false)
    setEnableIPv6(false)
    setIpamDriver("default")
    setSubnet("")
    setGateway("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Network</DialogTitle>
          <DialogDescription>
            Create a new Docker network
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name*
            </Label>
            <Input
              id="name"
              value={networkName}
              onChange={(e) => setNetworkName(e.target.value)}
              className="col-span-3"
              placeholder="my-network"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="driver" className="text-right">
              Driver
            </Label>
            <Select
              value={driver}
              onValueChange={setDriver}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {NETWORK_DRIVERS.map((driver) => (
                  <SelectItem key={driver.value} value={driver.value}>
                    {driver.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ipam-driver" className="text-right">
              IPAM Driver
            </Label>
            <Select
              value={ipamDriver}
              onValueChange={setIpamDriver}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select IPAM driver" />
              </SelectTrigger>
              <SelectContent>
                {IPAM_DRIVERS.map((driver) => (
                  <SelectItem key={driver.value} value={driver.value}>
                    {driver.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subnet" className="text-right">
              Subnet
            </Label>
            <Input
              id="subnet"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              className="col-span-3"
              placeholder="172.28.0.0/16"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gateway" className="text-right">
              Gateway
            </Label>
            <Input
              id="gateway"
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              className="col-span-3"
              placeholder="172.28.5.1"
              disabled={!subnet}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="internal" className="text-right">
              Internal
            </Label>
            <Checkbox
              id="internal"
              checked={internal}
              onCheckedChange={(checked) => setInternal(checked === true)}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="attachable" className="text-right">
              Attachable
            </Label>
            <Checkbox
              id="attachable"
              checked={attachable}
              onCheckedChange={(checked) => setAttachable(checked === true)}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ingress" className="text-right">
              Ingress
            </Label>
            <Checkbox
              id="ingress"
              checked={ingress}
              onCheckedChange={(checked) => setIngress(checked === true)}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ipv6" className="text-right">
              Enable IPv6
            </Label>
            <Checkbox
              id="ipv6"
              checked={enableIPv6}
              onCheckedChange={(checked) => setEnableIPv6(checked === true)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreateNetwork}
            disabled={createInProgress || !networkName}
          >
            {createInProgress ? "Creating..." : "Create Network"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
