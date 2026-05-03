import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import {
  formatCurrency,
  getMesAnoChave,
  parseDateString,
  calcularTotalAjustes,
  isOrcamentoFechado,
  registrarUltimaAlteracao,
} from "./utils.js";

export function updateMonthDisplay(callbackRender) {
  if (!elements.currentMonthDisplay) return;
  const monthName = state.currentDate.toLocaleString("pt-BR", {
    month: "long",
  });
  const year = state.currentDate.getFullYear();
  elements.currentMonthDisplay.textContent = `${
    monthName.charAt(0).toUpperCase() + monthName.slice(1)
  }/${year}`;

  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() + 24);
  elements.nextMonthBtn.disabled =
    getMesAnoChave(state.currentDate) >= getMesAnoChave(limitDate);

  if (elements.searchInput.value.trim() === "") {
    callbackRender();
  }
}

export function atualizarResumoFinanceiro() {
  if (
    !elements.totalReceitasDisplay ||
    !elements.totalDespesasDisplay ||
    !elements.saldoMesDisplay
  )
    return;
  const mesAnoAtual = getMesAnoChave(state.currentDate);
  const transacoesDoMesReferencia = state.transacoes.filter(
    (t) => t.mesAnoReferencia === mesAnoAtual,
  );

  let receitasDoMes = 0;
  let despesasDoMes = 0;

  // 1. Soma das Receitas
  receitasDoMes = transacoesDoMesReferencia
    .filter((t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA)
    .reduce((total, t) => total + t.valor, 0);

  // 2. Despesas Ordinárias (Débito/Pix direto da conta)
  // Como as ordinárias não usam orçamentos, elas são somadas integralmente
  const despesasOrdinarias = transacoesDoMesReferencia.filter(
    (t) =>
      t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA &&
      t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA,
  );
  despesasDoMes += despesasOrdinarias.reduce((total, t) => total + t.valor, 0);

  // 3. Lógica de Orçamentos (Previsão vs Real)
  state.orcamentos.forEach((orcamento) => {
    // Busca gastos vinculados diretamente a este ID
    let gastosNesteOrcamento = transacoesDoMesReferencia
      .filter((t) => t.orcamentoId === orcamento.id)
      .reduce((total, t) => total + t.valor, 0);

    // LÓGICA NOVA: Se for o orçamento fixo, captura também todos os cartões sem orcamentoId
    if (orcamento.isFixed) {
      const gastosCartaoNaoCategorizados = transacoesDoMesReferencia
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            !t.orcamentoId,
        )
        .reduce((total, t) => total + t.valor, 0);
      gastosNesteOrcamento += gastosCartaoNaoCategorizados;
    }

    if (isOrcamentoFechado(orcamento.id, mesAnoAtual)) {
      // Se estiver fechado (cadeado), usa o valor real gasto
      despesasDoMes += gastosNesteOrcamento;
    } else {
      // Se aberto, usa o que for maior: a previsão (teto) ou o gasto real
      despesasDoMes += Math.max(orcamento.valor, gastosNesteOrcamento);
    }
  });

  // 4. Abate os ajustes de fatura (Cashbacks/Estornos)
  const totalAjustesDoMes = state.ajustesFatura
    .filter((a) => a.mesAnoReferencia === mesAnoAtual)
    .reduce((total, a) => total + a.valor, 0);
  despesasDoMes -= totalAjustesDoMes;

  const saldoDoMes = receitasDoMes - despesasDoMes;
  elements.totalReceitasDisplay.textContent = formatCurrency(receitasDoMes);
  elements.totalDespesasDisplay.textContent = formatCurrency(despesasDoMes);
  elements.saldoMesDisplay.textContent = formatCurrency(saldoDoMes);

  if (!state.areValuesHidden) {
    elements.saldoMesDisplay.style.color =
      saldoDoMes > 0 ? "#27ae60" : saldoDoMes < 0 ? "#e74c3c" : "#3498db";
  } else {
    elements.saldoMesDisplay.style.color = "";
  }
}

