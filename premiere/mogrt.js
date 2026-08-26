/**
 * Inserção de MOGRT e leitura/escrita dos parâmetros expostos.
 * Implementação baseada na Premiere UXP DOM disponível no Premiere 26.x.
 */

const premierepro = require("premierepro");
const { executeAction } = require("./actions.js");

const SIZE_PARAM_NAMES = [
  "Font Size",
  "Tamanho da Fonte",
  "Tamanho",
  "Size"
];

const POSITION_X_PARAM_NAMES = [
  "Position X",
  "Posição X",
  "Posicao X",
  "X"
];

const POSITION_Y_PARAM_NAMES = [
  "Position Y",
  "Posição Y",
  "Posicao Y",
  "Y"
];

const COMBINED_POSITION_NAMES = [
  "Position",
  "Posição",
  "Posicao"
];

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

async function insertMogrt(
  sequence,
  mogrtPath,
  timeSeconds,
  videoTrackIndex,
  audioTrackIndex = 0
) {
  console.log("[Text Motion] Inserindo MOGRT", {
    mogrtPath,
    timeSeconds,
    videoTrackIndex,
    audioTrackIndex
  });

  const editor = await premierepro.SequenceEditor.getEditor(sequence);
  const time = premierepro.TickTime.createWithSeconds(timeSeconds);

  try {
    const trackItems = await editor.insertMogrtFromPath(
      mogrtPath,
      time,
      videoTrackIndex,
      audioTrackIndex
    );

    if (!trackItems || trackItems.length === 0) {
      throw new Error(
        "insertMogrtFromPath() não retornou nenhum TrackItem."
      );
    }

    console.log(
      "[Text Motion] MOGRT inserido; " +
      trackItems.length +
      " TrackItem(s) retornado(s)."
    );

    return trackItems;
  } catch (err) {
    console.error("[Text Motion] Falha ao inserir MOGRT:", err);
    throw new Error(
      "Não foi possível inserir o MOGRT em \"" +
      mogrtPath +
      "\": " +
      (err.message || err)
    );
  }
}

/**
 * Lista todos os parâmetros da cadeia de componentes.
 *
 * ComponentChain.getComponentCount(), getComponentAtIndex(),
 * Component.getParamCount() e getParam() são os nomes reais da DOM 26.x.
 */
async function listComponentParams(trackItem, project = null) {
  const chain = await trackItem.getComponentChain();
  const references = [];

  const collectReferences = () => {
    const componentCount = chain.getComponentCount();

    for (
      let componentIndex = 0;
      componentIndex < componentCount;
      componentIndex++
    ) {
      const component = chain.getComponentAtIndex(componentIndex);
      const paramCount = component.getParamCount();

      for (let paramIndex = 0; paramIndex < paramCount; paramIndex++) {
        references.push({
          component,
          componentIndex,
          paramIndex,
          param: component.getParam(paramIndex)
        });
      }
    }
  };

  if (project) {
    project.lockedAccess(collectReferences);
  } else {
    collectReferences();
  }

  const componentNames = new Map();

  for (const entry of references) {
    if (!componentNames.has(entry.componentIndex)) {
      const displayName = await entry.component.getDisplayName();
      componentNames.set(entry.componentIndex, displayName || "");
    }
  }

  return references.map((entry) => ({
    componentName: componentNames.get(entry.componentIndex) || "",
    componentIndex: entry.componentIndex,
    paramIndex: entry.paramIndex,
    paramName: entry.param.displayName || "",
    param: entry.param
  }));
}

function logDiscoveredParams(params) {
  const summary = params
    .map((entry) => entry.componentName + " > " + entry.paramName)
    .join(" | ");

  console.log(
    "[Text Motion] Parâmetros descobertos:",
    summary || "(nenhum parâmetro)"
  );
}

function findParamEntryByNames(
  params,
  candidateNames,
  allowContains = true
) {
  const normalizedCandidates = candidateNames
    .filter(Boolean)
    .map(normalizeName);

  const exact = params.find((entry) =>
    normalizedCandidates.includes(normalizeName(entry.paramName))
  );

  if (exact || !allowContains) {
    return exact || null;
  }

  return params.find((entry) => {
    const normalizedParamName = normalizeName(entry.paramName);
    return normalizedCandidates.some((candidate) =>
      candidate.length > 1 && normalizedParamName.includes(candidate)
    );
  }) || null;
}

