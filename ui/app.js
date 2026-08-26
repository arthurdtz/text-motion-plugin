/**
 * Interface principal do Text Motion.
 * JS puro e CommonJS para preservar a compatibilidade com UXP.
 */

const {
  toggleFavorite
} = require("../presets/animations.js");

const {
  resolveStyleToParams
} = require("../presets/styles.js");

const {
  loadData,
  updateData
} = require("../storage/settings.js");

const {
  createLayersOnTimeline
} = require("../premiere/timeline.js");

const TEST_MOGRT = {
  id: "mogrt_teste_uxp",
  name: "Teste UXP",
  category: "Entrada",
  mogrtPath: "D:/TextMotion/MOGRTs/teste UXP.mogrt",
  textParamName: "teste",
  previewPath: null,
  favorite: false
};

let layers = [];
let animations = [];
let styles = [];
let selectedLayerId = null;
let activeView = "layers";
let libraryQuery = "";
let favoritesOnly = false;
let isBusy = false;
let status = {
  type: "ready",
  message: "Pronto para criar"
};

let globalSettings = {
  durationSeconds: 1.2,
  positionX: 960,
  positionY: 540,
  fontSize: 72
};

const root = document.getElementById("app");

async function initApp() {
  const data = await loadData();
  animations = Array.isArray(data.mogrts)
    ? data.mogrts.slice()
    : [];
  styles = Array.isArray(data.styles)
    ? data.styles.slice()
    : [];

  const hasTestMogrt = animations.some(
    (item) =>
      item.id === TEST_MOGRT.id ||
      item.mogrtPath === TEST_MOGRT.mogrtPath
  );

  if (!hasTestMogrt) {
    animations.push({ ...TEST_MOGRT });
    await updateData({ mogrts: animations });
  }

  globalSettings = {
    ...globalSettings,
    ...(data.lastUsed || {})
  };

  const firstLayer = makeEmptyLayer();
  layers = [firstLayer];
  selectedLayerId = firstLayer.id;

  render();
}

function makeEmptyLayer() {
  return {
    id:
      "layer_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2, 7),
    text: "",
    animationId: animations[0] ? animations[0].id : null,
    styleId: styles[0] ? styles[0].id : null
  };
}

function getSelectedLayer() {
  return (
    layers.find((layer) => layer.id === selectedLayerId) ||
    layers[0] ||
    null
  );
}

function render() {
  root.innerHTML = "";
  root.className = isBusy ? "tm-is-busy" : "";

  const shell = el("div", "tm-shell");
  shell.appendChild(renderHeader());
  shell.appendChild(renderNavigation());

  const content = el("main", "tm-content");
  content.appendChild(
    activeView === "library"
      ? renderLibrary()
      : renderLayersWorkspace()
  );

  shell.appendChild(content);
  shell.appendChild(renderFooter());
  root.appendChild(shell);
}

function renderHeader() {
  const logo = el("div", "tm-logo", null, "TM");
  const brand = el("div", "tm-brand", [
    el("div", "tm-title", null, "TEXT MOTION"),
    el("div", "tm-subtitle", null, "Motion graphics composer")
  ]);

  const host = el("div", "tm-host-badge", [
    el("span", "tm-host-dot"),
    el("span", null, null, "PREMIERE")
  ]);

  return el("header", "tm-header", [
    el("div", "tm-brand-group", [logo, brand]),
    host
  ]);
}

function renderNavigation() {
  const nav = el("nav", "tm-nav");

  const layersButton = navButton(
    "Camadas",
    "layers",
    String(layers.length)
  );
  const libraryButton = navButton(
    "Biblioteca",
    "library",
    String(animations.length)
  );

  nav.appendChild(layersButton);
  nav.appendChild(libraryButton);
  return nav;
}

function navButton(label, viewName, count) {
  const button = el(
    "button",
    "tm-nav-button" +
      (activeView === viewName ? " is-active" : ""),
    [
      el("span", null, null, label),
      el("span", "tm-nav-count", null, count)
    ]
  );

  button.type = "button";
  button.addEventListener("click", () => {
    activeView = viewName;
    render();
  });

  return button;
}