export function abrirModalEspecifico(
  modalElement,
  idParaEditar = null,
  tipoModal = "transacao",
  callbacks = {},
) {
  if (!modalElement) return;

  // Gerenciamento de z-index para empilhamento
  modalElement.style.zIndex = 1000 + state.openModals.length * 10;
  if (!state.openModals.includes(modalElement)) {
    state.openModals.push(modalElement);
  }

  if (tipoModal === "transacao") {
    state.isEditMode = !!idParaEditar;
    state.editingTransactionId = idParaEditar;
    // SÓ CHAMA O RESET SE ELE EXISTIR (Evita o erro de fechar o modal)
    if (callbacks.resetModalNovaTransacao) callbacks.resetModalNovaTransacao();
    if (state.isEditMode && callbacks.preencherModalParaEdicao) {
      callbacks.preencherModalParaEdicao(state.editingTransactionId);
    }
  } else if (tipoModal === "cartaoCadastroEdicao") {
    state.isCartaoEditMode = !!idParaEditar;
    if (callbacks.resetModalCartao) callbacks.resetModalCartao();
    if (state.isCartaoEditMode && callbacks.preencherModalEdicaoCartao) {
      elements.cartaoEditIdInput.value = idParaEditar;
      callbacks.preencherModalEdicaoCartao(idParaEditar);
    }
  } else if (tipoModal === "gerenciarCartoes") {
    if (callbacks.renderizarListaCartoesCadastrados)
      callbacks.renderizarListaCartoesCadastrados();
    // ... (dentro da função abrirModalEspecifico)
  } else if (tipoModal === "orcamentos") {
    // ADICIONADO: Limpa o formulário para garantir que abra em modo de "Novo"
    if (callbacks.resetFormOrcamento) callbacks.resetFormOrcamento();
    if (callbacks.renderizarListaOrcamentos)
      callbacks.renderizarListaOrcamentos();
  } else if (tipoModal === "relatorios") {
    state.reportDate = new Date(state.currentDate);
    if (callbacks.popularModalRelatorio)
      callbacks.popularModalRelatorio(state.reportDate);
  } else if (tipoModal === "gerenciarPessoas") {
    // NOVO CASO ADICIONADO
    if (callbacks.renderizarListaPessoas) callbacks.renderizarListaPessoas();
  }

  modalElement.style.display = "flex";
  elements.bodyEl.classList.add("modal-aberto");
}

export function fecharModalEspecifico(modalElement) {
  if (!modalElement) return;
  modalElement.style.display = "none";
  state.openModals = state.openModals.filter((m) => m !== modalElement);
  if (state.openModals.length === 0) {
    elements.bodyEl.classList.remove("modal-aberto");
  }

  switch (modalElement.id) {
    case "modalNovaTransacao":
      state.isQuickAddMode = false;
      state.isModoTerceiros = false;
      state.isEditMode = false;
      state.editingTransactionId = null;
      state.editingSerieId = null;
      if (elements.tipoTransacaoSelect)
        elements.tipoTransacaoSelect.disabled = false;
      break;
    case "modalCadastrarCartao":
      state.isCartaoEditMode = false;
      if (elements.cartaoEditIdInput) elements.cartaoEditIdInput.value = "";
      break;
    case "modalDetalhesFaturaCartao":
      state.currentFaturaDate = null;
      break;
    case "modalOrcamentos":
      if (elements.orcamentoEditIdInput)
        elements.orcamentoEditIdInput.value = "";
      if (elements.nomeOrcamentoInput) elements.nomeOrcamentoInput.value = "";
      if (elements.valorOrcamentoInput) elements.valorOrcamentoInput.value = "";
      if (elements.diaOrcamentoInput) elements.diaOrcamentoInput.value = "";
      if (elements.modalOrcamentoTitulo)
        elements.modalOrcamentoTitulo.textContent = "Gerenciar Orçamentos";
      if (elements.btnSalvarOrcamento)
        elements.btnSalvarOrcamento.textContent = "Salvar";
      break;
  }
}

export function criarElementoReceita(item, actionsDiv) {
  const dataFormatada = item.dataEntrada
    ? new Date(parseDateString(item.dataEntrada)).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "N/D";
  const editButton = document.createElement("button");
  editButton.className = "btn-edit";
  editButton.innerHTML = "✎";
  editButton.title = "Editar"; // REINSERIDO
  editButton.dataset.id = item.id;
  actionsDiv.appendChild(editButton);

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn-delete";
  deleteButton.innerHTML = "✖";
  deleteButton.title = "Excluir"; // REINSERIDO
  deleteButton.dataset.id = item.id;
  actionsDiv.appendChild(deleteButton);

  return `<span class="transaction-name">${item.nome}</span>
                <div class="transaction-value-date-group">
                    <span class="transaction-value">${formatCurrency(
                      item.valor,
                    )}</span>
                    <span class="transaction-date">Entrada: ${dataFormatada}</span>
                </div>`;
}

