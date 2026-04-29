/**
 * Snake Game Implementation
 * A classic Snake game with canvas rendering, keyboard controls,
 * collision detection, and score tracking.
 */

(function () {
  'use strict';

  // Polyfill for roundRect if not supported
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
      if (width < 2 * radius) radius = width / 2;
      if (height < 2 * radius) radius = height / 2;
      this.beginPath();
      this.moveTo(x + radius, y);
      this.arcTo(x + width, y, x + width, y + height, radius);
      this.arcTo(x + width, y + height, x, y + height, radius);
      this.arcTo(x, y + height, x, y, radius);
      this.arcTo(x, y, x + width, y, radius);
      this.closePath();
      return this;
    };
  }

  // Game configuration
  const CONFIG = {
    canvas: {
      width: 600,
      height: 600,
    },
    grid: {
      size: 20, // Size of each grid cell
    },
    colors: {
      background: '#1a1a2e',
      snake: '#00ff88',
      snakeHead: '#00cc70',
      food: '#ff0066',
      text: '#ffffff',
      gameOverBg: 'rgba(0, 0, 0, 0.7)',
    },
    gameSpeed: 100, // Milliseconds between game ticks
    initialSnakeLength: 3,
  };

  // Calculate grid dimensions
  const GRID_WIDTH = CONFIG.canvas.width / CONFIG.grid.size;
  const GRID_HEIGHT = CONFIG.canvas.height / CONFIG.grid.size;

  /**
   * Game state object
   */
  const gameState = {
    snake: [],
    food: null,
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    highScore: parseInt(localStorage.getItem('snakeHighScore')) || 0,
    isGameOver: false,
    isPaused: false,
    isRunning: false,
    gameLoop: null,
  };

  /**
   * Canvas and context references
   */
  let canvas, ctx;

  /**
   * Initialize the game
   */
  function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.error('Canvas element with id "gameCanvas" not found!');
      return;
    }

    ctx = canvas.getContext('2d');

    // Set canvas dimensions
    canvas.width = CONFIG.canvas.width;
    canvas.height = CONFIG.canvas.height;

    // Set up event listeners
    setupEventListeners();

    // Draw initial state
    drawStartScreen();
  }

  /**
   * Set up keyboard event listeners
   */
  function setupEventListeners() {
    document.addEventListener('keydown', handleKeyDown);

    // Touch controls for mobile (optional enhancement)
    setupTouchControls();
  }

  /**
   * Handle keyboard input
   * @param {KeyboardEvent} event
   */
  function handleKeyDown(event) {
    const key = event.key;

    // Prevent default behavior for arrow keys and space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
      event.preventDefault();
    }

    // Handle game over restart
    if (gameState.isGameOver && key === ' ') {
      restartGame();
      return;
    }

    // Handle pause toggle
    if (key === 'p' || key === 'P') {
      togglePause();
      return;
    }

    // Handle direction changes (prevent 180-degree turns)
    switch (key) {
      case 'ArrowUp':
        if (gameState.direction !== 'down') {
          gameState.nextDirection = 'up';
        }
        break;
      case 'ArrowDown':
        if (gameState.direction !== 'up') {
          gameState.nextDirection = 'down';
        }
        break;
      case 'ArrowLeft':
        if (gameState.direction !== 'right') {
          gameState.nextDirection = 'left';
        }
        break;
      case 'ArrowRight':
        if (gameState.direction !== 'left') {
          gameState.nextDirection = 'right';
        }
        break;
      case ' ':
        if (!gameState.isRunning && !gameState.isGameOver) {
          startGame();
        }
        break;
    }
  }

  /**
   * Set up touch controls for mobile devices
   */
  function setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener('touchstart', function (event) {
      event.preventDefault();
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    });

    canvas.addEventListener('touchend', function (event) {
      event.preventDefault();
      if (!gameState.isRunning && !gameState.isGameOver) {
        startGame();
        return;
      }

      if (gameState.isGameOver) {
        restartGame();
        return;
      }

      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      // Determine swipe direction based on larger movement
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 0 && gameState.direction !== 'left') {
          gameState.nextDirection = 'right';
        } else if (dx < 0 && gameState.direction !== 'right') {
          gameState.nextDirection = 'left';
        }
      } else {
        // Vertical swipe
        if (dy > 0 && gameState.direction !== 'up') {
          gameState.nextDirection = 'down';
        } else if (dy < 0 && gameState.direction !== 'down') {
          gameState.nextDirection = 'up';
        }
      }
    });
  }

  /**
   * Start the game
   */
  function startGame() {
    resetGameState();
    gameState.isRunning = true;
    gameState.isGameOver = false;
    gameState.isPaused = false;

    // Start game loop
    gameState.gameLoop = setInterval(gameTick, CONFIG.gameSpeed);
  }

  /**
   * Reset the game state to initial values
   */
  function resetGameState() {
    // Initialize snake in the middle of the canvas
    const startX = Math.floor(GRID_WIDTH / 2);
    const startY = Math.floor(GRID_HEIGHT / 2);

    gameState.snake = [];
    for (let i = 0; i < CONFIG.initialSnakeLength; i++) {
      gameState.snake.push({
        x: startX - i,
        y: startY,
      });
    }

    gameState.direction = 'right';
    gameState.nextDirection = 'right';
    gameState.score = 0;
    gameState.isGameOver = false;
    gameState.isPaused = false;

    // Generate first food
    generateFood();
  }

  /**
   * Generate food at a random position not occupied by the snake
   */
  function generateFood() {
    let newFood;
    let isOnSnake;

    do {
      isOnSnake = false;
      newFood = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT),
      };

      // Check if food is on snake
      for (const segment of gameState.snake) {
        if (segment.x === newFood.x && segment.y === newFood.y) {
          isOnSnake = true;
          break;
        }
      }
    } while (isOnSnake);

    gameState.food = newFood;
  }

  /**
   * Main game tick - called on each interval
   */
  function gameTick() {
    if (gameState.isPaused || gameState.isGameOver) {
      return;
    }

    // Update direction
    gameState.direction = gameState.nextDirection;

    // Move snake
    moveSnake();

    // Check for collisions
    if (checkCollisions()) {
      endGame();
      return;
    }

    // Check if snake ate food
    if (checkFoodCollision()) {
      handleFoodEaten();
    }

    // Draw the game
    draw();
  }

  /**
   * Move the snake in the current direction
   */
  function moveSnake() {
    // Get head position
    const head = { ...gameState.snake[0] };

    // Calculate new head position based on direction
    switch (gameState.direction) {
      case 'up':
        head.y -= 1;
        break;
      case 'down':
        head.y += 1;
        break;
      case 'left':
        head.x -= 1;
        break;
      case 'right':
        head.x += 1;
        break;
    }

    // Add new head to the beginning of the snake
    gameState.snake.unshift(head);

    // Remove the tail (unless food was eaten, handled separately)
    // We'll remove the tail in checkFoodCollision if no food was eaten
  }

  /**
   * Check for collisions (walls or self)
   * @returns {boolean} True if collision detected
   */
  function checkCollisions() {
    const head = gameState.snake[0];

    // Check wall collision
    if (
      head.x < 0 ||
      head.x >= GRID_WIDTH ||
      head.y < 0 ||
      head.y >= GRID_HEIGHT
    ) {
      return true;
    }

    // Check self collision (skip the tail which will be removed)
    for (let i = 1; i < gameState.snake.length; i++) {
      if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if snake head collides with food
   * @returns {boolean} True if food was eaten
   */
  function checkFoodCollision() {
    const head = gameState.snake[0];
    return head.x === gameState.food.x && head.y === gameState.food.y;
  }

  /**
   * Handle food being eaten
   */
  function handleFoodEaten() {
    // Increase score
    gameState.score += 10;

    // Update high score if needed
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
      localStorage.setItem('snakeHighScore', gameState.highScore.toString());
    }

    // Generate new food (snake grows because we don't remove the tail)
    generateFood();

    // Increase game speed slightly (optional enhancement)
    if (CONFIG.gameSpeed > 50) {
      CONFIG.gameSpeed = Math.max(50, CONFIG.gameSpeed - 1);
      clearInterval(gameState.gameLoop);
      gameState.gameLoop = setInterval(gameTick, CONFIG.gameSpeed);
    }
  }

  /**
   * Draw the entire game state
   */
  function draw() {
    // Clear canvas
    ctx.fillStyle = CONFIG.colors.background;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // Draw grid (optional, for visual reference)
    drawGrid();

    // Draw food
    drawFood();

    // Draw snake
    drawSnake();

    // Draw score
    drawScore();

    // Draw pause indicator if paused
    if (gameState.isPaused) {
      drawPauseScreen();
    }
  }

  /**
   * Draw the background grid
   */
  function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= CONFIG.canvas.width; x += CONFIG.grid.size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CONFIG.canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= CONFIG.canvas.height; y += CONFIG.grid.size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CONFIG.canvas.width, y);
      ctx.stroke();
    }
  }

  /**
   * Draw the food on the canvas
   */
  function drawFood() {
    const x = gameState.food.x * CONFIG.grid.size;
    const y = gameState.food.y * CONFIG.grid.size;
    const size = CONFIG.grid.size;

    // Draw food as a circle
    ctx.fillStyle = CONFIG.colors.food;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Add glow effect
    ctx.shadowColor = CONFIG.colors.food;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /**
   * Draw the snake on the canvas
   */
  function drawSnake() {
    gameState.snake.forEach((segment, index) => {
      const x = segment.x * CONFIG.grid.size;
      const y = segment.y * CONFIG.grid.size;
      const size = CONFIG.grid.size;

      // Different color for head
      if (index === 0) {
        ctx.fillStyle = CONFIG.colors.snakeHead;
      } else {
        ctx.fillStyle = CONFIG.colors.snake;
      }

      // Draw rounded rectangle for snake segment
      const radius = 4;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, size - 2, size - 2, radius);
      ctx.fill();

      // Draw eyes on head
      if (index === 0) {
        drawSnakeEyes(x, y, size);
      }
    });
  }

  /**
   * Draw eyes on the snake's head
   * @param {number} x - Head x position
   * @param {number} y - Head y position
   * @param {number} size - Grid cell size
   */
  function drawSnakeEyes(x, y, size) {
    ctx.fillStyle = '#ffffff';

    const eyeSize = size / 6;
    const offsetX = size / 3;
    const offsetY = size / 3;

    // Position eyes based on direction
    let leftEyeX, leftEyeY, rightEyeX, rightEyeY;

    switch (gameState.direction) {
      case 'up':
        leftEyeX = x + offsetX;
        leftEyeY = y + offsetY;
        rightEyeX = x + size - offsetX - eyeSize;
        rightEyeY = y + offsetY;
        break;
      case 'down':
        leftEyeX = x + offsetX;
        leftEyeY = y + size - offsetY - eyeSize;
        rightEyeX = x + size - offsetX - eyeSize;
        rightEyeY = y + size - offsetY - eyeSize;
        break;
      case 'left':
        leftEyeX = x + offsetY;
        leftEyeY = y + offsetX;
        rightEyeX = x + offsetY;
        rightEyeY = y + size - offsetX - eyeSize;
        break;
      case 'right':
        leftEyeX = x + size - offsetY - eyeSize;
        leftEyeY = y + offsetX;
        rightEyeX = x + size - offsetY - eyeSize;
        rightEyeY = y + size - offsetX - eyeSize;
        break;
    }

    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw the current score and high score
   */
  function drawScore() {
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameState.score}`, 10, 30);

    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`High Score: ${gameState.highScore}`, 10, 55);
  }

  /**
   * Draw the start screen
   */
  function drawStartScreen() {
    // Clear canvas
    ctx.fillStyle = CONFIG.colors.background;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // Draw title
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Snake Game', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 60);

    // Draw instructions
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = CONFIG.colors.snake;
    ctx.fillText('Press SPACE to Start', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);

    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Use Arrow Keys to control the snake', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 40);
    ctx.fillText('Press P to pause', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 70);

    // Draw high score
    if (gameState.highScore > 0) {
      ctx.fillStyle = CONFIG.colors.food;
      ctx.fillText(`High Score: ${gameState.highScore}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 120);
    }
  }

  /**
   * Draw the game over screen
   */
  function drawGameOverScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = CONFIG.colors.gameOverBg;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // Game Over text
    ctx.fillStyle = CONFIG.colors.food;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 60);

    // Final score
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText(`Score: ${gameState.score}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);

    // High score
    if (gameState.score >= gameState.highScore) {
      ctx.fillStyle = '#ffdd00';
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText('New High Score!', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 40);
    } else {
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText(`High Score: ${gameState.highScore}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 40);
    }

    // Restart instruction
    ctx.fillStyle = CONFIG.colors.snake;
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('Press SPACE to Restart', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 90);
  }

  /**
   * Draw the pause screen overlay
   */
  function drawPauseScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);

    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('Press P to continue', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 50);
  }

  /**
   * End the game
   */
  function endGame() {
    gameState.isGameOver = true;
    gameState.isRunning = false;

    clearInterval(gameState.gameLoop);
    gameState.gameLoop = null;

    // Draw final state and game over screen
    draw();
    drawGameOverScreen();
  }

  /**
   * Toggle pause state
   */
  function togglePause() {
    if (gameState.isGameOver || !gameState.isRunning) {
      return;
    }

    gameState.isPaused = !gameState.isPaused;

    if (gameState.isPaused) {
      draw();
    }
  }

  /**
   * Restart the game
   */
  function restartGame() {
    clearInterval(gameState.gameLoop);
    startGame();
  }

  /**
   * Clean up and destroy the game
   */
  function destroy() {
    clearInterval(gameState.gameLoop);
    document.removeEventListener('keydown', handleKeyDown);
    gameState.gameLoop = null;
  }

  // Initialize the game when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export public API for external control (optional)
  window.SnakeGame = {
    start: startGame,
    restart: restartGame,
    pause: togglePause,
    destroy: destroy,
    getState: function () {
      return {
        score: gameState.score,
        highScore: gameState.highScore,
        isGameOver: gameState.isGameOver,
        isPaused: gameState.isPaused,
        isRunning: gameState.isRunning,
        snakeLength: gameState.snake.length,
      };
    },
  };
})();
