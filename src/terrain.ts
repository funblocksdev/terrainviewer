import { toHex } from 'viem';
type Hex = `0x${string}`
import { client, worldAddress } from './viem';
import { getChunkSalt, getCreate3Address_TS } from './address';


export const CHUNK_WIDTH = 16;

import { Vec3 } from './math';

// --- Chunk Logic ---
export function voxelToChunkPos(p: {x: number, y: number, z: number}): [number, number, number] {
    const chunkCoords = new Vec3(p.x, p.y, p.z).scale(1 / CHUNK_WIDTH).floor();
    return [chunkCoords.x, chunkCoords.y, chunkCoords.z];
}

export function chunkToVoxelPos(chunkCoord: [number, number, number]): [number, number, number] {
    return [chunkCoord[0] * CHUNK_WIDTH, chunkCoord[1] * CHUNK_WIDTH, chunkCoord[2] * CHUNK_WIDTH];
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
