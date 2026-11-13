export type Eip1193Provider = {
  request(args: {
    method: string
    params?: unknown[] | Record<string, unknown>
  }): Promise<unknown>
}

type Web3AuthConnection = {
  status?: string
  connection?: {
    ethereumProvider?: unknown
  } | null
}

function isEip1193Provider(value: unknown): value is Eip1193Provider {
  return (
    typeof value === 'object' &&
    value !== null &&
    'request' in value &&
    typeof (value as { request?: unknown }).request === 'function'
  )
}

function resolveProvider(
  connection: unknown,
  hookProvider?: unknown,
): Eip1193Provider | null {
  const auth = connection as Web3AuthConnection | null

  const candidates = [
    hookProvider,
    auth?.connection?.ethereumProvider,
  ]

  return candidates.find(isEip1193Provider) ?? null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForProvider(
  connection: unknown,
  hookProvider?: unknown,
  timeoutMs = 10000,
): Promise<Eip1193Provider> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const provider = resolveProvider(connection, hookProvider)

    if (provider) {
      return provider
    }

    await sleep(200)
  }

  throw new Error(
    'Web3Auth is authenticated, but its EVM provider is unavailable. ' +
    'Wait for the Web3Auth connection to finish initializing, then retry.',
  )
}

function utf8ToHex(value: string): `0x${string}` {
  const bytes = new TextEncoder().encode(value)

  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return `0x${hex}`
}

export async function signEip191ViaWeb3Auth(
  connection: unknown,
  message: string,
  expectedAddress: string,
  hookProvider?: unknown,
): Promise<string> {
  if (!message) {
    throw new Error('Cannot sign an empty challenge.')
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(expectedAddress)) {
    throw new Error(`Invalid EVM signer address: ${expectedAddress}`)
  }

  const provider = await waitForProvider(
    connection,
    hookProvider,
  )

  const signature = await provider.request({
    method: 'personal_sign',
    params: [
      utf8ToHex(message),
      expectedAddress,
    ],
  })

  if (
    typeof signature !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(signature)
  ) {
    throw new Error('Web3Auth returned an invalid EIP-191 signature.')
  }

  return signature
}