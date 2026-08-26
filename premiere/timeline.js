/**
 * Orquestra a criação das camadas:
 * UI -> configuração -> timeline -> MOGRT/Sequence -> Premiere UXP.
 */

const premierepro = require("premierepro");

const {
  getActiveProject,
  getPlayheadPosition,
  getNextAvailableVideoTrackIndex
} = require("./sequence.js");

const {
  insertMogrt,
  setMogrtText,
  setMogrtParams,
  setMogrtControls
} = require("./mogrt.js");

const { executeAction } = require("./actions.js");

/**
 * @typedef {Object} TextLayerConfig
 * @property {string} text
 * @property {string} mogrtPath
 * @property {string} textParamName
 * @property {number} durationSeconds
 * @property {number} positionX
 * @property {number} positionY
 * @property {number} fontSize
 * @property {string} [fontSizeParamName]
 * @property {string} [positionXParamName]
 * @property {string} [positionYParamName]
 * @property {string} [positionParamName]
 * @property {Array<{paramName:string, value:any}>} [extraParams]
 */

async function createLayersOnTimeline({
  layers,
  layoutMode = "stacked",
  onProgress
}) {
  if (!layers || layers.length === 0) {
    throw new Error("Nenhuma camada de texto para inserir.");
  }

  const invalidLayer = layers.find(
    (layer) => !layer.mogrtPath || !layer.textParamName
  );

  if (invalidLayer) {
    throw new Error(
      "A camada \"" +
      (invalidLayer.text || "sem texto") +
      "\" não possui mogrtPath e textParamName válidos."
    );
  }

  const project = await getActiveProject();
  const sequence = await project.getActiveSequence();

  if (!sequence) {
    throw new Error(
      "Nenhuma sequência ativa. Abra ou selecione uma sequência na timeline."
    );
  }

  const playhead = await getPlayheadPosition(sequence);
  const playheadSeconds = playhead.seconds || 0;
  const startTrackIndex =
    await getNextAvailableVideoTrackIndex(sequence);

  let cursorSeconds = playheadSeconds;
  const createdItems = [];

  console.log("[Text Motion] Criação iniciada", {
    layerCount: layers.length,
    playheadSeconds,
    startTrackIndex,
    layoutMode
  });

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const videoTrackIndex = startTrackIndex + i;
    const insertTimeSeconds =
      layoutMode === "sequential"
        ? cursorSeconds
        : playheadSeconds;

    console.log(
      "[Text Motion] Criando camada " +
      (i + 1) +
      "/" +
      layers.length,
      {
        text: layer.text,
        insertTimeSeconds,
        videoTrackIndex,
        durationSeconds: layer.durationSeconds
      }
    );

    const trackItems = await insertMogrt(
      sequence,
      layer.mogrtPath,
      insertTimeSeconds,
      videoTrackIndex,
      0
    );

    const mainItem = trackItems.find(
      (item) => item && typeof item.getComponentChain === "function"
    );

    if (!mainItem) {
      throw new Error(
        "O MOGRT da camada \"" +
        layer.text +
        "\" não retornou um VideoClipTrackItem editável."
      );
    }

    if (!layer.textParamName) {
      throw new Error(
        "O MOGRT da camada \"" +
        layer.text +
        "\" não possui textParamName configurado."
      );
    }

    await setMogrtText(
      project,
      mainItem,
      layer.textParamName,
      layer.text
    );

    if (layer.extraParams && layer.extraParams.length > 0) {
      try {
        await setMogrtParams(
          project,
          mainItem,
          layer.extraParams
        );
      } catch (err) {
        console.warn(
          "[Text Motion] O estilo não pôde ser processado; a camada continuará sem ele.",
          err
        );
      }
    }

    // Os valores explícitos do inspector têm prioridade sobre o estilo.
    try {
      await setMogrtControls(project, mainItem, {
        fontSize: layer.fontSize,
        positionX: layer.positionX,
        positionY: layer.positionY,
        fontSizeParamName: layer.fontSizeParamName,
        positionXParamName: layer.positionXParamName,
        positionYParamName: layer.positionYParamName,
        positionParamName: layer.positionParamName
      });
    } catch (err) {
      console.warn(
        "[Text Motion] Tamanho/posição não puderam ser processados; a camada continuará com os valores do MOGRT.",
        err
      );
    }

    if (
      typeof layer.durationSeconds === "number" &&
      Number.isFinite(layer.durationSeconds) &&
      layer.durationSeconds > 0
    ) {
      await applyDuration(
        project,
        mainItem,
        layer.durationSeconds
      );
    } else {
      console.warn(
        "[Text Motion] Duração inválida; o item manterá a duração original:",
        layer.durationSeconds
      );
    }

    createdItems.push(mainItem);

    if (onProgress) {
      onProgress({
        index: i,
        total: layers.length,
        layer
      });
    }

    if (layoutMode === "sequential") {
      cursorSeconds += layer.durationSeconds || 1.2;
    }
  }

  console.log(
    "[Text Motion] Criação concluída:",
    createdItems.length,
    "camada(s)."
  );

  return createdItems;
}

/**
 * O fim é calculado a partir do início real retornado pelo TrackItem.
 */
async function applyDuration(
  project,
  trackItem,
  durationSeconds
) {
  const actualStartTime = await trackItem.getStartTime();
  const actualStartSeconds = actualStartTime.seconds;

  if (!Number.isFinite(actualStartSeconds)) {
    throw new Error(
      "O Premiere não retornou um início válido para ajustar a duração."
    );
  }

  const endSeconds = actualStartSeconds + durationSeconds;
  const endTime =
    premierepro.TickTime.createWithSeconds(endSeconds);

  console.log("[Text Motion] Ajustando duração", {
    startSeconds: actualStartSeconds,
    durationSeconds,
    endSeconds
  });

  await executeAction(
    project,
    () => trackItem.createSetEndAction(endTime),
    "Ajustar duração da camada"
  );
}

module.exports = {
  createLayersOnTimeline,
  applyDuration
};
