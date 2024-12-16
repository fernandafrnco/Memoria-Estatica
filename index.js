let memorySize = 0;
let osSize = 0;
let partitions = []; // Manejo de bloques libres y ocupados
let waitingList = []; // Lista de trabajos en espera

function updateMemory() {
    const sizeInput = parseFloat(document.getElementById('memorySize').value) || 0;
    const unit = document.getElementById('memoryUnit').value;

    memorySize = convertToKB(sizeInput, unit);

    if (memorySize > 0) {
        partitions = [{ start: 0, size: memorySize, free: true }];
        waitingList = [];
        updateUI();
    }
}

function updateOS() {
    const sizeInput = parseFloat(document.getElementById('osSize').value) || 0;
    const unit = document.getElementById('osUnit').value;

    osSize = convertToKB(sizeInput, unit);

    if (osSize > memorySize * 0.3) {
        alert("El sistema operativo no puede ocupar más del 30% de la memoria.");
        return;
    }

    // Liberar el SO si ya existe
    partitions = partitions.filter(partition => partition.name !== "SO");

    // Agregar el SO al inicio
    partitions.unshift({
        start: 0,
        size: osSize,
        free: false,
        name: "SO"
    });

    // Ajustar el bloque libre restante
    const remainingSize = memorySize - osSize;
    partitions.push({
        start: osSize,
        size: remainingSize,
        free: true
    });

    compactMemory();
    updateUI();
}

function addJob() {
    const name = document.getElementById('jobName').value.trim();
    const sizeInput = parseFloat(document.getElementById('jobSize').value) || 0;
    const unit = document.getElementById('jobUnit').value;
    const jobSize = convertToKB(sizeInput, unit);

    if (!name || jobSize <= 0) {
        alert("Nombre o tamaño del trabajo inválido.");
        return;
    }

    // Liberar si el trabajo ya existe
    partitions = partitions.filter(partition => partition.name !== name);

    // Intentar asignar el trabajo
    if (!assignJob(name, jobSize)) {
        waitingList.push({ name, size: jobSize });
    }

    compactMemory();
    updateUI();
}

function assignJob(name, size) {
    for (let partition of partitions) {
        if (partition.free && partition.size >= size) {
            partition.free = false;
            partition.name = name;
            partition.size = size;

            // Crear un nuevo bloque libre si sobra espacio
            const remainingSize = partition.size - size;
            if (remainingSize > 0) {
                partitions.push({
                    start: partition.start + size,
                    size: remainingSize,
                    free: true
                });
            }

            compactMemory();
            return true;
        }
    }
    return false; // No se pudo asignar
}

function compactMemory() {
    partitions.sort((a, b) => a.start - b.start);

    let newPartitions = [];
    let currentFreeBlock = null;

    for (let partition of partitions) {
        if (partition.free) {
            if (!currentFreeBlock) {
                currentFreeBlock = { start: partition.start, size: partition.size, free: true };
            } else {
                currentFreeBlock.size += partition.size;
            }
        } else {
            if (currentFreeBlock) {
                newPartitions.push(currentFreeBlock);
                currentFreeBlock = null;
            }
            newPartitions.push(partition);
        }
    }

    if (currentFreeBlock) newPartitions.push(currentFreeBlock);

    partitions = newPartitions;

    // Revisar lista de espera después de compactar
    checkWaitingList();
}

function checkWaitingList() {
    let updatedWaitingList = [];

    for (let job of waitingList) {
        if (!assignJob(job.name, job.size)) {
            updatedWaitingList.push(job);
        }
    }

    waitingList = updatedWaitingList;
    updateUI();
}

function updateUI() {
    const graph = document.getElementById('memory-graph');
    graph.innerHTML = '';

    const scale = graph.clientHeight / memorySize;

    for (let partition of partitions) {
        const block = createBlock(
            partition.start,
            partition.size,
            scale,
            partition.free ? "free" : "occupied",
            partition.free ? `Libre (${(partition.size / 1024).toFixed(2)} MB)` : `${partition.name} (${(partition.size / 1024).toFixed(2)} MB)`
        );
        graph.appendChild(block);
    }

    updateWaitingList();
}

function updateWaitingList() {
    const waitListLabel = document.getElementById('waitlist-label');
    if (waitingList.length > 0) {
        const jobs = waitingList.map(job => `${job.name} (${(job.size / 1024).toFixed(2)} MB)`);
        waitListLabel.textContent = `Lista de Espera: ${jobs.join(", ")}`;
    } else {
        waitListLabel.textContent = "Lista de Espera: Ninguna";
    }
}

function createBlock(start, size, scale, type, text) {
    const div = document.createElement('div');
    div.className = `block ${type}`;
    div.style.top = `${start * scale}px`;
    div.style.height = `${size * scale}px`;
    div.textContent = text;
    return div;
}

function convertToKB(size, unit) {
    switch (unit) {
        case "MB": return size * 1024;
        case "GB": return size * 1024 * 1024;
        default: return size;
    }
}