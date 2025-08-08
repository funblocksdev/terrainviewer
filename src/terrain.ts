import { getCreate2Address, getCreateAddress, pad, toBytes, toHex } from 'viem';
type Hex = `0x${string}`
import { client, worldAddress, DEFAULT_CREATE3_PROXY_INITCODE_HASH } from './viem';

export const CHUNK_WIDTH = 16;

// --- Vector Math ---
class Vec3 {
    x: number;
    y: number;
    z: number;
    
    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    scale(n: number): Vec3 {
        return new Vec3(this.x * n, this.y * n, this.z * n);
    }
    floor(): Vec3 {
        return new Vec3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    }
}

function packVec3([x, y, z]: [number, number, number]): bigint {
    const ux = BigInt(x >>> 0);
    const uy = BigInt(y >>> 0);
    const uz = BigInt(z >>> 0);
    return (ux << 64n) | (uy << 32n) | uz;
}

// --- Chunk Logic ---
export function voxelToChunkPos(p: {x: number, y: number, z: number}): [number, number, number] {
    const chunkCoords = new Vec3(p.x, p.y, p.z).scale(1 / CHUNK_WIDTH).floor();
    return [chunkCoords.x, chunkCoords.y, chunkCoords.z];
}

function getChunkSalt(coord: [number, number, number]): `0x${string}` {
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

export function chunkToVoxelPos(chunkCoord: [number, number, number]): [number, number, number] {
    return [chunkCoord[0] * CHUNK_WIDTH, chunkCoord[1] * CHUNK_WIDTH, chunkCoord[2] * CHUNK_WIDTH];
}

function getCreate3Address_TS(opts: Create3AddressOptions): { finalAddress: Hex; proxyAddress: Hex } {
    const proxyAddress = getCreate2Address({
        from: opts.from,
        salt: opts.salt,
        bytecodeHash: opts.proxyInitCodeHash ?? DEFAULT_CREATE3_PROXY_INITCODE_HASH,
    });
    const finalAddress = getCreateAddress({ from: proxyAddress, nonce: 1n });
    return { finalAddress, proxyAddress };
}

export async function getTerrainData(x: number, y: number, z: number): Promise<{ finalAddress: Hex, terrainData: Hex, debugInfo: string[] }> {
    let debugInfo: string[] = [];

    debugInfo.push(`1. Input Voxel Coords: [${x}, ${y}, ${z}]`);

    const position = new Vec3(x, y, z);
    const chunkCoord = voxelToChunkPos(position);
    debugInfo.push(`2. Calculated Chunk Coords: [${chunkCoord.join(', ')}]`);

    const salt = getChunkSalt(chunkCoord);
    debugInfo.push(`3. Generated Salt (32 bytes): ${toHex(salt)}`);

    const { finalAddress, proxyAddress } = getCreate3Address_TS({ from: worldAddress, salt: salt });
    debugInfo.push(`4. CREATE2 Proxy Address: ${proxyAddress}`);
    debugInfo.push(`5. Final CREATE3 Chunk Address: ${finalAddress}`);

    const terrainData = await client.getCode({ address: finalAddress });

    if (!terrainData || terrainData === "0x") {
        throw new Error("Chunk not explored or contract has no bytecode.");
    }

    return { finalAddress, terrainData, debugInfo };
}

export function decodeTerrainHeader(hexData: Hex): { version: number, biome: number, surface: number, data: string } {
    const data = hexData.substring(2);
    const versionHex = data.substring(0, 4);
    const version = parseInt(versionHex, 16);
    if (version !== 0x0000) {
        throw new Error(`Unsupported version: ${version}`);
    }

    const biomeHex = data.substring(4, 6);
    const biome = parseInt(biomeHex, 16);
    const surfaceHex = data.substring(6, 8);
    const surface = parseInt(surfaceHex, 16);

    return { version, biome, surface, data };
}
