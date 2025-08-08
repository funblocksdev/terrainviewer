import './style.css';
import { getTerrainData, decodeTerrainHeader, chunkToVoxelPos, voxelToChunkPos } from './terrain';
import { displaySlice, initializeColorPickers } from './ui';

document.addEventListener('DOMContentLoaded', () => {
    initializeCoordSync();
    const getTerrainButton = document.getElementById('get-terrain-button');
    if (getTerrainButton) {
        getTerrainButton.addEventListener('click', handleFetchTerrain);
    }
    initializeColorPickers();
});

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

    const CHUNK_WIDTH = 16;

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

async function handleFetchTerrain() {
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

        setupSliceControls(y, data);

    } catch (err: any) {
        document.getElementById('error')!.textContent = err.message;
    }
}

function setupSliceControls(y: number, data: string) {
    const chunkY = Math.floor(y / 16);
    const minY = chunkY * 16;
    const maxY = (chunkY + 1) * 16 - 1;

    const ySlider = document.getElementById('y-slider') as HTMLInputElement;
    const yLabel = document.getElementById('y-label')!;

    ySlider.min = minY.toString();
    ySlider.max = maxY.toString();
    ySlider.value = minY.toString();
    yLabel.textContent = `Y: ${minY}`;

    displaySlice(data, minY);

    ySlider.addEventListener('input', () => {
        const yValue = parseInt(ySlider.value);
        yLabel.textContent = `Y: ${yValue}`;
        displaySlice(data, yValue);
    });
}

function clearOutput() {
    document.getElementById('chunk-address')!.textContent = '';
    document.getElementById('terrain-data')!.textContent = 'Loading...';
    document.getElementById('decoded-data')!.innerHTML = 'Decoding...';
    document.getElementById('debug-info')!.textContent = '';
    document.getElementById('error')!.textContent = '';
}