/**
 * Mantém a assinatura pública existente para ferramentas de diagnóstico.
 */
async function findComponentParamByName(
  trackItem,
  paramNameFragment,
  project = null
) {
  const params = await listComponentParams(trackItem, project);
  const found = findParamEntryByNames(
    params,
    [paramNameFragment],
    true
  );
  return found ? found.param : null;
}

function createParamValueAction(param, value) {
  const keyframe = param.createKeyframe(value);
  return param.createSetValueAction(keyframe, true);
}

async function setParamValue(
  project,
  entry,
  value,
  transactionName
) {
  return executeAction(
    project,
    () => createParamValueAction(entry.param, value),
    transactionName
  );
}

/**
 * O texto principal é obrigatório: se não for localizado ou aceito pelo
 * template, a operação gera um erro claro.
 */
async function setMogrtText(
  project,
  trackItem,
  textParamName,
  newText
) {
  const params = await listComponentParams(trackItem, project);
  logDiscoveredParams(params);

  const entry = findParamEntryByNames(
    params,
    [textParamName],
    true
  );

  if (!entry) {
    const available = params
      .map((param) => param.paramName)
      .filter(Boolean);

    throw new Error(
      "Parâmetro de texto \"" +
      textParamName +
      "\" não encontrado neste MOGRT. Disponíveis: " +
      (available.join(", ") || "nenhum") +
      "."
    );
  }

  try {
    await setParamValue(
      project,
      entry,
      String(newText),
      "Definir texto: " + newText
    );
    console.log(
      "[Text Motion] Texto aplicado em \"" +
      entry.paramName +
      "\":",
      String(newText)
    );
  } catch (err) {
    throw new Error(
      "O parâmetro \"" +
      entry.paramName +
      "\" foi encontrado, mas não aceitou o texto: " +
      (err.message || err)
    );
  }
}

/**
 * Parâmetros de estilo são opcionais e independentes. Um parâmetro ausente
 * ou incompatível não impede a criação do texto.
 */
async function setMogrtParams(
  project,
  trackItem,
  paramValues
) {
  const params = await listComponentParams(trackItem, project);
  const results = [];

  for (const { paramName, value } of paramValues) {
    const entry = findParamEntryByNames(
      params,
      [paramName],
      true
    );

    if (!entry) {
      console.warn(
        "[Text Motion] Parâmetro opcional \"" +
        paramName +
        "\" não encontrado; ignorado."
      );
      results.push({
        paramName,
        applied: false,
        reason: "not-found"
      });
      continue;
    }

    try {
      await setParamValue(
        project,
        entry,
        value,
        "Aplicar " + entry.paramName
      );
      results.push({
        paramName: entry.paramName,
        applied: true
      });
    } catch (err) {
      console.warn(
        "[Text Motion] Parâmetro opcional \"" +
        entry.paramName +
        "\" não pôde ser aplicado; ignorado.",
        err
      );
      results.push({
        paramName: entry.paramName,
        applied: false,
        reason: err.message || String(err)
      });
    }
  }

  return results;
}

async function applyOptionalNumberParam(
  project,
  params,
  candidateNames,
  value,
  label
) {
  if (!isFiniteNumber(value)) {
    return false;
  }

  const entry = findParamEntryByNames(
    params,
    candidateNames,
    true
  );

  if (!entry) {
    console.warn(
      "[Text Motion] " +
      label +
      ": nenhum parâmetro compatível encontrado (" +
      candidateNames.join(", ") +
      ")."
    );
    return false;
  }

  try {
    await setParamValue(
      project,
      entry,
      value,
      "Ajustar " + label
    );
    console.log(
      "[Text Motion] " +
      label +
      " aplicado em \"" +
      entry.paramName +
      "\":",
      value
    );
    return true;
  } catch (err) {
    console.warn(
      "[Text Motion] " +
      label +
      ": \"" +
      entry.paramName +
      "\" não aceitou o valor " +
      value +
      "; ignorado.",
      err
    );
    return false;
  }
}

