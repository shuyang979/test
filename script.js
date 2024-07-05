const gameContainer = document.getElementById('game-container');
const player = document.getElementById('player');
const scoreElement = document.getElementById('score-value');
const healthElement = document.getElementById('health-value');
const levelElement = document.getElementById('level-value');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const backgroundVideo = document.getElementById('background-video');
const backgroundMusic = document.getElementById('background-music');

const INITIAL_PLAYER_HEALTH = 100;
const BASE_ENEMY_SPEED = 0.005;
const INITIAL_ENEMY_INTERVAL = 1000;
const LEVEL_INCREASE_THRESHOLD = 100;

let bullets = [];
let enemies = [];
let score = 0;
let playerHealth = INITIAL_PLAYER_HEALTH;
let gameIsRunning = false;
let enemyInterval;
let powerUpInterval;
let shootInterval;
let powerUpType = null;
let powerUpTimer = null;
let currentLevel = 1;

// 敌人图片路径
const enemyImages = {
    normal: 'images/enemy-normal.svg',
    elite: 'images/enemy-elite.svg',
    boss: 'images/enemy-boss.svg'
};

function handlePlayerMove(e) {
    if (!gameIsRunning) return;
    let x, y;
    if (e.type.startsWith('mouse')) {
        x = e.clientX;
        y = e.clientY;
    } else if (e.type.startsWith('touch')) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    }
    const rect = gameContainer.getBoundingClientRect();
    x -= rect.left;
    y -= rect.top;
    player.style.left = `${Math.max(0, Math.min(x - player.offsetWidth / 2, gameContainer.offsetWidth - player.offsetWidth))}px`;
    player.style.top = `${Math.max(0, Math.min(y - player.offsetHeight / 2, gameContainer.offsetHeight - player.offsetHeight))}px`;
}

function createBullet() {
    if (!gameIsRunning) return;
    
    if (powerUpType === 'power-up-double') {
        createSingleBullet(-10);
        createSingleBullet(10);
    } else if (powerUpType === 'power-up-fan') {
        createSingleBullet(-20);
        createSingleBullet(0);
        createSingleBullet(20);
    } else {
        createSingleBullet(0);
    }
}

function createSingleBullet(angle) {
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    const playerRect = player.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    bullet.style.left = `${playerRect.left + playerRect.width / 2 - containerRect.left - bullet.offsetWidth / 2}px`;
    bullet.style.top = `${playerRect.top - containerRect.top}px`;
    bullet.dataset.angle = angle;
    gameContainer.appendChild(bullet);
    bullets.push(bullet);
}

function moveBullets() {
    bullets.forEach((bullet, index) => {
        const angle = parseFloat(bullet.dataset.angle) || 0;
        const speed = gameContainer.offsetHeight * 0.01;
        const deltaX = Math.sin(angle * Math.PI / 180) * speed;
        const deltaY = -Math.cos(angle * Math.PI / 180) * speed;
        
        bullet.style.left = `${bullet.offsetLeft + deltaX}px`;
        bullet.style.top = `${bullet.offsetTop + deltaY}px`;
        
        if (bullet.offsetTop < 0 || bullet.offsetLeft < 0 || bullet.offsetLeft > gameContainer.offsetWidth) {
            gameContainer.removeChild(bullet);
            bullets.splice(index, 1);
        }
    });
}

function createEnemy() {
    if (!gameIsRunning) return;
    const enemy = document.createElement('div');
    enemy.className = 'enemy';
    
    const enemyType = Math.random();
    if (enemyType < 0.7) {
        enemy.classList.add('enemy-normal');
        enemy.health = 20;
        enemy.style.backgroundImage = `url('${enemyImages.normal}')`;
    } else if (enemyType < 0.95) {
        enemy.classList.add('enemy-elite');
        enemy.health = 40;
        enemy.style.backgroundImage = `url('${enemyImages.elite}')`;
    } else {
        enemy.classList.add('enemy-boss');
        enemy.health = 100;
        enemy.style.backgroundImage = `url('${enemyImages.boss}')`;
    }
    
    enemy.style.left = `${Math.random() * (gameContainer.offsetWidth - enemy.offsetWidth)}px`;
    enemy.style.top = '0px';
    
    const healthBar = document.createElement('div');
    healthBar.className = 'enemy-health';
    enemy.appendChild(healthBar);

    gameContainer.appendChild(enemy);
    enemies.push(enemy);
}

function moveEnemies() {
    const slowFactor = powerUpType === 'power-up-slow' ? 0.2 : 1;
    enemies.forEach((enemy, index) => {
        let speed = gameContainer.offsetHeight * BASE_ENEMY_SPEED * (1 + (currentLevel - 1) * 0.1) * slowFactor;
        if (enemy.classList.contains('enemy-elite')) {
            speed *= 1.3;
        } else if (enemy.classList.contains('enemy-boss')) {
            speed *= 0.8;
        }
        enemy.style.top = `${enemy.offsetTop + speed}px`;
        if (enemy.offsetTop > gameContainer.offsetHeight) {
            gameContainer.removeChild(enemy);
            enemies.splice(index, 1);
            decreasePlayerHealth(5);
        }
    });
}