export function criarElementoDespesa(item, actionsDiv) {
  let categoriaDisplay = `(Ordinária${
    item.frequencia === CONSTS.FREQUENCIA.PARCELADA && item.totalParcelas
      ? ` - ${item.parcelaAtual || "?"}/${item.totalParcelas}`
      : ""
  })`;
  let nomeDisplay = item.nome;
  if (item.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
    nomeDisplay = item.nome.replace(/\s\(\d+\/\d+\)$/, "");
  }
  const dataFormatada = item.dataVencimento
    ? new Date(parseDateString(item.dataVencimento)).toLocaleDateString(
        "pt-BR",
        { day: "2-digit", month: "2-digit", year: "numeric" },
      )
    : "N/D";

  const editButton = document.createElement("button");
  editButton.className = "btn-edit";
  editButton.innerHTML = "✎";
  editButton.title = "Editar"; // REINSERIDO
  editButton.dataset.id = item.id;
  actionsDiv.appendChild(editButton);

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn-delete";
  deleteButton.innerHTML = "✖";
  deleteButton.title = "Excluir"; // REINSERIDO
  deleteButton.dataset.id = item.id;
  actionsDiv.appendChild(deleteButton);

  return `<label class="transaction-main-info" for="despesa-${item.id}">
                    <input type="checkbox" id="despesa-${
                      item.id
                    }" data-transaction-id="${item.id}" ${
                      item.paga ? "checked" : ""
                    }>
                    <div class="transaction-name-category">
                        <span class="transaction-name">${nomeDisplay}</span>
                        <span class="transaction-category">${categoriaDisplay}</span>
                    </div>
                </label>
                <div class="transaction-value-date">
                    <span class="transaction-value">- ${formatCurrency(
                      item.valor,
                    )}</span>
                    <span class="transaction-date">Venc: ${dataFormatada}</span>
                    ${item.paga ? '<span class="status-paga">Paga</span>' : ""}
                </div>`;
}

export function criarElementoFatura(item, actionsDiv) {
  const dataFormatada = item.dataVencimentoDisplay
    ? new Date(parseDateString(item.dataVencimentoDisplay)).toLocaleDateString(
        "pt-BR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        },
      )
    : "N/D";

  // Se o cartão foi excluído, mostramos um selo e não permitimos ajustar o vencimento
  const seloExcluido = item.isDeletado
    ? '<span class="status-excluido" style="background: #95a5a6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-left: 5px;">Excluído</span>'
    : "";

  const btnAjusteHTML = item.isDeletado
    ? ""
    : `<button class="btn-vencimento-adjust ${item.vencimentoNoMesSeguinte ? "ativo" : ""}" data-cartao-id="${item.cartaoId}" title="Ajustar mês de vencimento">🗓️</button>`;

  const viewButton = document.createElement("button");
  viewButton.className = "btn-view-fatura";
  viewButton.innerHTML = "🔍";
  viewButton.title = "Ver Detalhes da Fatura";
  viewButton.dataset.cartaoId = item.cartaoId;
  viewButton.dataset.mesAnoFatura = item.mesAnoReferencia;
  actionsDiv.appendChild(viewButton);

  return `<label class="transaction-main-info" for="fatura-check-${item.cartaoId}">
                    <input type="checkbox" id="fatura-check-${item.cartaoId}" class="fatura-checkbox" data-cartao-id="${item.cartaoId}" data-mes-ano-fatura="${item.mesAnoReferencia}" ${item.paga ? "checked" : ""}>
                    <div class="transaction-name-category">
                        <span class="transaction-name">${item.nome}${seloExcluido}</span>
                        <span class="transaction-category">(Fatura do Cartão)</span>
                    </div>
                </label>
                <div class="transaction-value-date">
                    <span class="transaction-value">- ${formatCurrency(item.valor)}</span>
                    <div class="fatura-date-container">
                        <span class="transaction-date">Venc: ${dataFormatada}</span>
                        ${btnAjusteHTML}
                    </div>
                    ${item.paga ? '<span class="status-paga">Paga</span>' : ""}
                </div>`;
}

