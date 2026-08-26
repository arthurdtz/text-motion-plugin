# Text Motion — painel UXP para Premiere

Plugin para criar camadas de texto animado a partir de MOGRTs diretamente
na timeline do Adobe Premiere Pro.

## Recursos atuais

- Interface compacta com camadas, biblioteca e inspector.
- Biblioteca de MOGRTs com busca, previews configuráveis e favoritos.
- Inserção no playhead por SequenceEditor.insertMogrtFromPath().
- Alteração do texto exposto pelo MOGRT.
- Tentativa tolerante de tamanho e posição por nomes configuráveis.
- Fallback de posição pelo parâmetro Motion/Transform quando ele expõe PointF.
- Duração calculada a partir do início real do item.
- Persistência local de biblioteca, favoritos e último inspector usado.
- Atalhos: Enter cria outra camada, Ctrl+Enter cria na timeline e
  Shift+Delete remove a camada.

## Compatibilidade

- Adobe Premiere Pro 25.6 ou superior, incluindo a linha 26.x.
- CommonJS em todo o projeto, com require e module.exports.
- Sem framework de UI e sem etapa obrigatória de build.

## MOGRT de desenvolvimento

O cadastro de teste é preservado na biblioteca:

    D:/TextMotion/MOGRTs/teste UXP.mogrt

O nome configurado para o parâmetro de texto é:

    teste

Cada novo MOGRT deve cadastrar seu próprio mogrtPath e textParamName.
Nomes de tamanho e posição variam por template; parâmetros opcionais
ausentes geram avisos no console e não impedem a criação do texto.
Quando os aliases automáticos não bastarem, o cadastro também aceita
fontSizeParamName, positionXParamName, positionYParamName e
positionParamName.

## Como testar

1. Ative o developer mode de plugins UXP no Premiere Pro e reinicie-o.
2. No UXP Developer Tool, adicione o manifest.json desta pasta.
3. Abra um projeto e uma sequência com pelo menos uma trilha de vídeo.
4. Abra o painel Text Motion, informe texto, MOGRT e valores do inspector.
5. Posicione o playhead e clique em CRIAR NA TIMELINE.
6. Confira o console do UDT pelos logs iniciados por [Text Motion].

## APIs principais

- Project.getActiveProject() e project.getActiveSequence()
- sequence.getPlayerPosition() e sequence.getVideoTrackCount()
- SequenceEditor.getEditor() e insertMogrtFromPath()
- trackItem.getComponentChain()
- Component.getParamCount() e Component.getParam()
- ComponentParam.createKeyframe()
- ComponentParam.createSetValueAction()
- VideoClipTrackItem.getStartTime() e createSetEndAction()
- project.lockedAccess() e project.executeTransaction()

Actions são criadas e executadas dentro de lockedAccess(), conforme o
contrato atual da Premiere UXP DOM.

## Estrutura

    manifest.json
    index.html
    main.js
    css/style.css
    ui/app.js
    premiere/sequence.js
    premiere/mogrt.js
    premiere/timeline.js
    premiere/actions.js
    presets/animations.js
    presets/styles.js
    presets/presets.js
    storage/settings.js

Ainda não há cadastro visual de novos MOGRTs, color picker ou
drag-and-drop para reordenar camadas.
