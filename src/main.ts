import './style.css';
import { createPublicClient, http, getCreate2Address, getCreateAddress, pad, toBytes, toHex } from 'viem';

type Hex = `0x${string}`

// --- Constants ---
const CHUNK_WIDTH = 16;
const worldAddress = "0x253eb85B3C953bFE3827CC14a151262482E7189C";
const DEFAULT_CREATE3_PROXY_INITCODE_HASH: Hex = "0x21c35dbe1b344a2488cf3321d6ce542f8e9f305544ff09e4993a62319a497c1f";

// --- Viem Client ---
const redstoneChain = {
    id: 690,
    name: 'redstone',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.redstonechain.com'] } },
};
const client = createPublicClient({ chain: redstoneChain, transport: http() });

// --- Vector Math ---
class Vec3 {
    constructor(public x: number, public y: number, public z: number) {}
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
function voxelToChunkPos(p: Vec3): [number, number, number] {
    const chunkCoords = p.scale(1 / CHUNK_WIDTH).floor();
    return [chunkCoords.x, chunkCoords.y, chunkCoords.z];
}

function getChunkSalt(coord: [number, number, number]): Hex {
    const packed = packVec3(coord);
    const packedBytes = toBytes(packed, { size: 12 });
    return pad(packedBytes, { size: 32 });
}

// --- Create3 Address Logic ---
interface Create3AddressOptions {
    from: Hex;
    salt: Hex;
    proxyInitCodeHash?: Hex;
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

// --- Terrain Decoding and Display ---
const defaultColors: { [key: number]: string } = {
    1: '#c8fffc',   // air
    4: '#888888',   // stone
    2: '#4d94ff',   // water
    32: '#f0e68c',  // sand
    21: '#7cce6d',  // grass
    22: '#8b4513'   // dirt
};

let currentColors = { ...defaultColors };

function getBlockColor(blockType: number): string {
    return currentColors[blockType] || 'transparent';
}

function displaySlice(data: string, yValue: number) {
    const container = document.getElementById('slice-container');
    if (!container) return;

    container.innerHTML = '';

    if (!document.getElementById('color-picker-container')?.hasChildNodes()) {
        initializeColorPickers();
    }

    const userX = parseInt((document.getElementById('x') as HTMLInputElement).value);
    const userZ = parseInt((document.getElementById('z') as HTMLInputElement).value);
    const chunkX = Math.floor(userX / 16) * 16;
    const chunkZ = Math.floor(userZ / 16) * 16;
    const relativeY = ((yValue % 16) + 16) % 16;

    for (let z = 0; z < 16; z++) {
        for (let x = 0; x < 16; x++) {
            const index = 4 + x * 256 + relativeY * 16 + z;
            const byte = data.substring(index * 2, index * 2 + 2);
            const blockType = parseInt(byte, 16);

            const cube = document.createElement('div');
            cube.className = 'cube';
            cube.textContent = blockType.toString();
            cube.style.backgroundColor = getBlockColor(blockType);
            cube.style.gridColumn = `${x + 2}`;
            cube.style.gridRow = `${z + 2}`;
            container.appendChild(cube);
        }
    }

    // Add coordinate labels
    const topLeftLabel = document.createElement('div');
    topLeftLabel.className = 'coordinate-label';
    topLeftLabel.textContent = chunkZ.toString();
    topLeftLabel.style.gridColumn = '1';
    topLeftLabel.style.gridRow = '2';
    container.appendChild(topLeftLabel);

    const bottomLeftLabel = document.createElement('div');
    bottomLeftLabel.className = 'coordinate-label';
    bottomLeftLabel.textContent = (chunkZ + 15).toString();
    bottomLeftLabel.style.gridColumn = '1';
    bottomLeftLabel.style.gridRow = '17';
    container.appendChild(bottomLeftLabel);

    const leftBottomLabel = document.createElement('div');
    leftBottomLabel.className = 'coordinate-label';
    leftBottomLabel.textContent = chunkX.toString();
    leftBottomLabel.style.gridColumn = '2';
    leftBottomLabel.style.gridRow = '18';
    container.appendChild(leftBottomLabel);

    const rightBottomLabel = document.createElement('div');
    rightBottomLabel.className = 'coordinate-label';
    rightBottomLabel.textContent = (chunkX + 15).toString();
    rightBottomLabel.style.gridColumn = '17';
    rightBottomLabel.style.gridRow = '18';
    container.appendChild(rightBottomLabel);
}

function initializeColorPickers() {
    const container = document.getElementById('color-picker-container');
    if (!container) return;

    container.innerHTML = '';

    const title = document.createElement('h4');
    title.textContent = 'Block Colors';
    container.appendChild(title);

    const blockTypes = [
        { id: 1, name: 'Air' },
        { id: 4, name: 'Stone' },
        { id: 2, name: 'Water' },
        { id: 32, name: 'Sand' },
        { id: 21, name: 'Grass' },
        { id: 22, name: 'Dirt' }
    ];

    blockTypes.forEach(type => {
        const item = document.createElement('div');
        item.className = 'color-picker-item';

        const label = document.createElement('label');
        label.textContent = type.name + ':';
        label.setAttribute('for', `color-picker-${type.id}`);

        const picker = document.createElement('input');
        picker.type = 'color';
        picker.id = `color-picker-${type.id}`;
        picker.value = currentColors[type.id] || '#cccccc';
        picker.addEventListener('input', function() {
            currentColors[type.id] = this.value;
            const rawData = document.getElementById('raw-data')?.textContent;
            const ySlider = document.getElementById('y-slider') as HTMLInputElement;
            if (rawData && ySlider) {
                displaySlice(rawData, parseInt(ySlider.value));
            }
        });

        item.appendChild(label);
        item.appendChild(picker);
        container.appendChild(item);
    });

    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset to Default';
    resetButton.addEventListener('click', resetColorsToDefault);
    container.appendChild(resetButton);
}

function resetColorsToDefault() {
    currentColors = { ...defaultColors };
    updateColorPickers();
    const rawData = document.getElementById('raw-data')?.textContent;
    const ySlider = document.getElementById('y-slider') as HTMLInputElement;
    if (rawData && ySlider) {
        displaySlice(rawData, parseInt(ySlider.value));
    }
}

function updateColorPickers() {
    Object.keys(currentColors).forEach(type => {
        const picker = document.getElementById(`color-picker-${parseInt(type)}`) as HTMLInputElement;
        if (picker) {
            picker.value = currentColors[parseInt(type)];
        }
    });
}

function decodeTerrainData(hexData: Hex): string {
    if (!hexData || hexData === "0x") {
        return "No data to decode";
    }

    const data = hexData.substring(2);
    const versionHex = data.substring(0, 4);
    const version = parseInt(versionHex, 16);
    if (version !== 0x0000) {
        return `Unsupported version: ${version}`;
    }

    const biomeHex = data.substring(4, 6);
    const biome = parseInt(biomeHex, 16);
    const surfaceHex = data.substring(6, 8);
    const surface = parseInt(surfaceHex, 16);
    const userY = parseInt((document.getElementById('y') as HTMLInputElement).value);
    const chunkY = Math.floor(userY / 16);
    const minY = chunkY * 16;
    const maxY = (chunkY + 1) * 16 - 1;

    let decoded = `Version: 0x${versionHex} (${version})\nBiome: 0x${biomeHex} (${biome})\nSurface: 0x${surfaceHex} (${surface})\n\n`;
    decoded += '<div class="controls">';
    decoded += '<div class="slice-container-wrapper">';
    decoded += '<div id="slice-container" class="slice-container"></div>';
    decoded += '<div id="color-picker-container" class="color-picker-container"></div>';
    decoded += '</div>';
    decoded += '<div class="vertical-slider-container">';
    decoded += `<label for="y-slider" id="y-label">Y: ${minY}</label>`;
    decoded += `<input type="range" id="y-slider" min="${minY}" max="${maxY}" value="${minY}" orient="vertical">`;
    decoded += '</div>';
    decoded += '</div>';
    decoded += `<div id="raw-data" style="display:none;">${data}</div>`;

    return decoded;
}

async function fetchTerrainData() {
    const debug = (msg: string) => {
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) debugInfo.textContent += msg + '\n';
    };

