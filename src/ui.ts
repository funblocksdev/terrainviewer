import { objects, objectsById } from '@dust/world/internal';

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
        { id: 1, name: objectsById[1]?.name || 'Air' },
        { id: 4, name: objectsById[4]?.name || 'Stone' },
        { id: 2, name: objectsById[2]?.name || 'Water' },
        { id: 32, name: objectsById[32]?.name || 'Sand' },
        { id: 21, name: objectsById[21]?.name || 'Grass' },
        { id: 22, name: objectsById[22]?.name || 'Dirt' }
    ];

    blockTypes.forEach(type => {
        const item = document.createElement('div');
        item.className = 'color-picker-item';

        const label = document.createElement('label');
        label.textContent = `${type.name} (${type.id}):`;
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

        // Add remove button for default colors
        const removeButton = document.createElement('button');
        removeButton.textContent = '×';
        removeButton.style.marginLeft = '5px';
        // 在删除颜色时设置为白色而不是灰色
        removeButton.addEventListener('click', () => {
            delete currentColors[type.id];
            picker.value = '#ffffff'; // Set to default white color
            const rawData = document.getElementById('raw-data')?.textContent;
            const ySlider = document.getElementById('y-slider') as HTMLInputElement;
            if (rawData && ySlider) {
                displaySlice(rawData, parseInt(ySlider.value));
            }
        });

        item.appendChild(label);
        item.appendChild(picker);
        item.appendChild(removeButton);
        container.appendChild(item);
    });

    // Add custom color section
    const customColorSection = document.createElement('div');
    customColorSection.className = 'custom-color-section';
    customColorSection.style.gridColumn = 'span 2';
    
    // Container for custom color pickers
    const customColorContainer = document.createElement('div');
    customColorContainer.id = 'custom-color-container';
    customColorSection.appendChild(customColorContainer);
    
    // Add existing custom colors
    renderCustomColorPickers(customColorContainer);
    
    // Add new custom color row
    const addCustomColorRow = document.createElement('div');
    addCustomColorRow.className = 'color-picker-item';
    addCustomColorRow.style.gridColumn = 'span 2';
    
    // Create select element for block types
    const blockSelect = document.createElement('select');
    blockSelect.id = 'new-block-id';
    blockSelect.style.marginRight = '10px';
    blockSelect.style.width = '112px';  // 修改从120px到80px
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Block';
    blockSelect.appendChild(defaultOption);
    
    // Add options from objects
    objects.forEach(obj => {
        const option = document.createElement('option');
        option.value = obj.id.toString();
        option.textContent = `${obj.name} (${obj.id})`;
        blockSelect.appendChild(option);
    });
    
    // 新添加的自定义颜色选择器默认值设置为白色
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.id = 'new-color-picker';
    colorPicker.value = '#ffffff';
    
    // 自定义颜色对话框中的颜色选择器默认值也设置为白色
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#ffffff';
    colorInput.style.display = 'block';
    colorInput.style.marginBottom = '15px';
    const addButton = document.createElement('button');
    addButton.textContent = '+';
    addButton.style.marginLeft = 'auto';  // Changed from marginRight to marginLeft: auto
    addButton.addEventListener('click', () => {
        const blockId = parseInt((addCustomColorRow.querySelector('#new-block-id') as HTMLSelectElement).value);
        const color = (addCustomColorRow.querySelector('#new-color-picker') as HTMLInputElement).value;
        
        if (isNaN(blockId) || blockId < 0) {
            alert('Please select a valid block');
            return;
        }
        
        // Update color
        currentColors[blockId] = color;
        
        // Re-render the slice
        const rawData = document.getElementById('raw-data')?.textContent;
        const ySlider = document.getElementById('y-slider') as HTMLInputElement;
        if (rawData && ySlider) {
            displaySlice(rawData, parseInt(ySlider.value));
        }
        
        // Re-render custom color pickers
        renderCustomColorPickers(customColorContainer);
    });
    
    addCustomColorRow.appendChild(blockSelect);
    addCustomColorRow.appendChild(colorPicker);
    addCustomColorRow.appendChild(addButton);  // Moved addButton to the end
    customColorSection.appendChild(addCustomColorRow);
    
    container.appendChild(customColorSection);

    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset to Default';
    resetButton.addEventListener('click', resetColorsToDefault);
    container.appendChild(resetButton);
}

