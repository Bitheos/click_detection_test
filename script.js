document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const testArea = document.getElementById('testArea');
    const resetBtn = document.getElementById('resetBtn');
    const exportBtn = document.getElementById('exportBtn');
    const shareBtn = document.getElementById('shareBtn');
    const inputCount = document.getElementById('inputCount');
    const leftClickCount = document.getElementById('leftClickCount');
    const rightClickCount = document.getElementById('rightClickCount');
    const keyPressCount = document.getElementById('keyPressCount');
    const currentCount = document.getElementById('currentCount');
    const leftClickAvg = document.getElementById('leftClickAvg');
    const rightClickAvg = document.getElementById('rightClickAvg');
    const keyPressAvg = document.getElementById('keyPressAvg');
    const inputHistory = document.getElementById('inputHistory');
    const statusIndicator = document.getElementById('statusIndicator');
    const historyInfo = document.getElementById('historyInfo');
    const keyDisplay = document.getElementById('keyDisplay');
    const currentInputDisplay = document.getElementById('currentInputDisplay');
    const currentInputElement = document.getElementById('currentInput');
    const timerDisplay = document.getElementById('timerDisplay');
    const cpsDisplay = document.getElementById('cpsDisplay');
    const bestCPS = document.getElementById('bestCPS');
    const bestTime5 = document.getElementById('bestTime5');
    const bestTime10 = document.getElementById('bestTime10');
    const bestTime30 = document.getElementById('bestTime30');
    const comparisonBadge = document.getElementById('comparisonBadge');
    const macroWarning = document.getElementById('macroWarning');
    const countdownOverlay = document.getElementById('countdownOverlay');
    const countdownNumber = document.getElementById('countdownNumber');
    const themeToggle = document.getElementById('themeToggle');
    const soundToggle = document.getElementById('soundToggle');
    const shareSection = document.getElementById('shareSection');
    const shareLink = document.getElementById('shareLink');
    const timerModeButtons = document.querySelectorAll('.timer-mode-btn');
    
    // Test state
    let testActive = false;
    let inputTimes = [];
    let currentInput = null;
    let currentInputType = null;
    let currentInputCount = 0;
    let leftClicks = 0;
    let rightClicks = 0;
    let keyPresses = 0;
    let totalInputs = 0;
    let lastInputTime = null;
    let inputNumber = 0;
    let timerDuration = 0;
    let timerRemaining = 0;
    let timerInterval = null;
    let testStartTime = null;
    let currentCPS = 0;
    let soundEnabled = true;
    let chartData = [];
    let performanceChart = null;
    
    // Records
    let records = {
        bestCPS: 0,
        best5s: 0,
        best10s: 0,
        best30s: 0
    };
    
    // Load records from localStorage
    try {
        const savedRecords = localStorage.getItem('clickTestRecords');
        if (savedRecords) {
            records = JSON.parse(savedRecords);
            updateRecordsDisplay();
        }
    } catch (e) {
        console.error('Error loading records:', e);
    }
    
    // Constants
    const MAX_HISTORY = 50;
    const DEBOUNCE_TIME = 10;
    const AVERAGE_CPS = 6.5;
    const MACRO_THRESHOLD = 5;
    
    // Audio context for click sounds
    let audioContext = null;
    
    function playClickSound() {
        if (!soundEnabled) return;
        
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }
    
    // Initialize chart
    function initChart() {
        const canvas = document.getElementById('performanceChart');
        const ctx = canvas.getContext('2d');
        performanceChart = { canvas, ctx, data: [] };
        drawChart();
    }
    
    function drawChart() {
        if (!performanceChart) return;
        
        const { canvas, ctx } = performanceChart;
        const width = canvas.parentElement.clientWidth - 32;
        const height = 250;
        canvas.width = width;
        canvas.height = height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (chartData.length < 2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Start testing to see performance graph', width / 2, height / 2);
            return;
        }
        
        const maxCPS = Math.max(...chartData.map(d => d.cps), 10);
        const padding = 40;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (graphHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Draw line
        ctx.strokeStyle = '#fdbb2d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        chartData.forEach((point, index) => {
            const x = padding + (graphWidth / (chartData.length - 1)) * index;
            const y = padding + graphHeight - (point.cps / maxCPS) * graphHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = '#fdbb2d';
        chartData.forEach((point, index) => {
            const x = padding + (graphWidth / (chartData.length - 1)) * index;
            const y = padding + graphHeight - (point.cps / maxCPS) * graphHeight;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = padding + (graphHeight / 5) * i;
            const value = (maxCPS * (5 - i) / 5).toFixed(1);
            ctx.fillText(value, padding - 10, y + 4);
        }
        
        ctx.textAlign = 'center';
        ctx.fillText('CPS', padding - 10, padding - 10);
    }
    
    // Timer mode selection
    timerModeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (testActive) return;
            
            timerModeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            timerDuration = parseInt(this.dataset.duration);
            
            if (timerDuration > 0) {
                timerDisplay.textContent = `${timerDuration}s`;
            } else {
                timerDisplay.textContent = 'Ready';
            }
        });
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        drawChart();
    });
    
    // Sound toggle
    soundToggle.addEventListener('click', function() {
        soundEnabled = !soundEnabled;
        this.classList.toggle('muted');
        this.textContent = soundEnabled ? '🔊' : '🔇';
    });
    
    function startCountdown(callback) {
        let count = 3;
        countdownOverlay.classList.add('active');
        countdownNumber.textContent = count;
        
        // Disable mode buttons during countdown
        timerModeButtons.forEach(btn => btn.disabled = true);
        
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
            } else {
                countdownNumber.textContent = 'GO!';
                setTimeout(() => {
                    countdownOverlay.classList.remove('active');
                    callback();
                }, 500);
                clearInterval(countdownInterval);
            }
        }, 1000);
    }
    
    function startTimer() {
        if (timerDuration === 0) return;
        
        timerRemaining = timerDuration;
        testStartTime = Date.now();
        
        timerInterval = setInterval(() => {
            const elapsed = (Date.now() - testStartTime) / 1000;
            timerRemaining = Math.max(0, timerDuration - elapsed);
            
            timerDisplay.textContent = timerRemaining.toFixed(2) + 's';
            
            if (elapsed > 0) {
                currentCPS = currentInputCount / elapsed;
                cpsDisplay.textContent = currentCPS.toFixed(2);
                
                if (Math.floor(elapsed * 2) > chartData.length) {
                    chartData.push({ time: elapsed, cps: currentCPS });
                    drawChart();
                }
            }
            
            if (timerRemaining <= 0) {
                endTimedTest();
            }
        }, 50);
    }
    
    function endTimedTest() {
        clearInterval(timerInterval);
        testActive = false;
        testArea.classList.remove('active');
        timerModeButtons.forEach(btn => btn.disabled = false);
        
        const finalCPS = currentCPS;
        
        let newRecord = false;
        if (finalCPS > records.bestCPS) {
            records.bestCPS = finalCPS;
            newRecord = true;
        }
        
        if (timerDuration === 5 && currentInputCount > records.best5s) {
            records.best5s = currentInputCount;
            newRecord = true;
        }
        
        if (timerDuration === 10 && currentInputCount > records.best10s) {
            records.best10s = currentInputCount;
            newRecord = true;
        }
        
        if (timerDuration === 30 && currentInputCount > records.best30s) {
            records.best30s = currentInputCount;
            newRecord = true;
        }
        
        if (newRecord) {
            try {
                localStorage.setItem('clickTestRecords', JSON.stringify(records));
            } catch (e) {
                console.error('Error saving records:', e);
            }
            updateRecordsDisplay();
            statusIndicator.textContent = `🎉 NEW RECORD! CPS: ${finalCPS.toFixed(2)}`;
        } else {
            statusIndicator.textContent = `Test Complete! CPS: ${finalCPS.toFixed(2)}`;
        }
        
        statusIndicator.className = 'status-indicator status-waiting';
        timerDisplay.textContent = 'Complete!';
    }
    
    function updateRecordsDisplay() {
        bestCPS.textContent = records.bestCPS.toFixed(2);
        bestTime5.textContent = records.best5s > 0 ? `${records.best5s} clicks (${(records.best5s / 5).toFixed(2)} CPS)` : 'N/A';
        bestTime10.textContent = records.best10s > 0 ? `${records.best10s} clicks (${(records.best10s / 10).toFixed(2)} CPS)` : 'N/A';
        bestTime30.textContent = records.best30s > 0 ? `${records.best30s} clicks (${(records.best30s / 30).toFixed(2)} CPS)` : 'N/A';
    }
    
    function updateComparison() {
        if (currentCPS === 0) {
            comparisonBadge.textContent = '';
            return;
        }
        
        const diff = ((currentCPS - AVERAGE_CPS) / AVERAGE_CPS) * 100;
        
        if (diff > 20) {
            comparisonBadge.textContent = `${diff.toFixed(0)}% above average`;
            comparisonBadge.className = 'comparison-badge comparison-above';
        } else if (diff < -20) {
            comparisonBadge.textContent = `${Math.abs(diff).toFixed(0)}% below average`;
            comparisonBadge.className = 'comparison-badge comparison-below';
        } else {
            comparisonBadge.textContent = 'Average speed';
            comparisonBadge.className = 'comparison-badge comparison-average';
        }
    }
    
    function detectMacro() {
        if (inputTimes.length < MACRO_THRESHOLD) return;
        
        const recentTimes = inputTimes.slice(0, MACRO_THRESHOLD).map(i => i.time).filter(t => t > 0);
        if (recentTimes.length < MACRO_THRESHOLD) return;
        
        const avg = recentTimes.reduce((a, b) => a + b) / recentTimes.length;
        const variance = recentTimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / recentTimes.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev < 5 && avg < 100) {
            macroWarning.classList.add('active');
        } else {
            macroWarning.classList.remove('active');
        }
    }
    
    function initTestArea() {
        testArea.setAttribute('tabindex', '0');
        testArea.addEventListener('click', handleLeftClick);
        testArea.addEventListener('contextmenu', handleRightClick);
        testArea.addEventListener('keydown', handleKeyPress);
        testArea.focus();
    }
    
    function handleLeftClick(e) {
        e.preventDefault();
        
        testArea.classList.add('click-effect');
        setTimeout(() => testArea.classList.remove('click-effect'), 200);
        
        if (!testActive) {
            if (timerDuration > 0) {
                startCountdown(() => {
                    startTest('left', 'Left Click');
                    recordInput('left', 'Left Click');
                    updateDisplay();
                });
                return;
            } else {
                startTest('left', 'Left Click');
            }
        } else if (currentInputType !== 'left') {
            switchInput('left', 'Left Click');
        }
        
        recordInput('left', 'Left Click');
        updateDisplay();
    }
    
    function handleRightClick(e) {
        e.preventDefault();
        
        testArea.classList.add('click-effect');
        setTimeout(() => testArea.classList.remove('click-effect'), 200);
        
        if (!testActive) {
            if (timerDuration > 0) {
                startCountdown(() => {
                    startTest('right', 'Right Click');
                    recordInput('right', 'Right Click');
                    updateDisplay();
                });
                return;
            } else {
                startTest('right', 'Right Click');
            }
        } else if (currentInputType !== 'right') {
            switchInput('right', 'Right Click');
        }
        
        recordInput('right', 'Right Click');
        updateDisplay();
    }
    
    function handleKeyPress(e) {
        e.preventDefault();
        
        let keyName = e.key;
        if (keyName === ' ') {
            keyName = 'Space';
        } else if (keyName === 'Escape') {
            keyName = 'Esc';
        } else if (keyName.length > 1) {
            keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1).toLowerCase();
        }
        
        if (!testActive) {
            if (timerDuration > 0) {
                startCountdown(() => {
                    startTest('key', keyName);
                    recordInput('key', keyName);
                    updateDisplay();
                });
                return;
            } else {
                startTest('key', keyName);
            }
        } else if (currentInputType !== 'key' || currentInput !== keyName) {
            switchInput('key', keyName);
        }
        
        recordInput('key', keyName);
        updateDisplay();
    }
    
    function switchInput(type, value) {
        currentInputType = type;
        currentInput = value;
        currentInputCount = 0;
        currentInputDisplay.textContent = `Current: ${value}`;
        currentInputElement.textContent = value;
        
        if (timerDuration === 0) {
            chartData = [];
            testStartTime = Date.now();
        }
    }
    
    function startTest(type, value) {
        testActive = true;
        testArea.classList.add('active');
        switchInput(type, value);
        statusIndicator.textContent = `Testing: ${value}`;
        statusIndicator.className = 'status-indicator status-active';
        
        if (timerDuration > 0) {
            startTimer();
        } else {
            testStartTime = Date.now();
        }
        
        testArea.focus();
    }
    
    function recordInput(type, value) {
        const now = Date.now();
        const timeSinceLastInput = lastInputTime ? now - lastInputTime : 0;
        
        if (timeSinceLastInput > 0 && timeSinceLastInput < DEBOUNCE_TIME) {
            return;
        }
        
        playClickSound();
        
        inputNumber++;
        
        const inputData = {
            number: inputNumber,
            type: type,
            value: value,
            time: timeSinceLastInput,
            timestamp: new Date().toLocaleTimeString()
        };
        
        inputTimes.unshift(inputData);
        
        if (inputTimes.length > MAX_HISTORY) {
            inputTimes.pop();
        }
        
        currentInputCount++;
        totalInputs++;
        
        if (type === 'left') {
            leftClicks++;
        } else if (type === 'right') {
            rightClicks++;
        } else if (type === 'key') {
            keyPresses++;
        }
        
        lastInputTime = now;
        
        if (type === 'key') {
            keyDisplay.textContent = value;
            setTimeout(() => {
                keyDisplay.textContent = '';
            }, 300);
        }
        
        if (timerDuration === 0 && testStartTime) {
            const elapsed = (now - testStartTime) / 1000;
            if (elapsed > 0) {
                currentCPS = currentInputCount / elapsed;
                cpsDisplay.textContent = currentCPS.toFixed(2);
                
                if (Math.floor(elapsed * 2) > chartData.length) {
                    chartData.push({ time: elapsed, cps: currentCPS });
                    drawChart();
                }
            }
        }
        
        updateHistoryTable();
        detectMacro();
    }
    
    function updateHistoryTable() {
        inputHistory.innerHTML = '';
        
        inputTimes.forEach(input => {
            const row = document.createElement('tr');
            
            const indexCell = document.createElement('td');
            indexCell.textContent = input.number;
            
            const typeCell = document.createElement('td');
            let typeText = '';
            let typeClass = '';
            
            if (input.type === 'left') {
                typeText = 'Left Click';
                typeClass = 'input-type-left';
            } else if (input.type === 'right') {
                typeText = 'Right Click';
                typeClass = 'input-type-right';
            } else {
                typeText = 'Key Press';
                typeClass = 'input-type-key';
            }
            
            typeCell.textContent = typeText;
            typeCell.className = typeClass;
            
            const valueCell = document.createElement('td');
            valueCell.textContent = input.value;
            
            const timeCell = document.createElement('td');
            timeCell.textContent = `${input.time} ms`;
            
            const timestampCell = document.createElement('td');
            timestampCell.textContent = input.timestamp;
            
            row.appendChild(indexCell);
            row.appendChild(typeCell);
            row.appendChild(valueCell);
            row.appendChild(timeCell);
            row.appendChild(timestampCell);
            
            inputHistory.appendChild(row);
        });
        
        const displayedCount = inputTimes.length;
        historyInfo.textContent = `Showing last ${displayedCount} of ${totalInputs} total inputs`;
    }
    
    function updateDisplay() {
        inputCount.textContent = totalInputs.toLocaleString();
        currentCount.textContent = currentInputCount.toLocaleString();
        leftClickCount.textContent = leftClicks.toLocaleString();
        rightClickCount.textContent = rightClicks.toLocaleString();
        keyPressCount.textContent = keyPresses.toLocaleString();
        
        const leftTimes = inputTimes
            .filter(input => input.type === 'left')
            .map(i => i.time);

        const rightTimes = inputTimes
            .filter(input => input.type === 'right')
            .map(i => i.time);

        const keyTimes = inputTimes
            .filter(input => input.type === 'key' && input.value === currentInput)
            .map(input => input.time)
            .filter(t => t > 0);

        const leftAvg = leftTimes.length > 0 ?
            Math.round(leftTimes.reduce((a, b) => a + b, 0) / leftTimes.length) : 0;

        const rightAvg = rightTimes.length > 0 ?
            Math.round(rightTimes.reduce((a, b) => a + b, 0) / rightTimes.length) : 0;

        const keyAvg = keyTimes.length > 0 ?
            Math.round(keyTimes.reduce((a, b) => a + b, 0) / keyTimes.length) : 0;

        leftClickAvg.textContent = `${leftAvg} ms`;
        rightClickAvg.textContent = `${rightAvg} ms`;
        keyPressAvg.textContent = `${keyAvg} ms`;
        
        updateComparison();
        
        if (testActive) {
            statusIndicator.textContent = `Testing: ${currentInput}`;
            statusIndicator.className = 'status-indicator status-active';
        }
    }
    
    function resetTest() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        testActive = false;
        currentInput = null;
        currentInputType = null;
        currentInputCount = 0;
        leftClicks = 0;
        rightClicks = 0;
        keyPresses = 0;
        totalInputs = 0;
        inputTimes = [];
        lastInputTime = null;
        inputNumber = 0;
        currentCPS = 0;
        chartData = [];
        testStartTime = null;
        
        inputHistory.innerHTML = '';
        keyDisplay.textContent = '';
        currentInputDisplay.textContent = 'Current: None';
        currentInputElement.textContent = '-';
        cpsDisplay.textContent = '0.00';
        statusIndicator.textContent = 'Waiting for first input...';
        statusIndicator.className = 'status-indicator status-waiting';
        historyInfo.textContent = 'Showing 0 inputs';
        comparisonBadge.textContent = '';
        macroWarning.classList.remove('active');
        shareSection.style.display = 'none';
        
        timerModeButtons.forEach(btn => btn.disabled = false);
        
        if (timerDuration > 0) {
            timerDisplay.textContent = `${timerDuration}s`;
        } else {
            timerDisplay.textContent = 'Ready';
        }
        
        drawChart();
        updateDisplay();
        testArea.focus();
    }
    
    exportBtn.addEventListener('click', function() {
        if (inputTimes.length === 0) {
            alert('No data to export!');
            return;
        }
        
        let csv = 'Number,Type,Value,Time (ms),Timestamp\n';
        
        inputTimes.slice().reverse().forEach(input => {
            const type = input.type === 'left' ? 'Left Click' : 
                        input.type === 'right' ? 'Right Click' : 'Key Press';
            csv += `${input.number},"${type}","${input.value}",${input.time},"${input.timestamp}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `click-test-results-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    });
    
    shareBtn.addEventListener('click', function() {
        const shareData = {
            cps: currentCPS.toFixed(2),
            clicks: currentInputCount,
            duration: timerDuration || 'free',
            best: records.bestCPS.toFixed(2)
        };
        
        const encoded = btoa(JSON.stringify(shareData));
        const shareUrl = `${window.location.origin}${window.location.pathname}?results=${encoded}`;
        
        shareLink.textContent = shareUrl;
        shareSection.style.display = 'block';
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const sharedResults = urlParams.get('results');
    if (sharedResults) {
        try {
            const data = JSON.parse(atob(sharedResults));
            alert(`📊 Shared Results:\n\nCPS: ${data.cps}\nClicks: ${data.clicks}\nDuration: ${data.duration}\nBest CPS: ${data.best}`);
        } catch (e) {
            console.error('Invalid shared results');
        }
    }
    
    resetBtn.addEventListener('click', resetTest);
    
    document.addEventListener('click', function() {
        testArea.focus();
    });
    
    initTestArea();
    initChart();
});