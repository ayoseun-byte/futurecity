export type post_checkApprovalAndGetApproveTx = {
    needs_approval: boolean;
    approve_tx: ApproveTx;
    token: HexString;
    amount: string;
}


type HexString = `0x${string}`;

interface ApproveTxMeta {
    network: string;
    networkName: string;
    action: "approveToken" | string;
    tokenAddress: HexString;
    spender: HexString;
    amount: string;
}

interface ApproveTx {
    signingMethod: "eth_sendTransaction" | string;
    tx: {
        from: HexString;
        to: HexString;
        data: HexString;
        value: HexString;
        nonce: HexString;
        gas: HexString;
        chainId: HexString;
        maxFeePerGas: HexString;
        maxPriorityFeePerGas: HexString;
    };
    meta: ApproveTxMeta;
}

