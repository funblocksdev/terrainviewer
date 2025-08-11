import './style.css';
import { getTerrainData, decodeTerrainHeader, chunkToVoxelPos, voxelToChunkPos, CHUNK_WIDTH } from './terrain';
import { displaySlice, initializeColorPickers } from './ui';
import { connectDustClient } from "dustkit/internal";
import { encodePlayer } from '@dust/world/internal';

document.addEventListener('DOMContentLoaded', () => {
    initializeCoordSync();
    const getTerrainButton = document.getElementById('get-terrain-button');
    if (getTerrainButton) {
        // Create a wrapper function for the event listener
        getTerrainButton.addEventListener('click', () => handleFetchTerrain());
    }
    const getPlayerPositionButton = document.getElementById('get-player-position-button');
    if (getPlayerPositionButton) {
        getPlayerPositionButton.addEventListener('click', getPlayerPosition);
    }
    initializeColorPickers();
    
    // Add event listener for the toggle arrows
    setupToggleArrow('toggle-chunk-address', 'chunk-address');
    setupToggleArrow('toggle-terrain-data', 'terrain-data');
    setupToggleArrow('toggle-decoded-header', 'decoded-data');
    setupToggleArrow('toggle-debug-info', 'debug-info');
});

async function getPlayerPosition() {
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
                xInput.value = position.x.toString();
                yInput.value = position.y.toString();
                zInput.value = position.z.toString();

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

function setupToggleArrow(arrowId: string, targetId: string) {
    const toggleArrow = document.getElementById(arrowId);
    const targetElement = document.getElementById(targetId);
    if (toggleArrow && targetElement) {
        toggleArrow.addEventListener('click', () => {
            if (targetElement.style.display === 'none' || targetElement.style.display === '') {
                targetElement.style.display = 'block';
                toggleArrow.classList.add('rotated');
            } else {
                targetElement.style.display = 'none';
                toggleArrow.classList.remove('rotated');
            }
        });
    }
}

function initializeCoordSync() {
    const inputs = {
        x: document.getElementById('x') as HTMLInputElement,
        y: document.getElementById('y') as HTMLInputElement,
        z: document.getElementById('z') as HTMLInputElement,
        chunkX: document.getElementById('chunk-x') as HTMLInputElement,
        chunkY: document.getElementById('chunk-y') as HTMLInputElement,
        chunkZ: document.getElementById('chunk-z') as HTMLInputElement,
    };

    let isUpdating = false; // Flag to prevent infinite loops

    // Voxel to Chunk
    ['x', 'y', 'z'].forEach(axis => {
        inputs[axis as 'x' | 'y' | 'z'].addEventListener('input', () => {
            if (isUpdating) return;
            isUpdating = true;
            const x = parseInt(inputs.x.value) || 0;
            const y = parseInt(inputs.y.value) || 0;
            const z = parseInt(inputs.z.value) || 0;
            const [chunkX, chunkY, chunkZ] = voxelToChunkPos({x, y, z});
            inputs.chunkX.value = chunkX.toString();
            inputs.chunkY.value = chunkY.toString();
            inputs.chunkZ.value = chunkZ.toString();
            isUpdating = false;
        });
    });

    // Chunk to Voxel
    ['chunkX', 'chunkY', 'chunkZ'].forEach(axis => {
        inputs[axis as 'chunkX' | 'chunkY' | 'chunkZ'].addEventListener('input', () => {
            if (isUpdating) return;
            isUpdating = true;
            const chunkX = parseInt(inputs.chunkX.value) || 0;
            const chunkY = parseInt(inputs.chunkY.value) || 0;
            const chunkZ = parseInt(inputs.chunkZ.value) || 0;
            const [x, y, z] = chunkToVoxelPos([chunkX, chunkY, chunkZ]);
            inputs.x.value = x.toString();
            inputs.y.value = y.toString();
            inputs.z.value = z.toString();
            isUpdating = false;
        });
    });

    // Initial sync
    const x = parseInt(inputs.x.value) || 0;
    const y = parseInt(inputs.y.value) || 0;
    const z = parseInt(inputs.z.value) || 0;
    const [chunkX, chunkY, chunkZ] = voxelToChunkPos({x, y, z});
    inputs.chunkX.value = chunkX.toString();
    inputs.chunkY.value = chunkY.toString();
    inputs.chunkZ.value = chunkZ.toString();
}

async function handleFetchTerrain(isPlayerPosition = false) {
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

        const chunkCoord = voxelToChunkPos({x, y, z});
        setBlueprintOfChunk(data, chunkCoord[0], chunkCoord[1], chunkCoord[2]);

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
        console.log("Attempting to set blueprint for chunk:", chunkX, chunkY, chunkZ);

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

                    // We don't draw air (type 1) or empty (type 0) blocks to avoid clutter.
                    if (blockType > 1) {
                        blocks.push({
                            objectTypeId: blockType,
                            x: startX + x,
                            y: startY + y,
                            z: startZ + z,
                            orientation: 0,
                        });
                    }
                }
            }
        }

        console.log(`Found ${blocks.length} non-air blocks to create blueprint.`);

        if (blocks.length === 0) {
            console.log("No blocks to draw for blueprint (all air/empty).");
            return;
        }

        if (blocks.length > 0) {
            console.log("Sample blocks:", blocks.slice(0, 5));
        }

        await provider.request({
            method: "setBlueprint",
            params: {
                blocks: blocks,
                options: {
                    showBlocksToMine: false,
                    showBlocksToBuild: true,
                }
            },
        });
        console.log("Successfully sent setBlueprint request.");
    } catch (error) {
        console.error("Failed to set blueprint:", error);
        const errorElement = document.getElementById('error');
        if(errorElement) {
            errorElement.textContent = "Failed to set blueprint. See console for details.";
        }
    }
}

function setupSliceControls(y: number, data: string, highlight?: {x: number, y: number, z: number}) {
    const chunkY = Math.floor(y / CHUNK_WIDTH);
    const minY = chunkY * CHUNK_WIDTH;
    const maxY = (chunkY + 1) * CHUNK_WIDTH - 1;

    const ySlider = document.getElementById('y-slider') as HTMLInputElement;
    const yLabel = document.getElementById('y-label')!;

    ySlider.min = minY.toString();
    ySlider.max = maxY.toString();
    ySlider.value = y.toString();
    yLabel.textContent = `Y: ${y}`;

    displaySlice(data, y, highlight);

    ySlider.addEventListener('input', () => {
        const yValue = parseInt(ySlider.value);
        yLabel.textContent = `Y: ${yValue}`;
        displaySlice(data, yValue, highlight);
    });

}

function clearOutput() {
    document.getElementById('chunk-address')!.textContent = '';
    document.getElementById('terrain-data')!.textContent = 'Loading...';
    document.getElementById('decoded-data')!.innerHTML = 'Decoding...';
    document.getElementById('debug-info')!.textContent = '';
    document.getElementById('error')!.textContent = '';
}