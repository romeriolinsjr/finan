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
  if (!elements.monthPicker) return;

  const ano = state.currentDate.getFullYear();
  const mes = String(state.currentDate.getMonth() + 1).padStart(2, "0");
  elements.monthPicker.value = `${ano}-${mes}`;

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
  const transacoesDoMes = state.transacoes.filter(
    (t) => t.mesAnoReferencia === mesAnoAtual,
  );
  const orcamentosDoMes = state.orcamentos.filter(
    (o) => o.mesAnoReferencia === mesAnoAtual,
  );

  // 1. Receitas de Renda (Salário, etc)
  const receitasTotais = transacoesDoMes
    .filter((t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA)
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  // 2. Movimentações de Patrimônio (Aportes vs Resgates)
  const aportesDoMes = transacoesDoMes
    .filter(
      (t) =>
        t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO && t.operacao === "aporte",
    )
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const resgatesDoMes = transacoesDoMes
    .filter(
      (t) =>
        t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO && t.operacao === "resgate",
    )
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const amortizacoesDoMes = transacoesDoMes
    .filter(
      (t) =>
        t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO &&
        t.operacao === "amortizacao",
    )
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  // 3. Lógica de Despesas e Orçamentos
  const activeBudgetIds = orcamentosDoMes.map((o) => o.id);
  let despesasProjetadasTotais = 0;

  orcamentosDoMes.forEach((orc) => {
    const orcValorPlan = Number(orc.valor) || 0;
    let gastoRealNoOrc = transacoesDoMes
      .filter((t) => t.orcamentoId === orc.id)
      .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

    if (orc.isFixed) {
      gastoRealNoOrc += transacoesDoMes
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            (!t.orcamentoId || !activeBudgetIds.includes(t.orcamentoId)),
        )
        .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
    }
    if (orc.isFixedOrdinary) {
      gastoRealNoOrc += transacoesDoMes
        .filter((t) => t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA)
        .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
    }

    if (isOrcamentoFechado(orc.id, mesAnoAtual)) {
      despesasProjetadasTotais += gastoRealNoOrc;
    } else {
      despesasProjetadasTotais += Math.max(orcValorPlan, gastoRealNoOrc);
    }
  });

  const totalAjustes = state.ajustesFatura
    .filter((a) => a.mesAnoReferencia === mesAnoAtual)
    .reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
  despesasProjetadasTotais -= totalAjustes;

  // LÓGICA FINAL: Saldo = (Receitas + Resgates) - (Despesas + Aportes + Amortizações)
  const saldoFinal =
    receitasTotais +
    resgatesDoMes -
    (despesasProjetadasTotais + aportesDoMes + amortizacoesDoMes);

  // --- ATUALIZAÇÃO VISUAL ---
  elements.totalReceitasDisplay.textContent = formatCurrency(receitasTotais);

  // Linha condicional de Resgates na Sidebar
  let containerResgate = document.getElementById("linhaResumoResgates");
  if (resgatesDoMes > 0) {
    if (!containerResgate) {
      containerResgate = document.createElement("div");
      containerResgate.id = "linhaResumoResgates";
      containerResgate.className = "summary-item";
      containerResgate.style.color = "#9b59b6";
      containerResgate.innerHTML = `<span>Resgates do mês:</span> <span id="totalResgates">${formatCurrency(resgatesDoMes)}</span>`;
      elements.totalReceitasDisplay.parentElement.insertAdjacentElement(
        "afterend",
        containerResgate,
      );
    } else {
      containerResgate.style.display = "flex";
      const elTotal = document.getElementById("totalResgates");
      if (elTotal) elTotal.textContent = formatCurrency(resgatesDoMes);
    }
  } else if (containerResgate) {
    containerResgate.style.display = "none";
  }

  elements.totalDespesasDisplay.textContent = formatCurrency(
    despesasProjetadasTotais,
  );

  // --- NOVO: Linha condicional de Aportes na Sidebar ---
  let containerAporte = document.getElementById("linhaResumoAportes");
  if (aportesDoMes > 0) {
    if (!containerAporte) {
      containerAporte = document.createElement("div");
      containerAporte.id = "linhaResumoAportes";
      containerAporte.className = "summary-item";
      containerAporte.style.color = "#3498db";
      containerAporte.innerHTML = `<span>Aportes do mês:</span> <span id="totalAportes">${formatCurrency(aportesDoMes)}</span>`;
      // Insere logo abaixo das despesas
      elements.totalDespesasDisplay.parentElement.insertAdjacentElement(
        "afterend",
        containerAporte,
      );
    } else {
      containerAporte.style.display = "flex";
      const elTotal = document.getElementById("totalAportes");
      if (elTotal) elTotal.textContent = formatCurrency(aportesDoMes);
    }
  } else if (containerAporte) {
    containerAporte.style.display = "none";
  }

  // --- NOVO: Linha condicional de Amortizações na Sidebar ---
  let containerAmortizacao = document.getElementById("linhaResumoAmortizacoes");
  if (amortizacoesDoMes > 0) {
    if (!containerAmortizacao) {
      containerAmortizacao = document.createElement("div");
      containerAmortizacao.id = "linhaResumoAmortizacoes";
      containerAmortizacao.className = "summary-item";
      containerAmortizacao.style.color = "#008080"; // Azul Petróleo / Teal para Amortização
      containerAmortizacao.innerHTML = `<span>Amortizações:</span> <span id="totalAmortizacoes">${formatCurrency(amortizacoesDoMes)}</span>`;
      // Insere logo abaixo dos aportes (ou despesas se não houver aportes)
      const elReferencia =
        document.getElementById("linhaResumoAportes") ||
        elements.totalDespesasDisplay.parentElement;
      elReferencia.insertAdjacentElement("afterend", containerAmortizacao);
    } else {
      containerAmortizacao.style.display = "flex";
      const elTotal = document.getElementById("totalAmortizacoes");
      if (elTotal) elTotal.textContent = formatCurrency(amortizacoesDoMes);
    }
  } else if (containerAmortizacao) {
    containerAmortizacao.style.display = "none";
  }

  elements.saldoMesDisplay.textContent = formatCurrency(saldoFinal);

  if (!state.areValuesHidden) {
    elements.saldoMesDisplay.style.color =
      saldoFinal > 0 ? "#27ae60" : saldoFinal < 0 ? "#e74c3c" : "#3498db";
  } else {
    elements.saldoMesDisplay.style.color = "";
  }

  if (elements.btnFecharTodosOrcamentos) {
    const algumAberto = orcamentosDoMes.some(
      (orc) => !isOrcamentoFechado(orc.id, mesAnoAtual),
    );
    elements.btnFecharTodosOrcamentos.innerHTML = algumAberto
      ? "🔓 Fechar todos os orçamentos"
      : "🔒 Abrir todos os orçamentos";
  }
}

