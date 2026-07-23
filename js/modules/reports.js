import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { formatCurrency, getMesAnoChave, isOrcamentoFechado } from "./utils.js";

export function popularModalRelatorio(date) {
  if (!elements.relatorioTitulo || !elements.relatorioCorpo) return;
  const mesAno = getMesAnoChave(date);
  const nomeMes = date.toLocaleString("pt-BR", { month: "long" });
  elements.relatorioTitulo.textContent = `Relatório de ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${date.getFullYear()}`;

  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() + 24);
  elements.btnRelatorioProximo.disabled =
    getMesAnoChave(date) >= getMesAnoChave(limitDate);

  let primeiroMesAno =
    state.transacoes.length > 0
      ? state.transacoes.reduce(
          (min, t) => (t.mesAnoReferencia < min ? t.mesAnoReferencia : min),
          state.transacoes[0].mesAnoReferencia,
        )
      : null;
  if (primeiroMesAno && mesAno < primeiroMesAno) {
    elements.relatorioCorpo.innerHTML =
      '<p style="text-align:center;padding:20px;color:#777;">Sem dados.</p>';
    return;
  }

  elements.relatorioCorpo.innerHTML =
    '<div id="relatorio-secao-resumo"></div>' +
    '<div id="relatorio-secao-analise-patrimonio"></div>' +
    '<div id="relatorio-secao-analise-despesas"></div>' +
    '<div id="relatorio-secao-analise-orcamentos"></div>';

  const transacoesDoMes = state.transacoes.filter(
    (t) => t.mesAnoReferencia === mesAno,
  );
  const despesasDoMes = transacoesDoMes.filter(
    (t) => t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA,
  );
  const totalReceitas = transacoesDoMes
    .filter((t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA)
    .reduce((total, t) => total + t.valor, 0);

  // --- CÁLCULOS DE PATRIMÔNIO (LOGICA DE CRUZAMENTO) ---

  // Função auxiliar para descobrir se uma transação de patrimônio é Ativo ou Redução
  const obterTipoDoItem = (patrimonioId) => {
    const sub = state.patrimonioSubcategorias.find(
      (s) => s.id === patrimonioId,
    );
    if (!sub) return null;
    const cat = state.patrimonioCategorias.find(
      (c) => c.id === sub.categoriaId,
    );
    return cat ? cat.tipo : null;
  };

  const totalAportesAtivos = transacoesDoMes
    .filter(
      (t) =>
        t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO &&
        t.operacao === "aporte" &&
        obterTipoDoItem(t.patrimonioId) === "ativo",
    )
    .reduce((s, t) => s + t.valor, 0);

  const totalAportesReducao = transacoesDoMes
    .filter(
      (t) =>
        t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO &&
        t.operacao === "aporte" &&
        obterTipoDoItem(t.patrimonioId) === "passivo",
    )
    .reduce((s, t) => s + t.valor, 0);

  const totalResgates = transacoesDoMes
    .filter(
      (t) =>
        t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO && t.operacao === "resgate",
    )
    .reduce((s, t) => s + t.valor, 0);

  const totalAmortizacoes = transacoesDoMes
    .filter(
      (t) =>
        t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO &&
        t.operacao === "amortizacao",
    )
    .reduce((s, t) => s + t.valor, 0);

  const totalAportesGeral = totalAportesAtivos + totalAportesReducao;
  const investimentoLiquido = totalAportesGeral - totalResgates;
  const taxaInvestimento =
    totalReceitas > 0 ? (investimentoLiquido / totalReceitas) * 100 : 0;

  // --- CÁLCULOS DE DESPESAS E ORÇAMENTOS ---
  const activeBudgetIds = state.orcamentos.map((o) => o.id);
  const totalGastoRealCartao = despesasDoMes
    .filter((d) => d.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO)
    .reduce((s, t) => s + t.valor, 0);
  const totalGastoRealOrdinario = despesasDoMes
    .filter((d) => d.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA)
    .reduce((s, t) => s + t.valor, 0);

  let totalGastoOrcamentos = 0;
  let totalPrevistoOrcamentos = 0;
  let somaDespesasProjetadas = 0;

  const orcamentosRelatorio = state.orcamentos.filter(
    (o) => o.mesAnoReferencia === mesAno,
  );

  orcamentosRelatorio.forEach((orc) => {
    totalPrevistoOrcamentos += orc.valor;
    let gastoDeste = despesasDoMes
      .filter((t) => t.orcamentoId === orc.id)
      .reduce((s, t) => s + t.valor, 0);
    if (orc.isFixed)
      gastoDeste += despesasDoMes
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            (!t.orcamentoId || !activeBudgetIds.includes(t.orcamentoId)),
        )
        .reduce((s, t) => s + t.valor, 0);
    if (orc.isFixedOrdinary)
      gastoDeste += despesasDoMes
        .filter((t) => t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA)
        .reduce((s, t) => s + t.valor, 0);
    totalGastoOrcamentos += gastoDeste;
    somaDespesasProjetadas += isOrcamentoFechado(orc.id, mesAno)
      ? gastoDeste
      : Math.max(orc.valor, gastoDeste);
  });

  const totalAjustesDoMes = state.ajustesFatura
    .filter((a) => a.mesAnoReferencia === mesAno)
    .reduce((s, a) => s + a.valor, 0);

  // --- CÁLCULO DOS SALDOS (ATUALIZADO FASE 3: AMORTIZAÇÃO) ---
  // Saldo = (Receitas + Resgates) - (Gastos + Aportes + Amortizações)
  const saldoReal =
    totalReceitas +
    totalResgates -
    (totalGastoRealCartao +
      totalGastoRealOrdinario -
      totalAjustesDoMes +
      totalAportesGeral +
      totalAmortizacoes);
  const saldoFinal =
    totalReceitas +
    totalResgates -
    (somaDespesasProjetadas -
      totalAjustesDoMes +
      totalAportesGeral +
      totalAmortizacoes);

  // --- RENDERIZAÇÃO: ANÁLISE DE DESPESAS ---
  const calcularSubtotais = (categoria) => {
    const despesasFiltradas = despesasDoMes.filter(
      (d) => d.categoria === categoria,
    );
    return {
      unica: despesasFiltradas
        .filter((d) => d.frequencia === CONSTS.FREQUENCIA.UNICA)
        .reduce((sum, d) => sum + d.valor, 0),
      recorrente: despesasFiltradas
        .filter((d) => d.frequencia === CONSTS.FREQUENCIA.RECORRENTE)
        .reduce((sum, d) => sum + d.valor, 0),
      parcelada: despesasFiltradas
        .filter((d) => d.frequencia === CONSTS.FREQUENCIA.PARCELADA)
        .reduce((sum, d) => sum + d.valor, 0),
    };
  };

  const subtotaisOrd = calcularSubtotais(CONSTS.CATEGORIA_DESPESA.ORDINARIA);
  const subtotaisCartao = calcularSubtotais(
    CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO,
  );

  const analiseDespesasHTML = `
    <section class="relatorio-secao">
      <h3>Análise de Despesas</h3>
      <div class="relatorio-grid-analise">
        <div class="relatorio-sub-secao">
          <h4>Ordinárias</h4>
          <div class="relatorio-item-analise clicavel" data-cat="${CONSTS.CATEGORIA_DESPESA.ORDINARIA}" data-freq="${CONSTS.FREQUENCIA.UNICA}">
            <span>Únicas</span> <strong>${formatCurrency(subtotaisOrd.unica)}</strong>
          </div>
          <div class="relatorio-item-analise clicavel" data-cat="${CONSTS.CATEGORIA_DESPESA.ORDINARIA}" data-freq="${CONSTS.FREQUENCIA.RECORRENTE}">
            <span>Recorrentes</span> <strong>${formatCurrency(subtotaisOrd.recorrente)}</strong>
          </div>
          <div class="relatorio-item-analise clicavel" data-cat="${CONSTS.CATEGORIA_DESPESA.ORDINARIA}" data-freq="${CONSTS.FREQUENCIA.PARCELADA}">
            <span>Parceladas</span> <strong>${formatCurrency(subtotaisOrd.parcelada)}</strong>
          </div>
          <div class="relatorio-item-analise" style="font-weight: bold; margin-top: 15px; border-left-color: #3498db;">
            <span>Total</span> <strong>${formatCurrency(totalGastoRealOrdinario)}</strong>
          </div>
        </div>
        <div class="relatorio-sub-secao">
          <h4>Cartão de Crédito</h4>
          <div class="relatorio-item-analise clicavel" data-cat="${CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO}" data-freq="${CONSTS.FREQUENCIA.UNICA}">
            <span>Únicas</span> <strong>${formatCurrency(subtotaisCartao.unica)}</strong>
          </div>
          <div class="relatorio-item-analise clicavel" data-cat="${CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO}" data-freq="${CONSTS.FREQUENCIA.RECORRENTE}">
            <span>Recorrentes</span> <strong>${formatCurrency(subtotaisCartao.recorrente)}</strong>
          </div>
          <div class="relatorio-item-analise clicavel" data-cat="${CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO}" data-freq="${CONSTS.FREQUENCIA.PARCELADA}">
            <span>Parceladas</span> <strong>${formatCurrency(subtotaisCartao.parcelada)}</strong>
          </div>
          <div class="relatorio-item-analise" style="font-weight: bold; margin-top: 15px; border-left-color: #3498db;">
            <span>Total</span> <strong>${formatCurrency(totalGastoRealCartao)}</strong>
          </div>
        </div>
      </div>
    </section>`;

  document.getElementById("relatorio-secao-analise-despesas").innerHTML =
    analiseDespesasHTML;

  // --- RENDERIZAÇÃO: ANÁLISE DE PATRIMÔNIO (ATUALIZADA) ---
  const analisePatrimonioHTML = `
    <section class="relatorio-secao">
      <h3>Análise de Patrimônio</h3>
      <div class="relatorio-grid-analise">
        <div class="relatorio-sub-secao">
          <h4>Aportes</h4>
          <div class="relatorio-item-analise clicavel" data-tipo-patrimonio="aporte-ativo">
            <span>Formação de Ativos</span> <strong>${formatCurrency(totalAportesAtivos)}</strong>
          </div>
          <div class="relatorio-item-analise clicavel" data-tipo-patrimonio="aporte-passivo">
            <span>Recursos para Amortização</span> <strong>${formatCurrency(totalAportesReducao)}</strong>
          </div>
          <div class="relatorio-item-analise" style="font-weight: bold; margin-top: 15px; border-left-color: #3498db;">
            <span>Total Aportado</span> <strong>${formatCurrency(totalAportesGeral)}</strong>
          </div>
        </div>
        <div class="relatorio-sub-secao">
          <h4>Resgates e Performance</h4>
          <div class="relatorio-item-analise clicavel" data-tipo-patrimonio="resgate">
            <span>Total Resgatado</span> <strong>${formatCurrency(totalResgates)}</strong>
          </div>
          <div class="relatorio-item-analise" style="font-weight: bold; margin-top: 15px; border-left-color: #27ae60;">
            <span>Investimento Líquido</span> <strong>${formatCurrency(investimentoLiquido)}</strong>
          </div>
          <div class="relatorio-item-analise" style="font-weight: bold; border-left-color: #f1c40f;">
            <span>Taxa de Poupança</span> <strong>${taxaInvestimento.toFixed(1)}%</strong>
          </div>
        </div>
      </div>
    </section>`;

  document.getElementById("relatorio-secao-analise-patrimonio").innerHTML =
    analisePatrimonioHTML;

  // --- RENDERIZAÇÃO: RESUMO GERAL ---
  document.getElementById("relatorio-secao-resumo").innerHTML =
    `<section class="relatorio-secao"><h3>Resumo Geral</h3><div class="relatorio-grid">
    <div class="relatorio-item"><span>Receitas Totais</span><strong class="valor-receita">${formatCurrency(totalReceitas)}</strong></div>
    <div class="relatorio-item"><span>Resgates</span><strong style="color: #9b59b6;">${formatCurrency(totalResgates)}</strong></div>
    <div class="relatorio-item"><span>Despesas Totais</span><strong class="valor-despesa">${formatCurrency(somaDespesasProjetadas - totalAjustesDoMes)}</strong></div>
    <div class="relatorio-item"><span>Aportes</span><strong style="color: #3498db;">${formatCurrency(totalAportesGeral)}</strong></div>
    <div class="relatorio-item"><span>Amortizações</span><strong style="color: #d35400;">${formatCurrency(totalAmortizacoes)}</strong></div>
    <div class="relatorio-item"><span>Saldo Final</span><strong style="color:${saldoFinal >= 0 ? "#27ae60" : "#e74c3c"}">${formatCurrency(saldoFinal)}</strong></div>
    <div class="relatorio-item"><span>Saldo Real</span><strong style="color:${saldoReal >= 0 ? "#27ae60" : "#e74c3c"}">${formatCurrency(saldoReal)}</strong></div>
  </div></section>`;

  let orcamentosHTML = "";
  const orcamentosOrdenadosRelatorio = [...orcamentosRelatorio].sort((a, b) => {
    if (a.isFixedOrdinary) return -1;
    if (b.isFixedOrdinary) return 1;
    if (a.isFixed) return -1;
    if (b.isFixed) return 1;
    return b.valor - a.valor;
  });

  orcamentosOrdenadosRelatorio.forEach((orc) => {
    let gastoNoOrc = despesasDoMes
      .filter((t) => t.orcamentoId === orc.id)
      .reduce((s, t) => s + t.valor, 0);
    if (orc.isFixed)
      gastoNoOrc += despesasDoMes
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            (!t.orcamentoId || !activeBudgetIds.includes(t.orcamentoId)),
        )
        .reduce((s, t) => s + t.valor, 0);
    if (orc.isFixedOrdinary)
      gastoNoOrc += despesasDoMes
        .filter((t) => t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA)
        .reduce((s, t) => s + t.valor, 0);

    orcamentosHTML += `<div class="relatorio-orcamento-item"><span>${orc.nome}</span><div class="orcamento-valores"><small>Prev: ${formatCurrency(orc.valor)}</small><small>Gasto: ${formatCurrency(gastoNoOrc)}</small><strong style="color:${orc.valor - gastoNoOrc >= 0 ? "#27ae60" : "#e74c3c"}">Saldo: ${formatCurrency(orc.valor - gastoNoOrc)}</strong></div></div>`;
  });

  document.getElementById("relatorio-secao-analise-orcamentos").innerHTML =
    `<section class="relatorio-secao"><h3>Análise de Orçamentos</h3><div class="relatorio-orcamento-lista">${orcamentosHTML}</div><div class="relatorio-orcamento-total"><span>TOTAIS</span><div class="orcamento-valores"><small>Prev: ${formatCurrency(totalPrevistoOrcamentos)}</small><small>Gasto: ${formatCurrency(totalGastoOrcamentos)}</small><strong>Saldo: ${formatCurrency(totalPrevistoOrcamentos - totalGastoOrcamentos)}</strong></div></div></section>`;
}