function renderCustomColorPickers(container: HTMLElement) {
    // Clear container
    container.innerHTML = '';
    
    // Get custom colors (not in default colors)
    const defaultColorIds = [1, 4, 2, 32, 21, 22];
    const customColors: { id: number; color: string }[] = [];
    
    Object.keys(currentColors).forEach(type => {
        const id = parseInt(type);
        if (!defaultColorIds.includes(id)) {
            customColors.push({ id, color: currentColors[id] });
        }
    });
    
    // Render custom colors in a grid layout (2 columns)
    customColors.forEach(colorItem => {
        const item = document.createElement('div');
        item.className = 'color-picker-item';
        
        // Get object name by ID
        const objectDefinition = objectsById[colorItem.id];
        const labelName = objectDefinition ? `${objectDefinition.name} (${colorItem.id})` : `ID ${colorItem.id}`;
        
        const label = document.createElement('label');
        label.textContent = labelName + ':';
        label.setAttribute('for', `color-picker-${colorItem.id}`);
        
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.id = `color-picker-${colorItem.id}`;
        picker.value = colorItem.color;
        picker.addEventListener('input', function() {
            currentColors[colorItem.id] = this.value;
            const rawData = document.getElementById('raw-data')?.textContent;
            const ySlider = document.getElementById('y-slider') as HTMLInputElement;
            if (rawData && ySlider) {
                displaySlice(rawData, parseInt(ySlider.value));
            }
        });
        
        // Add remove button
        const removeButton = document.createElement('button');
        removeButton.textContent = '×';
        removeButton.style.marginLeft = '5px';
        removeButton.addEventListener('click', () => {
            delete currentColors[colorItem.id];
            item.remove();
            
            // Re-render the slice
            const rawData = document.getElementById('raw-data')?.textContent;
            const ySlider = document.getElementById('y-slider') as HTMLInputElement;
            if (rawData && ySlider) {
                displaySlice(rawData, parseInt(ySlider.value));
            }
        });
        
        item.appendChild(label);
        item.appendChild(picker);
        item.appendChild(removeButton);
        container.appendChild(item);
    });
}

// Function to show custom color dialog
function showCustomColorDialog() {
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = 'white';
    dialog.style.padding = '20px';
    dialog.style.border = '1px solid #ccc';
    dialog.style.borderRadius = '5px';
    dialog.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    dialog.style.zIndex = '1000';
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.left = '0';
    backdrop.style.top = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0,0,0,0.5)';
    backdrop.style.zIndex = '999';
    
    // Create form elements
    const titleLabel = document.createElement('h3');
    titleLabel.textContent = 'Add Custom Color';
    
    const blockIdLabel = document.createElement('label');
    blockIdLabel.textContent = 'Block ID:';
    blockIdLabel.style.display = 'block';
    blockIdLabel.style.marginBottom = '5px';
    
    const blockIdInput = document.createElement('input');
    blockIdInput.type = 'number';
    blockIdInput.min = '0';
    blockIdInput.style.display = 'block';
    blockIdInput.style.marginBottom = '10px';
    blockIdInput.style.padding = '5px';
    
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Color:';
    colorLabel.style.display = 'block';
    colorLabel.style.marginBottom = '5px';
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#cccccc';
    colorInput.style.display = 'block';
    colorInput.style.marginBottom = '15px';
    
    const buttonContainer = document.createElement('div');
    
    const addButton = document.createElement('button');
    addButton.textContent = 'Add';
    addButton.style.marginRight = '10px';
    addButton.style.padding = '5px 10px';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '5px 10px';
    
    // Add event listeners
    addButton.addEventListener('click', () => {
        const blockId = parseInt(blockIdInput.value);
        if (isNaN(blockId) || blockId < 0) {
            alert('Please enter a valid block ID');
            return;
        }
        
        // Update color
        currentColors[blockId] = colorInput.value;
        
        // Close dialog
        document.body.removeChild(backdrop);
        document.body.removeChild(dialog);
        
        // Re-render the slice
        const rawData = document.getElementById('raw-data')?.textContent;
        const ySlider = document.getElementById('y-slider') as HTMLInputElement;
        if (rawData && ySlider) {
            displaySlice(rawData, parseInt(ySlider.value));
        }
        
        // Update color pickers to show the new custom color
        initializeColorPickers();
    });
    
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(backdrop);
        document.body.removeChild(dialog);
    });
    
    // Assemble dialog
    buttonContainer.appendChild(addButton);
    buttonContainer.appendChild(cancelButton);
    
    dialog.appendChild(titleLabel);
    dialog.appendChild(blockIdLabel);
    dialog.appendChild(blockIdInput);
    dialog.appendChild(colorLabel);
    dialog.appendChild(colorInput);
    dialog.appendChild(buttonContainer);
    
    // Add to document
    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
    
    // Focus on block ID input
    blockIdInput.focus();
}

export function displaySlice(data: string, yValue: number, highlight?: {x: number, y: number, z: number}) {
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

    // Add debug info for highlight
    if (highlight) {
        console.log(`Highlight requested at: x=${highlight.x}, y=${highlight.y}, z=${highlight.z}`);
        console.log(`Current slice yValue: ${yValue}`);
        console.log(`Relative Y: ${relativeY}`);
    }

    for (let z = 0; z < 16; z++) {
        for (let x = 0; x < 16; x++) {
            const index = 4 + x * 256 + relativeY * 16 + z;
            const byte = data.substring(index * 2, index * 2 + 2);
            const blockType = parseInt(byte, 16);

            const cube = document.createElement('div');
            cube.className = 'cube';
            cube.textContent = blockType.toString();
            
            // Check if this cube should be highlighted
            // Use yValue for comparison since that's the actual Y coordinate we want to highlight
            if (highlight && 
                highlight.x === x && 
                highlight.z === z && 
                highlight.y === yValue) {
                console.log(`Highlighting cube at x=${x}, z=${z}`);
                cube.style.backgroundColor = 'red'; // Highlight color
                cube.style.border = '2px solid yellow';
            } else {
                cube.style.backgroundColor = getBlockColor(blockType);
            }
            
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

