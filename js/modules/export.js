import { state } from "./state.js";
import { CONSTS } from "./constants.js";
import {
  formatCurrency,
  getMesAnoChave,
  calcularTotalAjustes,
  isOrcamentoFechado,
} from "./utils.js";

export async function gerarExtratoMensalPDF() {
  if (!window.jspdf) {
    alert("O motor de PDF não foi carregado. Tente recarregar a página.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const mesAno = getMesAnoChave(state.currentDate);
  const nomeMes = state.currentDate.toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // --- 1. PREPARAÇÃO E CÁLCULOS DE TOTAIS ---
  const transacoes = state.transacoes.filter(
    (t) => t.mesAnoReferencia === mesAno,
  );
  const activeBudgetIds = state.orcamentos.map((o) => o.id);

  // Totais de Receitas
  const receitas = transacoes.filter(
    (t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA,
  );
  const totalReceitas = receitas.reduce((s, t) => s + t.valor, 0);

  // Totais de Despesas Ordinárias
  const despesasOrd = transacoes.filter(
    (t) =>
      t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA &&
      t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA,
  );
  const totalOrd = despesasOrd.reduce((s, t) => s + t.valor, 0);

  // Totais de Cartões
  let totalFaturas = 0;
  const dadosCartoes = state.cartoes
    .filter((c) => !c.deletado || transacoes.some((t) => t.cartaoId === c.id))
    .map((cartao) => {
      const totalGasto = transacoes
        .filter((t) => t.cartaoId === cartao.id)
        .reduce((s, t) => s + t.valor, 0);
      const ajustes = calcularTotalAjustes(cartao.id, mesAno);
      const valorFinal = totalGasto - ajustes;
      if (totalGasto > 0) totalFaturas += valorFinal;
      return totalGasto > 0
        ? [`Fatura ${cartao.nome}`, formatCurrency(valorFinal)]
        : null;
    })
    .filter((row) => row !== null);

  // Totais de Orçamentos (Lógica Dashboard)
  let totalGastoRealOrcamentos = 0;
  let totalPrevistoOrcamentos = 0;
  let despesasProjetadasDashboard = 0;

  const orcamentosExport = state.orcamentos.filter(
    (o) => o.mesAnoReferencia === mesAno,
  );

  const dadosOrcamentos = orcamentosExport.map((orc) => {
    let gastoDeste = transacoes
      .filter((t) => t.orcamentoId === orc.id)
      .reduce((s, t) => s + t.valor, 0);
    if (orc.isFixed) {
      gastoDeste += transacoes
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            (!t.orcamentoId || !activeBudgetIds.includes(t.orcamentoId)),
        )
        .reduce((s, t) => s + t.valor, 0);
    }
    if (orc.isFixedOrdinary) {
      gastoDeste += transacoes
        .filter((t) => t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA)
        .reduce((s, t) => s + t.valor, 0);
    }

    totalGastoRealOrcamentos += gastoDeste;
    totalPrevistoOrcamentos += orc.valor;

    // Lógica de Saldo do Mês (Cadeados)
    despesasProjetadasDashboard += isOrcamentoFechado(orc.id, mesAno)
      ? gastoDeste
      : Math.max(orc.valor, gastoDeste);

    const saldo = orc.valor - gastoDeste;
    return [
      orc.nome,
      formatCurrency(orc.valor),
      formatCurrency(gastoDeste),
      formatCurrency(saldo),
    ];
  });

  // Cálculo de Saldo Final (Resumo Financeiro)
  const totalAjustesMes = state.ajustesFatura
    .filter((a) => a.mesAnoReferencia === mesAno)
    .reduce((s, a) => s + a.valor, 0);
  const despesasTotaisResumo = despesasProjetadasDashboard - totalAjustesMes;
  const saldoMensalResumo = totalReceitas - despesasTotaisResumo;

  // --- 2. CONSTRUÇÃO DO PDF ---

  // Cabeçalho
  doc.setFontSize(22);
  doc.setTextColor(44, 62, 80);
  doc.text("FINAN", pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(127, 140, 141);
  doc.text(`EXTRATO MENSAL: ${nomeMes.toUpperCase()}`, pageWidth / 2, 28, {
    align: "center",
  });

  let currentY = 35;

  // SEÇÃO: RESUMO FINANCEIRO (DASHBOARD)
  doc.autoTable({
    startY: currentY,
    head: [["RESUMO FINANCEIRO DO MÊS", "VALOR"]],
    body: [
      ["Receitas do Mês", formatCurrency(totalReceitas)],
      [
        "Despesas do Mês (Previsto vs Real)",
        formatCurrency(despesasTotaisResumo),
      ],
      [
        { content: "Saldo do Mês", styles: { fontStyle: "bold" } },
        {
          content: formatCurrency(saldoMensalResumo),
          styles: {
            fontStyle: "bold",
            textColor: saldoMensalResumo >= 0 ? [39, 174, 96] : [192, 57, 43],
          },
        },
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [44, 62, 80] },
    columnStyles: { 1: { halign: "right" } },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // --- SEÇÃO: ANÁLISE DE DESPESAS ---
  const despesasDoMesParaAnalise = transacoes.filter(
    (t) => t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA,
  );
  const calcularSubtotaisAnalise = (cat) => {
    const d = despesasDoMesParaAnalise.filter((t) => t.categoria === cat);
    return {
      unica: d
        .filter((t) => t.frequencia === CONSTS.FREQUENCIA.UNICA)
        .reduce((s, t) => s + t.valor, 0),
      recorrente: d
        .filter((t) => t.frequencia === CONSTS.FREQUENCIA.RECORRENTE)
        .reduce((s, t) => s + t.valor, 0),
      parcelada: d
        .filter((t) => t.frequencia === CONSTS.FREQUENCIA.PARCELADA)
        .reduce((s, t) => s + t.valor, 0),
    };
  };

  const subsOrdAnalise = calcularSubtotaisAnalise(
    CONSTS.CATEGORIA_DESPESA.ORDINARIA,
  );
  const subsCartaoAnalise = calcularSubtotaisAnalise(
    CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO,
  );
  const somaSubsOrd = Object.values(subsOrdAnalise).reduce((a, b) => a + b, 0);
  const somaSubsCartao = Object.values(subsCartaoAnalise).reduce(
    (a, b) => a + b,
    0,
  );

  doc.autoTable({
    startY: currentY,
    head: [
      [
        "ANÁLISE DE DESPESAS",
        "ÚNICA",
        "RECORRENTE",
        "PARCELADA",
        "TOTAL (% SALÁRIO)",
      ],
    ],
    body: [
      [
        "Gastos Ordinários",
        formatCurrency(subsOrdAnalise.unica),
        formatCurrency(subsOrdAnalise.recorrente),
        formatCurrency(subsOrdAnalise.parcelada),
        `${formatCurrency(somaSubsOrd)} (${((somaSubsOrd / (totalReceitas || 1)) * 100).toFixed(1)}%)`,
      ],
      [
        "Cartão de Crédito",
        formatCurrency(subsCartaoAnalise.unica),
        formatCurrency(subsCartaoAnalise.recorrente),
        formatCurrency(subsCartaoAnalise.parcelada),
        `${formatCurrency(somaSubsCartao)} (${((somaSubsCartao / (totalReceitas || 1)) * 100).toFixed(1)}%)`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [52, 73, 94] },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // SEÇÃO 1: RECEITAS
  doc.autoTable({
    startY: currentY,
    head: [["1. RECEITAS", "VALOR"]],
    body: [
      ...receitas.map((r) => [r.nome, formatCurrency(r.valor)]),
      [
        {
          content: "TOTAL RECEITAS",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        {
          content: formatCurrency(totalReceitas),
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [240, 240, 240],
          },
        },
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [39, 174, 96] },
    columnStyles: { 1: { halign: "right" } },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // SEÇÃO 2: ORÇAMENTOS
  doc.autoTable({
    startY: currentY,
    head: [["2. PLANEJAMENTO (ORÇAMENTOS)", "PREVISTO", "GASTO", "SALDO"]],
    body: [
      ...dadosOrcamentos,
      [
        {
          content: "TOTAIS",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        {
          content: formatCurrency(totalPrevistoOrcamentos),
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [240, 240, 240],
          },
        },
        {
          content: formatCurrency(totalGastoRealOrcamentos),
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [240, 240, 240],
          },
        },
        {
          content: formatCurrency(
            totalPrevistoOrcamentos - totalGastoRealOrcamentos,
          ),
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [240, 240, 240],
          },
        },
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [52, 152, 219] },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // SEÇÃO 3: DESPESAS ORDINÁRIAS
  doc.autoTable({
    startY: currentY,
    head: [["3. DESPESAS ORDINÁRIAS", "FREQ.", "VALOR"]],
    body: [
      ...despesasOrd.map((d) => [
        d.nome,
        d.frequencia,
        formatCurrency(d.valor),
      ]),
      [
        {
          content: "TOTAL ORDINÁRIAS",
          colSpan: 2,
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        {
          content: formatCurrency(totalOrd),
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [240, 240, 240],
          },
        },
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [142, 68, 173] },
    columnStyles: { 2: { halign: "right" } },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // SEÇÃO 4: CARTÕES
  if (dadosCartoes.length > 0) {
    doc.autoTable({
      startY: currentY,
      head: [["4. CARTÕES DE CRÉDITO", "TOTAL"]],
      body: [
        ...dadosCartoes,
        [
          {
            content: "TOTAL CARTÕES",
            styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
          },
          {
            content: formatCurrency(totalFaturas),
            styles: {
              fontStyle: "bold",
              halign: "right",
              fillColor: [240, 240, 240],
            },
          },
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [230, 126, 34] },
      columnStyles: { 1: { halign: "right" } },
    });
    currentY = doc.lastAutoTable.finalY + 15;
  }

  // Rodapé
  doc.setFontSize(9);
  doc.setTextColor(149, 165, 166);
  doc.text(
    `Backup gerado em: ${new Date().toLocaleString("pt-BR")} | Finan - Controle Financeiro Pessoal`,
    margin,
    currentY,
  );

  doc.save(`Finan_Extrato_${mesAno}.pdf`);
}