export function abrirModalEspecifico(
  modalElement,
  idParaEditar = null,
  tipoModal = "transacao",
  callbacks = {},
) {
  if (!modalElement) return;

  // 1. Controle de Pilha (Z-Index)
  modalElement.style.zIndex = 1000 + state.openModals.length * 10;
  if (!state.openModals.includes(modalElement)) {
    state.openModals.push(modalElement);
  }

  // 2. Execução da Lógica por Tipo
  try {
    if (tipoModal === "transacao") {
      state.isEditMode = !!idParaEditar;
      state.editingTransactionId = idParaEditar;
      if (callbacks.resetModalNovaTransacao)
        callbacks.resetModalNovaTransacao();
      if (state.isEditMode && callbacks.preencherModalParaEdicao) {
        callbacks.preencherModalParaEdicao(state.editingTransactionId);
      }
    } else if (tipoModal === "patrimonio") {
      if (callbacks.renderizarLista) callbacks.renderizarLista();
    } else if (tipoModal === "patrimonioForm") {
      if (idParaEditar) {
        if (callbacks.preencherModal) callbacks.preencherModal(idParaEditar);
      } else {
        if (callbacks.resetForm) callbacks.resetForm();
      }
    } else if (tipoModal === "patrimonioHistorico") {
      // Novo caso para o Extrato do Ativo - Passa o idParaEditar para o renderizador
      if (callbacks.popularHistorico) callbacks.popularHistorico(idParaEditar);
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
    } else if (tipoModal === "orcamentos") {
      if (callbacks.renderizarListaOrcamentos)
        callbacks.renderizarListaOrcamentos();
    } else if (tipoModal === "orcamentoCadastroEdicao") {
      state.isOrcamentoEditMode = !!idParaEditar;
      if (callbacks.resetFormOrcamento) callbacks.resetFormOrcamento();
      if (
        state.isOrcamentoEditMode &&
        callbacks.preencherModalEdicaoOrcamento
      ) {
        elements.orcamentoEditIdInput.value = idParaEditar;
        callbacks.preencherModalEdicaoOrcamento(idParaEditar);
      }
    } else if (tipoModal === "relatorios") {
      state.reportDate = new Date(state.currentDate);
      if (callbacks.popularModalRelatorio)
        callbacks.popularModalRelatorio(state.reportDate);
    } else if (tipoModal === "gerenciarPessoas") {
      if (callbacks.renderizarListaPessoas) callbacks.renderizarListaPessoas();
    }
  } catch (error) {
    console.error(`Erro ao processar modal ${tipoModal}:`, error);
  }

  // 3. Exibição Visual ( display: flex )
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
      // Nota: state.currentFaturaDate NÃO deve ser resetado aqui,
      // pois o modal de detalhes da fatura ainda pode estar aberto ao fundo.
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
    case "modalCadastrarOrcamento":
      if (elements.orcamentoEditIdInput)
        elements.orcamentoEditIdInput.value = "";
      if (elements.nomeOrcamentoInput) elements.nomeOrcamentoInput.value = "";
      if (elements.valorOrcamentoInput) elements.valorOrcamentoInput.value = "";
      if (elements.diaOrcamentoInput) elements.diaOrcamentoInput.value = "";
      break;
    case "modalDetalhesPatrimonio":
      if (elements.listaHistoricoPatrimonioUl)
        elements.listaHistoricoPatrimonioUl.innerHTML = "";
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
  editButton.title = "Editar";
  editButton.dataset.id = item.id;
  actionsDiv.appendChild(editButton);

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn-delete";
  deleteButton.innerHTML = "✖";
  deleteButton.title = "Excluir";
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

export function criarElementoPatrimonio(item, actionsDiv) {
  // Busca Dinâmica: Tenta ler da transação ou descobrir via ID do Patrimônio
  let natureza = item.natureza;

  if (!natureza && item.patrimonioId) {
    const sub = (state.patrimonioSubcategorias || []).find(
      (s) => s.id === item.patrimonioId,
    );
    if (sub) {
      const cat = (state.patrimonioCategorias || []).find(
        (c) => c.id === sub.categoriaId,
      );
      natureza = cat?.tipo;
    }
  }

  const isAtivo = natureza === "ativo";
  const subTipoLabel = isAtivo
    ? "Formação de Ativos"
    : "Recursos para Amortização";

  // Mapeamento amigável da Operação
  const operacaoMap = {
    aporte: "Aporte",
    resgate: "Resgate",
    ajuste: "Ajuste",
    amortizacao: "Amortização",
  };
  const labelOperacao = operacaoMap[item.operacao] || "Operação";

  const dataFormatada = item.dataOperacao
    ? new Date(parseDateString(item.dataOperacao)).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "N/D";

  const editButton = document.createElement("button");
  editButton.className = "btn-edit";
  editButton.innerHTML = "✎";
  editButton.title = "Editar";
  editButton.dataset.id = item.id;
  actionsDiv.appendChild(editButton);

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn-delete";
  deleteButton.innerHTML = "✖";
  deleteButton.title = "Excluir";
  deleteButton.dataset.id = item.id;
  actionsDiv.appendChild(deleteButton);

  let categoriaDisplay = `(Patrimônio - ${subTipoLabel} - ${labelOperacao}${
    item.frequencia === CONSTS.FREQUENCIA.PARCELADA && item.totalParcelas
      ? ` - ${item.parcelaAtual || "?"}/${item.totalParcelas}`
      : ""
  })`;

  return `<label class="transaction-main-info" for="patrimonio-${item.id}">
            <input type="checkbox" id="patrimonio-${item.id}" data-transaction-id="${item.id}" ${item.paga ? "checked" : ""}>
            <div class="transaction-name-category">
                <span class="transaction-name">${item.nome}</span>
                <span class="transaction-category">${categoriaDisplay}</span>
            </div>
          </label>
          <div class="transaction-value-date">
              <span class="transaction-value" style="color: #34495e;">${formatCurrency(item.valor)}</span>
              <span class="transaction-date">Operação: ${dataFormatada}</span>
              ${item.paga ? '<span class="status-paga">Concluído</span>' : ""}
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
  editButton.title = "Editar";
  editButton.dataset.id = item.id;
  actionsDiv.appendChild(editButton);

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn-delete";
  deleteButton.innerHTML = "✖";
  deleteButton.title = "Excluir";
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

  const seloExcluido = item.isDeletado
    ? '<span class="status-excluido" style="background: #95a5a6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-left: 5px;">Excluído</span>'
    : "";

  const seloConferida = item.isConferida
    ? '<span class="status-conferida" style="background: #3498db; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-left: 5px;">Conferida</span>'
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
                        <span class="transaction-name">${item.nome}${seloExcluido}${seloConferida}</span>
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
    actionButton.title = "Reabrir orçamento do mês";
  } else {
    actionButton.className = "btn-fechar-orcamento";
    actionButton.innerHTML = "🔓";
    actionButton.title = "Fechar orçamento do mês";
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

  // Identifica o mês real de hoje para evitar que o mês atual seja considerado "pré-histórico"
  const mesAnoHoje = getMesAnoChave(new Date());

  if (
    primeiroMesAnoComDados &&
    mesAnoAtual < primeiroMesAnoComDados &&
    mesAnoAtual < mesAnoHoje
  ) {
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

  // Receitas
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

  // Despesas Ordinárias Individuais (RESTAURADO)
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

  // Patrimônio
  const patrimoniosDoMes = transacoesDoMesVisivel.filter(
    (t) => t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO,
  );
  patrimoniosDoMes.forEach((p) =>
    itensParaRenderizar.push({
      ...p,
      tipoDisplay: CONSTS.TIPO_RENDERIZACAO.PATRIMONIO,
      dataOrdenacao: parseDateString(p.dataOperacao),
    }),
  );

  // Faturas de Cartão
  const despesasCartaoDoMes = transacoesDoMesVisivel.filter(
    (t) =>
      t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA &&
      t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO,
  );
  const faturasAgrupadas = {};
  despesasCartaoDoMes.forEach((dc) => {
    if (!dc.cartaoId) return;

    // NOVO: Verifica se o cartão tem uma data de corte e se deve ser exibido neste mês
    const cartaoInfo = state.cartoes.find((c) => c.id === dc.cartaoId) || {};
    if (
      cartaoInfo.deletado &&
      cartaoInfo.dataExclusao &&
      mesAnoAtual >= cartaoInfo.dataExclusao
    ) {
      return; // Pula este cartão, ele não deve aparecer mais deste mês em diante
    }

    if (!faturasAgrupadas[dc.cartaoId]) {
      faturasAgrupadas[dc.cartaoId] = {
        cartaoId: dc.cartaoId,
        cartaoNome: cartaoInfo.nome || "Cartão Desconhecido",
        diaVencimentoFatura: cartaoInfo.diaVencimentoFatura || 1,
        vencimentoNoMesSeguinte: cartaoInfo.vencimentoNoMesSeguinte || false,
        totalValor: 0,
        todasPagas: true,
        isDeletado: cartaoInfo.deletado === true,
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
    // Verifica se esta fatura foi marcada como conferida pelo usuário
    const isConferida = state.faturasConferidas.some(
      (f) => f.cartaoId === fatura.cartaoId && f.mesAno === mesAnoAtual,
    );

    itensParaRenderizar.push({
      id: fatura.cartaoId,
      tipoDisplay: CONSTS.TIPO_RENDERIZACAO.FATURA,
      cartaoId: fatura.cartaoId,
      nome: `Fatura ${fatura.cartaoNome}`,
      valor: fatura.totalValor - totalAjustes,
      dataOrdenacao: dataVencimentoFatura,
      dataVencimentoDisplay: dataVencimentoFatura.toISOString().split("T")[0],
      paga: fatura.todasPagas,
      mesAnoReferencia: mesAnoAtual,
      vencimentoNoMesSeguinte: fatura.vencimentoNoMesSeguinte,
      isDeletado: fatura.isDeletado,
      isConferida: isConferida, // Injeta o status de conferência
    });
  });

  // Orçamentos
  // IMPORTANTE: Exibe apenas os orçamentos vinculados ao mês que está na tela
  const orcamentosParaRenderizar = state.orcamentos.filter(
    (o) => o.mesAnoReferencia === mesAnoAtual,
  );

  orcamentosParaRenderizar.forEach((orcamento) => {
    const [ano, mes] = mesAnoAtual.split("-").map(Number);
    const dataOrcamento = new Date(ano, mes - 1, orcamento.dia);
    let gastosNoOrcamento = transacoesDoMesVisivel
      .filter((t) => t.orcamentoId === orcamento.id)
      .reduce((total, t) => total + t.valor, 0);

    if (orcamento.isFixed) {
      const activeBudgetIds = state.orcamentos.map((o) => o.id);
      const extra = transacoesDoMesVisivel
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            (!t.orcamentoId || !activeBudgetIds.includes(t.orcamentoId)),
        )
        .reduce((total, t) => total + t.valor, 0);
      gastosNoOrcamento += extra;
    }

    if (orcamento.isFixedOrdinary) {
      const extraOrdinario = transacoesDoMesVisivel
        .filter((t) => t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA)
        .reduce((total, t) => total + t.valor, 0);
      gastosNoOrcamento += extraOrdinario;
    }

    itensParaRenderizar.push({
      id: `orcamento-${orcamento.id}`,
      orcamentoId: orcamento.id,
      tipoDisplay: CONSTS.TIPO_RENDERIZACAO.ORCAMENTO,
      nome: orcamento.nome,
      valor: orcamento.valor - gastosNoOrcamento,
      valorTotalOrcamento: orcamento.valor,
      dataOrdenacao: dataOrcamento,
      isFixed: orcamento.isFixed || false,
      isFixedOrdinary: orcamento.isFixedOrdinary || false,
    });
  });

  // Prioridade de exibição na Home (Ajustada para Amortização)
  itensParaRenderizar.forEach((item) => {
    if (item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.RECEITA)
      item.ordemMaster = 1;
    else if (
      item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.PATRIMONIO &&
      item.operacao === "resgate"
    )
      item.ordemMaster = 2;
    else if (item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.ORCAMENTO)
      item.ordemMaster = 3;
    else if (
      item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.PATRIMONIO &&
      (item.operacao === "aporte" || item.operacao === "ajuste")
    )
      item.ordemMaster = 4; // Investimentos
    else if (
      item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.PATRIMONIO &&
      item.operacao === "amortizacao"
    )
      item.ordemMaster = 5; // Amortização (entre Investimentos e Despesas)
    else item.ordemMaster = 6; // Despesas e Faturas
  });

  itensParaRenderizar.sort((a, b) => {
    if (a.ordemMaster !== b.ordemMaster) return a.ordemMaster - b.ordemMaster;

    // Sub-ordenação para Orçamentos
    if (
      a.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.ORCAMENTO &&
      b.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.ORCAMENTO
    ) {
      if (a.isFixedOrdinary) return -1;
      if (b.isFixedOrdinary) return 1;
      if (a.isFixed) return -1;
      if (b.isFixed) return 1;
    }

    const dateA =
      a.dataOrdenacao instanceof Date ? a.dataOrdenacao : new Date(0);
    const dateB =
      b.dataOrdenacao instanceof Date ? b.dataOrdenacao : new Date(0);
    return (
      dateA - dateB ||
      (b.valorTotalOrcamento || b.valor || 0) -
        (a.valorTotalOrcamento || a.valor || 0)
    );
  });

  // 1. Define a Prioridade Master (Sincronizado com a lógica acima)
  itensParaRenderizar.forEach((item) => {
    if (item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.RECEITA)
      item.ordemMaster = 1;
    else if (
      item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.PATRIMONIO &&
      item.operacao === "resgate"
    )
      item.ordemMaster = 2;
    else if (item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.ORCAMENTO)
      item.ordemMaster = 3;
    else if (
      item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.PATRIMONIO &&
      (item.operacao === "aporte" || item.operacao === "ajuste")
    )
      item.ordemMaster = 4;
    else if (
      item.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.PATRIMONIO &&
      item.operacao === "amortizacao"
    )
      item.ordemMaster = 5;
    else item.ordemMaster = 6;
  });

  // 2. Executa a Ordenação Multinível
  itensParaRenderizar.sort((a, b) => {
    // Primeiro critério: Natureza do item (ordemMaster)
    if (a.ordemMaster !== b.ordemMaster) {
      return a.ordemMaster - b.ordemMaster;
    }

    // Segundo critério: Regras internas para Orçamentos
    if (
      a.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.ORCAMENTO &&
      b.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.ORCAMENTO
    ) {
      if (a.isFixedOrdinary) return -1;
      if (b.isFixedOrdinary) return 1;
      if (a.isFixed) return -1;
      if (b.isFixed) return 1;
    }

    // Terceiro critério: Data e depois Valor
    const dateA =
      a.dataOrdenacao instanceof Date ? a.dataOrdenacao : new Date(0);
    const dateB =
      b.dataOrdenacao instanceof Date ? b.dataOrdenacao : new Date(0);

    return (
      dateA - dateB ||
      (b.valorTotalOrcamento || b.valor || 0) -
        (a.valorTotalOrcamento || a.valor || 0)
    );
  });

  atualizarResumoFinanceiro();

  if (itensParaRenderizar.length === 0) {
    elements.listaTransacoesUl.innerHTML =
      '<li style="text-align:center;padding:20px;color:#777;">Nenhuma transação.</li>';
    return;
  }

  itensParaRenderizar.forEach((item) => {
    const li = document.createElement("li");
    li.classList.add("transaction-item");
    const detailsDiv = document.createElement("div");
    detailsDiv.classList.add("transaction-details");
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("transaction-actions");

    switch (item.tipoDisplay) {
      case CONSTS.TIPO_RENDERIZACAO.RECEITA:
        li.classList.add("receita");
        li.dataset.transactionId = item.id;
        detailsDiv.innerHTML = criarElementoReceita(item, actionsDiv);
        break;
      case CONSTS.TIPO_RENDERIZACAO.PATRIMONIO:
        if (item.operacao === "resgate") {
          li.classList.add("patrimonio-resgate");
        } else if (item.operacao === "amortizacao") {
          li.classList.add("patrimonio-amortizacao");
        } else {
          li.classList.add("patrimonio");
        }
        if (item.paga) li.classList.add("paga");
        li.dataset.transactionId = item.id;
        detailsDiv.innerHTML = criarElementoPatrimonio(item, actionsDiv);
        break;
      case CONSTS.TIPO_RENDERIZACAO.DESPESA:
        li.classList.add("despesa");
        if (item.paga) li.classList.add("paga");
        li.dataset.transactionId = item.id;
        detailsDiv.innerHTML = criarElementoDespesa(item, actionsDiv);
        break;
      case CONSTS.TIPO_RENDERIZACAO.FATURA:
        li.classList.add("despesa", "fatura-cartao");
        if (item.paga) li.classList.add("paga");
        li.dataset.cartaoId = item.cartaoId;
        li.dataset.mesAnoFatura = item.mesAnoReferencia;
        detailsDiv.innerHTML = criarElementoFatura(item, actionsDiv);
        break;
      case CONSTS.TIPO_RENDERIZACAO.ORCAMENTO:
        li.classList.add("orcamento");
        // Adiciona as classes de destaque se for um orçamento fixo
        if (item.isFixedOrdinary) li.classList.add("orcamento-item-ordinario");
        if (item.isFixed) li.classList.add("orcamento-item-outros");

        if (isOrcamentoFechado(item.orcamentoId, mesAnoAtual))
          li.classList.add("fechado");
        li.dataset.orcamentoId = item.id;
        detailsDiv.innerHTML = criarElementoOrcamento(item, actionsDiv);
        break;
    }
    li.appendChild(detailsDiv);
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

  if (elements.modalDetalhesSerieTitulo) {
    elements.modalDetalhesSerieTitulo.textContent = `Detalhes: ${nomeBase}`;
  }

  if (elements.listaDetalhesSerieUl) {
    elements.listaDetalhesSerieUl.innerHTML = "";
  }
  transacoesDaSerie.forEach((t) => {
    const li = document.createElement("li");
    const [ano, mes] = t.mesAnoReferencia.split("-");
    const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
      month: "long",
    });
    li.innerHTML = `<span class="parcela-nome">${t.nome} <small style="color:#777;">- ${nomeMes}/${ano}</small></span><span class="parcela-valor">${formatCurrency(t.valor)}</span>`;
    elements.listaDetalhesSerieUl.appendChild(li);
  });
  callbackAbrir(elements.modalDetalhesSerie);
}

export function renderizarEstadoVisibilidade() {
  if (state.areValuesHidden) {
    elements.bodyEl.classList.add("values-hidden");
    if (elements.btnToggleVisibility)
      elements.btnToggleVisibility.style.opacity = "0.5";
  } else {
    elements.bodyEl.classList.remove("values-hidden");
    if (elements.btnToggleVisibility)
      elements.btnToggleVisibility.style.opacity = "1";
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
  let item =
    context === "dividaTerceiro"
      ? state.dividasTerceiros.find((d) => d.id === itemId)
      : state.transacoes.find((t) => t.id === itemId);
  if (!item) return;
  elements.modalConfirmarAcaoSerie.dataset.itemId = itemId;
  elements.modalConfirmarAcaoSerie.dataset.serieId = item.serieId;
  elements.modalConfirmarAcaoSerie.dataset.acao = acao;
  elements.modalConfirmarAcaoSerie.dataset.context = context;
  elements.modalConfirmarAcaoSerieTitulo.textContent =
    acao === CONSTS.ACAO_SERIE.EXCLUIR
      ? `Excluir Item em Série`
      : "Editar em Série";
  elements.modalConfirmarAcaoSerieTexto.textContent = `Deseja aplicar esta ação apenas a este item ou toda a série?`;
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
      callbacks.abrirModal(
        elements.modalNovaTransacao,
        transacaoId,
        "transacao",
        callbacks,
      );
    }
  }
}