    // Clear previous output
    const chunkAddressEl = document.getElementById('chunk-address');
    const terrainDataEl = document.getElementById('terrain-data');
    const decodedDataEl = document.getElementById('decoded-data');
    const debugInfoEl = document.getElementById('debug-info');
    const errorEl = document.getElementById('error');

    if (chunkAddressEl) chunkAddressEl.textContent = '';
    if (terrainDataEl) terrainDataEl.textContent = 'Loading...';
    if (decodedDataEl) decodedDataEl.innerHTML = 'Decoding...';
    if (debugInfoEl) debugInfoEl.textContent = '';
    if (errorEl) errorEl.textContent = '';

    try {
        const x = parseInt((document.getElementById('x') as HTMLInputElement).value);
        const y = parseInt((document.getElementById('y') as HTMLInputElement).value);
        const z = parseInt((document.getElementById('z') as HTMLInputElement).value);
        if (isNaN(x) || isNaN(y) || isNaN(z)) throw new Error("Invalid coordinates.");

        debug(`1. Input Voxel Coords: [${x}, ${y}, ${z}]`);

        const position = new Vec3(x, y, z);
        const chunkCoord = voxelToChunkPos(position);
        debug(`2. Calculated Chunk Coords: [${chunkCoord.join(', ')}]`);

        const salt = getChunkSalt(chunkCoord);
        debug(`3. Generated Salt (32 bytes): ${toHex(salt)}`);

        const { finalAddress, proxyAddress } = getCreate3Address_TS({ from: worldAddress, salt: salt });
        debug(`4. CREATE2 Proxy Address: ${proxyAddress}`);
        debug(`5. Final CREATE3 Chunk Address: ${finalAddress}`);

        if (chunkAddressEl) chunkAddressEl.textContent = finalAddress;

        const terrainData = await client.getCode({ address: finalAddress });

        if (!terrainData || terrainData === "0x") {
            throw new Error("Chunk not explored or contract has no bytecode.");
        }

        if (terrainDataEl) terrainDataEl.textContent = terrainData;

        const decodedData = decodeTerrainData(terrainData);
        if (decodedDataEl) decodedDataEl.innerHTML = decodedData;

        const ySlider = document.getElementById('y-slider') as HTMLInputElement;
        const rawData = document.getElementById('raw-data')?.textContent;

        if (ySlider && rawData) {
            const chunkY = Math.floor(y / 16);
            const minY = chunkY * 16;
            displaySlice(rawData, minY);

            ySlider.addEventListener('input', function() {
                const actualY = parseInt(this.value);
                const yLabel = document.getElementById('y-label');
                if (yLabel) yLabel.textContent = `Y: ${actualY}`;
                displaySlice(rawData, actualY);
            });
        }
    } catch (err: any) {
        console.error(err);
        if (terrainDataEl) terrainDataEl.textContent = 'Failed to fetch data.';
        if (decodedDataEl) decodedDataEl.innerHTML = 'Failed to decode data.';
        if (errorEl) errorEl.textContent = err.message;
    }
}

// --- Event Listeners ---
document.getElementById('get-terrain-button')?.addEventListener('click', fetchTerrainData);