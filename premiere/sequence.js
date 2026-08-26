/**
 * premiere/sequence.js
 *
 * Wrappers finos em torno da Premiere DOM (via UXP)
 * para obter o projeto e a sequência ativos.
 */

const premierepro = require("premierepro");

/**
 * Retorna o projeto ativo.
 */
async function getActiveProject() {
  const project = await premierepro.Project.getActiveProject();

  if (!project) {
    throw new Error(
      "Nenhum projeto do Premiere está aberto. Abra um projeto antes de usar o Text Motion."
    );
  }

  return project;
}

/**
 * Retorna a sequência ativa.
 */
async function getActiveSequence() {
  const project = await getActiveProject();

  const sequence = await project.getActiveSequence();

  if (!sequence) {
    throw new Error(
      "Nenhuma sequência ativa. Abra ou selecione uma sequência na timeline."
    );
  }

  return sequence;
}

/**
 * Retorna a posição atual do playhead.
 */
async function getPlayheadPosition(sequence) {
  return sequence.getPlayerPosition();
}

/**
 * Retorna o índice da próxima trilha de vídeo.
 */
async function getNextAvailableVideoTrackIndex(sequence) {
  const count = await sequence.getVideoTrackCount();

  if (count <= 0) {
    throw new Error("A sequência não possui nenhuma faixa de vídeo.");
  }

  // Usa a última faixa de vídeo existente.
  return count - 1;
}

module.exports = {
  getActiveProject,
  getActiveSequence,
  getPlayheadPosition,
  getNextAvailableVideoTrackIndex
};