function renderLayersWorkspace() {
  const workspace = el("div", "tm-workspace");
  const sectionHeader = el("div", "tm-section-heading", [
    el("div", null, [
      el("h2", "tm-section-title", null, "Camadas de texto"),
      el(
        "p",
        "tm-section-copy",
        null,
        "Cada camada usa um MOGRT da biblioteca."
      )
    ]),
    iconButton("+", "Adicionar camada", "tm-heading-action")
  ]);

  sectionHeader.lastChild.addEventListener("click", addLayer);
  workspace.appendChild(sectionHeader);

  const list = el("div", "tm-layers");
  layers.forEach((layer, index) => {
    list.appendChild(renderLayerCard(layer, index));
  });
  workspace.appendChild(list);

  const addButton = el("button", "tm-add-layer", [
    el("span", "tm-add-icon", null, "+"),
    el("span", null, null, "Adicionar texto")
  ]);
  addButton.type = "button";
  addButton.addEventListener("click", addLayer);
  workspace.appendChild(addButton);

  workspace.appendChild(renderInspector());
  return workspace;
}

function renderLayerCard(layer, index) {
  const isSelected = layer.id === selectedLayerId;
  const animation = animations.find(
    (item) => item.id === layer.animationId
  );

  const card = el(
    "article",
    "tm-layer-card" + (isSelected ? " is-selected" : "")
  );
  card.dataset.layerId = layer.id;
  card.addEventListener("click", () => {
    if (selectedLayerId !== layer.id) {
      selectedLayerId = layer.id;
      render();
    }
  });

  const indexBadge = el(
    "span",
    "tm-layer-index",
    null,
    String(index + 1).padStart(2, "0")
  );
  const layerMeta = el("div", "tm-layer-meta", [
    el("strong", null, null, "Camada de texto"),
    el(
      "span",
      null,
      null,
      animation ? animation.name : "MOGRT não selecionado"
    )
  ]);

  const duplicateButton = iconButton(
    "++",
    "Duplicar camada",
    "tm-card-action"
  );
  duplicateButton.addEventListener("click", (event) => {
    event.stopPropagation();
    duplicateLayer(index);
  });

  const removeButton = iconButton(
    "×",
    "Excluir camada",
    "tm-card-action tm-danger-action"
  );
  removeButton.disabled = layers.length === 1;
  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    removeLayer(index);
  });

  const cardHeader = el("div", "tm-layer-header", [
    indexBadge,
    layerMeta,
    el("div", "tm-card-actions", [
      duplicateButton,
      removeButton
    ])
  ]);

  const textInput = el("input", "tm-layer-text");
  textInput.type = "text";
  textInput.placeholder = "Digite o texto...";
  textInput.value = layer.text;
  textInput.dataset.layerIndex = String(index);
  textInput.addEventListener("focus", () => {
    selectedLayerId = layer.id;
  });
  textInput.addEventListener("input", (event) => {
    layer.text = event.target.value;
  });
  textInput.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      handleCreateOnTimeline();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (index === layers.length - 1) {
        addLayer();
      } else {
        focusLayerInput(index + 1);
      }
      return;
    }

    if (event.key === "Delete" && event.shiftKey) {
      event.preventDefault();
      removeLayer(index);
    }
  });

  const animationSelect = renderAnimationSelect(layer);
  const styleSelect = renderStyleSelect(layer);

  const content = el("div", "tm-layer-body", [
    labeled("Texto", textInput, "tm-field tm-field-wide"),
    el("div", "tm-control-row", [
      labeled("Animação", animationSelect),
      labeled("Estilo", styleSelect)
    ])
  ]);

  card.appendChild(cardHeader);
  card.appendChild(content);
  return card;
}

function renderAnimationSelect(layer) {
  const select = el("select", "tm-select");
  const placeholder = el(
    "option",
    null,
    null,
    animations.length
      ? "Escolher MOGRT"
      : "Nenhum MOGRT cadastrado"
  );
  placeholder.value = "";
  select.appendChild(placeholder);

  animations.forEach((animation) => {
    const option = el(
      "option",
      null,
      null,
      (animation.favorite ? "★  " : "") + animation.name
    );
    option.value = animation.id;
    option.selected = animation.id === layer.animationId;
    select.appendChild(option);
  });

  select.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  select.addEventListener("change", (event) => {
    layer.animationId = event.target.value || null;
    selectedLayerId = layer.id;
    render();
  });
  return select;
}

