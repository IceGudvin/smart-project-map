/**
 * DepList — вкладка Deps: список зависимостей (ссылки на другие узлы)
 */
import type { GraphModel } from '../../../../shared/src/graph.js';
import { emit } from '../../lib/eventBus.js';

export const DepList = {
  render(container: HTMLElement, depIds: string[], graph: GraphModel | null): void {
    if (!depIds.length) {
      container.innerHTML = `<p class="dp-empty">Зависимостей нет</p>`;
      return;
    }
    const list = document.createElement('ul');
    list.className = 'dep-list';

    depIds.forEach(id => {
      const node = graph?.nodes.find(n => n.id === id);
      const li = document.createElement('li');
      li.className = 'dep-item';

      const icon = document.createElement('span');
      icon.className = 'dep-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><circle cx="5" cy="19" r="3"/>
        <path d="M12 8v4m0 0-5 4m5-4 5 4"/>
      </svg>`;

      const info = document.createElement('div');
      info.className = 'dep-info';

      const name = document.createElement('span');
      name.className = 'dep-name';
      name.textContent = node?.name ?? id;

      const sub = document.createElement('span');
      sub.className = 'dep-sub';
      sub.textContent = node
        ? `${node.framework !== 'unknown' ? node.framework : node.language}`
        : 'нет данных';

      info.appendChild(name);
      info.appendChild(sub);

      const goBtn = document.createElement('button');
      goBtn.className = 'dep-go';
      goBtn.title = 'Перейти к сервису';
      goBtn.setAttribute('aria-label', `Перейти к ${node?.name ?? id}`);
      goBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M13 6l6 6-6 6"/>
      </svg>`;
      goBtn.addEventListener('click', () => emit('node:select', id));

      li.appendChild(icon);
      li.appendChild(info);
      li.appendChild(goBtn);
      list.appendChild(li);
    });

    container.appendChild(list);
  },
};
