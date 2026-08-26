/**
 * presets/animations.js
 *
 * Biblioteca de animações (seção 5 e 19 do spec). Cada entrada representa
 * um .mogrt cadastrado pelo usuário — o plugin NUNCA recria animações via
 * código (seção 16); ele só referencia o arquivo e sabe qual parâmetro
 * usar para o texto.
 *
 * Formato de cada entrada:
 * {
 *   id: string,
 *   name: string,            // "Impacto", "Bounce" etc.
 *   category: string,        // "Entrada", "Saída", "Ênfase"...
 *   mogrtPath: string,       // caminho absoluto do arquivo .mogrt
 *   textParamName: string,   // nome do parâmetro de texto dentro do MOGRT
 *                            // (descoberto uma vez via listComponentParams)
 *   fontSizeParamName?: string,
 *   positionXParamName?: string,
 *   positionYParamName?: string,
 *   positionParamName?: string, // parâmetro combinado PointF (fallback)
 *   previewPath: string|null,// caminho de uma imagem/gif de preview (opcional)
 *   favorite: boolean,
 * }
 */

const { loadData, saveData } = require("../storage/settings.js");

async function listAnimations() {
  const data = await loadData();
  return data.mogrts;
}

async function addAnimation({
  name,
  category,
  mogrtPath,
  textParamName,
  fontSizeParamName = null,
  positionXParamName = null,
  positionYParamName = null,
  positionParamName = null,
  previewPath = null
}) {
  const data = await loadData();

  const entry = {
    id: `mogrt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    category: category || "Sem categoria",
    mogrtPath,
    textParamName,
    fontSizeParamName,
    positionXParamName,
    positionYParamName,
    positionParamName,
    previewPath,
    favorite: false
  };

  data.mogrts.push(entry);
  await saveData(data);

  return entry;
}

async function updateAnimation(id, changes) {
  const data = await loadData();
  const idx = data.mogrts.findIndex((m) => m.id === id);

  if (idx === -1) {
    throw new Error(`Animação ${id} não encontrada.`);
  }

  data.mogrts[idx] = { ...data.mogrts[idx], ...changes };
  await saveData(data);

  return data.mogrts[idx];
}

async function removeAnimation(id) {
  const data = await loadData();
  data.mogrts = data.mogrts.filter((m) => m.id !== id);
  await saveData(data);
}

async function toggleFavorite(id) {
  const data = await loadData();
  const entry = data.mogrts.find((m) => m.id === id);

  if (!entry) return;

  entry.favorite = !entry.favorite;
  await saveData(data);

  return entry;
}

module.exports = {
  listAnimations,
  addAnimation,
  updateAnimation,
  removeAnimation,
  toggleFavorite
};
