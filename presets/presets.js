/**
 * Presets completos: animação, estilo, tamanho, posição e duração.
 * CommonJS para compatibilidade com o runtime UXP do projeto.
 */

const {
  loadData,
  saveData
} = require("../storage/settings.js");

async function listPresets() {
  const data = await loadData();
  return data.presets;
}

async function addPreset(name, config) {
  const data = await loadData();
  const entry = {
    id:
      "preset_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2, 7),
    name,
    animationId: config.animationId || null,
    styleId: config.styleId || null,
    fontSize: config.fontSize ?? 72,
    position: config.position ?? { x: 960, y: 540 },
    durationSeconds: config.durationSeconds ?? 1.2
  };

  data.presets.push(entry);
  await saveData(data);
  return entry;
}

async function removePreset(id) {
  const data = await loadData();
  data.presets = data.presets.filter(
    (preset) => preset.id !== id
  );
  await saveData(data);
}

async function updatePreset(id, changes) {
  const data = await loadData();
  const index = data.presets.findIndex(
    (preset) => preset.id === id
  );

  if (index === -1) {
    throw new Error("Preset " + id + " não encontrado.");
  }

  data.presets[index] = {
    ...data.presets[index],
    ...changes
  };
  await saveData(data);
  return data.presets[index];
}

module.exports = {
  listPresets,
  addPreset,
  removePreset,
  updatePreset
};
