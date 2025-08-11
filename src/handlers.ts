import { getTerrainData, decodeTerrainHeader, chunkToVoxelPos, voxelToChunkPos, CHUNK_WIDTH } from './terrain';
import { connectDustClient } from "dustkit/internal";
import { encodePlayer } from '@dust/world/internal';
import { setupSliceControls, clearOutput } from './dom';

export async function getPlayerPosition() {
    try {
        const { appContext, provider } = await connectDustClient();
        const playerEntityId = encodePlayer(appContext.userAddress);
        const position = await provider.request({
            method: "getPlayerPosition",
            params: {
                entity: playerEntityId,
            },
        });
        if (position) {
            const xInput = document.getElementById('x') as HTMLInputElement;
            const yInput = document.getElementById('y') as HTMLInputElement;
            const zInput = document.getElementById('z') as HTMLInputElement;
            if (xInput && yInput && zInput) {
                // Convert positions to integers before setting them
                xInput.value = Math.floor(position.x).toString();
                yInput.value = Math.floor(position.y).toString();
                zInput.value = Math.floor(position.z).toString();

                // Manually trigger input event to update chunk coordinates
                xInput.dispatchEvent(new Event('input'));
                handleFetchTerrain(true);
            }
        }
    } catch (error) {
        console.error("Failed to get player position:", error);
        const errorElement = document.getElementById('error');
        if(errorElement) {
            errorElement.textContent = "Failed to get player position. See console for details.";
        }
    }
}

export async function handleFetchTerrain(isPlayerPosition = false) {
    const x = parseInt((document.getElementById('x') as HTMLInputElement).value);
    const y = parseInt((document.getElementById('y') as HTMLInputElement).value);
    const z = parseInt((document.getElementById('z') as HTMLInputElement).value);

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
        alert("Invalid coordinates.");
        return;
    }

    clearOutput();

    try {
        const { finalAddress, terrainData, debugInfo } = await getTerrainData(x, y, z);

        document.getElementById('chunk-address')!.textContent = finalAddress;
        document.getElementById('terrain-data')!.textContent = terrainData;
        document.getElementById('debug-info')!.textContent = debugInfo.join('\n');

        const { version, biome, surface, data } = decodeTerrainHeader(terrainData);

        const decodedDataEl = document.getElementById('decoded-data')!;
        decodedDataEl.innerHTML = `
            Version: ${version}<br>
            Biome: ${biome}<br>
            Surface: ${surface}<br>
            <div id="raw-data" style="display:none;">${data}</div>
        `;

        // Pass the y coordinate for highlighting
        setupSliceControls(y, data, isPlayerPosition ? {x: x % 16, y: y, z: z % 16} : undefined);

        const blueprintToggle = document.getElementById('blueprint-toggle') as HTMLInputElement;
        if (blueprintToggle && blueprintToggle.checked) {
            const chunkCoord = voxelToChunkPos({x, y, z});
            setBlueprintOfChunk(data, chunkCoord[0], chunkCoord[1], chunkCoord[2]);
        }

    } catch (err: any) {
        document.getElementById('error')!.textContent = err.message;
        // Display message in slice container when there's no data
        const sliceContainer = document.getElementById('slice-container');
        if (sliceContainer) {
            sliceContainer.innerHTML = '<div class="no-data-message">Chunk not explored</div>';
        }
    }
}

async function setBlueprintOfChunk(data: string, chunkX: number, chunkY: number, chunkZ: number) {
    try {
        const { provider } = await connectDustClient();
        const blocks = [];
        const [startX, startY, startZ] = chunkToVoxelPos([chunkX, chunkY, chunkZ]);

        // The data is laid out X-major, then Y, then Z.
        // Index = 4 (header) + x*16*16 + y*16 + z
        for (let x = 0; x < CHUNK_WIDTH; x++) {
            for (let y = 0; y < CHUNK_WIDTH; y++) {
                for (let z = 0; z < CHUNK_WIDTH; z++) {
                    const index = 4 + x * CHUNK_WIDTH * CHUNK_WIDTH + y * CHUNK_WIDTH + z;
                    const byte = data.substring(index * 2, index * 2 + 2);
                    if (byte === '') continue; // Avoid errors on incomplete data

                    const blockType = parseInt(byte, 16);

                    // Rule 1: If the block is NOT air, represent it as air in the blueprint.
                    if (blockType > 1) {
                        blocks.push({
                            objectTypeId: 1, // show as air
                            x: startX + x,
                            y: startY + y,
                            z: startZ + z,
                            orientation: 0,
                        });
                    }

                    // Rule 2: If the block IS air AND it's on the boundary, show it as object 110.
                    const isBoundary = x === 0 || x === CHUNK_WIDTH - 1 || y === 0 || y === CHUNK_WIDTH - 1 || z === 0 || z === CHUNK_WIDTH - 1;
                    if (blockType === 1 && isBoundary) {
                        blocks.push({
                            objectTypeId: 110, // show as 110
                            x: startX + x,
                            y: startY + y,
                            z: startZ + z,
                            orientation: 0,
                        });
                    }
                }
            }
        }

        if (blocks.length === 0) {
            return;
        }

        await provider.request({
            method: "setBlueprint",
            params: {
                blocks: blocks,
                options: {
                    showBlocksToMine: true,
                    showBlocksToBuild: true,
                }
            },
        });
    } catch (error) {
        console.error("Failed to set blueprint:", error);
        const errorElement = document.getElementById('error');
        if(errorElement) {
            errorElement.textContent = "Failed to set blueprint. See console for details.";
        }
    }
}

export async function clearBlueprint() {
    try {
        const { provider } = await connectDustClient();
        await provider.request({
            method: "setBlueprint",
            params: {
                blocks: [],
                options: {
                    showBlocksToMine: true,
                    showBlocksToBuild: true,
                }
            },
        });
    } catch (error) {
        console.error("Failed to clear blueprint:", error);
        const errorElement = document.getElementById('error');
        if(errorElement) {
            errorElement.textContent = "Failed to clear blueprint. See console for details.";
        }
    }
}

