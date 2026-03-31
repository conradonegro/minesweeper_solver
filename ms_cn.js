/*
 * Minesweeper Solver via Double Set Single Point (DSSP) Algorithm
 * Refactored by Antigravity AI
 */
(function() {
    // Utilities
    function getRndInteger(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    // Constants
    const values = {
        OPEN0: 0, OPEN1: 1, OPEN2: 2, OPEN3: 3, OPEN4: 4,
        OPEN5: 5, OPEN6: 6, OPEN7: 7, OPEN8: 8,
        BLANK: -1, BOMBFLAGGED: -2, BOMBDEATH: -3, BOMBREVEALED: -4
    };
    
    const movs = [[-1,-1], [-1,0], [-1,+1], [0,-1], [0,+1], [+1,-1], [+1,0], [+1,+1]];

    /*
     * MineSweeper classes
     */
    class MineSweeperCell {
        constructor(row, col, val) {
            this.row = row;
            this.column = col;
            this.value = val;
            this.clicked = false;
        }

        static compareCells(cell1, cell2) {
            return cell1.row === cell2.row && cell1.column === cell2.column && cell1.value === cell2.value;
        }
    }

    class MineSweeperBoard {
        constructor(row, col, mines) {
            this.rowSize = parseInt(row, 10);
            this.colSize = parseInt(col, 10);
            this.numMines = parseInt(mines, 10);
            this.board = [];
            for (let i = 0; i < this.rowSize; i++) {
                this.board[i] = [];
                for (let j = 0; j < this.colSize; j++) {
                    this.board[i][j] = new MineSweeperCell(i, j, values.BLANK);
                }
            }
        }

        getValue(i, j) { return this.board[i][j].value; }
        getClicked(i, j) { return this.board[i][j].clicked; }
        setValue(i, j, val) { this.board[i][j].value = val; }
        setClicked(i, j, val) { this.board[i][j].clicked = val; }
    }

    function sleep(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    /*
     * Implementation State and Config Object
     */
    let rows, cols, mines;
    let DOMNodes = [];
    
    // Configurations
    let cfgDelayMs = 15;
    let cfgFirstMove = "center";
    let cfgDeadlockMove = "smart";
    let cfgAutoRestart = true;
    
    // Statistics
    let numGames = 0, numMoves = 0;
    let totalWins = 0, totalLosses = 0;
    let totalFastestTimeWin = 99999;
    let totalTimeToWin = 0, totalTimeToLose = 0;
    let totalGuesses = 0, totalMoves = 0;
    let currentRandomChoices = 0;

    // Await User State variables
    let clickWaiterActive = false;
    let globalResolveClick = null;
    let globalRejectClick = null;

    function loadConfig() {
        const d = document.getElementById("radoConfigDelay");
        if (d) cfgDelayMs = parseInt(d.value, 10) || 0;
        
        const f = document.getElementById("radoConfigFirst");
        if (f) cfgFirstMove = f.value;
        
        const dm = document.getElementById("radoConfigDeadlock");
        if (dm) cfgDeadlockMove = dm.value;
        
        const a = document.getElementById("radoConfigAuto");
        if (a) cfgAutoRestart = a.checked;
    }

    function initDOMCache() {
        DOMNodes = [];
        for (let i = 0; i < rows; i++) {
            DOMNodes[i] = [];
            for (let j = 0; j < cols; j++) {
                // DOM mapping in original website is 1-indexed
                DOMNodes[i][j] = document.getElementById(`${i + 1}_${j + 1}`);
            }
        }
    }

    function getValueFromDOM(i, j) {
        const node = DOMNodes[i][j];
        if (!node) return -1000;
        
        switch(node.className) {
            case "square open0": return values.OPEN0;
            case "square open1": return values.OPEN1;
            case "square open2": return values.OPEN2;
            case "square open3": return values.OPEN3;
            case "square open4": return values.OPEN4;
            case "square open5": return values.OPEN5;
            case "square open6": return values.OPEN6;
            case "square open7": return values.OPEN7;
            case "square open8": return values.OPEN8;
            case "square blank": return values.BLANK;
            case "square bombflagged": return values.BOMBFLAGGED;
            case "square bombdeath": return values.BOMBDEATH;
            case "square bombrevealed": return values.BOMBREVEALED;
            default: return -1000;
        }
    }

    function openIJ(i, j) {
        const e = DOMNodes[i][j];
        if (e && e.className === "square blank") {
            myClick(e, "left"); // open = left click
        }
        return e ? e.className : null;
    }

    function toggleFlagIJ(i, j) {
        const e = DOMNodes[i][j];
        const val = getValueFromDOM(i, j);

        if (val === values.BLANK || val === values.BOMBFLAGGED) {
            myClick(e, "right"); // flag = right click
        }
        return e ? e.className : null;
    }

    function newGame() {
        const e = document.getElementById("face");
        if (e) myClick(e, "left");
        numGames++;
    }

    // Modern dispatch mapping
    function myClick(element, b) {
        const btnCode = (b === "right") ? 2 : (b === "left" ? 0 : 1);
        const options = { bubbles: true, cancelable: true, button: btnCode };
        
        element.dispatchEvent(new MouseEvent("mousedown", options));
        element.dispatchEvent(new MouseEvent("mouseup", options));
        
        if (b === "left") {
            element.dispatchEvent(new MouseEvent("click", options));
        } else if (b === "right") {
            element.dispatchEvent(new MouseEvent("contextmenu", options));
        }
    }

    function getBoardSize() {
        const expert = document.getElementById("expert");
        const intermediate = document.getElementById("intermediate");
        const beginner = document.getElementById("beginner");
        
        if (expert && expert.checked) {
            rows = 16; cols = 30; mines = 99;
        } else if (intermediate && intermediate.checked) {
            rows = 16; cols = 16; mines = 40;
        } else if (beginner && beginner.checked) {
            rows = 9; cols = 9; mines = 10;
        } else { // custom
            const h = document.getElementById("custom_height");
            const w = document.getElementById("custom_width");
            const m = document.getElementById("custom_mines");
            rows = h ? parseInt(h.value, 10) : 16;
            cols = w ? parseInt(w.value, 10) : 30;
            mines = m ? parseInt(m.value, 10) : 99;
        }
    }

    function createControlBox() {
        const existing = document.getElementById("RadoSolverControlBox");
        if (existing) existing.remove();

        const html = `
            <div id="RadoSolverControlBox" class="RadoSolverControlBox">
                <div id="headerDiv" class="headerDiv">
                    <p class="RadoSolverTitle">RadoSolver Controls</p>
                </div>
                <!-- Control Panel configurations -->
                <div id="cfgDiv" style="font-size: 14px; text-align: left; padding: 10px; padding-bottom: 0px; margin-bottom: 5px;">
                    <div>
                        <label title="0 for instant. Adds ms sleep between clicks so you can watch live solving">Yield Delay (ms):</label>
                        <input type="number" id="radoConfigDelay" value="15" style="width: 50px;">
                    </div>
                    <div style="margin-top: 5px;">
                        <label>First Move:</label>
                        <select id="radoConfigFirst">
                            <option value="center">Random Center</option>
                            <option value="corner">Random Corner</option>
                            <option value="wait">Wait for Click</option>
                        </select>
                    </div>
                    <div style="margin-top: 5px;">
                        <label>Deadlock Move:</label>
                        <select id="radoConfigDeadlock">
                            <option value="smart">Smart Guess</option>
                            <option value="random">Pure Random</option>
                            <option value="wait">Wait for Click</option>
                        </select>
                    </div>
                    <div style="margin-top: 5px;">
                        <label>Auto-Restart Loss:</label>
                        <input type="checkbox" id="radoConfigAuto" checked>
                    </div>
                </div>

                <div id="preBodyDiv" class="preBodyDiv">
                    <button id="radoSolverBtn">RadoSolver</button>
                    <button id="clearLogBtn">ClearLog</button>
                </div>
                <div id="bodyDiv" class="bodyDiv">
                    <div class="RadoSolverMessages" id="RadoSolverMessages"></div>
                </div>
                <div id="footerDiv" class="footerDiv">
                    <marquee class="RadoSolverBanner" scrollamount="3">Made by RADOMAN (Antigravity Refactor)</marquee>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Use an async wrapper to catch rejections (like aborts)
        document.getElementById("radoSolverBtn").addEventListener("click", () => {
             solveDSSP().catch(err => logEvent("Info: " + err));
        });
        document.getElementById("clearLogBtn").addEventListener("click", clearLog);
    }

    function logEvent(s) {
        const l = document.getElementById("RadoSolverMessages");
        if (l) l.insertAdjacentHTML('afterbegin', `<p>${s}</p>`);
    }

    function clearLog() {
        const l = document.getElementById("RadoSolverMessages");
        if (l) l.innerHTML = "";
    }

    function resetStats() {
        numGames = 0;
        totalWins = 0;
        totalLosses = 0;
        totalFastestTimeWin = 99999;
        totalTimeToWin = 0;
        totalTimeToLose = 0;
        totalGuesses = 0;
        totalMoves = 0;
    }

    /*
     * Custom User Intervention Listeners
     */
    function handleBoardClick(e) {
        if (!clickWaiterActive) return;

        let target = e.target;
        if (target && target.className && target.className.includes("square")) {
            // Only capture left-clicks for the algorithm bridge
            if (e.button !== 0) return; 

            const parts = target.id.split("_");
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                const r = parseInt(parts[0], 10) - 1;
                const c = parseInt(parts[1], 10) - 1;
                
                clickWaiterActive = false;
                const boardEl = document.getElementById("game");
                if (boardEl) boardEl.removeEventListener("mouseup", handleBoardClick, true);

                logEvent(`User manual target acknowledged: (${r + 1}, ${c + 1})`);
                if (globalResolveClick) globalResolveClick(new MineSweeperCell(r, c, values.BLANK));
            }
        }
    }

    async function waitForUserClick() {
        return new Promise((resolve, reject) => {
            const boardEl = document.getElementById("game");
            if (!boardEl) {
                logEvent("Failed to attach user click listener. Falling back to random.");
                return resolve(null);
            }
            
            logEvent("<strong style='color:orange;'>PAUSED: Waiting for human intervention. Click a square to continue execution.</strong>");
            clickWaiterActive = true;
            globalResolveClick = resolve;
            globalRejectClick = reject;
            boardEl.addEventListener("mouseup", handleBoardClick, true);
        });
    }

    /*
     * Logic Functions
     */
    function checkWin(board) {
        let openCount = 0;
        let deathOrRevealedFound = false;
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const v = board.getValue(i, j);
                if (v >= values.OPEN0 && v <= values.OPEN8) {
                    openCount++;
                } else if (v === values.BOMBDEATH || v === values.BOMBREVEALED) {
                    deathOrRevealedFound = true;
                }
            }
        }
        
        if (deathOrRevealedFound) return false;
        return openCount === ((rows * cols) - mines);
    }

    function countUnflaggedNeighbors(board, i, j) {
        let r = 0;
        for (let f = 0; f < 8; f++) {
            const auxR = i + movs[f][0];
            const auxC = j + movs[f][1];
            if (auxR >= 0 && auxR < rows && auxC >= 0 && auxC < cols) {
                if (board.getValue(auxR, auxC) === values.BLANK) r++;
            }
        }
        return r;
    }

    function countFlaggedNeighbors(board, i, j) {
        let r = 0;
        for (let f = 0; f < 8; f++) {
            const auxR = i + movs[f][0];
            const auxC = j + movs[f][1];
            if (auxR >= 0 && auxR < rows && auxC >= 0 && auxC < cols) {
                if (board.getValue(auxR, auxC) === values.BOMBFLAGGED) r++;
            }
        }
        return r;
    }

    function effectiveLabel(board, i, j) {
        return board.getValue(i, j) - countFlaggedNeighbors(board, i, j);
    }

    function isAMN(board, i, j) {
        return effectiveLabel(board, i, j) === countUnflaggedNeighbors(board, i, j);
    }

    function isAFN(board, i, j) {
        return effectiveLabel(board, i, j) === 0;
    }

    function getUnmarkedNeighbors(board, i, j, safeCells, safeCellsSet) {
        for (let f = 0; f < 8; f++) {
            const auxR = i + movs[f][0];
            const auxC = j + movs[f][1];
            if (auxR >= 0 && auxR < rows && auxC >= 0 && auxC < cols) {
                const cellVal = board.getValue(auxR, auxC);
                if (cellVal === values.BLANK) {
                    const key = `${auxR},${auxC}`;
                    if (!safeCellsSet.has(key)) {
                        const cell = new MineSweeperCell(auxR, auxC, cellVal);
                        safeCells.push(cell);
                        safeCellsSet.add(key);
                    }
                }
            }
        }
    }

    function flagNeighbors(board, i, j, safeCellsSet) {
        for (let f = 0; f < 8; f++) {
            const auxR = i + movs[f][0];
            const auxC = j + movs[f][1];
            if (auxR >= 0 && auxR < rows && auxC >= 0 && auxC < cols) {
                if (board.getValue(auxR, auxC) === values.BLANK) {
                    toggleFlagIJ(auxR, auxC);
                    logEvent(`Flagged mine at: (${auxR + 1}, ${auxC + 1})`);
                    board.setValue(auxR, auxC, values.BOMBFLAGGED);
                    board.setClicked(auxR, auxC, true);
                    safeCellsSet.add(`${auxR},${auxC}`);
                }
            }
        }
    }

    function getUnflaggedNeighborsList(board, i, j) {
        const list = [];
        for (let f = 0; f < 8; f++) {
            const auxR = i + movs[f][0];
            const auxC = j + movs[f][1];
            if (auxR >= 0 && auxR < rows && auxC >= 0 && auxC < cols) {
                if (board.getValue(auxR, auxC) === values.BLANK) {
                    list.push(`${auxR},${auxC}`);
                }
            }
        }
        return list;
    }

    function doubleSetEvaluate(board, safeCells, safeCellsSet) {
        let progress = false;
        const boundaryCells = [];
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const val = board.getValue(i, j);
                if (val >= values.OPEN1 && val <= values.OPEN8) {
                    const eff = effectiveLabel(board, i, j);
                    if (eff > 0) {
                        const nbrs = getUnflaggedNeighborsList(board, i, j);
                        if (nbrs.length > 0) {
                            boundaryCells.push({ r: i, c: j, eff: eff, nbrs: nbrs });
                        }
                    }
                }
            }
        }

        for (let a = 0; a < boundaryCells.length; a++) {
            const cellA = boundaryCells[a];
            for (let b = 0; b < boundaryCells.length; b++) {
                if (a === b) continue;
                const cellB = boundaryCells[b];
                
                // Chebyshev distance <= 2 checks overlapping vicinity
                if (Math.max(Math.abs(cellA.r - cellB.r), Math.abs(cellA.c - cellB.c)) > 2) continue;

                // Is A a proper subset of B?
                if (cellA.nbrs.length > 0 && cellA.nbrs.length < cellB.nbrs.length) {
                    const isSubset = cellA.nbrs.every(n => cellB.nbrs.includes(n));
                    if (isSubset) {
                        const diffMines = cellB.eff - cellA.eff;
                        const diffSet = cellB.nbrs.filter(n => !cellA.nbrs.includes(n));

                        if (diffSet.length > 0) {
                            if (diffMines === diffSet.length) {
                                // All diff elements are MINES
                                for (const nKey of diffSet) {
                                    if (!safeCellsSet.has(nKey)) {
                                        const parts = nKey.split(",");
                                        const dr = parseInt(parts[0], 10);
                                        const dc = parseInt(parts[1], 10);
                                        
                                        toggleFlagIJ(dr, dc);
                                        logEvent(`[Double-Set Logic]: Certain mine discovered at (${dr + 1}, ${dc + 1})`);
                                        board.setValue(dr, dc, values.BOMBFLAGGED);
                                        board.setClicked(dr, dc, true);
                                        safeCellsSet.add(nKey);
                                        progress = true;
                                    }
                                }
                            } else if (diffMines === 0) {
                                // All diff elements are SAFE
                                for (const nKey of diffSet) {
                                    if (!safeCellsSet.has(nKey)) {
                                        const parts = nKey.split(",");
                                        const dr = parseInt(parts[0], 10);
                                        const dc = parseInt(parts[1], 10);
                                        
                                        logEvent(`[Double-Set Logic]: Certain safe-cell discovered at (${dr + 1}, ${dc + 1})`);
                                        safeCells.push(new MineSweeperCell(dr, dc, values.BLANK));
                                        safeCellsSet.add(nKey);
                                        progress = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return progress;
    }

    function updateBoard(board) {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                board.setValue(i, j, getValueFromDOM(i, j));
            }
        }
    }

    function initialMoveCenter(board) {
        const centerR = Math.floor(rows / 2);
        const centerC = Math.floor(cols / 2);
        let offsetR = getRndInteger(-1, 2);
        let offsetC = getRndInteger(-1, 2);
        let targetR = Math.max(0, Math.min(rows - 1, centerR + offsetR));
        let targetC = Math.max(0, Math.min(cols - 1, centerC + offsetC));
        return new MineSweeperCell(targetR, targetC, values.BLANK);
    }

    async function getInitialMove(board) {
        if (cfgFirstMove === "wait") {
            const userMove = await waitForUserClick();
            if (userMove) return userMove;
        } else if (cfgFirstMove === "corner") {
            const corners = [
                {r: 0, c: 0}, {r: 0, c: cols - 1},
                {r: rows - 1, c: 0}, {r: rows - 1, c: cols - 1}
            ];
            const t = corners[getRndInteger(0, corners.length)];
            return new MineSweeperCell(t.r, t.c, values.BLANK);
        }
        return initialMoveCenter(board);
    }

    function getRandomMovePure(board) {
        currentRandomChoices++;
        const blanks = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (board.getValue(i, j) === values.BLANK) {
                    blanks.push(new MineSweeperCell(i, j, values.BLANK));
                }
            }
        }
        if (blanks.length === 0) return null;
        return blanks[getRndInteger(0, blanks.length)];
    }

    function getRandomMoveSmart(board) {
        currentRandomChoices++;
        const blanks = [];
        const corners = [];
        const edges = [];

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (board.getValue(i, j) === values.BLANK) {
                    const cell = new MineSweeperCell(i, j, values.BLANK);
                    blanks.push(cell);
                    
                    const isEdge = (i === 0 || i === rows - 1 || j === 0 || j === cols - 1);
                    const isCorner = ((i === 0 || i === rows - 1) && (j === 0 || j === cols - 1));
                    
                    if (isCorner) corners.push(cell);
                    else if (isEdge) edges.push(cell);
                }
            }
        }

        if (blanks.length === 0) return null;
        
        let pool = blanks;
        if (corners.length > 0) pool = corners;
        else if (edges.length > 0) pool = edges;

        return pool[getRndInteger(0, pool.length)];
    }

    async function getDeadlockMove(board) {
        if (cfgDeadlockMove === "wait") {
             const userMove = await waitForUserClick();
             if (userMove) return userMove;
        } else if (cfgDeadlockMove === "random") {
             return getRandomMovePure(board);
        }
        return getRandomMoveSmart(board);
    }

    /*
     * Main Executor
     */
    async function solveDSSP() {
        // Intercept triggers that re-fire while a UI Promise is hovering in mid-air
        if (clickWaiterActive && globalRejectClick) {
            clickWaiterActive = false;
            const boardEl = document.getElementById("game");
            if (boardEl) boardEl.removeEventListener("mouseup", handleBoardClick, true);
            globalRejectClick("Aborted due to new play command execution.");
        }

        let board;
        let safeCells = [];
        let safeCellsSet = new Set();
        let questionableCells = [];
        let lost;
        let win;
        let cell;
        let dateStart, dateEnd, gameTime;

        loadConfig();
        clearLog();
        resetStats();
        getBoardSize();
        initDOMCache();

        do {
            board = new MineSweeperBoard(rows, cols, mines);
            safeCells = [];
            safeCellsSet = new Set();
            questionableCells = [];
            
            newGame();
            
            // Re-bind DOM Nodes after new game generation to capture DOM shifts (if any)
            initDOMCache();
            
            lost = false;
            win = false;
            numMoves = 0;
            currentRandomChoices = 0;
            dateStart = new Date().getTime();

            // initial move
            const iMove = await getInitialMove(board);
            safeCells.push(iMove);
            safeCellsSet.add(`${iMove.row},${iMove.column}`);

            // Main loop
            while (!lost && !win) {
                // If there is no safe choice available, evaluate subset logic before guessing
                if (safeCells.length === 0) {
                    let doubleSetProgress = doubleSetEvaluate(board, safeCells, safeCellsSet);
                    
                    if (doubleSetProgress && safeCells.length === 0) {
                        // Double-Set only found FLAGS. We must rescan Single-Point conditions first!
                        for (let i = 0; i < rows; i++) {
                            for (let j = 0; j < cols; j++) {
                                const val = board.getValue(i, j);
                                if (val >= values.OPEN1 && val <= values.OPEN8) {
                                    if (isAMN(board, i, j)) flagNeighbors(board, i, j, safeCellsSet);
                                    if (isAFN(board, i, j)) getUnmarkedNeighbors(board, i, j, safeCells, safeCellsSet);
                                }
                            }
                        }
                    }
                }

                // Still deadlocked? Execute User Configured Guess Strategy
                if (safeCells.length === 0) {
                    const randomChoice = await getDeadlockMove(board);
                    if (!randomChoice) {
                        logEvent("Fatal Deadlock: No valid targets found.");
                        break;
                    }
                    if (cfgDeadlockMove !== "wait") {
                        logEvent(`Forced algorithm guess! Targeting: (${randomChoice.row + 1}, ${randomChoice.column + 1})`);
                    }
                    safeCells.push(randomChoice);
                    safeCellsSet.add(`${randomChoice.row},${randomChoice.column}`);
                }

                // Open all confirmed safe cells
                while (safeCells.length > 0 && !lost && !win) {
                    cell = safeCells.shift();
                    const key = `${cell.row},${cell.column}`;
                    safeCellsSet.delete(key); 
                    
                    logEvent(`Opening cell: (${cell.row + 1}, ${cell.column + 1})`);
                    openIJ(cell.row, cell.column);
                    numMoves++;
                    board.setClicked(cell.row, cell.column, true);

                    if (cfgDelayMs > 0) {
                        await sleep(cfgDelayMs / 1000);
                    }

                    // Pull fresh data
                    updateBoard(board);
                    cell.value = board.getValue(cell.row, cell.column);

                    if (cell.value === values.BOMBDEATH) {
                        lost = true;
                        break;
                    }
                    if (checkWin(board)) {
                        win = true;
                        break;
                    }

                    // Sweep the map for actionable clues (evaluate neighbors)
                    questionableCells = [];
                    for (let i = 0; i < rows; i++) {
                        for (let j = 0; j < cols; j++) {
                            const val = board.getValue(i, j);
                            if (val >= values.OPEN1 && val <= values.OPEN8) {
                                if (isAFN(board, i, j)) {
                                    getUnmarkedNeighbors(board, i, j, safeCells, safeCellsSet);
                                } else {
                                    questionableCells.push(new MineSweeperCell(i, j, val));
                                }
                            }
                        }
                    }
                }

                questionableCells = questionableCells.filter(qCell => {
                    if (isAMN(board, qCell.row, qCell.column)) {
                        flagNeighbors(board, qCell.row, qCell.column, safeCellsSet);
                        return false; 
                    }
                    return true;
                });

                questionableCells = questionableCells.filter(qCell => {
                    if (isAFN(board, qCell.row, qCell.column)) {
                        getUnmarkedNeighbors(board, qCell.row, qCell.column, safeCells, safeCellsSet);
                        return false;
                    }
                    return true;
                });

                if (!win) win = checkWin(board);
            }

            dateEnd = new Date().getTime();
            gameTime = (dateEnd - dateStart) / 1000;

            if (win) {
                logEvent("WE WON! :) :)");
                totalWins++;
                if (gameTime < totalFastestTimeWin) {
                    totalFastestTimeWin = gameTime;
                }
                totalTimeToWin += gameTime;
            } else {
                logEvent("WE LOST! :( :(");
                totalLosses++;
                totalTimeToLose += gameTime;
            }
            
            totalGuesses += currentRandomChoices;
            totalMoves += numMoves;

        } while (!win && cfgAutoRestart);

        metricsReport();
    }

    function metricsReport() {
        logEvent("====================");
        logEvent("Total Games Played: " + numGames);
        logEvent("Total Games Won   : " + totalWins);
        logEvent("Total Games Lost  : " + totalLosses);
        
        const winPercent = numGames > 0 ? (totalWins * 100 / numGames).toFixed(1) : 0;
        logEvent("Win %: " + winPercent);
        
        if (totalWins > 0) {
           logEvent("Fastest Win: " + totalFastestTimeWin.toFixed(2) + "s");
           logEvent("Avg Time Wins : " + (totalTimeToWin / totalWins).toFixed(2) + "s");
        }
        if (totalLosses > 0) {
             logEvent("Avg Time Loss : " + (totalTimeToLose / totalLosses).toFixed(2) + "s");
        }
        logEvent("Total Moves       : " + totalMoves);
        logEvent("Total Guesses     : " + totalGuesses);
        if (totalMoves > 0) {
            logEvent("Guess %           : " + ((totalGuesses * 100) / totalMoves).toFixed(1));
        }
        logEvent("====================");
    }

    createControlBox();

})();