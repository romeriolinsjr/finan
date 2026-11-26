**📑 CONTEXTUALIZAÇÃO DO PROJETO FINAN**

*Versão de Alta Fidelidade — Consolidada em 26/11/2026*

Olá! Este é o **Finan**, um sistema de controle financeiro pessoal desenvolvido como um PWA (Progressive Web App). Esta janela de contexto foi aberta para dar continuidade ao desenvolvimento, garantindo que a IA compreenda a lógica de funcionamento, as tecnologias envolvidas e, principalmente, as Regras de Ouro de trabalho estabelecidas para este projeto. O seu diferencial não é apenas registrar gastos passados, mas sim planejar o futuro através de uma arquitetura baseada no **Ciclo Real de Caixa** do usuário — e, mais recentemente, apoiar a **construção de riqueza**, tratando o patrimônio não apenas como saldo, mas como estratégia de alocação.

*Observação de leitura:* os marcadores 🆕 indicam funcionalidades criadas nas janelas recentes e 🔄 indicam regras que foram **alteradas** em relação a versões anteriores desta contextualização (prevalece sempre a redação atual).

**⚠️ LEIA ANTES DE RESPONDER — PROTOCOLO DESTA JANELA**

As Regras de Ouro que encerram este documento não são preferências de estilo: são o resultado de mais de um ano de lógica acumulada. Janelas anteriores as ignoraram, refatoraram código por conta própria e **causaram perda de funções em produção**. Antes da primeira resposta que contenha código, a IA deve ler a seção "Regras de Ouro" ao final, confirmar por escrito que vai segui-las e pedir os arquivos necessários. Em resumo, as violações mais frequentes:

- **Não refatorar, otimizar ou "limpar"** nada que não tenha sido expressamente pedido — nem em trechos vizinhos ao que foi solicitado.

- **Não usar comentários de omissão** ("// resto igual"): os blocos são sempre integrais.

- **Não recalcular saldos fora dos motores oficiais** (*obterDadosFinanceirosAgrupados*, em reports.js, para fluxo mensal; *obterSaldoItemAteMes*, em patrimony.js, para estoque).

- **Não presumir nomes** de variáveis, IDs, funções ou arquivos: ler o código enviado pelo usuário.

- **Encerrar toda resposta com código** com a seção "O que mudou", listando ponto a ponto o que foi alterado.

**Acordo operacional da janela:** a discussão técnica e o alinhamento de requisitos vêm primeiro; **código só deve ser enviado após comando expresso do usuário**.

**📱 LÓGICA DE FUNCIONAMENTO (O "DNA" DO APP)**

**1. O Mês de Referência (Âncora Temporal)**

O Finan ignora o calendário civil puro para focar no **Ciclo do Salário** (ex.: do dia 21 de um mês ao dia 20 do mês seguinte).

- **Carimbo Mensal:** a tela inicial exibe o "Mês de Referência" carregado no estado global. Toda e qualquer transação cadastrada é carimbada com esse mês, independentemente da data de vencimento. Exemplo: se o usuário recebe o salário em 25 de maio e tem uma conta para pagar em 10 de junho, ele registra essa conta em maio. Ela aparecerá na lista de maio, descontando do saldo de maio.

- **Navegação Blindada:** para evitar o erro de "Month Overflow" (pular meses ao navegar em dias 31), o sistema força o posicionamento no dia 1 de cada mês ao utilizar as setas de navegação ou o botão "Hoje".

- **Data Local do Dispositivo (🆕 2/9/2026):** os formulários são pré-preenchidos com a **data local do dispositivo**, e não com *toISOString()*. O uso do padrão UTC fazia o app pular para o dia seguinte após as 21h. Qualquer nova rotina de data deve seguir esse mesmo critério.

- **Variável Soberana (🔄 corrigido em 13/9/2026):** a âncora temporal em memória é **state.currentDate**, um objeto *Date* declarado em *state.js*. O que a documentação chamava de "variável *mesAnoReferencia*" **não existe como variável de estado**: *mesAnoReferencia* é a **projeção textual** dessa âncora no formato "YYYY-MM", gerada sob demanda por *getMesAnoChave(state.currentDate)* e gravada como campo nos documentos do Firestore (*t.mesAnoReferencia*, *o.mesAnoReferencia*). Por serem a mesma informação em dois formatos, não há risco de divergirem.

- **Os cinco ponteiros temporais do estado (🔄 27/9/2026):** além da âncora, o *state.js* mantém ponteiros próprios para os contextos que navegam de forma independente — **state.reportDate** (contexto e modal de Relatórios), **state.currentFaturaDate** (fatura do cartão, inicializado como *null*), **state.dividasTerceirosDate** (Despesas de terceiros) e **state.currentPatrimonioExtratoDate** (🆕 folheação do extrato do item no Patrimônio). A independência é **intencional**: folhear faturas, relatórios, terceiros ou o extrato de um ativo altera apenas o ponteiro daquele contexto e preserva o mês de onde o usuário partiu na Home. Não unificar esses ponteiros sem decisão expressa do usuário.

- **Carimbo das novas transações:** o mês gravado vem de *state.currentDate*, salvo na adição rápida dentro de uma fatura (*state.isQuickAddMode* com *state.currentFaturaDate*), em que prevalece o mês da fatura aberta. Séries recorrentes e parceladas projetam os meses seguintes a partir de *state.currentDate*.

- **Ponto de fragilidade conhecido (baixo risco):** no botão de download do PDF, o *main.js* verifica se o **modal** de relatórios está aberto para então igualar *state.currentDate* a *state.reportDate*. A verificação não cobre o **contexto** de Relatórios na Home — o que não gera erro hoje, porque nesse contexto a navegação de meses já altera *state.currentDate* pelo cabeçalho principal. Registrado para que uma futura alteração no fluxo de relatórios não transforme isso em bug silencioso.

**2. Orçamentos Temporais (Série Histórica e Planejamento)**

Os orçamentos (ex.: Supermercado, Delivery, Assinaturas, Restaurantes etc.) são "baldes" de planejamento.

- **Independência Mensal:** cada mês no Finan tem seus próprios documentos de orçamento. Isso permite planejar um gasto maior em meses de férias sem alterar o valor histórico dos meses passados.

- **Pavimentação (Propagação):** ao navegar para um mês futuro vazio, o sistema busca o último planejamento conhecido e clona automaticamente para o novo mês.

- **Orçamentos fixos do sistema:** *isFixed: true* ("Outros Gastos") recolhe as compras de cartão sem categoria e tem previsão própria editável; *isFixedOrdinary: true* ("Gastos Ordinários") é dedicado às despesas pagas por Pix, débito ou dinheiro. Ambos são **protegidos contra exclusão acidental**.

- **Absorção de compras órfãs (🆕 setembro/2026):** toda compra de cartão sem orçamento, ou com orçamento inválido, é capturada por "Outros Gastos"; se estourar a previsão dele, a diferença é subtraída a mais do Saldo do Mês. Quando o usuário edita a compra e a vincula ao orçamento correto com cadeado aberto, o valor é **absorvido pela reserva já existente** daquele orçamento, a cobrança em "Outros Gastos" é cancelada e o Saldo do Mês volta ao valor correto.

