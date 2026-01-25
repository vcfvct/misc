        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const gameOverScreen = document.getElementById('game-over');
        const finalScoreDisplay = document.getElementById('final-score');
        const scoreDisplay = document.getElementById('score');

        const gridSize = 40; // Increased size for visibility matches 600/40 = 15 tiles
        const tileCountX = canvas.width / gridSize;
        const tileCountY = canvas.height / gridSize;

        let score = 0;
        let snake = [];
        let food = {x: 0, y: 0};
        let dx = 0;
        let dy = 0;
        let gameLoop;
        let isGameRunning = false;
        let isPaused = false;

        let touchStartX = 0;
        let touchStartY = 0;

        // Parse query parameters
        const urlParams = new URLSearchParams(window.location.search);
        // Default to Ivy if not specified
        const playerName = urlParams.get('name') || 'Ivy';
        const playerImageSrc = urlParams.get('img') || 'ivy-game-head.jpeg';

        // Update page title and heading
        document.title = `${playerName}'s Snake Game`;
        document.querySelector('h1').innerText = `${playerName}'s Snake Game`;

        const headImage = new Image();
        headImage.src = playerImageSrc;

        document.addEventListener('keydown', keyDownEvent);

        // Use passive: false to ensure preventDefault works on Android/Chrome
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

        initGame();

        function initGame() {
            snake = [{x: 10, y: 10}];
            placeFood();

            if (headImage.complete) {
                startGame();
            } else {
                headImage.onload = startGame;
                setTimeout(() => {
                    if (!gameLoop) startGame();
                }, 1000);
            }
        }

        function startGame() {
            if (gameLoop) clearInterval(gameLoop);
            isGameRunning = true;
            gameOverScreen.style.display = 'none';
            // Game FPS
            gameLoop = setInterval(drawGame, 1000/5);
        }

        function drawPaused() {
            ctx.fillStyle = 'white';
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("PAUSED", canvas.width/2, canvas.height/2);
            ctx.font = '20px Arial';
            ctx.fillText("Press Space to Resume", canvas.width/2, canvas.height/2 + 50);
        }

        function drawGame() {
            if (isPaused) {
                drawPaused();
                return;
            }
            moveSnake();

            if (checkCollision()) {
                handleGameOver();
                return;
            }

            clearCanvas();
            drawFood();
            drawSnake();
        }

        function handleGameOver() {
            clearInterval(gameLoop);
            isGameRunning = false;
            finalScoreDisplay.innerText = 'Score: ' + score;
            gameOverScreen.style.display = 'flex';
        }

        function clearCanvas() {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        function moveSnake() {
            if (dx === 0 && dy === 0) return;

            const head = {x: snake[0].x + dx, y: snake[0].y + dy};
            snake.unshift(head);

            if (head.x === food.x && head.y === food.y) {
                score++;
                scoreDisplay.innerText = 'Score: ' + score;
                placeFood();
            } else {
                snake.pop();
            }
        }

        function drawSnake() {
            ctx.save();
            const headX = snake[0].x * gridSize;
            const headY = snake[0].y * gridSize;

            if (headImage.complete && headImage.naturalWidth !== 0) {
                // Draw head centered and larger, without rotation
                const visualSize = gridSize * 1.5;
                const offset = (visualSize - gridSize) / 2;
                ctx.drawImage(headImage, headX - offset, headY - offset, visualSize, visualSize);
            } else {
                ctx.fillStyle = 'green';
                ctx.fillRect(headX, headY, gridSize - 2, gridSize - 2);
            }
            ctx.restore();

            ctx.fillStyle = 'lime';
            for (let i = 1; i < snake.length; i++) {
                ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize - 2, gridSize - 2);
            }
        }

        function drawFood() {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            const cx = food.x * gridSize + gridSize/2;
            const cy = food.y * gridSize + gridSize/2;
            ctx.arc(cx, cy, gridSize/2 - 2, 0, 2 * Math.PI);
            ctx.fill();
        }

        function placeFood() {
            food.x = Math.floor(Math.random() * tileCountX);
            food.y = Math.floor(Math.random() * tileCountY);

            for (let part of snake) {
                if (part.x === food.x && part.y === food.y) {
                    placeFood();
                    break;
                }
            }
        }

        function checkCollision() {
            const head = snake[0];
            if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
                return true;
            }
            for (let i = 1; i < snake.length; i++) {
                if (head.x === snake[i].x && head.y === snake[i].y) {
                    return true;
                }
            }
            return false;
        }

        function resetGame() {
            score = 0;
            scoreDisplay.innerText = 'Score: ' + score;
            snake = [{x: 10, y: 10}];
            dx = 0;
            dy = 0;
            isPaused = false;
            placeFood();
            startGame();
        }

        function keyDownEvent(e) {
            // Prevent scrolling with arrow keys and space
            if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
                e.preventDefault();
            }

            if (e.keyCode === 32) { // Space bar
                if (isGameRunning) {
                    isPaused = !isPaused;
                }
                return;
            }

            if (isPaused) return;

            switch (e.keyCode) {
                case 37:
                    if (dx !== 1) { dx = -1; dy = 0; }
                    break;
                case 38:
                    if (dy !== 1) { dx = 0; dy = -1; }
                    break;
                case 39:
                    if (dx !== -1) { dx = 1; dy = 0; }
                    break;
                case 40:
                    if (dy !== -1) { dx = 0; dy = 1; }
                    break;
            }
        }

        function handleTouchStart(evt) {
            const firstTouch = evt.touches[0];
            touchStartX = firstTouch.clientX;
            touchStartY = firstTouch.clientY;
            evt.preventDefault();
        }

        function handleTouchMove(evt) {
            if (!touchStartX || !touchStartY) return;

            // Prevent default behavior (scrolling) immediately
            evt.preventDefault();

            let touchEndX = evt.touches[0].clientX;
            let touchEndY = evt.touches[0].clientY;

            let xDiff = touchStartX - touchEndX;
            let yDiff = touchStartY - touchEndY;

            // Add threshold to avoid accidental small twitches
            if (Math.abs(xDiff) < 10 && Math.abs(yDiff) < 10) {
                return;
            }

            if (Math.abs(xDiff) > Math.abs(yDiff)) {
                if (xDiff > 0) {
                    if (dx !== 1) { dx = -1; dy = 0; }
                } else {
                    if (dx !== -1) { dx = 1; dy = 0; }
                }
            } else {
                if (yDiff > 0) {
                    if (dy !== 1) { dx = 0; dy = -1; }
                } else {
                    if (dy !== -1) { dx = 0; dy = 1; }
                }
            }
            touchStartX = 0;
            touchStartY = 0;
        }