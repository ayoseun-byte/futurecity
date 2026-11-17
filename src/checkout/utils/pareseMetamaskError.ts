type ChainType = "solana" | "evm";

export function parseMetaMaskError(error: unknown, chain?: ChainType): string {
  const raw = extractMessage(error).toLowerCase();

  const parsers: [RegExp, string][] = [
    // -------------------------
    // Universal
    // -------------------------
    [
      /user rejected|rejected the request|denied transaction|user cancelled|user canceled|cancelled by user|canceled by user|transaction cancelled|transaction canceled|user denied|4001|action_rejected|window closed|user closed modal/,
      "Transaction cancelled.",
    ],
    [
      /insufficient funds|insufficient balance|insufficient lamports|exceeds the balance of the account|exceeds account balance/,
      "Insufficient balance.",
    ],
    [
      /network error|failed to fetch|rpc error|connection refused|connection reset|econnrefused|fetch failed/,
      "Network error. Please try again.",
    ],
    [/timeout|timed out/, "Transaction timed out. Please retry."],
    [
      /rate limit|too many requests|429|limitexceededrpc/,
      "Rate limit hit. Please wait and retry.",
    ],
    [
      /wallet not connected|no provider|provider not found|no wallet|connector not connected|connector not found|cannot read propert.*sendtransaction/,
      "Wallet not connected.",
    ],
    [
      /invalid address|bad address|malformed address/,
      "Invalid wallet address.",
    ],
    [
      /slippage|price impact too high|price moved|slippage tolerance/,
      "Price moved too much. Try again or increase slippage.",
    ],
    [
      /insufficient liquidity|not enough liquidity|liquidity too low/,
      "Insufficient liquidity for this trade.",
    ],

    // -------------------------
    // Solana
    // -------------------------
    [
      /blockhash not found|blockhash expired/,
      "Transaction expired. Please retry.",
    ],
    [/simulation failed/, "Transaction simulation failed."],
    [/custom program error/, "Smart contract execution failed."],
    [/invalid account data/, "Invalid account state."],
    [/signature verification failed/, "Transaction signature invalid."],
    [/account not found/, "Required account not found."],
    [/already processed/, "Transaction already submitted."],
    [/compute budget exceeded/, "Transaction exceeded compute limit."],
    [/program failed to complete/, "Program execution failed."],
    [
      /transaction too large/,
      "Transaction too large. Try reducing instructions.",
    ],
    [
      /token account not found|associated token account/,
      "Token account not initialised.",
    ],
    [/account in use|account already exists/, "Account already exists."],
    [
      /rent exempt|below rent-exempt/,
      "Account balance too low (rent exemption).",
    ],
    [/transaction has too many/, "Too many instructions in transaction."],

    // -------------------------
    // EVM
    // -------------------------
    [
      /insufficient allowance|transfer amount exceeds allowance|erc20insufficientallowance/,
      "Token allowance too low. Approve spending first.",
    ],
    [
      /transfer amount exceeds balance|erc20: transfer amount|erc20insufficientbalance/,
      "Insufficient token balance.",
    ],
    [/nonce too low|nonce already used|transaction nonce/, "Transaction nonce outdated. Please retry."],
    [
      /replacement transaction underpriced|transaction underpriced|replacement fee too low|gas price below minimum|gas tip cap/,
      "Gas fee too low. Increase gas price.",
    ],
    [/intrinsic gas too low/, "Gas limit too low."],
    [
      /gas required exceeds allowance|exceeds block gas limit/,
      "Gas limit exceeded.",
    ],
    [
      /max fee per gas less than block base fee|max priority fee per gas higher than max fee/,
      "Gas fee below network minimum. Increase gas.",
    ],
    [/unpredictable_gas_limit/, "Could not estimate gas. Contract may revert."],
    [/invalid sender/, "Invalid wallet signature."],
    [
      /chain id mismatch|wrong network|network_error/,
      "Wrong network selected.",
    ],
    [/already known|already pending/, "Transaction already pending."],
    [
      /txpool is full|transaction pool is full/,
      "Network congested. Please retry later.",
    ],
    [
      /execution reverted|call_exception|contractfunctionreverted/,
      "Smart contract rejected the transaction.",
    ],
    [
      /server_error|internal json-rpc error|-32603/,
      "RPC server error. Please retry.",
    ],
    [
      /numeric_fault|overflow|underflow/,
      "Numeric error in transaction parameters.",
    ],
  ];

  for (const [pattern, message] of parsers) {
    if (pattern.test(raw)) return message as string;
  }

  console.error("Unhandled blockchain error:", error);

  // If the error has a clean, readable message (not raw RPC/hex dump), surface it for UX
  if (error instanceof Error && error.message) {
    const msg = error.message.trim();
    const isTechnicalDump =
      msg.includes("0x") ||
      msg.includes("Internal JSON-RPC") ||
      msg.includes("{\n") ||
      msg.includes('{"') ||
      msg.includes("Call exception") ||
      msg.length > 200;

    if (!isTechnicalDump && msg.length > 0) {
      return msg;
    }
  }

  return chain
    ? `${chain === "evm" ? "EVM" : "Solana"} transaction failed. Please try again.`
    : "Transaction failed. Please try again.";
}

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;

  const parts: string[] = [];

  if (error instanceof Error) {
    if (error.name) parts.push(error.name);
    if (error.message) parts.push(error.message);

    const anyErr = error as any;
    if (anyErr.shortMessage && anyErr.shortMessage !== error.message) {
      parts.push(anyErr.shortMessage);
    }
    if (anyErr.reason && anyErr.reason !== error.message) {
      parts.push(anyErr.reason);
    }
    if (anyErr.details && anyErr.details !== error.message) {
      parts.push(String(anyErr.details));
    }
    if (typeof anyErr.code === "string" || typeof anyErr.code === "number") {
      parts.push(String(anyErr.code));
    }

    if (anyErr.cause) {
      if (typeof anyErr.cause === "string") {
        parts.push(anyErr.cause);
      } else if (typeof anyErr.cause === "object") {
        if (anyErr.cause.name) parts.push(anyErr.cause.name);
        if (anyErr.cause.message) parts.push(anyErr.cause.message);
        if (anyErr.cause.shortMessage) parts.push(anyErr.cause.shortMessage);
        if (anyErr.cause.reason) parts.push(anyErr.cause.reason);
        if (anyErr.cause.details) parts.push(String(anyErr.cause.details));
        if (anyErr.cause.code !== undefined) parts.push(String(anyErr.cause.code));
      }
    }

    if (anyErr.response?.data?.message) {
      parts.push(String(anyErr.response.data.message));
    }

    // Viem error walk to find root cause
    if (typeof anyErr.walk === "function") {
      try {
        const root = anyErr.walk();
        if (root && root !== error) {
          if (root.name) parts.push(root.name);
          if (root.message) parts.push(root.message);
          if (root.shortMessage) parts.push(root.shortMessage);
          if (root.details) parts.push(String(root.details));
        }
      } catch {
        // ignore walk error
      }
    }

    return parts.join(" ");
  }

  if (typeof error === "object") {
    const e = error as any;
    if (e.reason) parts.push(e.reason);
    if (e.shortMessage) parts.push(e.shortMessage);
    if (e.message) parts.push(e.message);
    if (e.details) parts.push(String(e.details));
    if (e.code !== undefined) parts.push(String(e.code));
    if (e.error?.message) parts.push(e.error.message);
    if (e.data?.message) parts.push(e.data.message);
    if (e.response?.data?.message) parts.push(e.response.data.message);

    if (parts.length > 0) return parts.join(" ");

    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }

  return String(error);
}
