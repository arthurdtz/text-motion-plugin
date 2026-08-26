/**
 * main.js — ponto de entrada do painel UXP.
 */

const { initApp } = require("./ui/app.js");

async function start() {
  try {
    await initApp();
  } catch (err) {
    console.error("[Text Motion] Falha ao iniciar o painel:", err);

    const root = document.getElementById("app");

    if (root) {
      root.innerHTML = `
        <div class="tm-error">
          Erro ao iniciar: ${err?.message || err}
        </div>
      `;
    }
  }
}

start();