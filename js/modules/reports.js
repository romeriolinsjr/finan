import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { formatCurrency, getMesAnoChave, isOrcamentoFechado } from "./utils.js";

export function popularModalRelatorio(date) {
  if (!elements.relatorioTitulo || !elements.relatorioCorpo) return;

  const mesAno = getMesAnoChave(date);
  const nomeMes = date.toLocaleString("pt-BR", { month: "long" });
  const ano = date.getFullYear();
  elements.relatorioTitulo.textContent = `Relatório de ${
    nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)
  }/${ano}`;

  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() + 24);
  elements.btnRelatorioProximo.disabled =
    getMesAnoChave(date) >= getMesAnoChave(limitDate);

  let primeiroMesAnoComDados = null;
  if (state.transacoes.length > 0) {
    primeiroMesAnoComDados = state.transacoes.reduce(
      (min, t) => (t.mesAnoReferencia < min ? t.mesAnoReferencia : min),
      state.transacoes[0].mesAnoReferencia,
    );
  }

  if (primeiroMesAnoComDados && mesAno < primeiroMesAnoComDados) {
    elements.relatorioCorpo.innerHTML =
      '<p style="text-align: center; padding: 20px; color: #777;">Sem dados para este período.</p>';
    return;
  }

  elements.relatorioCorpo.innerHTML = `
            <div id="relatorio-secao-resumo"></div>
            <div id="relatorio-secao-analise-despesas"></div>
            <div id="relatorio-secao-analise-orcamentos"></div>
        `;

  const transacoesDoMes = state.transacoes.filter(
    (t) => t.mesAnoReferencia === mesAno,
  );
  const despesasDoMes = transacoesDoMes.filter(
    (t) => t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA,
  );

  const totalReceitas = transacoesDoMes
    .filter((t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA)
    .reduce((total, t) => total + t.valor, 0);

  // 1. Despesas Ordinárias Totais (Débito/Pix - Estas nunca entram em orçamentos)
  const despesasOrdinariasTotais = despesasDoMes
    .filter((d) => d.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA)
    .reduce((total, t) => total + t.valor, 0);

  // 2. Cálculo dos Orçamentos (Previsto vs Gasto Real)
  let totalGastoOrcamentos = 0;
  let totalPrevistoOrcamentos = 0;

  // Calculamos os totais baseados no que cada orçamento individual está capturando
  state.orcamentos.forEach((orc) => {
    totalPrevistoOrcamentos += orc.valor;

    let gastoDesteOrcamento = despesasDoMes
      .filter((t) => t.orcamentoId === orc.id)
      .reduce((sum, t) => sum + t.valor, 0);

    // Inclui gastos não categorizados se for o orçamento fixo
    if (orc.isFixed) {
      const extra = despesasDoMes
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            !t.orcamentoId,
        )
        .reduce((sum, t) => sum + t.valor, 0);
      gastoDesteOrcamento += extra;
    }

    totalGastoOrcamentos += gastoDesteOrcamento;
  });

  // 3. Ajustes de fatura (descontos)
  const totalAjustesDoMes = state.ajustesFatura
    .filter((a) => a.mesAnoReferencia === mesAno)
    .reduce((total, a) => total + a.valor, 0);

  // 4. Saldo Real: Receitas - (Ordinárias + Gastos Reais em Cartão - Ajustes)
  const saldoReal =
    totalReceitas -
    (despesasOrdinariasTotais + totalGastoOrcamentos - totalAjustesDoMes);

  // 5. Saldo Final (Respeitando Cadeados)
  let despesasParaSaldoFinal = despesasOrdinariasTotais;
  state.orcamentos.forEach((orcamento) => {
    let gastoNeste = despesasDoMes
      .filter((t) => t.orcamentoId === orcamento.id)
      .reduce((sum, t) => sum + t.valor, 0);

    if (orcamento.isFixed) {
      const extra = despesasDoMes
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            !t.orcamentoId,
        )
        .reduce((sum, t) => sum + t.valor, 0);
      gastoNeste += extra;
    }

    if (isOrcamentoFechado(orcamento.id, mesAno)) {
      despesasParaSaldoFinal += gastoNeste;
    } else {
      despesasParaSaldoFinal += Math.max(orcamento.valor, gastoNeste);
    }
  });
  despesasParaSaldoFinal -= totalAjustesDoMes;
  const saldoFinal = totalReceitas - despesasParaSaldoFinal;

  const resumoHTML = `<section class="relatorio-secao"><h3>Resumo Geral</h3><div class="relatorio-grid">
            <div class="relatorio-item"><span>Receitas Totais</span><strong class="valor-receita">${formatCurrency(
              totalReceitas,
            )}</strong></div>
            <div class="relatorio-item"><span>Despesas Totais</span><strong class="valor-despesa">${formatCurrency(
              despesasParaSaldoFinal,
            )}</strong></div>
            <div class="relatorio-item"><span>Saldo Final</span><strong style="color: ${
              saldoFinal >= 0 ? "#27ae60" : "#e74c3c"
            };">${formatCurrency(saldoFinal)}</strong></div>
            <div class="relatorio-item"><span>Saldo Real (Pós-Orçamento)</span><strong style="color: ${
              saldoReal >= 0 ? "#27ae60" : "#e74c3c"
            };">${formatCurrency(saldoReal)}</strong></div>
        </div></section>`;
  document.getElementById("relatorio-secao-resumo").innerHTML = resumoHTML;

  const calcularSubtotais = (categoria) => {
    const despesasFiltradas = despesasDoMes.filter(
      (d) => d.categoria === categoria,
    );
    return {
      unica: despesasFiltradas
        .filter((d) => d.frequencia === "unica")
        .reduce((sum, d) => sum + d.valor, 0),
      recorrente: despesasFiltradas
        .filter((d) => d.frequencia === "recorrente")
        .reduce((sum, d) => sum + d.valor, 0),
      parcelada: despesasFiltradas
        .filter((d) => d.frequencia === "parcelada")
        .reduce((sum, d) => sum + d.valor, 0),
    };
  };
  const subtotaisOrd = calcularSubtotais("ordinaria");
  const subtotaisCartao = calcularSubtotais("cartao_credito");
  const analiseDespesasHTML = `<section class="relatorio-secao"><h3>Análise de Despesas</h3><div class="relatorio-grid-analise"><div class="relatorio-sub-secao"><h4>Gastos Ordinários</h4><div class="relatorio-item-analise"><span>Únicas</span> <strong>${formatCurrency(
    subtotaisOrd.unica,
  )}</strong></div><div class="relatorio-item-analise"><span>Recorrentes</span> <strong>${formatCurrency(
    subtotaisOrd.recorrente,
  )}</strong></div><div class="relatorio-item-analise"><span>Parceladas</span> <strong>${formatCurrency(
    subtotaisOrd.parcelada,
  )}</strong></div></div><div class="relatorio-sub-secao"><h4>Gastos com Cartão de Crédito</h4><div class="relatorio-item-analise"><span>Únicas</span> <strong>${formatCurrency(
    subtotaisCartao.unica,
  )}</strong></div><div class="relatorio-item-analise"><span>Recorrentes</span> <strong>${formatCurrency(
    subtotaisCartao.recorrente,
  )}</strong></div><div class="relatorio-item-analise"><span>Parceladas</span> <strong>${formatCurrency(
    subtotaisCartao.parcelada,
  )}</strong></div></div></div></section>`;
  document.getElementById("relatorio-secao-analise-despesas").innerHTML =
    analiseDespesasHTML;

  let orcamentosHTML = "";
  state.orcamentos.forEach((orc) => {
    // Busca gastos vinculados diretamente a este ID
    let gastosNoOrcamento = despesasDoMes
      .filter((t) => t.orcamentoId === orc.id)
      .reduce((sum, t) => sum + t.valor, 0);

    // LÓGICA ATUALIZADA: Se for o orçamento fixo, soma também os gastos não categorizados de cartão
    if (orc.isFixed) {
      const gastosCartaoSemVinculo = despesasDoMes
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            !t.orcamentoId,
        )
        .reduce((total, t) => total + t.valor, 0);
      gastosNoOrcamento += gastosCartaoSemVinculo;
    }

    const saldoOrcamento = orc.valor - gastosNoOrcamento;
    orcamentosHTML += `<div class="relatorio-orcamento-item"><span>${
      orc.nome
    }</span><div class="orcamento-valores"><small>Previsto: ${formatCurrency(
      orc.valor,
    )}</small><small>Gasto: ${formatCurrency(
      gastosNoOrcamento,
    )}</small><strong style="color: ${
      saldoOrcamento >= 0 ? "#27ae60" : "#e74c3c"
    };">Saldo: ${formatCurrency(saldoOrcamento)}</strong></div></div>`;
  });

  const analiseOrcamentosHTML = `<section class="relatorio-secao"><h3>Análise de Orçamentos</h3><div class="relatorio-orcamento-lista">${orcamentosHTML}</div><div class="relatorio-orcamento-total"><span>TOTAIS</span><div class="orcamento-valores"><small>Previsto: ${formatCurrency(
    totalPrevistoOrcamentos,
  )}</small><small>Gasto: ${formatCurrency(
    totalGastoOrcamentos,
  )}</small><strong style="color: ${
    totalPrevistoOrcamentos - totalGastoOrcamentos >= 0 ? "#27ae60" : "#e74c3c"
  };">Saldo: ${formatCurrency(
    totalPrevistoOrcamentos - totalGastoOrcamentos,
  )}</strong></div></div></section>`;
  document.getElementById("relatorio-secao-analise-orcamentos").innerHTML =
    analiseOrcamentosHTML;
}