function checkCollisions() {
    if (!gameIsRunning) return;
    
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (isColliding(bullet, enemy)) {
                gameContainer.removeChild(bullet);
                bullets.splice(bulletIndex, 1);
                enemy.health -= 10;
                
                const healthBar = enemy.querySelector('.enemy-health');
                const maxHealth = enemy.classList.contains('enemy-boss') ? 100 : (enemy.classList.contains('enemy-elite') ? 40 : 20);
                healthBar.style.width = `${(enemy.health / maxHealth) * 100}%`;
                
                if (enemy.health <= 0) {
                    gameContainer.removeChild(enemy);
                    enemies.splice(enemyIndex, 1);
                    increaseScore(enemy.classList.contains('enemy-boss') ? 30 : (enemy.classList.contains('enemy-elite') ? 20 : 10));
                }
            }
        });
    });

    enemies.forEach((enemy, index) => {
        if (isColliding(player, enemy)) {
            gameContainer.removeChild(enemy);
            enemies.splice(index, 1);
            decreasePlayerHealth(20);
        }
    });
}

function isColliding(a, b) {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    return !(
        aRect.top > bRect.bottom ||
        aRect.bottom < bRect.top ||
        aRect.right < bRect.left ||
        aRect.left > bRect.right
    );
}

function increaseScore(amount) {
    score += amount;
    scoreElement.innerText = Math.floor(score);
    updateLevel();
}

function decreasePlayerHealth(amount) {
    playerHealth -= amount;
    healthElement.innerText = playerHealth;
    if (playerHealth <= 0) {
        endGame();
    }
}

function createPowerUp() {
    if (!gameIsRunning) return;
    const powerUp = document.createElement('div');
    powerUp.className = 'power-up';
    
    const randomType = Math.random();
    if (randomType < 0.33) {
        powerUp.classList.add('power-up-double');
    } else if (randomType < 0.66) {
        powerUp.classList.add('power-up-fan');
    } else {
        powerUp.classList.add('power-up-slow');
    }
    
    powerUp.style.left = `${Math.random() * (gameContainer.offsetWidth - 30)}px`;
    powerUp.style.top = '0px';
    gameContainer.appendChild(powerUp);
    
    const powerUpInterval = setInterval(() => {
        powerUp.style.top = `${powerUp.offsetTop + 2}px`;
        if (powerUp.offsetTop > gameContainer.offsetHeight) {
            clearInterval(powerUpInterval);
            gameContainer.removeChild(powerUp);
        }
        if (isColliding(player, powerUp)) {
            clearInterval(powerUpInterval);
            gameContainer.removeChild(powerUp);
            activatePowerUp(powerUp.classList[1]);
        }
    }, 50);
}

function activatePowerUp(type) {
    clearTimeout(powerUpTimer);
    powerUpType = type;
    
    powerUpTimer = setTimeout(() => {
        powerUpType = null;
    }, 10000);
}

function updateLevel() {
    currentLevel = Math.floor(score / LEVEL_INCREASE_THRESHOLD) + 1;
    levelElement.innerText = currentLevel;
    clearInterval(enemyInterval);
    enemyInterval = setInterval(createEnemy, INITIAL_ENEMY_INTERVAL / (1 + (currentLevel - 1) * 0.1));
}

function endGame() {
    gameIsRunning = false;
    finalScoreElement.innerText = Math.floor(score);
    gameOverElement.classList.remove('hidden');
    gameContainer.classList.add('game-over');
    backgroundVideo.pause();
    backgroundMusic.volume = 0.5;
    player.style.display = 'none';
    document.getElementById('score').style.display = 'none';
    document.getElementById('health').style.display = 'none';
    document.getElementById('level').style.display = 'none';
    clearInterval(enemyInterval);
    clearInterval(powerUpInterval);
    clearInterval(shootInterval);
    removeEventListeners();
}

function restartGame() {
    score = 0;
    playerHealth = INITIAL_PLAYER_HEALTH;
    currentLevel = 1;
    scoreElement.innerText = score;
    healthElement.innerText = playerHealth;
    levelElement.innerText = currentLevel;
    
    enemies.forEach(enemy => gameContainer.removeChild(enemy));
    bullets.forEach(bullet => gameContainer.removeChild(bullet));
    enemies = [];
    bullets = [];
    
    gameOverElement.classList.add('hidden');
    gameContainer.classList.remove('game-over');
    startGame();
}

let lastTime = 0;
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    
    if (deltaTime > 16) { // 约60fps
        if (gameIsRunning) {
            moveBullets();
            moveEnemies();
            checkCollisions();
        }
        lastTime = timestamp;
    }
    requestAnimationFrame(gameLoop);
}

function addEventListeners() {
    gameContainer.addEventListener('mousemove', handlePlayerMove);
    gameContainer.addEventListener('touchmove', handlePlayerMove);
}

function removeEventListeners() {
    gameContainer.removeEventListener('mousemove', handlePlayerMove);
    gameContainer.removeEventListener('touchmove', handlePlayerMove);
}

function startGame() {
    startScreen.classList.add('hidden');
    player.style.display = 'block';
    document.getElementById('score').style.display = 'block';
    document.getElementById('health').style.display = 'block';
    document.getElementById('level').style.display = 'block';
    
    player.style.left = '50%';
    player.style.top = '80%';
    
    playerHealth = INITIAL_PLAYER_HEALTH;
    score = 0;
    currentLevel = 1;
    scoreElement.innerText = score;
    healthElement.innerText = playerHealth;
    levelElement.innerText = currentLevel;
    
    gameIsRunning = true;
    backgroundVideo.play();
    backgroundMusic.play().catch(e => console.log("Audio play failed:", e));
    backgroundMusic.volume = 1;
    
    addEventListeners();
    
    enemyInterval = setInterval(createEnemy, INITIAL_ENEMY_INTERVAL);
    powerUpInterval = setInterval(createPowerUp, 15000);
    shootInterval = setInterval(createBullet, 200);
    
    gameLoop();
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);