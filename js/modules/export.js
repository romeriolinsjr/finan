import { state } from "./state.js";
import { CONSTS } from "./constants.js";
import {
  formatCurrency,
  getMesAnoChave,
  calcularTotalAjustes,
  isOrcamentoFechado,
} from "./utils.js";

// Função auxiliar para carregar a logo (favicon)
const getLogoBase64 = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = "favicon.png"; // Caminho do seu ícone
  });
};

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
  let currentY = 20;

  // --- CORES PADRONIZADAS ---
  const COLOR_BLUE = [52, 152, 219]; // #3498db
  const COLOR_GRAY = [189, 195, 199]; // #bdc3c7
  const COLOR_DARK = [44, 62, 80]; // #2c3e50
  const COLOR_BG_HEADER = [241, 244, 247]; // #f1f4f7

  // --- FUNÇÕES AUXILIARES DE ESTILIZAÇÃO ---
  const drawSectionHeader = (title, y) => {
    // Fundo cinza claro
    doc.setFillColor(...COLOR_BG_HEADER);
    doc.rect(margin, y, pageWidth - margin * 2, 10, "F");
    // Borda azul à esquerda
    doc.setFillColor(...COLOR_BLUE);
    doc.rect(margin, y, 1.5, 10, "F");
    // Texto
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_DARK);
    doc.text(title.toUpperCase(), margin + 5, y + 6.5);
    return y + 15;
  };

  // --- 1. PREPARAÇÃO DE DADOS ---
  const transacoes = state.transacoes.filter(
    (t) => t.mesAnoReferencia === mesAno,
  );
  const activeBudgetIds = state.orcamentos.map((o) => o.id);

  // Filtra e ordena as receitas por valor decrescente
  const receitas = transacoes
    .filter((t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA)
    .sort((a, b) => b.valor - a.valor);

  const totalReceitas = receitas.reduce((s, t) => s + t.valor, 0);

  // Orçamentos
  let totalGastoRealOrcamentos = 0;
  let totalPrevistoOrcamentos = 0;
  let despesasProjetadas = 0;
  const orcamentosExport = state.orcamentos
    .filter((o) => o.mesAnoReferencia === mesAno)
    .sort((a, b) => {
      if (a.isFixedOrdinary) return -1;
      if (b.isFixedOrdinary) return 1;
      if (a.isFixed) return -1;
      if (b.isFixed) return 1;
      return b.valor - a.valor;
    });

  const dadosOrcamentos = orcamentosExport.map((orc) => {
    let gasto = transacoes
      .filter((t) => t.orcamentoId === orc.id)
      .reduce((s, t) => s + t.valor, 0);
    if (orc.isFixed)
      gasto += transacoes
        .filter(
          (t) =>
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
            (!t.orcamentoId || !activeBudgetIds.includes(t.orcamentoId)),
        )
        .reduce((s, t) => s + t.valor, 0);
    if (orc.isFixedOrdinary)
      gasto += transacoes
        .filter((t) => t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA)
        .reduce((s, t) => s + t.valor, 0);

    totalGastoRealOrcamentos += gasto;
    totalPrevistoOrcamentos += orc.valor;
    despesasProjetadas += isOrcamentoFechado(orc.id, mesAno)
      ? gasto
      : Math.max(orc.valor, gasto);
    return [
      orc.nome,
      formatCurrency(orc.valor),
      formatCurrency(gasto),
      formatCurrency(orc.valor - gasto),
    ];
  });

  const totalAjustesMes = state.ajustesFatura
    .filter((a) => a.mesAnoReferencia === mesAno)
    .reduce((s, a) => s + a.valor, 0);
  const despesasTotaisResumo = despesasProjetadas - totalAjustesMes;
  const saldoFinalResumo = totalReceitas - despesasTotaisResumo;

  // --- 2. CABEÇALHO COM LOGO ---
  const logo = await getLogoBase64();
  if (logo) {
    doc.addImage(logo, "PNG", margin, 12, 10, 10);
  }
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_DARK);
  doc.text("FINAN", logo ? margin + 12 : margin, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(127, 140, 141);
  doc.text(`EXTRATO MENSAL: ${nomeMes.toUpperCase()}`, pageWidth - margin, 20, {
    align: "right",
  });

  currentY = 30;

  // --- SEÇÃO: RESUMO GERAL ---
  currentY = drawSectionHeader("Resumo Geral", currentY);
  doc.autoTable({
    startY: currentY,
    body: [
      ["Receitas Totais", formatCurrency(totalReceitas)],
      ["Despesas Totais", formatCurrency(despesasTotaisResumo)],
      ["Saldo Final", formatCurrency(saldoFinalResumo)],
    ],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didDrawCell: (data) => {
      if (data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
      if (data.row.index === 2 && data.column.index === 1) {
        doc.setTextColor(
          saldoFinalResumo >= 0 ? 39 : 231,
          saldoFinalResumo >= 0 ? 174 : 76,
          saldoFinalResumo >= 0 ? 96 : 60,
        );
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // --- SEÇÃO: ANÁLISE DE DESPESAS ---
  currentY = drawSectionHeader("Análise de Despesas", currentY);
  const calcAnalise = (cat) => {
    const d = transacoes.filter(
      (t) => t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA && t.categoria === cat,
    );
    const u = d
      .filter((t) => t.frequencia === CONSTS.FREQUENCIA.UNICA)
      .reduce((s, t) => s + t.valor, 0);
    const r = d
      .filter((t) => t.frequencia === CONSTS.FREQUENCIA.RECORRENTE)
      .reduce((s, t) => s + t.valor, 0);
    const p = d
      .filter((t) => t.frequencia === CONSTS.FREQUENCIA.PARCELADA)
      .reduce((s, t) => s + t.valor, 0);
    return { u, r, p, total: u + r + p };
  };

  const aOrd = calcAnalise(CONSTS.CATEGORIA_DESPESA.ORDINARIA);
  const aCartao = calcAnalise(CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO);

  doc.autoTable({
    startY: currentY,
    head: [["", "ÚNICAS", "RECORRENTES", "PARCELADAS", "TOTAL"]], // Cabeçalho da 1ª coluna removido
    body: [
      [
        "Ordinárias",
        formatCurrency(aOrd.u),
        formatCurrency(aOrd.r),
        formatCurrency(aOrd.p),
        formatCurrency(aOrd.total),
      ],
      [
        "Cartão de Crédito",
        formatCurrency(aCartao.u),
        formatCurrency(aCartao.r),
        formatCurrency(aCartao.p),
        formatCurrency(aCartao.total),
      ],
    ],
    theme: "plain",
    headStyles: {
      fontStyle: "bold",
      textColor: [100, 100, 100],
      halign: "right",
    },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // --- SEÇÃO: ANÁLISE DE ORÇAMENTOS ---
  currentY = drawSectionHeader("Análise de Orçamentos", currentY);
  doc.autoTable({
    startY: currentY,
    head: [["", "PREVISTO", "GASTO", "SALDO"]], // Cabeçalho da 1ª coluna removido
    body: [
      ...dadosOrcamentos,
      [
        { content: "TOTAL", styles: { fontStyle: "bold" } },
        formatCurrency(totalPrevistoOrcamentos),
        formatCurrency(totalGastoRealOrcamentos),
        formatCurrency(totalPrevistoOrcamentos - totalGastoRealOrcamentos),
      ],
    ],
    theme: "plain",
    headStyles: {
      fontStyle: "bold",
      textColor: [100, 100, 100],
      halign: "right",
    },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // --- SEÇÃO: RECEITAS (DETALHADO) ---
  currentY = drawSectionHeader("Receitas", currentY);
  doc.autoTable({
    startY: currentY - 5, // Ajuste para subir a lista para perto do título
    showHead: false, // Remove completamente a linha do cabeçalho
    body:
      receitas.length > 0
        ? [
            ...receitas.map((r) => [r.nome, formatCurrency(r.valor)]),
            [
              { content: "TOTAL", styles: { fontStyle: "bold" } },
              formatCurrency(totalReceitas),
            ],
          ]
        : [["Nenhuma receita registrada", "-"]],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // --- SEÇÃO: DESPESAS (DETALHADO) ---
  currentY = drawSectionHeader("Despesas", currentY);

  // Sub-tabela: Ordinárias
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ORDINÁRIAS", margin, currentY);
  currentY += 4;

  // Filtra e ordena as ordinárias por valor decrescente
  const despesasOrd = transacoes
    .filter(
      (t) =>
        t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA &&
        t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA,
    )
    .sort((a, b) => b.valor - a.valor);

  const totalOrdLocal = despesasOrd.reduce((s, t) => s + t.valor, 0);

  doc.autoTable({
    startY: currentY,
    showHead: false,
    body:
      despesasOrd.length > 0
        ? [
            ...despesasOrd.map((d) => [d.nome, formatCurrency(d.valor)]),
            [
              { content: "TOTAL", styles: { fontStyle: "bold" } },
              formatCurrency(totalOrdLocal),
            ],
          ]
        : [["Nenhuma despesa ordinária", "-"]],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Sub-tabela: Cartão de Crédito (Resumo por Fatura)
  doc.setFont("helvetica", "bold");
  doc.text("CARTÃO DE CRÉDITO", margin, currentY);
  currentY += 4;

  // Mapeia os dados das faturas, mantendo o valor numérico para ordenação
  const resumoFaturasLista = state.cartoes
    .filter((c) => !c.deletado || transacoes.some((t) => t.cartaoId === c.id))
    .map((cartao) => {
      const totalGasto = transacoes
        .filter((t) => t.cartaoId === cartao.id)
        .reduce((s, t) => s + t.valor, 0);
      const ajustes = calcularTotalAjustes(cartao.id, mesAno);
      const valorFinal = totalGasto - ajustes;
      return totalGasto > 0
        ? { nome: `Fatura ${cartao.nome}`, valor: valorFinal }
        : null;
    })
    .filter((item) => item !== null)
    .sort((a, b) => b.valor - a.valor); // Ordena as faturas por valor decrescente

  const totalFaturasResumo = resumoFaturasLista.reduce(
    (s, item) => s + item.valor,
    0,
  );

  doc.autoTable({
    startY: currentY,
    showHead: false,
    body:
      resumoFaturasLista.length > 0
        ? [
            ...resumoFaturasLista.map((item) => [
              item.nome,
              formatCurrency(item.valor),
            ]),
            [
              { content: "TOTAL", styles: { fontStyle: "bold" } },
              formatCurrency(totalFaturasResumo),
            ],
          ]
        : [["Nenhuma despesa de cartão", "-"]],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });

  // Rodapé final
  const finalY = Math.max(doc.lastAutoTable.finalY + 15, 280);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")} | Finan PWA - Planejamento e Fluxo de Caixa`,
    margin,
    finalY,
  );

  doc.save(`Finan_Extrato_${mesAno}.pdf`);
}
