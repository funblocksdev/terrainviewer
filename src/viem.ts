import { createPublicClient, http } from 'viem';

export const redstoneChain = {
    id: 690,
    name: 'redstone',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.redstonechain.com'] } },
};

export const client = createPublicClient({ chain: redstoneChain, transport: http() });

export const worldAddress = "0x253eb85B3C953bFE3827CC14a151262482E7189C";
export const DEFAULT_CREATE3_PROXY_INITCODE_HASH: `0x${string}` = "0x21c35dbe1b344a2488cf3321d6ce542f8e9f305544ff09e4993a62319a497c1f";