function renderStyleSelect(layer) {
  const select = el("select", "tm-select");
  const placeholder = el(
    "option",
    null,
    null,
    styles.length ? "Sem estilo" : "Nenhum estilo"
  );
  placeholder.value = "";
  select.appendChild(placeholder);

  styles.forEach((style) => {
    const option = el("option", null, null, style.name);
    option.value = style.id;
    option.selected = style.id === layer.styleId;
    select.appendChild(option);
  });

  select.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  select.addEventListener("change", (event) => {
    layer.styleId = event.target.value || null;
  });
  return select;
}

function renderInspector() {
  const section = el("section", "tm-inspector");
  const heading = el("div", "tm-inspector-heading", [
    el("div", null, [
      el("h2", "tm-section-title", null, "Inspector"),
      el(
        "p",
        "tm-section-copy",
        null,
        "Aplicado a todas as camadas criadas."
      )
    ]),
    el("span", "tm-scope-chip", null, "GLOBAL")
  ]);

  const positionX = metricInput(
    "X",
    globalSettings.positionX,
    1,
    (value) => {
      globalSettings.positionX = value;
    }
  );
  const positionY = metricInput(
    "Y",
    globalSettings.positionY,
    1,
    (value) => {
      globalSettings.positionY = value;
    }
  );
  const fontSize = metricInput(
    "PX",
    globalSettings.fontSize,
    1,
    (value) => {
      globalSettings.fontSize = value;
    }
  );
  const duration = metricInput(
    "SEC",
    globalSettings.durationSeconds,
    0.1,
    (value) => {
      globalSettings.durationSeconds = value;
    }
  );

  section.appendChild(heading);
  section.appendChild(
    el("div", "tm-inspector-group", [
      el("div", "tm-inspector-label", null, "POSIÇÃO"),
      el("div", "tm-control-row", [
        labeled("Horizontal", positionX),
        labeled("Vertical", positionY)
      ])
    ])
  );
  section.appendChild(
    el("div", "tm-inspector-group", [
      el("div", "tm-inspector-label", null, "TIPOGRAFIA E TEMPO"),
      el("div", "tm-control-row", [
        labeled("Tamanho", fontSize),
        labeled("Duração", duration)
      ])
    ])
  );

  return section;
}

function renderLibrary() {
  const section = el("section", "tm-library");
  const selectedLayer = getSelectedLayer();

  const searchInput = el("input", "tm-search");
  searchInput.type = "search";
  searchInput.placeholder = "Buscar animações...";
  searchInput.value = libraryQuery;
  searchInput.addEventListener("input", (event) => {
    libraryQuery = event.target.value;
    updateLibraryGrid();
  });

  const favoriteFilter = el(
    "button",
    "tm-filter-button" + (favoritesOnly ? " is-active" : ""),
    null,
    favoritesOnly ? "★ Favoritos" : "☆ Favoritos"
  );
  favoriteFilter.type = "button";
  favoriteFilter.addEventListener("click", () => {
    favoritesOnly = !favoritesOnly;
    render();
  });

  section.appendChild(
    el("div", "tm-section-heading", [
      el("div", null, [
        el("h2", "tm-section-title", null, "Biblioteca de MOGRTs"),
        el(
          "p",
          "tm-section-copy",
          null,
          selectedLayer
            ? "Clique em um card para aplicar à camada selecionada."
            : "Adicione uma camada antes de escolher um MOGRT."
        )
      ])
    ])
  );
  section.appendChild(
    el("div", "tm-library-toolbar", [
      el("div", "tm-search-wrap", [
        el("span", "tm-search-icon", null, "⌕"),
        searchInput
      ]),
      favoriteFilter
    ])
  );

  const grid = el("div", "tm-library-grid");
  grid.id = "tm-library-grid";
  section.appendChild(grid);
  fillLibraryGrid(grid);
  return section;
}

function getFilteredAnimations() {
  const query = libraryQuery.trim().toLowerCase();
  return animations.filter((animation) => {
    const matchesFavorite =
      !favoritesOnly || animation.favorite;
    const haystack =
      (animation.name + " " + (animation.category || ""))
        .toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesFavorite && matchesSearch;
  });
}

function updateLibraryGrid() {
  const grid = root.querySelector("#tm-library-grid");
  if (!grid) return;
  grid.innerHTML = "";
  fillLibraryGrid(grid);
}

function fillLibraryGrid(grid) {
  const filtered = getFilteredAnimations();

  if (filtered.length === 0) {
    grid.appendChild(
      el("div", "tm-library-empty", [
        el("div", "tm-empty-icon", null, "◇"),
        el("strong", null, null, "Nenhum MOGRT encontrado"),
        el(
          "span",
          null,
          null,
          "Ajuste a busca ou o filtro de favoritos."
        )
      ])
    );
    return;
  }

  filtered.forEach((animation) => {
    grid.appendChild(renderAnimationCard(animation));
  });
}

