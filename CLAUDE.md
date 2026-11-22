# Finan — instruções para o Claude Code

A documentação completa do projeto (lógica de funcionamento, módulos e Regras de Ouro) está em `docs/CONTEXTUALIZACAO.md`, carregada abaixo. Ela vale integralmente, exceto nos pontos ajustados na seção "Adaptações para o Claude Code".

@docs/CONTEXTUALIZACAO.md

## Adaptações para o Claude Code

A contextualização foi escrita para IAs de chat, em que o usuário copiava e colava o código. No Claude Code, a IA lê e edita os arquivos diretamente. Por isso:

- **Regra de Ouro 4 (Pedido de arquivos):** em vez de pedir os arquivos ao usuário, ler sempre o código real do repositório antes de propor, diagnosticar ou alterar qualquer coisa. Nunca presumir o conteúdo de um arquivo sem tê-lo lido.
- **Regra de Ouro 3 (Protocolo de edição sem atalhos):** em vez de entregar blocos "LOCALIZAR / SUBSTITUIR POR", editar os arquivos diretamente, alterando apenas o que foi pedido. Continua proibido refatorar, otimizar ou "limpar" trechos não solicitados, inclusive os vizinhos.
- **Protocolo da janela:** a confirmação por escrito das Regras de Ouro e o pedido de arquivos não são necessários. Continua valendo o acordo operacional: discutir e alinhar os requisitos primeiro, e só alterar código após comando expresso do usuário.
- **Todas as demais Regras de Ouro permanecem inalteradas**, em especial a 1 (Editor mecânico), a 2 (Análise de impacto global), a 5 (Não presumir nomes), a 6 (Âncora temporal), a 7 (seção "O que mudou" ao final de toda alteração) e a 8 (Motor unificado).

## Fluxo de trabalho

1. O usuário descreve o pedido em linguagem natural. A IA lê o código, tira dúvidas e propõe a solução antes de alterar qualquer arquivo.
2. Com a ordem expressa do usuário, a IA faz as alterações num **branch separado**, nunca diretamente no `main`.
3. A IA faz commit e envia o branch ao GitHub. O usuário testa no VS Code, numa conta reserva, trocando para o branch e rodando o app localmente.
4. Correções são feitas no mesmo branch, quantas vezes forem necessárias.
5. Quando o usuário aprovar os testes, a IA atualiza `docs/CONTEXTUALIZACAO.md` **no mesmo branch**, para que código e documentação cheguem juntos ao `main` (ver "Manutenção da documentação").
6. **Somente após a aprovação expressa do usuário**, a IA abre um Pull Request do branch para o `main` e envia o link. **O merge é feito pelo próprio usuário**, clicando em "Merge pull request" no GitHub. A IA nunca faz o merge nem envia alterações diretamente ao `main`. O `main` é a versão publicada (GitHub Pages), usada pelo app instalado no celular e no desktop.
7. Após o merge, lembrar o usuário de voltar ao `main` no VS Code e fazer Sync/Pull.

Ao final de cada alteração, além da seção "O que mudou", informar o nome do branch e lembrar o usuário de puxar as alterações (Sync/Pull) no VS Code. Se o branch não aparecer na lista do VS Code, orientar a usar Sync ou Fetch antes de trocar de branch.

## Comunicação com o usuário

- Responder sempre em português.
- O usuário não é programador, mas tem boa noção de lógica e algoritmos. Explicar com clareza todo termo técnico (por exemplo: branch, commit, merge, pull), de preferência com analogias, sem presumir conhecimento prévio.
- Atenção à ambiguidade entre `main` (o branch oficial do projeto) e `main.js` (o arquivo de código): deixar claro de qual se trata.

## Manutenção da documentação

- Quando o usuário aprovar os testes de uma funcionalidade, atualizar `docs/CONTEXTUALIZACAO.md` no mesmo branch, **antes** do Pull Request, com o consentimento do usuário. Assim, o merge leva ao `main` o código e a documentação juntos.
- Atualizar **somente por acréscimo ou correção pontual**: nunca remover nem resumir partes que **ainda valem** sem pedido expresso do usuário. Manter os marcadores 🆕 (funcionalidade nova) e 🔄 (regra alterada) e a data no topo do documento.
- **Itens superados:** quando uma regra ou funcionalidade for substituída, **reescrever o item antigo** com a redação nova e o marcador 🔄, em vez de manter o texto superado e acrescentar outro item. Se for útil para evitar regressões, registrar em uma frase curta o motivo da mudança (como em "Esta redação substitui a anterior…"). Funcionalidades removidas do código saem também da documentação.

## Remoção de código

As Regras de Ouro proíbem remover ou "limpar" o que não foi pedido. Para não acumular código sem uso, valem também estas regras:

- **Código tornado obsoleto pela própria alteração pedida deve ser removido** no mesmo trabalho (por exemplo, o ícone antigo ao trocar por um novo). Toda remoção deve constar da seção "O que mudou".
- **Código que pareça sem uso, fora do escopo do pedido, nunca é removido por conta própria.** Antes de mencioná-lo ao usuário, a IA deve fazer uma **varredura em todos os arquivos do projeto** (HTML, CSS e JS) para confirmar que nada o chama ou referencia, incluindo usos indiretos: IDs e classes usados no HTML ou no CSS, nomes montados dinamicamente, mapeamentos em `elements.js`, ouvintes em `main.js` e campos lidos do Firestore. Trechos aparentemente inúteis podem ter uma função pequena ou muito específica, como as proteções contra *race conditions*.
- Só depois da varredura a IA aponta o trecho ao usuário, explicando **o que encontrou e por que acredita que está sem uso**. A remoção só ocorre com autorização expressa, como tarefa separada e com a análise de impacto da Regra de Ouro 2.
