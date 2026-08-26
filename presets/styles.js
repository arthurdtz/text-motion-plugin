/**
 * presets/styles.js
 *
 * Estilos de texto (seção 6 e 7 do spec) — separados de animação.
 * Um estilo é um conjunto nomeado de propriedades visuais que, na hora de
 * aplicar, é convertido em `extraParams` (paramName -> value) mapeados
 * para os parâmetros expostos pelo MOGRT escolhido.
 *
 * IMPORTANTE: nem todo MOGRT expõe todas essas propriedades como
 * parâmetros editáveis via script. `resolveStyleToParams()` só inclui,
 * na aplicação final, os campos de estilo que efetivamente encontrarem um
 * parâmetro correspondente no MOGRT (ver premiere/mogrt.js
 * findComponentParamByName) — os demais são ignorados silenciosamente
 * com um aviso no console, em vez de falhar a operação inteira.
 */

const { loadData, saveData } = require("../storage/settings.js");

const DEFAULT_STYLE_SHAPE = {
  fontFamily: "Inter",
  fontWeight: "Bold",
  color: "#FFFFFF",
  opacity: 100,
  tracking: 0,
  alignment: "center",
  strokeColor: null,
  strokeWidth: 0,
  shadow: false
};

async function listStyles() {
  const data = await loadData();
  return data.styles;
}

async function addStyle(name, styleProps = {}) {
  const data = await loadData();

  const entry = {
    id: `style_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    ...DEFAULT_STYLE_SHAPE,
    ...styleProps
  };

  data.styles.push(entry);
  await saveData(data);

  return entry;
}

async function updateStyle(id, changes) {
  const data = await loadData();
  const idx = data.styles.findIndex((s) => s.id === id);

  if (idx === -1) {
    throw new Error(`Estilo ${id} não encontrado.`);
  }

  data.styles[idx] = { ...data.styles[idx], ...changes };
  await saveData(data);

  return data.styles[idx];
}

async function removeStyle(id) {
  const data = await loadData();
  data.styles = data.styles.filter((s) => s.id !== id);
  await saveData(data);
}

/**
 * Converte um objeto de estilo em uma lista de {paramName, value} pronta
 * para premiere/mogrt.js -> setMogrtParams(). O mapeamento de nome de
 * propriedade de estilo -> nome de parâmetro do MOGRT é aproximado por
 * palavra-chave (cor, tamanho, tracking...) porque cada MOGRT nomeia seus
 * parâmetros do seu próprio jeito. Ajuste os `paramName` abaixo para
 * bater com os nomes reais expostos nos SEUS MOGRTs.
 */

function resolveStyleToParams(style) {
  const params = [];

  if (style.color) {
    params.push({ paramName: "Cor", value: style.color });
  }

  if (style.fontSize) {
    params.push({ paramName: "Tamanho", value: style.fontSize });
  }

  if (style.tracking != null) {
    params.push({ paramName: "Tracking", value: style.tracking });
  }

  if (style.opacity != null) {
    params.push({ paramName: "Opacidade", value: style.opacity });
  }

  return params;
}

module.exports = {
  listStyles,
  addStyle,
  updateStyle,
  removeStyle,
  resolveStyleToParams
};