function extractPointFromKeyframe(keyframe) {
  if (!keyframe) return null;

  const wrapper = keyframe.value;
  const point = wrapper && wrapper.value !== undefined
    ? wrapper.value
    : wrapper;

  if (
    !point ||
    !isFiniteNumber(point.x) ||
    !isFiniteNumber(point.y)
  ) {
    return null;
  }

  return point;
}

async function applyCombinedPosition(
  project,
  params,
  positionX,
  positionY,
  configuredParamName = null
) {
  const normalizedPositionNames =
    [configuredParamName, ...COMBINED_POSITION_NAMES]
      .filter(Boolean)
      .map(normalizeName);

  const positionEntries = params.filter((entry) =>
    normalizedPositionNames.includes(normalizeName(entry.paramName))
  );

  const preferredEntry = positionEntries.find((entry) => {
    const componentName = normalizeName(entry.componentName);
    return (
      componentName.includes("motion") ||
      componentName.includes("movimento") ||
      componentName.includes("transform")
    );
  }) || positionEntries[0];

  if (!preferredEntry) {
    console.warn(
      "[Text Motion] Posição: o MOGRT não expõe X/Y e nenhum parâmetro Motion/Transform compatível foi encontrado."
    );
    return false;
  }

  try {
    const currentKeyframe =
      await preferredEntry.param.getStartValue();
    const currentPoint =
      extractPointFromKeyframe(currentKeyframe);

    if (!currentPoint) {
      console.warn(
        "[Text Motion] Posição: \"" +
        preferredEntry.paramName +
        "\" não retornou um PointF editável."
      );
      return false;
    }

    currentPoint.x = positionX;
    currentPoint.y = positionY;

    await setParamValue(
      project,
      preferredEntry,
      currentPoint,
      "Ajustar posição"
    );

    console.log(
      "[Text Motion] Posição aplicada em \"" +
      preferredEntry.componentName +
      " > " +
      preferredEntry.paramName +
      "\":",
      { x: positionX, y: positionY }
    );
    return true;
  } catch (err) {
    console.warn(
      "[Text Motion] Posição: falha ao alterar \"" +
      preferredEntry.paramName +
      "\"; ignorada.",
      err
    );
    return false;
  }
}

/**
 * Aplica controles do inspector. Tamanho e posição são opcionais.
 * X/Y expostos têm prioridade; Motion/Transform é o fallback confirmado.
 */
async function setMogrtControls(
  project,
  trackItem,
  {
    fontSize,
    positionX,
    positionY,
    fontSizeParamName,
    positionXParamName,
    positionYParamName,
    positionParamName
  }
) {
  const params = await listComponentParams(trackItem, project);
  const sizeParamNames = [
    fontSizeParamName,
    ...SIZE_PARAM_NAMES
  ].filter(Boolean);
  const positionXParamNames = [
    positionXParamName,
    ...POSITION_X_PARAM_NAMES
  ].filter(Boolean);
  const positionYParamNames = [
    positionYParamName,
    ...POSITION_Y_PARAM_NAMES
  ].filter(Boolean);

  const sizeApplied = await applyOptionalNumberParam(
    project,
    params,
    sizeParamNames,
    fontSize,
    "Tamanho"
  );

  let positionApplied = false;

  if (isFiniteNumber(positionX) && isFiniteNumber(positionY)) {
    const xEntry = findParamEntryByNames(
      params,
      positionXParamNames,
      false
    );
    const yEntry = findParamEntryByNames(
      params,
      positionYParamNames,
      false
    );

    if (xEntry && yEntry) {
      const xApplied = await applyOptionalNumberParam(
        project,
        params,
        [xEntry.paramName],
        positionX,
        "Posição X"
      );
      const yApplied = await applyOptionalNumberParam(
        project,
        params,
        [yEntry.paramName],
        positionY,
        "Posição Y"
      );
      positionApplied = xApplied && yApplied;
    } else {
      positionApplied = await applyCombinedPosition(
        project,
        params,
        positionX,
        positionY,
        positionParamName
      );
    }
  }

  return {
    sizeApplied,
    positionApplied
  };
}

module.exports = {
  insertMogrt,
  listComponentParams,
  findComponentParamByName,
  setMogrtText,
  setMogrtParams,
  setMogrtControls
};
