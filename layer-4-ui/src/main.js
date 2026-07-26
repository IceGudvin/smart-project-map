/**
 * main.ts — Точка входа layer-4-ui.
 *
 * Порядок запуска:
 *   1. Импорт стилей
 *   2. AppShell.mount() — строит DOM, подписывается на eventBus,
 *      запускает wsClient внутри.
 *
 * AppShell владеет всей оркестрацией — main.ts только монтирует его.
 */
import './styles/index.css';
import { AppShell } from './components/AppShell/index.js';
const appEl = document.getElementById('app');
if (!appEl)
    throw new Error('[main] #app element not found');
const shell = new AppShell(appEl);
shell.mount();
window.__shell = shell;