export function abrirDetalhesFiltroRelatorio(
  categoria,
  frequencia,
  date,
  callbackAbrir,
  tipoPatrimonio = null,
) {
  const mesAno = getMesAnoChave(date);
  let labelTitulo = "";

  if (tipoPatrimonio) {
    if (tipoPatrimonio === "resgate") labelTitulo = "Patrimônio: Resgates";
    else if (tipoPatrimonio === "amortizacao")
      labelTitulo = "Patrimônio: Amortização de Passivos";
    else if (tipoPatrimonio === "aporte-ativo")
      labelTitulo = "Patrimônio: Formação de Ativos";
    else labelTitulo = "Patrimônio: Recursos para Amortização";
  } else {
    const labelCat =
      categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA
        ? "Ordinárias"
        : "Cartão";
    const labelFreq = frequencia.charAt(0).toUpperCase() + frequencia.slice(1);
    labelTitulo = `${labelCat}: ${labelFreq}s`;
  }

  elements.detalhesFiltroRelatorioTitulo.textContent = labelTitulo;
  elements.listaDetalhesFiltroRelatorioUl.innerHTML = "";

  const itens = state.transacoes
    .filter((t) => {
      if (tipoPatrimonio) {
        if (tipoPatrimonio === "resgate" || tipoPatrimonio === "amortizacao") {
          return (
            t.mesAnoReferencia === mesAno &&
            t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO &&
            t.operacao === tipoPatrimonio
          );
        }
        // Para aportes, cruza com a subcategoria para saber se é Ativo ou Passivo
        const sub = state.patrimonioSubcategorias.find(
          (s) => s.id === t.patrimonioId,
        );
        const cat = sub
          ? state.patrimonioCategorias.find((c) => c.id === sub.categoriaId)
          : null;
        const tipoAlvo =
          tipoPatrimonio === "aporte-ativo" ? "ativo" : "passivo";
        return (
          t.mesAnoReferencia === mesAno &&
          t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO &&
          t.operacao === "aporte" &&
          cat?.tipo === tipoAlvo
        );
      }
      return (
        t.mesAnoReferencia === mesAno &&
        t.categoria === categoria &&
        t.frequencia === frequencia
      );
    })
    .sort((a, b) => b.valor - a.valor);

  if (itens.length === 0) {
    elements.listaDetalhesFiltroRelatorioUl.innerHTML =
      "<li>Nenhum item encontrado.</li>";
  } else {
    itens.forEach((item) => {
      const li = document.createElement("li");
      li.style.cssText =
        "display:flex; justify-content:space-between; padding:10px 5px; border-bottom:1px solid #eee;";
      li.innerHTML = `<span>${item.nome}</span><strong>${formatCurrency(item.valor)}</strong>`;
      elements.listaDetalhesFiltroRelatorioUl.appendChild(li);
    });
  }

  callbackAbrir(elements.modalDetalhesFiltroRelatorio);
}