function renderAnimationCard(animation) {
  const selectedLayer = getSelectedLayer();
  const isActive =
    selectedLayer && selectedLayer.animationId === animation.id;
  const card = el(
    "button",
    "tm-animation-card" + (isActive ? " is-active" : "")
  );
  card.type = "button";

  const preview = el("div", "tm-preview");
  preview.appendChild(
    el(
      "span",
      "tm-preview-mark",
      null,
      animation.name.slice(0, 2).toUpperCase()
    )
  );

  if (animation.previewPath) {
    const image = document.createElement("img");
    image.className = "tm-preview-image";
    image.alt = "";
    image.src = animation.previewPath;
    image.addEventListener("error", () => image.remove());
    preview.appendChild(image);
  }

  const favoriteButton = iconButton(
    animation.favorite ? "★" : "☆",
    animation.favorite
      ? "Remover dos favoritos"
      : "Adicionar aos favoritos",
    "tm-favorite-button" +
      (animation.favorite ? " is-active" : "")
  );
  favoriteButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    const nextFavorite = !animation.favorite;
    await toggleFavorite(animation.id);
    animation.favorite = nextFavorite;
    render();
  });

  preview.appendChild(favoriteButton);
  preview.appendChild(
    el(
      "span",
      "tm-category-chip",
      null,
      animation.category || "MOGRT"
    )
  );

  card.appendChild(preview);
  card.appendChild(
    el("div", "tm-animation-info", [
      el("strong", null, null, animation.name),
      el(
        "span",
        null,
        null,
        isActive ? "Em uso" : "Aplicar à camada"
      )
    ])
  );

  card.addEventListener("click", () => {
    const layer = getSelectedLayer();
    if (!layer) return;
    layer.animationId = animation.id;
    setStatus("success", animation.name + " aplicado à camada.");
    render();
  });

  return card;
}

function renderFooter() {
  const footer = el("footer", "tm-footer");
  const statusNode = el(
    "div",
    "tm-status tm-status-" + status.type,
    [
      el("span", "tm-status-dot"),
      el("span", null, null, status.message)
    ]
  );

  const createButton = el(
    "button",
    "tm-create-btn",
    [
      el(
        "span",
        null,
        null,
        isBusy ? "CRIANDO..." : "CRIAR NA TIMELINE"
      ),
      el("span", "tm-create-arrow", null, "→")
    ]
  );
  createButton.type = "button";
  createButton.disabled = isBusy;
  createButton.addEventListener("click", handleCreateOnTimeline);

  footer.appendChild(statusNode);
  footer.appendChild(createButton);
  footer.appendChild(
    el(
      "div",
      "tm-shortcut-hint",
      null,
      "Ctrl + Enter para criar  •  Enter para nova camada"
    )
  );
  return footer;
}

function metricInput(prefix, value, step, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "tm-number-input";
  input.value = String(value);
  input.step = String(step);
  input.addEventListener("input", (event) => {
    const parsed = Number(event.target.value);
    if (Number.isFinite(parsed)) {
      onChange(parsed);
    }
  });

  return el("div", "tm-metric-input", [
    el("span", "tm-metric-prefix", null, prefix),
    input
  ]);
}

function addLayer() {
  const layer = makeEmptyLayer();
  layers.push(layer);
  selectedLayerId = layer.id;
  activeView = "layers";
  render();
  focusLayerInput(layers.length - 1);
}

function duplicateLayer(index) {
  const source = layers[index];
  const duplicate = {
    ...source,
    id:
      "layer_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2, 7)
  };
  layers.splice(index + 1, 0, duplicate);
  selectedLayerId = duplicate.id;
  render();
  focusLayerInput(index + 1);
}

function removeLayer(index) {
  if (layers.length === 1) return;
  const wasSelected = layers[index].id === selectedLayerId;
  layers.splice(index, 1);
  if (wasSelected) {
    const next = layers[Math.min(index, layers.length - 1)];
    selectedLayerId = next.id;
  }
  render();
}

function focusLayerInput(index) {
  requestAnimationFrame(() => {
    const inputs = root.querySelectorAll(".tm-layer-text");
    const target = inputs[index];
    if (target) target.focus();
  });
}

