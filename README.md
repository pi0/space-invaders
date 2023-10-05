# 👾 Space Invaders

[Space Invaders](https://en.wikipedia.org/wiki/Space_Invaders) game in single (~4KB Gzipped) JavaScript file!

[Play Online](https://pi0.github.io/space-invaders/)

# Overview

Welcome to the "space-invaders" project, a modern take on the classic arcade game. This project is a web-based game that utilizes HTML and JavaScript to create an interactive gaming experience. The game is initiated from an HTML file, which sets the visual properties of the webpage and imports the necessary JavaScript module. The JavaScript file defines the game's functionality, including starting the game, handling user input, updating game objects, and rendering graphics on the canvas.

# Technologies and Frameworks

This project is built using the following technologies and frameworks:

- **HTML**: Used for structuring the webpage and initiating the game.
- **JavaScript**: Used for defining the game's functionality and interactivity.
- **Node.js**: Used as the runtime environment for executing the JavaScript code.
- **npm**: Used as the package manager for managing the project's dependencies.
- **Webpack**: Used for bundling the JavaScript files.
- **Babel**: Used for transpiling the JavaScript code to ensure compatibility across different browsers.

# Installation

Follow the steps below to install and run the project:

## Step 1: Clone the Repository

First, you need to clone the repository to your local machine. You can do this by running the following command in your terminal:

```bash
git clone https://github.com/pi0/space-invaders.git
```

## Step 2: Install Dependencies

Navigate to the project directory:

```bash
cd space-invaders
```

Then, install the required dependencies. The project uses `pnpm` as the package manager. If you don't have it installed, you can install it by running:

```bash
npm install -g pnpm
```

Then, install the project dependencies:

```bash
pnpm install
```

This will install the following dependencies: `esbuild`, `prettier`, `terser`, and `typescript`.


## Step 3: Run the Project

Finally, you can run the project in a web browser that supports HTML5 and JavaScript. Open the `index.html` file in your browser to start the game.

Please note that the project requires a canvas element, a 2D rendering context, and the Play font from Google Fonts. Make sure these requirements are met before running the project.

# Usage

## Using in your pages

Checkout [`index.html`](./index.html) for additional styles.

```html
<div id="game"></div>
<script type="module">
const { startGame } = await import("https://cdn.jsdelivr.net/gh/pi0/space-invaders/index.js");
startGame({ selector: "#game" });
</script>
```

## License

MIT - Pooya Parsa <pooya@pi0.io>

Based on [a codepen](https://codepen.io/adelciotto/pen/WNzRYy) by Anthony Del Ciotto ([@adelciotto](https://github.com/adelciotto))
