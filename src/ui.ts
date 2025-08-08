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

function updateColorPickers() {
    Object.keys(currentColors).forEach(type => {
        const picker = document.getElementById(`color-picker-${parseInt(type)}`) as HTMLInputElement;
        if (picker) {
            picker.value = currentColors[parseInt(type)];
        }
    });
}

function resetColorsToDefault() {
    currentColors = { ...defaultColors };
    updateColorPickers();
    // Re-render the slice
    const rawData = document.getElementById('raw-data')?.textContent;
    const ySlider = document.getElementById('y-slider') as HTMLInputElement;
    if (rawData && ySlider) {
        displaySlice(rawData, parseInt(ySlider.value));
    }
}

export function initializeColorPickers() {
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

export function displaySlice(data: string, yValue: number) {
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