function validateSettings() {
  if (
    !Number.isFinite(globalSettings.durationSeconds) ||
    globalSettings.durationSeconds <= 0
  ) {
    throw new Error("A duração deve ser maior que zero.");
  }

  if (
    !Number.isFinite(globalSettings.fontSize) ||
    globalSettings.fontSize <= 0
  ) {
    throw new Error("O tamanho deve ser maior que zero.");
  }

  if (
    !Number.isFinite(globalSettings.positionX) ||
    !Number.isFinite(globalSettings.positionY)
  ) {
    throw new Error("X e Y precisam ser valores numéricos.");
  }
}

async function handleCreateOnTimeline() {
  if (isBusy) return;

  const validLayers = layers.filter(
    (layer) => layer.text.trim().length > 0
  );

  if (validLayers.length === 0) {
    alert("Digite ao menos um texto antes de criar na timeline.");
    return;
  }

  const missingAnimation = validLayers.find(
    (layer) => !layer.animationId
  );
  if (missingAnimation) {
    alert(
      "A camada \"" +
      missingAnimation.text +
      "\" não tem um MOGRT selecionado."
    );
    return;
  }

  const invalidAnimationLayer = validLayers.find((layer) => {
    const animation = animations.find(
      (item) => item.id === layer.animationId
    );
    return (
      !animation ||
      !animation.mogrtPath ||
      !animation.textParamName
    );
  });

  if (invalidAnimationLayer) {
    alert(
      "O MOGRT selecionado para \"" +
      invalidAnimationLayer.text +
      "\" não possui caminho e parâmetro de texto válidos."
    );
    return;
  }

  try {
    validateSettings();
  } catch (err) {
    alert(err.message || err);
    return;
  }

  const layerConfigs = validLayers.map((layer) => {
    const animation = animations.find(
      (item) => item.id === layer.animationId
    );
    const style = styles.find(
      (item) => item.id === layer.styleId
    );

    return {
      text: layer.text,
      mogrtPath: animation.mogrtPath,
      textParamName: animation.textParamName,
      durationSeconds: globalSettings.durationSeconds,
      positionX: globalSettings.positionX,
      positionY: globalSettings.positionY,
      fontSize: globalSettings.fontSize,
      fontSizeParamName: animation.fontSizeParamName || null,
      positionXParamName: animation.positionXParamName || null,
      positionYParamName: animation.positionYParamName || null,
      positionParamName: animation.positionParamName || null,
      extraParams: style
        ? resolveStyleToParams(style)
        : []
    };
  });

  try {
    setBusy(true);
    setStatus("working", "Inserindo MOGRT no playhead...");
    updateFooterState();

    await createLayersOnTimeline({
      layers: layerConfigs,
      layoutMode: "stacked",
      onProgress: (progress) => {
        setStatus(
          "working",
          "Camada " +
            (progress.index + 1) +
            " de " +
            progress.total +
            " criada"
        );
        updateFooterState();
      }
    });

    await updateData({ lastUsed: { ...globalSettings } });

    const firstLayer = makeEmptyLayer();
    layers = [firstLayer];
    selectedLayerId = firstLayer.id;
    activeView = "layers";
    setStatus(
      "success",
      validLayers.length + " camada(s) criada(s)"
    );
    setBusy(false);
    render();
  } catch (err) {
    console.error("[Text Motion] Erro na criação:", err);
    setStatus("error", "Falha ao criar na timeline");
    setBusy(false);
    render();
    alert(
      "Erro ao criar na timeline:\n" +
      (err.message || err)
    );
  }
}

function setBusy(value) {
  isBusy = value;
}

function setStatus(type, message) {
  status = { type, message };
}

function updateFooterState() {
  const footer = root.querySelector(".tm-footer");
  if (!footer) return;

  const replacement = renderFooter();
  footer.parentNode.replaceChild(replacement, footer);
}

function iconButton(text, title, className) {
  const button = el("button", className, null, text);
  button.type = "button";
  button.title = title;
  button.setAttribute("aria-label", title);
  return button;
}

function el(tag, className, children, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  if (children) {
    children.forEach((child) => {
      if (child) node.appendChild(child);
    });
  }
  return node;
}

function labeled(labelText, inputElement, className) {
  const wrap = el("label", className || "tm-field");
  wrap.appendChild(
    el("span", "tm-field-label", null, labelText)
  );
  wrap.appendChild(inputElement);
  return wrap;
}

module.exports = {
  initApp
};
