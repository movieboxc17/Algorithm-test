document.addEventListener('DOMContentLoaded', () => {
    // Grid configuration
    const rows = 20;
    const cols = 30;
    
    // Node states
    let startNode = null;
    let endNode = null;
    let grid = [];
    let isRunning = false;
    
    // DOM elements
    const gridElement = document.getElementById('grid');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const speedSelect = document.getElementById('speed');
    
    // Initialize the grid
    function initializeGrid() {
        gridElement.innerHTML = '';
        grid = [];
        
        for (let i = 0; i < rows; i++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'row';
            const rowArray = [];
            
            for (let j = 0; j < cols; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                cell.addEventListener('click', () => {
                    if (isRunning) return;
                    
                    const mode = document.querySelector('input[name="mode"]:checked').value;
                    
                    if (mode === 'start') {
                        // Remove previous start
                        if (startNode) {
                            document.querySelector(`.cell[data-row="${startNode.row}"][data-col="${startNode.col}"]`).classList.remove('start');
                        }
                        cell.classList.remove('wall', 'end');
                        cell.classList.add('start');
                        startNode = { row: i, col: j };
                    } else if (mode === 'end') {
                        // Remove previous end
                        if (endNode) {
                            document.querySelector(`.cell[data-row="${endNode.row}"][data-col="${endNode.col}"]`).classList.remove('end');
                        }
                        cell.classList.remove('wall', 'start');
                        cell.classList.add('end');
                        endNode = { row: i, col: j };
                    } else if (mode === 'wall') {
                        if (cell.classList.contains('start') || cell.classList.contains('end')) {
                            return;
                        }
                        cell.classList.toggle('wall');
                        rowArray[j].isWall = cell.classList.contains('wall');
                    }
                });
                
                rowElement.appendChild(cell);
                
                // Create grid node data
                rowArray.push({
                    row: i,
                    col: j,
                    isStart: false,
                    isEnd: false,
                    isWall: false,
                    g: 0,
                    h: 0,
                    f: 0,
                    parent: null
                });
            }
            
            gridElement.appendChild(rowElement);
            grid.push(rowArray);
        }
        
        // Default start and end positions
        startNode = { row: 10, col: 5 };
        document.querySelector(`.cell[data-row="${startNode.row}"][data-col="${startNode.col}"]`).classList.add('start');
        
        endNode = { row: 10, col: 25 };
        document.querySelector(`.cell[data-row="${endNode.row}"][data-col="${endNode.col}"]`).classList.add('end');
    }
    
    // Reset the grid, keeping walls
    function resetGrid() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('visited', 'path');
        });
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const node = grid[i][j];
                node.g = 0;
                node.h = 0;
                node.f = 0;
                node.parent = null;
            }
        }
    }
    
    // Reset everything
    function fullReset() {
        isRunning = false;
        initializeGrid();
    }
    
    // Calculate Manhattan distance heuristic
    function heuristic(nodeA, nodeB) {
        return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
    }
    
    // A* pathfinding algorithm
    async function astar() {
        if (!startNode || !endNode) {
            alert('Please set both start and end points');
            return;
        }
        
        isRunning = true;
        resetGrid();
        
        const delay = parseInt(speedSelect.value);
        const openSet = [];
        const closedSet = new Set();
        
        // Initialize start node
        const start = grid[startNode.row][startNode.col];
        start.isStart = true;
        const end = grid[endNode.row][endNode.col];
        end.isEnd = true;
        
        // Update wall states
        document.querySelectorAll('.wall').forEach(wallCell => {
            const row = parseInt(wallCell.dataset.row);
            const col = parseInt(wallCell.dataset.col);
            grid[row][col].isWall = true;
        });
        
        openSet.push(start);
        
        while (openSet.length > 0) {
            // Find node with lowest f score
            let lowestIndex = 0;
            for (let i = 0; i < openSet.length; i++) {
                if (openSet[i].f < openSet[lowestIndex].f) {
                    lowestIndex = i;
                }
            }
            
            const current = openSet[lowestIndex];
            
            // If we reached the end
            if (current.row === end.row && current.col === end.col) {
                let temp = current;
                let path = [];
                
                path.push(temp);
                while (temp.parent) {
                    path.push(temp.parent);
                    temp = temp.parent;
                }
                
                // Display path
                for (let i = path.length - 1; i >= 0; i--) {
                    if (i !== path.length - 1 && i !== 0) { // Don't color start and end
                        const cell = document.querySelector(`.cell[data-row="${path[i].row}"][data-col="${path[i].col}"]`);
                        cell.classList.add('path');
                        await new Promise(resolve => setTimeout(resolve, delay / 3));
                    }
                }
                
                isRunning = false;
                return;
            }
            
            // Remove current from openSet
            openSet.splice(lowestIndex, 1);
            closedSet.add(`${current.row},${current.col}`);
            
            // Show visited cell unless it's start or end
            if (!current.isStart && !current.isEnd) {
                const cell = document.querySelector(`.cell[data-row="${current.row}"][data-col="${current.col}"]`);
                cell.classList.add('visited');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            // Check neighbors
            const neighbors = [];
            const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // top, right, bottom, left
            
            for (const [dx, dy] of directions) {
                const newRow = current.row + dx;
                const newCol = current.col + dy;
                
                if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) {
                    continue; // Skip if out of bounds
                }
                
                const neighbor = grid[newRow][newCol];
                
                if (closedSet.has(`${neighbor.row},${neighbor.col}`) || neighbor.isWall) {
                    continue; // Skip if in closed set or is a wall
                }
                
                const tentativeG = current.g + 1;
                let newPath = false;
                
                if (openSet.includes(neighbor)) {
                    if (tentativeG < neighbor.g) {
                        neighbor.g = tentativeG;
                        newPath = true;
                    }
                } else {
                    neighbor.g = tentativeG;
                    newPath = true;
                    openSet.push(neighbor);
                }
                
                if (newPath) {
                    neighbor.h = heuristic(neighbor, end);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = current;
                }
            }
        }
        
        alert('No path found!');
        isRunning = false;
    }
    
    // Event listeners
    startBtn.addEventListener('click', () => {
        if (!isRunning) {
            astar();
        }
    });
    
    resetBtn.addEventListener('click', fullReset);
    
    // Initialize
    initializeGrid();
});