- **Ajuste Rápido de Saldo — botão do alvo 🎯 (🆕 setembro/2026):** fica em cada linha de orçamento da aba Gerais, ao lado do cadeado. Em vez de o usuário calcular de cabeça quanto mudar no previsto, ele informa **o saldo que quer ter sobrando** e o sistema aplica a equação invertida: **Novo Previsto = Saldo Desejado + Gastos Comprometidos no Mês**. Como todos os motores (Transações, Relatórios, Sidebar e PDF) consomem *orc.valor*, a alteração se propaga nativamente por todo o ecossistema.

  - **Modal de duplo escopo:** abre exibindo o gasto já comprometido e a previsão atual, com o campo de valor já focado e arredondado estritamente em duas casas decimais (sem dízimas flutuantes), e dois botões: "Aplicar APENAS neste mês" (azul \#3498db) e "Aplicar NESTE e nos PRÓXIMOS meses" (verde \#27ae60).

  - **Propagação dinâmica mês a mês:** a opção de meses futuros **não replica um previsto estático**. O sistema percorre os meses futuros já existentes no banco e recalcula cada um com os gastos daquele período específico: Novo Previsto Futuro = Saldo Desejado + Gastos Comprometidos Daquele Mês. Exemplo: com uma compra parcelada de R\$ 200,00 (duzentos reais) nos cinco meses seguintes e saldo desejado de R\$ 1.000,00 (mil reais), o previsto sobe para R\$ 1.200,00 (mil e duzentos reais) durante esses cinco meses e volta sozinho a R\$ 1.000,00 (mil reais) quando as parcelas acabam.

  - **Inteligência universal:** a rotina calcula os gastos de orçamentos comuns (por *orcamentoId*), de "Outros Gastos" (*isFixed*, capturando compras órfãs de cartão) e de "Gastos Ordinários" (*isFixedOrdinary*, capturando as despesas ordinárias).

  - **Performance e proteção contra concorrência (não remover):** o cálculo futuro usa **uma única consulta em lote** ao Firestore e processa tudo em memória; o botão é travado no primeiro milissegundo com o texto "Salvando…", impedindo cliques múltiplos e tarefas concorrentes; e a memória local (*state.orcamentos*) é atualizada diretamente, o que elimina a piscada ou o sumiço visual dos orçamentos na tela.

- **Lógica de Cadeados (Previsto vs Real):**

  - **Cadeado Aberto (🔓):** o sistema subtrai o valor **previsto** (*orc.valor*) do saldo do mês como provisão, independentemente do quanto já foi gasto. Gastos feitos **dentro** do limite não alteram o Saldo do Mês, porque o valor já estava reservado; apenas o que **estoura** o previsto reduz o saldo, e só na diferença excedente.

  - **Cadeado Fechado (🔒):** o sistema ignora a previsão e considera apenas o **gasto real** já vinculado àquela categoria.

**3. Tipos de Transações e Frequências**

O Finan trabalha atualmente com **quatro tipos de transação** (o quarto, Patrimônio, foi criado na janela de trabalho de julho/2026):

- **Receitas:** entradas de caixa.

- **Despesas Ordinárias:** pagas via PIX, Débito ou Dinheiro (vinculadas ao orçamento fixo "Gastos Ordinários").

- **Cartão de Crédito:** vinculadas a um cartão específico e a um orçamento (se não houver vínculo, caem no orçamento fixo "Outros Gastos"). **Não possuem data civil (🆕 setembro/2026):** o formulário de Nova Transação não exibe campo de vencimento para despesas de cartão — o mês é governado integralmente pelo mês ativo na Home (*state.currentDate*) ou pela fatura em que a compra foi lançada.

- **Patrimônio:** movimentações de ativos e amortização de dívidas. Ver detalhamento completo no item 5 e na seção "Regras de Cálculo e Gestão Patrimonial".

- **Frequências (🔄 26/11/2026):** podem ser Únicas, Recorrentes (mensais) ou Parceladas (ex.: 1/12), **tanto para despesas (ordinárias e de cartão) quanto para receitas**. O sistema suporta séries de até 60 meses. *Esta redação substitui a anterior, em que a receita só podia ser Única ou Recorrente.*

  - **Receita parcelada (🆕 26/11/2026):** o formulário da receita segue a mesma ordem do da despesa ordinária — Frequência → "Cadastrar por" (Valor total da receita ou Valor da parcela, *\#tipoCadastroParcelaReceita*) → Valor → Quantidade de parcelas e Parcela atual (*\#qtdParcelasReceita*, *\#parcelaAtualReceita*, no bloco *\#camposParceladaReceita*) → Data de entrada. Os campos de parcelas só aparecem com a frequência Parcelada, por meio de um ouvinte em *main.js* no *\#frequenciaReceita*. A gravação usa o mesmo motor de séries das despesas (*adicionarNovasTransacoes*): nome "Nome (1/6)", um mês de referência por parcela a partir de *state.currentDate* e data de entrada avançando mês a mês. Com "Valor total", cada parcela é arredondada em duas casas (pequenas diferenças de centavos são aceitas; o usuário ajusta a parcela, se quiser). As parcelas entram em "Receitas Totais" como qualquer receita do mês.

- **Dois botões de lançamento, com funções distintas:**

  - **"Nova Transação":** fica no topo da Home e abre o formulário completo, para lançamentos de Receita/Despesa em geral.

  - **Atalho Pix/Débito (💸):** botão dedicado que abre o formulário de Nova Transação **já pré-configurado como Despesa Ordinária**, para lançamentos instantâneos, com os campos Tipo (Despesa), Categoria (Ordinária) e Frequência (Única) **bloqueados** (*disabled*), restando ao usuário apenas Nome, Valor e Data. Embora esteja na mesma seção, situa-se em ponto distante do "Nova Transação": fica junto dos botões de **Mostrar/ocultar valores (olho 👁)** e de **Voltar para hoje**.

**4. Arquitetura de Contextos Nativos na Home (🔄 ampliada em 20/8/2026)**

A interface concluiu a transição de um modelo baseado em **janelas sobrepostas (modais de visualização)** para um modelo de **Contextos Nativos** renderizados na própria Home, separando a operação **estratégica** da **operacional** através da Sidebar. A variável *state.modoVisualizacao* gerencia **sete estados distintos** na tela principal:

1.  **Transações** (abas Gerais e Patrimoniais).

2.  **Patrimônio** (Árvore Hierárquica).

3.  **Relatórios** (analíticos e drill-down).

4.  **Ciclos dos cartões** (antigo Weekly Tracker).

5.  **Despesas de terceiros** (antigas Dívidas de Terceiros).

6.  **Orçamentos.**

7.  **Cartões de crédito.**

**Detalhamento dos dois contextos principais:**

- **Contexto Transações (Operacional):** focado no extrato mensal. Possui duas abas internas:

  - **Gerais:** Receitas, Orçamentos e Despesas (Pix, Débito e Cartão).

  - **Patrimoniais:** Aportes, Resgates e Amortizações realizados no mês. *Nota: os Ajustes de valor não aparecem aqui, para não poluir o fluxo de caixa.*

  - **Ação Central:** botão "Nova Transação" no topo da Home, para lançamentos de Receita/Despesa. O atalho Pix/Débito (💸) permanece ativo em ponto distinto da mesma seção, junto aos botões de Mostrar/ocultar valores (olho) e Voltar para hoje.

- **Contexto Patrimônio (Estratégico):** ao clicar em "Patrimônio" na sidebar, a Home exibe a **Árvore Hierárquica** (Categorias e Itens).

  - **Operações Diretas:** cada item possui botões coloridos: **⊕ (Aporte)**, **⊖ (Resgate)**, **≈ (Ajuste de Valor)** e **↓ (Amortização)**.

  - **Formulários Inteligentes:** clicar nos ícones abre o modal com Conta e Operação já preenchidas e travadas, focando o cursor no campo Valor.

**Implementação técnica (🆕 20/8/2026):**

- **Orquestrador:** a função *renderizarTransacoesDoMes*, em **ui.js**, liga e desliga os containers do *index.html* conforme o modo ativo.

- **Funções polimórficas:** as funções de renderização (*renderizarTracker*, *renderizarListaOrcamentos*, *renderizarDividasDoMes* etc.) detectam se estão preenchendo o **modal** (fluxo legado/secundário, ainda existente) ou os **novos containers da Home**, e se comportam de acordo.

- **Navegação no celular:** no mobile, a sidebar oculta-se automaticamente ao selecionar um contexto, deixando visível apenas o menu hambúrguer.

**5. Módulo de Patrimônio Acumulado**

O sistema gerencia o patrimônio em dois níveis: **Categorias** (Natureza) e **Itens** (Instituições/Ativos).

- **Naturezas:**

  - **Formação de Ativos (Verde):** investimentos reais e construção de riqueza.

  - **Recursos para Amortização (Azul):** capital destinado exclusivamente à redução de dívidas (passivos).

- **Operações Patrimoniais:**

  - **Aporte:** retira do saldo mensal e aumenta o saldo do ativo/recurso. É a "saída de caixa" para o usuário.

  - **Resgate:** retira do saldo do ativo e aumenta o saldo mensal.

  - **Ajuste (🔄 simplificado em 21/8/2026):** atualiza o valor do ativo (ex.: juros/valorização) sem afetar o saldo mensal. O usuário **não calcula o rendimento**: informa o **Saldo Atualizado da Conta**, tal como aparece no banco.

  - **Motor de Delta:** ao salvar um ajuste, o **transactions.js** consulta o saldo atual no app, calcula a diferença (delta) entre o valor informado e o atual, registra **apenas essa diferença** como transação de ajuste e grava no nome da transação o saldo final informado, para fins de auditoria.

  - **Amortização (🔄 regra revista em agosto/2026):** é operação **neutra para o saldo mensal** (não reduz o resumo financeiro da sidebar), mas **dedutiva para o estoque** (reduz o saldo do item na árvore de patrimônio). Reflete o uso do dinheiro que já estava guardado.

  - **Fluxo em duas etapas (razão da mudança):** concluiu-se ser mais intuitivo que o usuário faça primeiro o **Aporte** para uma conta de Recursos para Amortização — momento em que o dinheiro efetivamente sai do caixa do mês — e, somente depois, realize a **Amortização** propriamente dita, que apenas consome o estoque já constituído. *Esta redação substitui a anterior, segundo a qual a amortização reduziria o saldo mensal sem alterar o saldo do ativo.*

- **Motor Único de Estoque:** a função *obterSaldoItemAteMes* (**patrimony.js**) é o cálculo único do saldo de cada conta patrimonial, deduzindo rigorosamente as Amortizações — o que resolveu a inflação de valores nas contas de Recursos para Amortização. **Fórmula oficial:** Saldo = Saldo Inicial + Aportes − Resgates + Ajustes − Amortizações.

- **Parâmetros do motor (🔄 outubro/novembro de 2026):** a função **não lê o estado**. Recebe *mesAnoCorte* como string "YYYY-MM" (padrão "9999-12"), comparada com *sub.mesAnoCriacao* e com *t.mesAnoReferencia* de cada transação, e ganhou ainda *dataCorteCivil* e *apenasReal* — quem chama é que extrai a chave de *state.currentDate*.

- **Máquina do Tempo (🆕 setembro/2026):** o contexto Patrimônio deixou de exibir um saldo estático acumulado e passou a ser uma **série histórica fiel ao mês de referência da Home** (*state.currentDate*, lido via *getMesAnoChave*). Navegar no calendário passa a mostrar a fotografia patrimonial daquele mês.

- **Campo mesAnoCriacao (🆕 setembro/2026):** cada item (subcategoria) tem no Firestore o atributo *mesAnoCriacao* — a "data de nascimento" da conta. O modal de cadastro/edição traz o seletor *type="month"* (*\#mesAnoCriacaoPatrimonio*), pré-preenchido com o mês ativo na Home, mas que permite retroagir ou programar a data.

- **Corte histórico no motor de estoque (🔄 setembro/2026):** *obterSaldoItemAteMes* valida se o mês consultado é anterior ao *mesAnoCriacao*; se for, o saldo retornado é rigorosamente **0**. O *saldoInicial* do item só é ativado no mês de nascimento da conta.

- **Ocultação automática na árvore (🆕 setembro/2026):** ao navegar para meses passados, todo item cujo *mesAnoCriacao* seja posterior ao mês consultado é ocultado da árvore e **expurgado** dos somatórios de categoria e do Patrimônio Líquido do topo.

- **Retrocompatibilidade (🆕 setembro/2026):** contas cadastradas antes desta implementação, sem o campo *mesAnoCriacao*, continuam visíveis em todos os períodos por padrão (*!sub.mesAnoCriacao*) e podem receber a data de criação retroativamente pelo modal de edição. **Não remover essa guarda** ao mexer na renderização da árvore.

- **Saldo Real x Saldo Projetado (🆕 outubro/novembro de 2026):** transações patrimoniais agendadas para o fim do mês (um aporte do 13º em 21/11, por exemplo) inflavam o saldo da conta já no começo do mês, e qualquer Ajuste de Valor (≈) feito no presente gerava um delta negativo enorme, porque o motor consultava "9999-12" e supunha que o aporte futuro já deveria estar na conta. A solução foi dividir a leitura em dois modos:

  - **Modo Saldo Real (padrão):** computa estritamente as operações cuja *dataOperacao* seja igual ou anterior à data de hoje. Um aporte agendado para o dia 21 só entra no saldo real a partir do dia 21.

  - **Modo Saldo Projetado:** computa todas as operações determinísticas (Aportes, Resgates e Amortizações) planejadas até o fechamento do mês consultado.

  - **Pílula interativa** (*btnToggleVisaoPatrimonio*)**:** fica ao lado do valor no card de Patrimônio Acumulado Total e unifica, num único elemento em estilo *badge*, a tag de status e o botão de ação. Alterna de imediato entre 🏦 Saldo Real (azul claro \#e8f4fd) e 🔮 Saldo Projetado (azul marinho \#2c3e50), com *tooltip* nativo (*title*) e cursor *pointer*.

  - **Bloqueio no passado:** ao navegar para meses passados, a pílula é desabilitada e exibida como "Consolidado" (*cursor: not-allowed*), já que o histórico não comporta projeção.

  - **Persistência:** a escolha fica em *state.patrimonioVisaoProjetada* e é preservada ao navegar entre o mês corrente e os futuros.

  - **Blindagem do motor de delta do Ajuste (🔄, em transactions.js):** o cálculo do rendimento passou a consultar o **saldo real até a data da operação do ajuste** (*dataAjusteCivil*), em vez da consulta cega a "9999-12". É o que permite agendar aportes futuros sem corromper o cálculo dos juros de hoje.

- **Soft Delete Temporal de contas (🆕 novembro/2026):** a antiga *excluirSubcategoria* apagava o documento da subcategoria no Firestore (*hard delete*), e a conta sumia retroativamente de todos os meses anteriores, deixando as transações órfãs e distorcendo o patrimônio acumulado, os relatórios e os PDFs históricos. O encerramento passou a ser temporal:

  - **Modal de encerramento:** o botão ✖ de uma conta — tanto na árvore da Home (*listaPatrimonioHierarquicaHome*) quanto no modal (*listaPatrimonioHierarquicaUl*) — chama *prepararSoftDeleteSubcategoria* (**patrimony.js**) e abre o *\#modalConfirmarExclusaoPatrimonio*, padronizado com o modelo de exclusão de cartões, onde o usuário escolhe o mês de encerramento (*\#dataCorteExclusaoPatrimonio*, pré-preenchido com o mês ativo na Home).

  - **Gravação:** ao confirmar (*\#btnConfirmarSoftDeletePatrimonio*), *executarSoftDeleteSubcategoria* grava { deletado: true, mesAnoExclusao: "YYYY-MM" } e atualiza a memória local, **sem apagar o documento nem as suas transações**.

  - **Meses anteriores ao encerramento:** a conta aparece integralmente ativa, preservando o *saldoInicial*, as movimentações e a composição exata do saldo total naquele período, nos Relatórios e no PDF.

  - **Mês do encerramento:** a conta continua visível na árvore, com fundo atenuado, tag cinza "Encerrada" ao lado do nome e os botões operacionais (⊕ ⊖ ≈ ↓) e de edição/exclusão ocultos. Isso preserva as movimentações feitas no início do ciclo, como o resgate total que costuma anteceder o encerramento.

  - **Meses seguintes:** a conta desaparece da árvore hierárquica e do cálculo do patrimônio líquido.

  - **Bloqueio de novos lançamentos:** em *transactions.js*, *popularSelectTransacaoPatrimonio* filtra as contas em que *sub.deletado && sub.mesAnoExclusao && mesAnoAtual \>= sub.mesAnoExclusao*, impedindo registrar operações em conta encerrada a partir do mês de corte.

  - **Não confundir com o Soft Delete de Cartões — jamais unificar as duas rotinas:** os dois mecanismos têm o mesmo nome, mas são **implementações independentes**, sem código nem campos em comum, e com regras **opostas** no mês de corte. O de **Cartões** (*cards.js*, funções *prepararSoftDeleteCartao* e *executarSoftDeleteCartao*, modal *\#modalConfirmarExclusaoCartao*) grava *dataExclusao*, **apaga permanentemente** do Firestore as compras do usuário com *mesAnoReferencia \>= dataExclusao* (preservando as de terceiros), faz o cartão sumir da Home já a partir do mês de corte e exibe a tag "Excluído" nas faturas anteriores. O de **Patrimônio** (*patrimony.js*, como descrito acima) grava *mesAnoExclusao*, **nunca apaga transação alguma**, mantém a conta visível no próprio mês de encerramento com a tag "Encerrada" (*=== mesAnoExclusao*) e só a oculta a partir do mês seguinte (*\> mesAnoExclusao*). **Atenção ao nome:** apesar de os dois se chamarem "Soft Delete", apenas o de Patrimônio preserva os dados; o de Cartões exclui transações de forma irreversível.

- **Extrato Mensal da Conta (🔄 setembro/2026):** o modal *\#modalDetalhesPatrimonio* deixou de listar o histórico corrido e passou a exibir **exclusivamente as movimentações do mês consultado** (*t.mesAnoReferencia === mesAnoAtivo*), com a seguinte estrutura:

  - **Card de abertura, em duas linhas:** "SALDO ANTERIOR (ABERTURA)", obtido pelo fechamento do mês anterior via *obterSaldoItemAteMes*, ou "SALDO INICIAL DA CONTA" quando o mês consultado é o de criação. O rótulo fica na linha de cima e o valor na de baixo, para não quebrar no mobile.

  - **Subtotais do mês:** bloco condicional que exibe apenas as operações efetivamente ocorridas no período (Aportes, Resgates, Ajustes e/ou Amortizações).

  - **Card de fechamento, em duas linhas:** "FECHAMENTO DO MÊS", com o valor cravado de *obterSaldoItemAteMes(sub.id, mesAnoAtivo)*.

  - **Setas de navegação interna (\< e \>):** folheiam o histórico do ativo mês a mês pelo cabeçalho do modal, usando *state.currentPatrimonioExtratoDate* e exibindo o subtítulo do período (ex.: "Outubro de 2026"), **sem alterar a data da Home**.

  - **Ancoragem superior no CSS:** *\#modalDetalhesPatrimonio .modal-content* usa *margin: 50px auto auto auto !important* (20px no mobile), travando o topo do modal para que as setas fiquem imóveis sob o mouse durante a navegação.

  - **Dependência do título (não alterar):** *\#tituloDetalhesPatrimonio* deve manter estritamente o formato *Extrato: \${sub.nome}* — o *main.js* depende dele para a exclusão de Ajustes.

- **Extrato do Item (🆕 21/8/2026):** o modal de extrato exibe data e saldo sem repetir o nome do item em cada linha (ele já consta no título). As transações do tipo **ajuste** possuem botão de exclusão (✖) próprio dentro do extrato, permitindo corrigir um lançamento de saldo sem navegar até a aba de transações gerais.

- **Ordenação e Reclassificação (🆕 2/9/2026):** dentro de cada categoria, os itens são ordenados automaticamente pelo **Saldo Real (decrescente)**. Já as **categorias** têm ordem manual, gravada no campo *posicao* no Firebase e alterada pelo usuário com os triângulos sólidos (▲ e ▼) na árvore.

- **Diferenciação de Ícones (regra a preservar):** a seta linear (↓) é **exclusiva** da operação financeira de Amortização; os triângulos sólidos (▲ ▼) são **exclusivos** da ferramenta de organização. Não usar um no lugar do outro.

- **Motor de Cache Permanente:** diferente das despesas, as transações de Patrimônio possuem um listener permanente no Firebase. Isso garante que o Patrimônio Acumulado seja calculado corretamente em qualquer mês, independentemente da janela de carregamento.

- **Identidade Visual por Cores:** Roxo (Resgate), Teal (Amortização), Azul (Aporte), Laranja/Amarelo (Orçamentos).

- **Layout Responsivo da Árvore (🆕 agosto/2026):** a função *renderizarListaPatrimonioHierarquica* (**patrimony.js**) e o *style.css* foram reformulados para o mobile:

  - **Categorias:** exibidas em duas linhas (nome na primeira, valor na segunda).

  - **Itens:** exibidos em três linhas (nome, valor e botões operacionais).

  - **Gestão blindada:** os ícones de Editar e Excluir são fixados com *position: absolute* no canto superior direito dos cards, para evitar transbordamento lateral em telas pequenas.

**6. Motor Econômico de Séries**

Para evitar o erro de cota do Firebase (Quota Exceeded), o sistema utiliza uma lógica de Leitura Única em Bloco. Ao editar uma série de 60 meses, o sistema baixa todos os orçamentos do usuário de uma vez, cria um mapa de memória e processa os vínculos de ID localmente antes de enviar um comando de lote (WriteBatch) ao banco. Garante timestamps precisos (*criadoEm*) com offset de milissegundos para ordenação cronológica.

**7. Ciclos dos cartões (antigo Weekly Tracker)**

Uma ferramenta híbrida para gerenciar o limite do cartão ao longo da fatura.

- **Ciclos Dinâmicos e Abas:** suporta até 2 ciclos ativos (Principal e Transição) organizados por abas, eliminando o scroll excessivo. O usuário define data de início, fim e meta.

- **Waterfall (Balde Transbordante):** os gastos preenchem a Semana 1; ao estourar o limite semanal, o valor "transborda" para a próxima.

- **Linha do Tempo Segmentada (🔄 26/11/2026):** exibe blocos azuis que avançam a cada dia real, permitindo comparar o tempo decorrido com o dinheiro gasto. O bloco do **dia atual** recebe destaque em azul-marinho (\#2c3e50) com leve sombra: em *construirHTMLCiclo* (*weekly-tracker.js*), a unidade cuja posição no ciclo (início da semana + número da unidade) é igual a *diasDecorridos* recebe a classe *today*, além da *past*. **Só vale com o ciclo em andamento** (hoje entre *dataInicio* e *dataFim*): num ciclo encerrado, *diasDecorridos* é igualado ao total de dias, e sem essa condição o último dia apareceria destacado. *Esta redação substitui a anterior: a regra .time-segment.today já existia no style.css, mas o código nunca a aplicava.*

- **Motor de Recuperabilidade (Regra dos 25%):** a cor da barra de gastos é dinâmica. Se o excesso de gastos ultrapassar 25% da folga financeira que resta no ciclo, a barra fica Vermelha (Crítico). Caso contrário, fica Amarela (Alerta). Se estiver dentro do previsto, Verde.

- **Regra da 1ª Parcela:** o Tracker captura automaticamente apenas a primeira parcela de compras parceladas/recorrentes. Edições em parcelas futuras (ex.: ajuste de centavos na parcela 7/10) são ignoradas para não distorcer o ciclo corrente.

- **Gestão de Vínculos:** permite remover itens do acompanhamento (✖) sem excluí-los das transações reais do Finan (para compras excepcionais pagas com reserva).

- **Setor de Ações:** botões unificados e coloridos no rodapé (Verde: Abrir, Amarelo: Editar, Azul: Valor Inicial, Vermelho: Encerrar).

**8. Despesas de terceiros e Relatórios / PDF Profissional**

- **Terceiros:** gerenciamento de compras feitas para outras pessoas, com dashboard de "Falta Receber" e controle de reembolso independente da fatura.

- **Acesso Direto:** o menu lateral leva diretamente à consulta de dívidas, com interface em Acordeão (expandir/recolher por pessoa) e Checkbox Mestre para reembolsos em lote.

- **Ordenação do detalhamento (🔄 setembro/2026):** no resumo de "Detalhamento" das Despesas de terceiros, a ordem é determinística — 1º "Ordinárias", sempre no topo; 2º os cartões, em ordem decrescente de valor, com desempate alfabético.

- **Categoria de cada despesa na lista (🆕 22/11/2026):** na lista de despesas de cada pessoa, cada item passou a ter três linhas: o nome (com a parcela, quando houver), a categoria e o valor. A categoria aparece como "Ordinária" ou "Cartão de crédito (nome do cartão)", com o nome buscado em *state.cartoes* pelo *cartaoId* gravado na despesa ("Cartão desconhecido" se não for encontrado). Fica entre o nome e o valor, em letra menor e cinza (classe *.divida-categoria*, em *style.css*), para não competir com o destaque do valor. Antes, a categoria e o cartão só eram usados nos totais do resumo do topo e não apareciam em nenhuma despesa individual. **Layout no celular (não remover):** no bloco *@media (max-width: 768px)* das Despesas de terceiros, a regra *.divida-terceiro-item .transaction-actions* aplica *width: auto*, *padding-top: 0* e *border-top: none*. Ela anula, só nesta lista, a regra geral de *.transaction-actions* para celular, feita para a lista de Transações (em que os botões descem para uma linha própria, com 100% da largura e linha superior). Sem essa anulação, os botões ✎ ✖, que aqui ficam **ao lado** do texto, espremiam a coluna de texto a cerca de 80px e quebravam nome, categoria e valor em várias linhas.

- **Drill-down total (🔄 ampliado em 2/9/2026):** **todas** as seções analíticas — Despesas, Patrimônio e também **Orçamentos** — abrem detalhamento ao clique, exibindo os itens e valores que compõem aquele número.

- **Parcelas que encerram no mês (🔄 ampliado às despesas ordinárias em 26/11/2026):** em *reports.js*, uma despesa parcelada é identificada como última parcela pelo critério *parcelaAtual === totalParcelas*. O resultado aparece em três lugares, **tanto para Cartão de Crédito quanto para Ordinárias**: no card "Parceladas" de cada categoria, uma linha verde logo abaixo do valor ("🏁 X compras encerram este mês" no cartão; "🏁 X despesas encerram este mês" nas ordinárias); no topo do modal de detalhamento, um banner verde consolidado informando quantas finalizam e o valor que será liberado no próximo ciclo; e, ao lado de cada item na última parcela, a tag verde "Finaliza este mês". **As receitas parceladas ficam deliberadamente de fora.** *Esta redação substitui a anterior, em que o aviso valia apenas para o cartão.*

- **Sincronia temporal do drill-down:** o detalhamento usa o ponteiro próprio do relatório (*state.reportDate*), sincronizado com a Home a cada renderização e depois navegável de forma independente, de modo que o usuário veja os dados do mês consultado ainda que ele seja diferente do mês da Home. Sem essa sincronização inicial, o drill-down fica preso a um mês fixo — cuidado a preservar em qualquer alteração no fluxo de relatórios.

- **Padronização das listas de detalhamento:** dentro dos modais, os itens aparecem sempre em ordem **decrescente de valor**, com *cursor: pointer* e efeito *hover* sinalizando a interatividade.

- **Conferência de Fatura:** seção que permite simular a diferença entre o banco e o app, com um checkbox para salvar o status de "Fatura Conferida", que exibe uma tag azul na Home.

- **Faturas só com despesas de terceiros (🆕 outubro/novembro de 2026):** quando o cartão era usado exclusivamente para compras de terceiros, a fatura não aparecia na lista de Transações da Home e havia o risco de o boleto vencer esquecido. Agora a rotina de faturas em *ui.js* consulta **tanto state.transacoes quanto state.dividasTerceiros**, e a fatura aparece com nome do cartão, data de vencimento, botão de conferência 🔍 e valor **− R\$ 0,00** — sem afetar o Saldo do Mês na sidebar nem consumir receitas. No modal de conferência, as linhas "Minhas Compras", "Compras de Terceiros" e "Total Esperado" permitem bater o valor com o boleto do banco sem duplicidade e sem lançamentos fictícios para forçar a fatura a aparecer. O checkbox de fatura paga na Home grava o status *faturaPaga* tanto nas transações do usuário quanto nas dívidas de terceiros daquele cartão e mês (*cards.js*).

- **PDF Profissional:** layout com bordas de destaque, ordenação analítica (maiores valores no topo em todas as seções) e somatórios em todos os grupos.

- **Paridade com o contexto Relatórios (🆕 agosto/2026):** o PDF replica exatamente as sete variáveis exibidas no menu Relatórios (Receitas Totais, Resgates, Despesas Totais, Aportes, Amortizações, Saldo Final e Saldo Real), por consumir o mesmo motor de cálculo centralizado.

- **Fidelidade Histórica (🔄 reforçada em setembro/2026):** o PDF de um mês passado exibe a Posição Patrimonial Acumulada fiel àquele período e **oculta as contas ainda não nascidas**, refletindo exatamente a mesma fotografia visível na Home naquele mês.

- **Conformidade do PDF com a Regra de Ouro 8 (🔄 setembro/2026):** o *export.js* passou a **importar e consumir diretamente** a função oficial *obterSaldoItemAteMes*, de *patrimony.js*, eliminando os loops manuais de cálculo de saldo que violavam a fonte única da verdade e ignoravam o corte temporal.

- **Destaque dos orçamentos fixos no relatório (🆕 setembro/2026):** *Gastos Ordinários* (*isFixedOrdinary*) permanece travado no topo da lista por *sort* e recebe fundo azul claro suave (#ebf5fb), preservando a borda padrão para não concorrer com a barra azul dos títulos de seção; *Outros Gastos* (*isFixed*) recebe a classe *.orcamento-item-outros* e fundo laranja suave (#fff5eb), na mesma identidade já usada nas telas de Transações e Orçamentos.

- **Métrica "Saldo nos cartões" (🆕 setembro/2026):** inserida na linha de TOTAIS, entre "Gasto" e "Saldo total", somando o saldo exclusivamente dos orçamentos de cartão de crédito (*!orc.isFixedOrdinary*), com cor dinâmica (verde/vermelha). Mostra de imediato a folga de compras no cartão até o fechamento do ciclo.

- **Rótulos (🔄 setembro/2026):** "Prev:" foi substituído por **"Previsto:"** em todas as linhas de orçamento e na linha de totais; o somatório geral passou a chamar-se **"Saldo total:"**, mantendo o cálculo inalterado.

- **Design em containers do PDF (🆕 setembro/2026):** todas as tabelas (Resumo Geral, Receitas, Orçamentos, Despesas, Indicadores Mensais e Posição Acumulada) usam a constante *COLOR_BG_SECTION = \[248, 250, 252\]* no corpo, cabeçalhos em \[238, 242, 246\] e linhas de TOTAL em \[240, 243, 246\]. Os respiros entre seções ficam no branco puro da folha, o que transforma cada seção em um bloco visual.

- **Alinhamento numérico dos cabeçalhos (🔄 corrigido em setembro/2026):** no jsPDF-autotable, as colunas numéricas de Orçamentos (PREVISTO, GASTO, SALDO) e de Patrimônio (SALDO ACUMULADO) têm estilo explícito *{ halign: "right" }* também no *head*, alinhando o cabeçalho aos valores.

- **Nota gerencial na tabela de Ativos (🆕 setembro/2026):** antes da tabela, em itálico: "Demonstrativo restrito às contas de Formação de Ativos (não inclui contas de Recursos para Amortização)." O cabeçalho da coluna foi simplificado para CONTA.

- **Duas casas decimais (🔄 setembro/2026):** o Índice de Destinação para Amortização, a Taxa de Investimento Líquido e a TCP passaram a ser formatados com *.toFixed(2)*, tanto no PDF quanto na tela de Relatórios.

- **Foco em Ativos e Legendas Gerenciais:** a Posição Patrimonial do PDF é focada em **Ativos** e acompanha legendas gerenciais explicativas dos cálculos (a, b, c).

**9. Fluxos Blindados de Formulário (🆕 2/9/2026)**

Os formulários passaram a se abrir já contextualizados, reduzindo cliques e impedindo escolhas inválidas:

- **Edição de orçamentos:** o fluxo foi padronizado com o das transações. Ao clicar em editar (✎), o sistema pergunta **primeiro o escopo** (Este mês ou Toda a série) e só então abre o formulário.

- **Atalho Pix/Débito (💸):** abre o modal com Tipo, Categoria e Frequência bloqueados (*disabled*), liberando apenas Nome, Valor e Data.

- **Despesa de terceiro:** o modal oculta os campos "Tipo" e "Orçamento" e exibe o título específico "Nova despesa de terceiro".

- **Operações patrimoniais:** os ícones ⊕ ⊖ ≈ ↓ da árvore abrem o modal com Conta e Operação preenchidas e travadas, com o cursor no campo Valor.

- **Edição de parcelas (🆕 26/11/2026):** ao editar uma receita, despesa ordinária ou despesa de cartão **parcelada**, *preencherModalParaEdicao* (*transactions.js*) abre o formulário com "Cadastrar por" em **"Valor da parcela"** (o campo Valor mostra o valor da parcela, e na edição ele é gravado exatamente como digitado, sem divisão) e **trava** (*disabled*) os campos "Quantidade de parcelas" e "Parcela atual". Razão: alterar a contagem na edição não cria nem apaga parcelas — apenas mudaria o nome exibido ("3/6" → "3/8"). Para mudar a quantidade de verdade, exclui-se a série e cadastra-se de novo. As travas de edição **não** se aplicam aos aportes parcelados de Patrimônio.

  - **Reset obrigatório (não remover):** *resetModalNovaTransacao* reabilita esses campos e devolve o "Cadastrar por" da receita, da ordinária e do cartão a "Valor total". Sem isso, depois de uma edição, o próximo cadastro novo (inclusive de despesa de terceiro, cujo *third-party.js* lê os mesmos campos da ordinária e do cartão) herdaria "Valor da parcela" e deixaria de dividir o valor.

**10. Backup local em .json (🆕 22/11/2026)**

Segundo backup dos dados, guardado no computador do usuário, complementar ao Firestore. **Razão:** as cópias que o Google mantém do Firestore são espelhos, e não backups — uma exclusão (como a do Soft Delete de cartões, que apaga compras de forma irreversível) ou um bug que grave valores errados é replicado em todas elas. O arquivo .json é uma fotografia congelada, imune ao que acontecer depois no banco.

- **Botão:** "💾 Baixar backup" (*\#btnBaixarBackup*), no rodapé da sidebar, entre o botão de abrir/fechar todos os orçamentos e o "Sair". O clique é registrado em *main.js* e executa *baixarBackupJson*, do módulo **backup.js**.

- **Leitura direta do Firestore (não ler do state):** o backup consulta o documento *users/{uid}* e as suas **12 subcoleções** — *transacoes*, *orcamentos*, *orcamentosFechados*, *cartoes*, *ajustesFatura*, *faturasConferidas*, *dividasTerceiros*, *pessoas*, *patrimonioCategorias*, *patrimonioSubcategorias*, *ciclos_tracker* e *votos_tracker*. O *state* não serve de fonte, porque só contém os meses já carregados (*mesesCarregados*).

- **Alerta de manutenção:** ao criar uma **nova coleção** no Firestore, acrescentá-la à constante *COLECOES_BACKUP*, em *backup.js*. Caso contrário, ela ficará fora do backup silenciosamente.

- **Formato do arquivo:** *finan-backup-AAAA-MM-DD.json*, com a data local do dispositivo. Contém um cabeçalho (*app*, *versaoBackup*, *geradoEm*, *usuario*), o *perfil* (dados do documento do usuário), os *totais* (quantidade de registros por coleção, para conferência rápida) e as *colecoes*, em que cada documento leva o seu *id* — indispensável para preservar os vínculos (*orcamentoId*, *cartaoId*, *pessoaId* etc.). Os *Timestamps* do Firebase são convertidos em texto ISO; os demais campos saem exatamente no formato gravado pelo app.

- **Tudo ou nada:** se a leitura de qualquer coleção falhar, nenhum arquivo é gerado e o usuário é avisado, para que nunca se guarde um backup incompleto sem saber. Durante a geração, o botão fica travado com o texto "Gerando backup…", impedindo cliques múltiplos.

- **Somente download:** não há rotina de restauração no app. Se um dia for necessária, deverá ser tratada como tarefa à parte (por gravar no banco), testada antes na conta reserva.

- **Lembrete de 30 dias:** após gerar o arquivo, o sistema grava o campo *ultimoBackup* no documento do usuário, com a hora do **dispositivo** (*firebase.firestore.Timestamp.now()*) — e não *serverTimestamp*, que chega nulo no snapshot local e faria a frase piscar "Nenhum backup realizado". O ouvinte já existente do documento do usuário, em *main.js*, chama *exibirLembreteBackup*, que preenche *\#lembreteBackupDisplay*, logo abaixo do botão: "Último backup em DD/MM/AAAA." em cinza até 30 dias; "⚠️ Último backup há X dias." ou "⚠️ Nenhum backup realizado." em laranja (\#f39c12, classe *.backup-atrasado*). A data fica no Firestore, e não no *localStorage*, para valer em todos os aparelhos.

- **Exceção deliberada ao Carimbo de Última Atualização (não "corrigir"):** *baixarBackupJson* **não** chama *registrarUltimaAlteracao*, porque o backup não altera nenhum dado financeiro. A "Última Atualização" da sidebar deve continuar indicando a última alteração real.

**11. Porteiro de atualizações — service worker (🆕 22/11/2026)**

Faz o app abrir sempre na versão mais recente publicada. **Razão:** no atalho da tela de início do iPhone, as alterações publicadas no *main* demoravam a aparecer, mesmo fechando o app, porque o navegador reaproveitava a cópia antiga dos arquivos guardada no aparelho.

- **Arquivo:** *sw.js*, na raiz do projeto. É registrado por um pequeno bloco no fim do *index.html*, logo depois do *js/main.js*, com caminho relativo ("sw.js"), o que faz valer tanto no GitHub Pages (subpasta */finan/*) quanto no Live Server. Se o navegador não suportar ou o registro falhar, o app funciona normalmente e só um aviso aparece no console ("Porteiro de atualizações não registrado").

- **Estratégia "rede primeiro":** para cada leitura (*GET*) de arquivo do próprio Finan, o *sw.js* consulta o servidor com *cache: "no-cache"*. Se o arquivo não mudou, o servidor só confirma, sem baixá-lo de novo. Uma cópia é guardada no cache "finan-arquivos" e usada **somente sem internet**, o que permite abrir o app offline (os dados do Firebase continuam exigindo conexão para atualizar).

- **Fora do alcance do porteiro:** requisições de outros endereços (Firebase, login, Google Fonts, jsPDF) e tudo que não for *GET* seguem direto para a internet, sem interferência.

- **Ativação imediata:** *skipWaiting* na instalação e *clients.claim* na ativação fazem a versão nova do porteiro assumir sem esperar o fechamento das abas.

- **Por que não usar números de versão nos nomes dos arquivos (*style.css?v=2*):** o app tem 17 módulos que se importam entre si. Seria preciso alterar dezenas de importações a cada publicação, e um descuido faria o navegador carregar **duas cópias** do mesmo módulo (por exemplo, dois *state.js* independentes), quebrando o app silenciosamente.

- **Alerta de manutenção (não apagar o sw.js):** se um dia o porteiro precisar ser retirado, não basta apagar o arquivo, porque o navegador mantém o porteiro já instalado nos aparelhos. É preciso antes publicar uma versão do *sw.js* que se desinstale e só depois removê-lo.

- **Conferência no navegador:** F12 › aba "Aplicativo" (no Edge, pelo botão "+" da barra de ferramentas) › "Service workers", que deve mostrar *sw.js* "ativado e está em execução".

**📊 REGRAS DE CÁLCULO E GESTÃO PATRIMONIAL**

**1. Motor de Cálculo Centralizado — Single Source of Truth (🆕 agosto/2026)**

O módulo **reports.js** abriga a função soberana *obterDadosFinanceirosAgrupados(date)*, o "cérebro" matemático único do app, que alimenta com os mesmos números:

- o **Resumo Financeiro** da sidebar (consumido por *ui.js*);

- o contexto de **Relatórios** na Home;

- a **exportação do PDF Profissional** (*export.js*).

*Nota histórica: uma contextualização anterior referiu-se a esta função como "obterResumoFinanceiro". O nome vigente no código é obterDadosFinanceirosAgrupados.*

**Regras do motor:**

- **Aportes como saída bruta:** os aportes (operação *aporte*) são tratados como **saídas brutas do caixa mensal**.

- **Fallback por natureza:** para não errar o cálculo quando uma conta de patrimônio é excluída, a função auxiliar interna *obterNaturezaTransacao(t)* utiliza a propriedade *t.natureza* **gravada na própria transação** (ex.: "ativo"), em vez de depender da existência atual do ID da subcategoria na árvore viva. Foi essa correção que eliminou o desaparecimento de valores de Aporte/Resgate no PDF.

- **Paridade total com o PDF:** o extrato em PDF foi reestruturado para replicar exatamente as **sete variáveis** do contexto Relatórios: Receitas Totais, Resgates, Despesas Totais, Aportes, Amortizações, Saldo Final e Saldo Real.

- **Implicação prática:** qualquer nova exibição de números financeiros deve consumir essa função, em vez de recalcular por conta própria — sob pena de as três telas voltarem a divergir.

- **Dois motores distintos, não confundir:** o motor descrito acima, em *reports.js*, calcula o **fluxo do mês** (resumo financeiro, relatórios e PDF). O cálculo do **estoque patrimonial** de cada conta é feito pela função *obterSaldoItemAteMes*, em *patrimony.js*, segundo a fórmula: Saldo = Saldo Inicial + Aportes − Resgates + Ajustes − Amortizações.

**2. Fluxo Contábil das Operações**

- **Aporte:** saída de caixa do mês (reduz o saldo mensal) e entrada no estoque (aumenta o saldo do item).

- **Resgate:** saída do estoque (reduz o saldo do item) e entrada de caixa no mês (aumenta o saldo mensal).

- **Ajuste:** altera apenas o estoque (valorização/juros), sem qualquer efeito sobre o saldo mensal.

- **Amortização:** neutra para o saldo mensal e dedutiva para o estoque — o dinheiro já havia saído do caixa quando do aporte.

**3. Indicadores de Performance (TCP e Índices)**

- **TCP (Taxa de Crescimento Patrimonial no Ciclo):** calculada **exclusivamente** sobre as contas de Formação de Ativos, ignorando por completo as de Recursos para Amortização.

- **TCP — metodologia vigente (🔄 setembro/2026):** o sistema consome, via *obterSaldoItemAteMes*, o fechamento do mês anterior (S inicial) e o do mês consultado (S final), com proteção de dia 1 para evitar *month overflow*. A variação ΔS = S final − S inicial captura de uma só vez novos aportes em ativos, rendimentos e juros (Ajustes de Valor ≈), resgates e o saldo de contas abertas no mês. **Fórmula:** TCP = (ΔS / S inicial) × 100, com *fallback* de 100,00% quando S inicial = 0 e S final \> 0. *Esta metodologia substitui a anterior, que reconstruía o saldo inicial revertendo Aportes, Resgates, Ajustes e Amortizações a partir do saldo final.*

- **Índice de Destinação para Amortização:** Amortizações / (Resgates + Amortizações).

- **Investimento Líquido:** (Aportes − Resgates + Ajustes) / Receitas, refletindo a situação real de ganho ou consumo patrimonial.

**🛠️ TECNOLOGIAS E FERRAMENTAS**

- **Ambiente:** VS Code e GitHub (versionamento).

- **Banco de Dados/Auth:** Firebase (Firestore e Firebase Auth). Escutas em tempo real (*onSnapshot*) para transações, orçamentos, cartões, ajustes, faturas conferidas e patrimônio.

- **Interface:** HTML5, CSS3 (Flexbox/Grid), JavaScript Moderno (ESM). Design baseado em "baldes" visuais, contextos nativos na Home, empilhamento de modais (*stacking*) nos fluxos remanescentes e identidade visual por cores (Roxo: Resgate, Teal: Amortização, Azul: Aporte, Laranja/Amarelo: Orçamentos).

- **Motores de PDF:** jsPDF e autoTable.

**📂 ESTRUTURA TÉCNICA (ARQUIVOS E MÓDULOS)**

**Convenções de Interface, Ordenação e Reatividade**

- **Ordenação Master (Home):** 1º Tipo (Receitas \> Orçamentos \> Despesas); 2º Data (crescente); 3º Prioridade Patrimonial (Aporte \> Amortização \> Resgate); 4º Valor (decrescente).

- **Prioridade dos orçamentos fixos na Home (🔄 novembro/2026):** dentro do bloco de ordenação de *itensParaRenderizar*, em *renderizarTransacoesDoMes* (**ui.js**), quando os dois itens comparados são do tipo *CONSTS.TIPO_RENDERIZACAO.ORCAMENTO* o sistema aplica prioridade absoluta **antes** do critério de data ou valor: 1º "Gastos Ordinários" (*isFixedOrdinary*), 2º "Outros Gastos" (*isFixed*), 3º os demais orçamentos, por *valorTotalOrcamento* decrescente. O algoritmo antes verificava apenas o *isFixedOrdinary*, de modo que um orçamento comum com previsto maior que o de "Outros Gastos" o ultrapassava na lista (por exemplo, o Supermercado depois de quitado um financiamento). Com a correção, a ordem ficou idêntica na Home (*ui.js*), no contexto de Relatórios (*reports.js*) e no gerenciador de Orçamentos (*budgets.js*).

- **Ordenação nos detalhes do orçamento (🔄 setembro/2026):** no modal *\#listaGastosOrcamento*, as compras vinculadas seguem a mesma hierarquia já usada na fatura do cartão — 1º Recorrentes, 2º Parceladas, 3º Únicas —, com desempate dentro de cada grupo pelo valor em ordem decrescente.

- **Privacidade — olho em SVG e correção do placeholder (🔄 22/11/2026):** o botão *\#btnToggleVisibility* (*index.html*) voltou a exibir um olho, agora em **dois desenhos vetoriais (SVG)** em vez de emoji: *.icone-olho-aberto* (valores visíveis) e *.icone-olho-riscado* (valores ocultos). O ícone indica o **estado atual**, e a troca é feita só pelo CSS, a partir da classe *.values-hidden* no *body*.

  - **Visual padronizado:** fundo azul-marinho \#2c3e50 (hover \#1a252f), ícone branco de 22px, altura de 36px e cantos de 4px, na mesma linha dos botões 💸 (laranja) e "Hoje" (azul).

  - **Estado do botão:** *renderizarEstadoVisibilidade* (*ui.js*) não aplica mais opacidade 0.5 ao botão; passou a alternar o *title* entre "Ocultar valores" e "Mostrar valores". A preferência continua salva em *localStorage* ("finanValuesHidden").

  - **Cor do Saldo do mês ao mostrar os valores (🆕 22/11/2026, não remover):** *atualizarResumoFinanceiro* (*ui.js*) só pinta o Saldo do mês (verde, vermelho ou azul) quando os valores estão visíveis; com os valores ocultos, deixa o saldo sem cor. Por isso, o ouvinte do botão do olho, em *main.js*, chama *ui.atualizarResumoFinanceiro()* logo depois de *renderizarEstadoVisibilidade*. Sem essa chamada, quando o app abria com os valores ocultos (preferência salva no aparelho) e o usuário abria o olho, o saldo aparecia branco até o resumo ser recalculado por outro motivo.

  - **Placeholder sobreposto (não reverter):** o "R\$ ●●●●●●" (pseudo-elemento *::before*) é posicionado com *position: absolute; top: 0; right: 0; white-space: nowrap* sobre o valor original transparente, que recebe *position: relative*. Antes, o placeholder era desenhado **ao lado** do valor transparente, somando as duas larguras: isso quebrava em duas linhas os nomes do Resumo Financeiro da sidebar e deslocava as bolinhas para a esquerda na Home.

  - **Resumo Financeiro da sidebar:** o placeholder usa cor clara \#ecf0f1 (o \#333 ficava quase invisível no fundo \#2c3e50) e versão mais curta, "R\$ ●●●●●", em 0.85em, para não encostar nos rótulos da coluna estreita. Na Home, a cor \#333 foi mantida.

- **Barra de Navegação Temporal Fixa — Sticky Month Bar (🆕 setembro/2026):** o conjunto de navegação de ciclo **\< \[Mês/Ano\] \>** foi isolado no container *.sticky-month-bar*, posicionado logo abaixo do *.main-header*, no topo do *.main-content*. Por ser elemento soberano do layout principal, **atende automaticamente todas as telas da Home** (Transações, Relatórios, Patrimônio, Orçamentos, Cartões, Terceiros etc.) sem duplicação de código. O ganho é ergonômico: o usuário avança ou retrocede ciclos de qualquer ponto da página, sem rolar de volta ao topo depois de analisar listas longas ou rodapés de relatórios.

  - **Separação de componentes:** o título, a logo e os botões de utilidade (💸 Pix/Débito, olho de Privacidade e Hoje) permanecem no fluxo normal e sobem com a rolagem; só o seletor de mês fica fixo.

  - **Comportamento:** *position: sticky; top: 0; z-index: 100*, com fundo \#f9fafb e borda inferior delicada.

  - **Desktop:** margens negativas horizontais (*margin-left: -25px; margin-right: -25px*) expandem o fundo por toda a largura do container, para que transações e tabelas passem por baixo sem vazamento visual lateral.

  - **Mobile:** *top: 0* com *padding-left: 55px*, mantendo o mês centralizado e alinhado ao lado do botão hambúrguer ☰, sem sobreposição nem conflito de toque.

  - **Regra técnica vital (não reverter):** a propriedade *overflow-y: auto* foi **removida** da classe *.main-content* no *style.css*. Era ela que criava a "gaiola invisível" de overflow e impedia os elementos filhos de ancorarem no topo da janela. Reintroduzi-la quebra o *sticky* silenciosamente.

- **Renomeação global na interface (🆕 2/9/2026) — atenção redobrada:** o *Weekly Tracker* passou a chamar-se **"Ciclos dos cartões"** e as *Dívidas de Terceiros*, **"Despesas de terceiros"**. A mudança é **apenas de rótulo**: no código permanecem *btnWeeklyTracker*, *weekly-tracker.js*, *third-party.js* e a coleção *dividasTerceiros* no Firestore. **Jamais renomear IDs, arquivos ou coleções para acompanhar o rótulo da interface.**

- **Sentence case:** nos nomes compostos da interface, apenas a primeira letra da primeira palavra é maiúscula ("Despesas de terceiros", "Ciclos dos cartões", "Cartões de crédito").

- **Scroll Offset Pattern (🔄 setembro/2026):** substituiu o *position: fixed* puro, que jogava a Home de volta ao topo ao fechar um modal. Ao abrir (*ui.abrirModalEspecifico*), o sistema lê a rolagem vertical (*window.scrollY*) e congela o fundo com *body.style.top = -scrollY px*; no *style.css*, *body.modal-aberto* aplica *position: fixed; width: 100%; overflow: hidden*, o que também evita o efeito elástico no iOS/Safari. Ao fechar o último modal (*ui.fecharModalEspecifico*), a trava é liberada e o sistema executa *window.scrollTo(0, scrollY)*, devolvendo o usuário exatamente à linha em que estava.

- **Carimbo de Última Atualização:** todas as funções de salvamento em *transactions.js* e *third-party.js* incluem *await registrarUltimaAlteracao()*, mantendo fiel o indicador de "Última Atualização" da sidebar. Ao criar uma nova função de salvamento, replicar essa chamada.

- **Botões de Ação Padronizados (🆕 20/8/2026):** todos os botões principais de comando no rodapé dos contextos da Home ("Cadastrar Novo...", "Consultar...", "Baixar PDF") usam a classe **.btn-pat-home**, com bordas arredondadas de 8px, peso de fonte semi-bold (600) e alinhamento centralizado. Os botões internos do card de ciclo ativo do Weekly Tracker também passaram de 6px para 8px, mantendo a paridade visual.

- **Nomenclatura sem o sinal "+":** os botões do contexto Patrimônio na Home chamam-se **"Nova categoria"** e **"Novo item"** (com dimensões ampliadas, bordas arredondadas e centralização fixa), na mesma linha do botão **"Nova Transação"** — o sinal "+" foi removido de todos.

- **Limpeza visual das datas:** o prefixo "Venc:" foi removido da exibição das despesas ordinárias na aba Gerais.

- **Títulos da Home (🆕 21/8/2026):** os títulos dos contextos são **idênticos aos nomes dos botões da sidebar** (ex.: "Gerenciar Orçamentos" passou a ser apenas "Orçamentos") e estão fixados em **1.4em**, para manter a paridade de importância visual que os antigos modais tinham.

- **Área de toque no mobile (🆕 21/8/2026):** a classe *.patrimonio-info* recebeu *width: 100%*, para que o clique que abre o extrato funcione em toda a largura da linha no celular.

- **Estabilidade horizontal (🆕 21/8/2026):** a regra *html { overflow-y: scroll; }* no *style.css* evita o pulo lateral do conteúdo quando a barra de rolagem aparece ou desaparece na troca entre menus curtos e longos.

- **Handlers Unificados (🆕 20/8/2026):** em **main.js**, os ouvintes de eventos (edição, exclusão, transferências) foram unificados em constantes (ex.: *handlerInteracaoOrcamentos*) que escutam **tanto os containers do modal quanto os da Home**, garantindo interatividade total nos dois fluxos.

- **Atualização Instantânea (🆕 20/8/2026):** as funções de salvamento em **budgets.js** e **cards.js** disparam o refresh da lista na Home imediatamente após o sucesso no Firestore, eliminando a necessidade de F5 ou recarregamento manual.

- **Soberania do ID no CSS (🆕 20/8/2026):** em **style.css**, as regras de estilo de orçamentos e cartões foram expandidas para alcançar também os novos IDs da Home (*\#listaOrcamentosHome*, *\#listaCartoesHome*), preservando o efeito visual de "baldes" coloridos.

- **Alerta de manutenção:** o **main.js** já passou por uma limpeza cirúrgica para remover ouvintes duplicados que provocavam a sobreposição indesejada de modais sobre a tela inicial. Ao acrescentar novos ouvintes, verificar se já não existe um handler unificado cobrindo aquele container.

- **Blindagem de seletores contra snapshots assíncronos (🆕 setembro/2026, não remover):** em *transactions.js*, as funções *popularSeletoresFixos* e *popularSelectTransacaoPatrimonio* memorizam a seleção ativa do usuário (*cartaoSelecionado*, *orcamentoSelecionado*, *itemSelecionado*) **antes** de reconstruir o *innerHTML* dos dropdowns. Isso corrige a *race condition* em que o salvamento de uma transação disparava um *onSnapshot* do Firebase em segundo plano, reescrevia o *\<select\>* e resetava silenciosamente a escolha para "Nenhum (Outros Gastos)" enquanto o usuário preenchia a transação seguinte.

- **Travas anti-duplicidade (não remover):** o **main.js** contém travas com *.some()* que verificam a existência dos dados em memória antes de novas gravações no Firestore. Elas foram implementadas para corrigir uma *race condition* (julho/2026) que criava orçamentos fixos duplicados. Parecem redundantes, mas são proteções — enquadram-se integralmente na Regra de Ouro 1.

- **Auditoria de código sem uso (🆕 26/11/2026):** por decisão do usuário, a IA passou a fazer varreduras somente de leitura em todos os arquivos para localizar código sem uso, duplicado ou conflitante, seguindo o protocolo de "Remoção de código" do *CLAUDE.md*: relatório com evidências, autorização item a item e remoção em lotes, do menor risco para o maior, cada um testado na conta reserva.

  - **Lote 1 (concluído):** *style.css*, *index.html* e *elements.js*. Saíram classes de CSS que nenhum HTML ou JS usava, regras repetidas e declarações anuladas por regras posteriores (sem mudança visual), o modal vazio *\#modalMenuTerceiros* e 7 mapeamentos do *elements.js* que apontavam para IDs inexistentes ou nunca usados, com os dois trechos de JS que dependiam deles (*faturaCartaoTotalValor* em *cards.js* e o ouvinte de *btnAbrirNovoCiclo* em *main.js*, cópia do *window.trackerMod.abrirNovoCiclo*, que segue em uso com a trava de 2 ciclos).

  - **Mantidos de propósito:** IDs em containers que nenhum código lê (etiquetas sem custo), seletores repetidos que se completam sem conflito e a sobrescrita intencional do placeholder do olho na sidebar.

  - **Pendente (Lote 3, envolve JS):** os modais legados *\#modalWeeklyTracker*, *\#modalPatrimonio* e *\#modalRelatorios* parecem inalcançáveis, porque a sidebar só abre os contextos da Home; *\#modalGerenciarCartoes*, *\#modalOrcamentos* e *\#modalConsultarTerceiros* só são reabertos a partir de botões que ficam dentro deles mesmos. O JS ainda verifica em vários pontos se estão abertos (inclusive o ponto de fragilidade do PDF, item 1 da Lógica de Funcionamento), por isso a remoção exige rastrear as funções polimórficas antes.

**Arquivos Raiz**

- **index.html:** estrutura de telas, modais, containers dos contextos da Home, containers de abas e botões de atalho.

- **style.css:** estilização completa, regras de visibilidade (privacidade), design de "baldes" (inclusive nos IDs da Home), padronização dos botões *.btn-pat-home*, classe *.modal-aberto* com Scroll Offset, ancoragem de topo do *\#modalDetalhesPatrimonio*, *.sticky-month-bar* (com o *.main-content* sem *overflow-y*), linha do tempo e responsividade mobile.

- **js/main.js:** o Orquestrador Central. Gerencia a autenticação, snapshots do Firebase, ouvintes de eventos globais unificados (modal + Home), navegação blindada, alternância de contexto na sidebar e persistência de modais ao salvar.

- **manifest.json / favicon.png:** configurações do PWA.

- **sw.js (🆕 22/11/2026):** porteiro de atualizações (service worker), com estratégia "rede primeiro" para os arquivos do próprio Finan. Ver item 11 da Lógica de Funcionamento.

**Módulos (js/modules/)**

- **1. state.js:** estado global do app. Armazena transações, orçamentos, ciclos, *faturasConferidas*, *trackerActiveTabIndex*, *patrimonioCategorias*, *patrimonioVisaoProjetada* (modo real ou projetado do patrimônio), *modoVisualizacao* (controla os sete contextos da Home), o array *mesesCarregados* (apenas cache de rede do Firestore, não é ponteiro de data) e os **cinco ponteiros temporais**: *currentDate* (âncora da Home), *reportDate*, *currentFaturaDate*, *dividasTerceirosDate* e *currentPatrimonioExtratoDate*.

- **2. constants.js:** tipos fixos (Receita/Despesa/Cartão/Patrimônio), Categorias, Frequências e mapeamento de operações patrimoniais (ex.: OPERACAO_PATRIMONIO.AMORTIZACAO).

- **3. elements.js:** mapeamento rigoroso de todos os IDs do DOM — entre eles *mesAnoCriacaoPatrimonioInput*, correspondente ao *\#mesAnoCriacaoPatrimonio* do modal *\#modalCadastrarPatrimonioSubcategoria*, gerenciado pelas rotinas *resetFormSubcategoria* e *preencherModalEdicaoSubcategoria* e gravado por *salvarSubcategoria*, e os elementos do encerramento temporal (*\#modalConfirmarExclusaoPatrimonio*, *\#dataCorteExclusaoPatrimonio* e *\#btnConfirmarSoftDeletePatrimonio*).

- **4. utils.js:** funções de formatação, cálculos de data, parse de strings e registro de *lastModified*.

- **5. ui.js:** motor de renderização e **orquestrador dos contextos** (função *renderizarTransacoesDoMes*, que liga e desliga os containers conforme o *modoVisualizacao*). Reúne ainda a lógica de cálculo de saldo (🔓/🔒), tags visuais (Conferida/Paga/Excluído), abertura e fechamento de modais, abas Gerais/Patrimoniais, ordenação master na Home, exibição das faturas que só contêm despesas de terceiros (consultando também *state.dividasTerceiros*) e exibição do resumo financeiro.

- **6. transactions.js:** gerencia o formulário em cascata, motor de séries (inclusive receitas parceladas), travas dos campos de parcelas na edição, atalhos rápidos, formulários pré-preenchidos e travados a partir dos ícones da árvore de patrimônio, **motor de delta do Ajuste de Valor** (converte o saldo final informado em transação de diferença), blindagem de edições futuras no Tracker, blindagem dos seletores contra *onSnapshot* (*popularSeletoresFixos*, *popularSelectTransacaoPatrimonio*, que também filtra as contas patrimoniais encerradas) e exibição de saldo de resgate em tempo real.

- **7. budgets.js:** gerencia orçamentos temporais, propagação futuro, exclusão por nome (Série), pergunta de escopo (mês ou série) antes da edição, o **Ajuste Rápido de Saldo (🎯)** com recálculo mês a mês em consulta única ao Firestore e o refresh imediato da lista na Home após o salvamento.

- **8. weekly-tracker.js** (interface: "Ciclos dos cartões")**:** gerencia a lógica de metas, abas, linha do tempo segmentada, transbordo (Waterfall) e motor de recuperabilidade. A função *renderizarTracker* é polimórfica (modal ou contexto da Home).

- **9. cards.js:** gestão de faturas, auditoria de compras, status de conferência (gravando *faturaPaga* nas transações do usuário e nas dívidas de terceiros do mesmo cartão e mês), **Soft Delete de cartões** (*prepararSoftDeleteCartao* e *executarSoftDeleteCartao*, campo *dataExclusao*, com exclusão permanente das compras do usuário a partir do mês de corte — rotina distinta da do patrimônio, ver item 5) e refresh imediato da lista na Home após o salvamento.

- **10. third-party.js** (interface: "Despesas de terceiros"; coleção *dividasTerceiros*)**:** gestão das despesas reembolsáveis, pessoas, interface em acordeão, reembolsos em lote e exibição da categoria (Ordinária ou cartão) em cada despesa da lista (*renderizarDividasDoMes* também polimórfica).

- **11. auth.js:** fluxos de login, cadastro, verificação de e-mail e exibição de "Última Atualização".

- **12. search.js:** motor de busca híbrido (Local + Firestore) e Busca Profunda.

- **13. reports.js:** abriga o **motor de cálculo centralizado** *obterDadosFinanceirosAgrupados(date)* e sua auxiliar *obterNaturezaTransacao(t)* — fonte única dos números do resumo da sidebar, do contexto de Relatórios e do PDF —, além do processamento do relatório visual, da identificação das parcelas que encerram no mês e da interatividade drill-down.

- **14. export.js:** construção estética do PDF (design em containers) com ordenação analítica hierárquica, posição patrimonial histórica e legendas gerenciais, consumindo os dados do motor centralizado de fluxo e importando *obterSaldoItemAteMes* para todo cálculo de estoque.

- **15. firebase-config.js:** inicialização e configuração do acesso ao banco de dados.

- **16. patrimony.js:** árvore hierárquica (Categorias e Itens) renderizada pela função *renderizarListaPatrimonioHierarquica*, com layout responsivo de duas/três linhas, ocultação de contas não nascidas, botões de operação direta (⊕ ⊖ ≈ ↓), extrato temporizado do item (*abrirHistoricoPatrimonio*, com exclusão de ajustes), apuração da TCP e dos índices de destinação, o encerramento temporal de contas (*prepararSoftDeleteSubcategoria* e *executarSoftDeleteSubcategoria*) e, sobretudo, a função *obterSaldoItemAteMes* — motor único do saldo de estoque, com corte pelo *mesAnoCriacao*.

- **17. backup.js (🆕 22/11/2026):** backup local em .json. A função *baixarBackupJson* lê diretamente do Firestore o documento do usuário e as 12 subcoleções listadas em *COLECOES_BACKUP*, gera o arquivo para download e grava *ultimoBackup*; a função *exibirLembreteBackup* exibe a frase do lembrete de 30 dias na sidebar. Ver item 10 da Lógica de Funcionamento.

**🚨 REGRAS DE OURO (ESTRITAMENTE OBRIGATÓRIAS)**

O usuário não é programador, mas possui alta noção de lógica. A IA deve seguir rigorosamente estes pilares:

1.  **EDITOR MECÂNICO:** a IA está PROIBIDA de limpar, otimizar ou refatorar o código por conta própria. Muitas linhas que parecem redundantes são correções de bugs de assincronismo ou proteções do Firebase. A IA deve agir exclusivamente como um organizador de blocos de texto.

2.  **ANÁLISE DE IMPACTO GLOBAL:** antes de alterar qualquer função, a IA deve mapear quais outros módulos chamam ou podem chamar aquele trecho. Uma correção nunca deve quebrar uma funcionalidade estável (como a reatividade, os cadeados, a captura do Tracker ou, mais recentemente, a Amortização, o Resgate, o Saldo Real de Patrimônio, o motor de cálculo centralizado, a Máquina do Tempo, a navegação temporal e a alternância de contextos da sidebar).

3.  **PROTOCOLO DE EDIÇÃO SEM ATALHOS:** é terminantemente proibido o uso de comentários como "// resto do código continua igual". O bloco enviado deve ser sempre integral, no formato: LOCALIZAR (trecho integral do código antigo) / SUBSTITUIR POR (trecho integral do código novo); se a orientação for para alterar uma função completa, a IA pode informar o nome da função e o novo trecho integral da função.

4.  **PEDIDO DE ARQUIVOS:** a IA nunca deve tentar adivinhar o conteúdo de arquivos. Sempre que o usuário pedir uma alteração **ou um diagnóstico**, a IA deve pedir os arquivos .js, .css ou .html necessários para a análise.

5.  **NÃO PRESUMIR NOMES:** a IA não deve assumir nomes de variáveis ou IDs. Deve sempre ler o código enviado pelo usuário para identificar como os elementos foram batizados (ex.: *state.currentDate*, *checkFaturaConferida*, *modoVisualizacao*). Atenção: nomes citados nesta documentação podem ser campos do Firestore ou variáveis locais, e não propriedades do *state* — confirmar no código antes de usar.

6.  **ÂNCORA TEMPORAL (SOBERANIA TEMPORAL):** o mês de referência da Home — mantido em *state.currentDate* e projetado como *mesAnoReferencia* ("YYYY-MM") por *getMesAnoChave* — é a verdade absoluta sobre qualquer data civil de transação, inclusive para lançamentos de Patrimônio.

7.  **PROTOCOLO DE TRANSPARÊNCIA — SEÇÃO ANALÍTICA OBRIGATÓRIA:** ao final de cada bloco de código enviado para substituição, a IA deve obrigatoriamente incluir uma seção intitulada **"O que mudou"**, **"O que foi corrigido"** ou similar.

    - **Conteúdo:** esta seção deve listar de forma analítica e pontual todas as alterações realizadas.

    - **Objetivo:** garantir que o usuário compreenda o impacto da mudança e, principalmente, servir como declaração de que a IA não realizou "limpezas" ou "otimizações" colaterais, preservando a integridade das mais de mil linhas de lógica acumulada no projeto.

    - **Rigor:** se o log de alterações não condisser exatamente com as linhas alteradas, a IA terá violado o papel de Editor Mecânico.

8.  **MOTOR UNIFICADO:** qualquer alteração em fórmulas de cálculo de saldo do **fluxo mensal** deve ser feita **exclusivamente** na função *obterDadosFinanceirosAgrupados*, em **reports.js**. É proibido recalcular saldos localmente em *ui.js*, *export.js* ou em qualquer novo componente — foi essa dispersão que gerava divergência entre a sidebar, os Relatórios e o PDF. O cálculo do **estoque patrimonial**, por sua vez, é competência exclusiva de *obterSaldoItemAteMes*, em **patrimony.js**.