export function criarElementoOrcamento(item, actionsDiv) {
  const mesAnoAtual = getMesAnoChave(state.currentDate);
  const fechado = isOrcamentoFechado(item.orcamentoId, mesAnoAtual);

  const actionButton = document.createElement("button");
  if (fechado) {
    actionButton.className = "btn-abrir-orcamento";
    actionButton.innerHTML = "🔒";
    actionButton.title = "Reabrir orçamento do mês"; // REINSERIDO
  } else {
    actionButton.className = "btn-fechar-orcamento";
    actionButton.innerHTML = "🔓";
    actionButton.title = "Fechar orçamento do mês"; // REINSERIDO
  }
  actionButton.dataset.orcamentoId = item.orcamentoId;
  actionButton.dataset.mesAno = mesAnoAtual;
  actionsDiv.appendChild(actionButton);

  return `<div class="transaction-main-info">
                    <div class="transaction-name-category">
                        <span class="transaction-name">${item.nome}</span>
                        <span class="transaction-category">(Orçamento)</span>
                    </div>
                </div>
                <div class="transaction-value-date">
                    <span class="transaction-value">- ${formatCurrency(
                      item.valorTotalOrcamento,
                    )}</span>
                    <span class="orcamento-restante ${item.valor < 0 ? "negativo" : ""}">Restante: ${formatCurrency(
                      item.valor,
                    )}</span>
                </div>`;
}

