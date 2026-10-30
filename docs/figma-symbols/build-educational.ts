import { symbolSvg } from '../../src/lib/symbology';
import type { Kind } from '../../src/lib/unit-balance';
import { mkdir } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const registry = await Bun.file(new URL('registry.json', root)).json();
const samples: any[] = [];
await mkdir(new URL('educational-svg/', root), { recursive: true });
for (const entry of registry.entries.filter((e: any) => e.existingDalaGlyph)) {
  samples.push({ id: entry.id, name: entry.name, source: 'src/lib/symbology.ts · renderKzSymbol',
    note: 'Учебная графика DALA; статус ВС РК не подтверждён.',
    svg: symbolSvg(entry.id as Kind, 'blue', 'kz') });
}
const historic = [
  ['weapons-point-1', 'Ручной пулемёт', '<path d="M12 32H54M12 32L24 28L21 32L24 36Z"/>'],
  ['weapons-point-2', 'Станковый пулемёт', '<path d="M10 32H54M54 21C37 21 37 43 54 43"/>'],
  ['weapons-point-12', 'Пушка', '<path d="M10 32H54M23 27H38M23 37H38"/>'],
  ['weapons-point-13', 'Гаубица', '<path d="M10 32H51M23 27H38M23 37H38"/><circle cx="54" cy="32" r="3"/>'],
  ['weapons-point-17', 'Миномёт', '<path d="M18 18L40 32L18 46"/><circle cx="40" cy="32" r="4"/>'],
  ['command-point-5', 'Командно-наблюдательный пункт роты', '<path d="M32 12V38M23 23H41M27 17H37M32 38L23 55H41Z"/>'],
  ['actions-line-1', 'Направление наступления', '<path d="M10 32L23 28L20 32L23 36Z"/><path d="M20 32H30M34 32H44M48 32H56"/>'],
  ['engineering-area-1', 'Противотанковое минное поле', '<rect x="8" y="22" width="48" height="20"/><g fill="#242424"><circle cx="20" cy="32" r="2.7"/><circle cx="32" cy="32" r="2.7"/><circle cx="44" cy="32" r="2.7"/></g>'],
  ['engineering-area-2', 'Противопехотное минное поле', '<rect x="8" y="22" width="48" height="20"/><circle cx="20" cy="32" r="2.7"/><circle cx="32" cy="32" r="2.7"/><circle cx="44" cy="32" r="2.7"/>'],
  ['fire-area-1', 'Участок сосредоточенного огня', '<g transform="rotate(-20 32 32)"><rect x="12" y="20" width="40" height="24"/><text x="19" y="36" font-family="Arial" font-size="13" stroke="none" fill="#242424">№1</text></g>'],
];
for (const [id, name, geometry] of historic) {
  samples.push({ id, name, source: 'http://lemur59.ru/node/427 · public/reference/tactical-signs-1.jpg',
    note: id === 'weapons-point-17' ? 'Учебная перерисовка: миномёт до 120 мм. Статус ВС РК не подтверждён.' : 'Учебная перерисовка исторической таблицы. Статус ВС РК не подтверждён.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="none" stroke="#242424" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${geometry}</g></svg>` });
}
for (const sample of samples) await Bun.write(new URL(`educational-svg/${sample.id}.svg`, root), sample.svg);
await Bun.write(new URL('educational-samples.json', root), JSON.stringify({status: 'educational-unverified', samples}, null, 2) + '\n');
const cards = samples.map(s => `<article><div class="glyph">${s.svg}</div><h2>${s.name}</h2><p>${s.note}</p><small>${s.source}</small></article>`).join('');
await Bun.write(new URL('educational-preview.html', root), `<!doctype html><html lang="ru"><meta charset="utf-8"><title>DALA — учебные образцы</title><style>body{font:14px/1.5 system-ui;margin:48px;background:#f7f7f5;color:#242424}h1{font-size:32px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}article{padding:24px;background:white}h2{font-size:17px;min-height:52px}.glyph{height:120px;display:grid;place-items:center}.glyph svg{width:96px;height:96px}p,small{color:#606060}small{overflow-wrap:anywhere}@media(max-width:900px){main{grid-template-columns:repeat(2,1fr)}}</style><h1>Учебные образцы DALA</h1><p>23 обозначения · Статус ВС РК не подтверждён · 13 из приложения и 10 перерисовок исторической таблицы</p><main>${cards}</main></html>`);
console.log(`Prepared ${samples.length} educational SVGs`);
