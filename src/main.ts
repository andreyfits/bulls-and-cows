import { getBrowserStore } from './storage/leaderboardStorage.js';
import { mountApp } from './ui/app.js';

const root = document.createElement('main');
root.className = 'app';
document.body.prepend(root);

mountApp(root, {
  random: () => Math.random(),
  now: () => Date.now(),
  store: getBrowserStore(),
});