export function renderizarTransacoesDoMes() {
  if (!elements.listaTransacoesUl) return;
  elements.listaTransacoesUl.innerHTML = "";
  const mesAnoAtual = getMesAnoChave(state.currentDate);

  let primeiroMesAnoComDados = null;
  if (state.transacoes.length > 0) {
    primeiroMesAnoComDados = state.transacoes.reduce(
      (min, t) => (t.mesAnoReferencia < min ? t.mesAnoReferencia : min),
      state.transacoes[0].mesAnoReferencia,
    );
  }

  if (primeiroMesAnoComDados && mesAnoAtual < primeiroMesAnoComDados) {
    atualizarResumoFinanceiro();
    const liEmpty = document.createElement("li");
    liEmpty.textContent = "Sem dados para este período.";
    liEmpty.style.textAlign = "center";
    liEmpty.style.padding = "20px";
    liEmpty.style.color = "#777";
    elements.listaTransacoesUl.appendChild(liEmpty);
    return;
  }

  const transacoesDoMesVisivel = state.transacoes.filter(
    (t) => t.mesAnoReferencia === mesAnoAtual,
  );
  let itensParaRenderizar = [];

  const receitasDoMes = transacoesDoMesVisivel.filter(
    (t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA,
  );
  receitasDoMes.forEach((r) =>
    itensParaRenderizar.push({
      ...r,
      tipoDisplay: CONSTS.TIPO_RENDERIZACAO.RECEITA,
      dataOrdenacao: parseDateString(r.dataEntrada),
    }),
  );

  const despesasOrdinariasDoMes = transacoesDoMesVisivel.filter(
    (t) =>
      t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA &&
      t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA,
  );
  despesasOrdinariasDoMes.forEach((d) =>
    itensParaRenderizar.push({
      ...d,
      tipoDisplay: CONSTS.TIPO_RENDERIZACAO.DESPESA,
      dataOrdenacao: parseDateString(d.dataVencimento),
    }),
  );

  const despesasCartaoDoMes = transacoesDoMesVisivel.filter(
    (t) =>
      t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA &&
      t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO,
  );
  const faturasAgrupadas = {};
  despesasCartaoDoMes.forEach((dc) => {
    if (!dc.cartaoId) return;
    if (!faturasAgrupadas[dc.cartaoId]) {
      const cartaoInfo = state.cartoes.find((c) => c.id === dc.cartaoId) || {};

      // LÓGICA ATUALIZADA: Identifica se o cartão está na lista de deletados
      const isDeletado = cartaoInfo.deletado === true;

      faturasAgrupadas[dc.cartaoId] = {
        cartaoId: dc.cartaoId,
        cartaoNome: cartaoInfo.nome || "Cartão Desconhecido",
        diaVencimentoFatura: cartaoInfo.diaVencimentoFatura || 1,
        vencimentoNoMesSeguinte: cartaoInfo.vencimentoNoMesSeguinte || false,
        totalValor: 0,
        todasPagas: true,
        isDeletado: isDeletado, // Passa a informação para o elemento visual
      };
    }
    faturasAgrupadas[dc.cartaoId].totalValor += dc.valor;
    if (!dc.paga) faturasAgrupadas[dc.cartaoId].todasPagas = false;
  });

  Object.values(faturasAgrupadas).forEach((fatura) => {
    const [ano, mes] = mesAnoAtual.split("-").map(Number);
    const ajusteDeMes = fatura.vencimentoNoMesSeguinte ? 1 : 0;
    const dataVencimentoFatura = new Date(
      ano,
      mes - 1 + ajusteDeMes,
      fatura.diaVencimentoFatura,
    );
    const totalAjustes = calcularTotalAjustes(fatura.cartaoId, mesAnoAtual);
    const valorFinalFatura = fatura.totalValor - totalAjustes;

    itensParaRenderizar.push({
      id: fatura.cartaoId,
      tipoDisplay: CONSTS.TIPO_RENDERIZACAO.FATURA,
      cartaoId: fatura.cartaoId,
      nome: `Fatura ${fatura.cartaoNome}`,
      valor: valorFinalFatura,
      dataOrdenacao: dataVencimentoFatura,
      dataVencimentoDisplay: dataVencimentoFatura.toISOString().split("T")[0],
      paga: fatura.todasPagas,
      mesAnoReferencia: mesAnoAtual,
      vencimentoNoMesSeguinte: fatura.vencimentoNoMesSeguinte,
      isDeletado: fatura.isDeletado, // Registra no item da lista
    });
  });

  state.orcamentos.forEach((orcamento) => {
    const [ano, mes] = mesAnoAtual.split("-").map(Number);
    const dataOrcamento = new Date(ano, mes - 1, orcamento.dia);

    // Soma gastos vinculados ao ID
    let gastosNoOrcamento = transacoesDoMesVisivel
      .filter((t) => t.orcamentoId === orcamento.id)
      .reduce((total, t) => total + t.valor, 0);

    // LÓGICA NOVA: Se for o orçamento fixo, exibe o "Restante" considerando os cartões sem categoria
    if (orcamento.isFixed) {
      const gastosCartaoSemVinculo = transacoesDoMesVisivel
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            !t.orcamentoId,
        )
        .reduce((total, t) => total + t.valor, 0);
      gastosNoOrcamento += gastosCartaoSemVinculo;
    }

    const valorRestante = orcamento.valor - gastosNoOrcamento;
    itensParaRenderizar.push({
      id: `orcamento-${orcamento.id}`,
      orcamentoId: orcamento.id,
      tipoDisplay: CONSTS.TIPO_RENDERIZACAO.ORCAMENTO,
      nome: orcamento.nome,
      valor: valorRestante,
      valorTotalOrcamento: orcamento.valor,
      dataOrdenacao: dataOrcamento,
    });
  });

  const tipoPrioridade = {
    [CONSTS.TIPO_RENDERIZACAO.RECEITA]: 1,
    [CONSTS.TIPO_RENDERIZACAO.ORCAMENTO]: 2,
    [CONSTS.TIPO_RENDERIZACAO.DESPESA]: 3,
    [CONSTS.TIPO_RENDERIZACAO.FATURA]: 3,
  };
  itensParaRenderizar.sort((a, b) => {
    const prioridadeA = tipoPrioridade[a.tipoDisplay];
    const prioridadeB = tipoPrioridade[b.tipoDisplay];
    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }
    const dateA =
      a.dataOrdenacao instanceof Date ? a.dataOrdenacao : new Date(0);
    const dateB =
      b.dataOrdenacao instanceof Date ? b.dataOrdenacao : new Date(0);
    const dateComparison = dateA - dateB;
    if (dateComparison !== 0) return dateComparison;
    const valorA = a.valorTotalOrcamento || a.valor || 0;
    const valorB = b.valorTotalOrcamento || b.valor || 0;
    return valorB - valorA;
  });

  atualizarResumoFinanceiro();

  if (itensParaRenderizar.length === 0) {
    const liEmpty = document.createElement("li");
    liEmpty.textContent = "Nenhuma transação para este mês.";
    liEmpty.style.textAlign = "center";
    liEmpty.style.padding = "20px";
    liEmpty.style.color = "#777";
    elements.listaTransacoesUl.appendChild(liEmpty);
    return;
  }

  itensParaRenderizar.forEach((item) => {
    const li = document.createElement("li");
    li.classList.add("transaction-item");
    const transactionDetailsDiv = document.createElement("div");
    transactionDetailsDiv.classList.add("transaction-details");
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("transaction-actions");

    switch (item.tipoDisplay) {
      case CONSTS.TIPO_RENDERIZACAO.RECEITA:
        li.classList.add("receita");
        li.dataset.transactionId = item.id;
        transactionDetailsDiv.innerHTML = criarElementoReceita(
          item,
          actionsDiv,
        );
        break;
      case CONSTS.TIPO_RENDERIZACAO.DESPESA:
        li.classList.add("despesa");
        if (item.paga) li.classList.add("paga");
        li.dataset.transactionId = item.id;
        transactionDetailsDiv.innerHTML = criarElementoDespesa(
          item,
          actionsDiv,
        );
        break;
      case CONSTS.TIPO_RENDERIZACAO.FATURA:
        li.classList.add("despesa", "fatura-cartao");
        if (item.paga) li.classList.add("paga");
        li.dataset.cartaoId = item.cartaoId;
        li.dataset.mesAnoFatura = item.mesAnoReferencia;
        transactionDetailsDiv.innerHTML = criarElementoFatura(item, actionsDiv);
        break;
      case CONSTS.TIPO_RENDERIZACAO.ORCAMENTO:
        li.classList.add("orcamento");
        if (isOrcamentoFechado(item.orcamentoId, mesAnoAtual))
          li.classList.add("fechado");
        li.dataset.orcamentoId = item.id; // REINSERIDO: Linha vital para o clique funcionar
        transactionDetailsDiv.innerHTML = criarElementoOrcamento(
          item,
          actionsDiv,
        );
        break;
    }
    li.appendChild(transactionDetailsDiv);
    li.appendChild(actionsDiv);
    elements.listaTransacoesUl.appendChild(li);
  });
}

