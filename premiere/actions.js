/**
 * Helpers para criar e executar Actions da API UXP do Premiere.
 *
 * No Premiere Pro 26.x, a Action deve ser criada e adicionada à transação
 * enquanto o projeto está protegido por lockedAccess(). Por isso estes
 * helpers recebem factories, e não Actions já criadas.
 */

function executeAction(
  project,
  createAction,
  transactionName = "Text Motion"
) {
  return executeActions(project, [createAction], transactionName);
}

function executeActions(
  project,
  actionFactories,
  transactionName = "Text Motion"
) {
  if (!project) {
    throw new Error("Projeto inválido ao executar uma Action do Text Motion.");
  }

  if (!Array.isArray(actionFactories) || actionFactories.length === 0) {
    return true;
  }

  let success = false;

  project.lockedAccess(() => {
    success = project.executeTransaction((compoundAction) => {
      for (const createAction of actionFactories) {
        if (typeof createAction !== "function") {
          throw new Error(
            "Action inválida: forneça uma função que crie a Action dentro de lockedAccess()."
          );
        }

        const action = createAction();

        if (!action) {
          throw new Error("A API do Premiere não retornou uma Action válida.");
        }

        compoundAction.addAction(action);
      }
    }, transactionName);
  });

  if (!success) {
    throw new Error(`O Premiere recusou a transação "${transactionName}".`);
  }

  return success;
}

module.exports = {
  executeAction,
  executeActions
};
