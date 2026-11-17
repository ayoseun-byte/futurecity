import { networks } from '@/config'
import type { AppKitNetwork } from '@reown/appkit/networks'


export function findAppKitNetwork(name: string): AppKitNetwork | undefined {
    const lower = name.toLowerCase()
    const network =
        networks.find(n => n.name.toLowerCase() === lower) ||
        networks.find(n => n.name.toLowerCase().includes(lower) || lower.includes(n.name.toLowerCase()))
    if (!network) return undefined
    return network
}