export function abrirModalDetalhesSerie(serieId, callbackAbrir) {
  const transacoesDaSerie = state.transacoes
    .filter((t) => t.serieId === serieId)
    .sort((a, b) => a.parcelaAtual - b.parcelaAtual);
  if (transacoesDaSerie.length === 0) return;

  const primeiraTransacao = transacoesDaSerie[0];
  const nomeBase = primeiraTransacao.nome.replace(/\s\(\d+\/\d+\)$/, "");
  elements.modalDetalhesSerieTitulo.textContent = `Detalhes: ${nomeBase}`;

  elements.listaDetalhesSerieUl.innerHTML = "";
  transacoesDaSerie.forEach((t) => {
    const li = document.createElement("li");
    const [ano, mes] = t.mesAnoReferencia.split("-");
    const dataParcela = new Date(ano, mes - 1);
    const nomeMes = dataParcela.toLocaleString("pt-BR", { month: "long" });
    const contextoData = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano}`;
    li.innerHTML = `
                <span class="parcela-nome">${t.nome} <small style="color: #777; margin-left: 5px;">- ${contextoData}</small></span>
                <span class="parcela-valor">${formatCurrency(t.valor)}</span>
            `;
    elements.listaDetalhesSerieUl.appendChild(li);
  });
  callbackAbrir(elements.modalDetalhesSerie);
}

export function renderizarEstadoVisibilidade() {
  if (state.areValuesHidden) {
    elements.bodyEl.classList.add("values-hidden");
    if (elements.btnToggleVisibility) {
      elements.btnToggleVisibility.style.opacity = "0.5";
    }
  } else {
    elements.bodyEl.classList.remove("values-hidden");
    if (elements.btnToggleVisibility) {
      elements.btnToggleVisibility.style.opacity = "1";
    }
  }
}

export function inicializarVisibilidade() {
  const preferenciaSalva = localStorage.getItem("finanValuesHidden");
  state.areValuesHidden = preferenciaSalva === "true";
  renderizarEstadoVisibilidade();
}

export function abrirModalConfirmarAcaoSerie(
  itemId,
  acao,
  context,
  callbackAbrir,
) {
  let item;
  if (context === "dividaTerceiro") {
    item = state.dividasTerceiros.find((d) => d.id === itemId);
  } else {
    item = state.transacoes.find((t) => t.id === itemId);
  }
  if (!item) return;

  elements.modalConfirmarAcaoSerie.dataset.itemId = itemId;
  elements.modalConfirmarAcaoSerie.dataset.serieId = item.serieId;
  elements.modalConfirmarAcaoSerie.dataset.acao = acao;
  elements.modalConfirmarAcaoSerie.dataset.context = context;

  if (acao === CONSTS.ACAO_SERIE.EXCLUIR) {
    elements.modalConfirmarAcaoSerieTitulo.textContent = `Excluir Item em Série`;
    elements.modalConfirmarAcaoSerieTexto.textContent = `Deseja excluir apenas este item ou toda a série?`;
  } else {
    elements.modalConfirmarAcaoSerieTitulo.textContent = "Editar em Série";
    elements.modalConfirmarAcaoSerieTexto.textContent = `Deseja editar apenas este item ou toda a série?`;
  }
  callbackAbrir(elements.modalConfirmarAcaoSerie, null, "confirmarAcao");
}

export async function handleTransactionListClick(event, callbacks = {}) {
  const target = event.target;
  const button = target.closest("button");
  const listItem = target.closest("li.transaction-item");

  if (!listItem) return;

  if (
    button &&
    (button.classList.contains("btn-fechar-orcamento") ||
      button.classList.contains("btn-abrir-orcamento"))
  ) {
    await callbacks.handleFecharAbrirOrcamento(button);
    return;
  }

  if (target.type === "checkbox") {
    event.stopPropagation();
    const marcarComoPaga = target.checked;
    const isFaturaCheckbox = target.classList.contains("fatura-checkbox");
    if (isFaturaCheckbox) {
      const cartaoId = target.dataset.cartaoId;
      const mesAnoFatura = target.dataset.mesAnoFatura;
      await callbacks.atualizarStatusPagoFatura(
        cartaoId,
        mesAnoFatura,
        marcarComoPaga,
      );
    } else {
      const transacaoId = target.dataset.transactionId;
      if (transacaoId)
        await callbacks.atualizarStatusPago(transacaoId, marcarComoPaga);
    }
    return;
  }

  if (!button) {
    if (listItem.classList.contains("orcamento")) {
      const orcamentoId = listItem.dataset.orcamentoId.replace(
        "orcamento-",
        "",
      );
      callbacks.abrirModalDetalhesOrcamento(
        orcamentoId,
        getMesAnoChave(state.currentDate),
      );
    }
    return;
  }

  if (button.classList.contains("btn-view-fatura")) {
    event.stopPropagation();
    const cartaoId = button.dataset.cartaoId;
    const mesAno = button.dataset.mesAnoFatura;
    callbacks.abrirModalDetalhesFatura(cartaoId, mesAno);
    return;
  }

  const transacaoId = button.dataset.id;
  if (!transacaoId) return;
  const transacao = state.transacoes.find((t) => t.id === transacaoId);
  if (!transacao) return;

  if (button.classList.contains("btn-delete")) {
    if (transacao.serieId) {
      abrirModalConfirmarAcaoSerie(
        transacaoId,
        CONSTS.ACAO_SERIE.EXCLUIR,
        "transacao",
        callbacks.abrirModal,
      );
    } else if (window.confirm(`Excluir "${transacao.nome}"?`)) {
      await callbacks.excluirTransacaoUnica(transacaoId);
    }
  } else if (button.classList.contains("btn-edit")) {
    if (transacao.serieId) {
      abrirModalConfirmarAcaoSerie(
        transacaoId,
        CONSTS.ACAO_SERIE.EDITAR,
        "transacao",
        callbacks.abrirModal,
      );
    } else {
      // CORRIGIDO: Passando os callbacks de reset e preenchimento para o abrirModal
      callbacks.abrirModal(
        elements.modalNovaTransacao,
        transacaoId,
        "transacao",
        callbacks,
      );
    }
  }
}
