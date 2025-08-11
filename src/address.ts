import { getCreate2Address, getCreateAddress, pad, toBytes, toHex } from 'viem';
import { packVec3 } from './math';
import { DEFAULT_CREATE3_PROXY_INITCODE_HASH } from './viem';

type Hex = `0x${string}`;

export function getChunkSalt(coord: [number, number, number]): `0x${string}` {
    const packed = packVec3(coord);
    const packedBytes = toBytes(packed, { size: 12 });
    const padded = pad(packedBytes, { size: 32 });
    return toHex(padded) as `0x${string}`;
}

// --- Create3 Address Logic ---
interface Create3AddressOptions {
    from: Hex;
    salt: Hex;
    proxyInitCodeHash?: Hex;
}

export function getCreate3Address_TS(opts: Create3AddressOptions): { finalAddress: Hex; proxyAddress: Hex } {
    const proxyAddress = getCreate2Address({
        from: opts.from,
        salt: opts.salt,
        bytecodeHash: opts.proxyInitCodeHash ?? DEFAULT_CREATE3_PROXY_INITCODE_HASH,
    });
    const finalAddress = getCreateAddress({ from: proxyAddress, nonce: 1n });
    return { finalAddress, proxyAddress };
}
