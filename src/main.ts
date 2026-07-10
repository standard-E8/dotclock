import { App } from './core/app.js';

const canvas = document.getElementById('display');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('#display canvas not found');
}

const app = new App(canvas);
app.start();
