/**
 * storage/settings.js
 *
 * Persistência local usando a API de armazenamento do UXP
 * (require('uxp').storage.localFileSystem), gravando um único arquivo
 * JSON na pasta de dados do plugin.
 */

const uxp = require("uxp");
const fs = uxp.storage.localFileSystem;

const DATA_FILENAME = "text-motion-data.json";

const DEFAULT_DATA = {
  mogrts: [],
  styles: [],
  presets: [],
  lastUsed: {
    durationSeconds: 1.2,
    positionX: 960,
    positionY: 540,
    fontSize: 72
  }
};

let _cache = null;

async function getDataFile(createIfMissing = true) {
  const dataFolder = await fs.getDataFolder();

  try {
    return await dataFolder.getEntry(DATA_FILENAME);
  } catch (err) {
    if (!createIfMissing) return null;

    const file = await dataFolder.createFile(
      DATA_FILENAME,
      { overwrite: false }
    );

    await file.write(
      JSON.stringify(DEFAULT_DATA, null, 2)
    );

    return file;
  }
}

/**
 * Carrega todos os dados persistidos.
 */
async function loadData() {
  if (_cache) return _cache;

  try {
    const file = await getDataFile(true);
    const content = await file.read();

    const parsed = JSON.parse(content);

    _cache = {
      ...DEFAULT_DATA,
      ...parsed,
      mogrts: Array.isArray(parsed.mogrts)
        ? parsed.mogrts
        : [],
      styles: Array.isArray(parsed.styles)
        ? parsed.styles
        : [],
      presets: Array.isArray(parsed.presets)
        ? parsed.presets
        : [],
      lastUsed: {
        ...DEFAULT_DATA.lastUsed,
        ...(parsed.lastUsed || {})
      }
    };
  } catch (err) {
    console.error(
      "[Text Motion] Falha ao ler dados salvos, usando padrão.",
      err
    );

    _cache = {
      ...DEFAULT_DATA,
      lastUsed: {
        ...DEFAULT_DATA.lastUsed
      }
    };
  }

  return _cache;
}

/**
 * Salva o objeto de dados completo em disco.
 */
async function saveData(data) {
  _cache = data;

  const file = await getDataFile(true);

  await file.write(
    JSON.stringify(data, null, 2)
  );
}

/**
 * Atualiza parcialmente os dados salvos.
 */
async function updateData(partial) {
  const current = await loadData();

  const updated = {
    ...current,
    ...partial
  };

  await saveData(updated);

  return updated;
}

module.exports = {
  loadData,
  saveData,
  updateData
};
