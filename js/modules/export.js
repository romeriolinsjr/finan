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
    img.src = "favicon.png";
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
  const COLOR_BLUE = [52, 152, 219];
  const COLOR_GRAY = [189, 195, 199];
  const COLOR_DARK = [44, 62, 80];
  const COLOR_BG_HEADER = [241, 244, 247];

  // --- FUNÇÕES AUXILIARES DE ESTILIZAÇÃO ---
  const drawSectionHeader = (title, y) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(...COLOR_BG_HEADER);
    doc.rect(margin, y, pageWidth - margin * 2, 10, "F");
    doc.setFillColor(...COLOR_BLUE);
    doc.rect(margin, y, 1.5, 10, "F");
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

  // Receitas
  const receitas = transacoes
    .filter((t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA)
    .sort((a, b) => b.valor - a.valor);
  const totalReceitas = receitas.reduce((s, t) => s + t.valor, 0);

  // Lógica de Cruzamento de Patrimônio
  const getNatureza = (patrimonioId) => {
    const sub = state.patrimonioSubcategorias.find(
      (s) => s.id === patrimonioId,
    );
    if (!sub) return null;
    const cat = state.patrimonioCategorias.find(
      (c) => c.id === sub.categoriaId,
    );
    return cat?.tipo;
  };

  const patTrans = transacoes.filter(
    (t) => t.tipo === CONSTS.TIPO_TRANSACAO.PATRIMONIO,
  );

  // Detalhamento por Natureza
  const aAtivos = patTrans
    .filter(
      (t) => t.operacao === "aporte" && getNatureza(t.patrimonioId) === "ativo",
    )
    .reduce((s, t) => s + t.valor, 0);
  const rAtivos = patTrans
    .filter(
      (t) =>
        t.operacao === "resgate" && getNatureza(t.patrimonioId) === "ativo",
    )
    .reduce((s, t) => s + t.valor, 0);

  // Taxa baseada no esforço de Aporte (evita percentuais negativos por resgate de juros)
  const taxaAtivos = totalReceitas > 0 ? (aAtivos / totalReceitas) * 100 : 0;

  const aAmortizacao = patTrans
    .filter(
      (t) =>
        t.operacao === "aporte" && getNatureza(t.patrimonioId) === "passivo",
    )
    .reduce((s, t) => s + t.valor, 0);
  const rAmortizacao = patTrans
    .filter(
      (t) =>
        t.operacao === "resgate" && getNatureza(t.patrimonioId) === "passivo",
    )
    .reduce((s, t) => s + t.valor, 0);

  const taxaAmortizacao =
    totalReceitas > 0 ? (aAmortizacao / totalReceitas) * 100 : 0;

  // Operação de Amortização Real (Saída de Saldo)
  const totalAmortizacoesReal = patTrans
    .filter((t) => t.operacao === "amortizacao")
    .reduce((s, t) => s + t.valor, 0);

  // Consolidação
  const totalAportesGeral = aAtivos + aAmortizacao;
  const totalResgatesGeral = rAtivos + rAmortizacao;
  const investimentoLiquidoGeral = totalAportesGeral - totalResgatesGeral;
  const taxaGlobal =
    totalReceitas > 0 ? (totalAportesGeral / totalReceitas) * 100 : 0;

  // Despesas e Orçamentos
  let despesasProjetadas = 0;
  state.orcamentos
    .filter((o) => o.mesAnoReferencia === mesAno)
    .forEach((orc) => {
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
      despesasProjetadas += isOrcamentoFechado(orc.id, mesAno)
        ? gasto
        : Math.max(orc.valor, gasto);
    });

  const totalAjustesMes = state.ajustesFatura
    .filter((a) => a.mesAnoReferencia === mesAno)
    .reduce((s, a) => s + a.valor, 0);
  const despesasTotaisResumo = despesasProjetadas - totalAjustesMes;
  // Correção: Subtrai também a Amortização Real do Saldo
  const saldoFinalResumo =
    totalReceitas +
    totalResgatesGeral -
    (despesasTotaisResumo + totalAportesGeral + totalAmortizacoesReal);

  // --- 2. CABEÇALHO ---
  const logo = await getLogoBase64();
  if (logo) doc.addImage(logo, "PNG", margin, 12, 10, 10);
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

  // --- SEÇÃO 1: RESUMO GERAL ---
  currentY = drawSectionHeader("Resumo Geral", currentY);
  doc.autoTable({
    startY: currentY,
    body: [
      ["Receitas do Mês", formatCurrency(totalReceitas)],
      ["Resgates de Patrimônio (+)", formatCurrency(totalResgatesGeral)],
      ["Aportes em Patrimônio (-)", formatCurrency(totalAportesGeral)],
      ["Amortizações de Passivo (-)", formatCurrency(totalAmortizacoesReal)],
      ["Despesas Totais (Consumo) (-)", formatCurrency(despesasTotaisResumo)],
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
      if (data.row.index === 4 && data.column.index === 1) {
        doc.setTextColor(
          saldoFinalResumo >= 0 ? 39 : 231,
          saldoFinalResumo >= 0 ? 174 : 76,
          saldoFinalResumo >= 0 ? 96 : 60,
        );
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // --- SEÇÃO 2: POSIÇÃO PATRIMONIAL MENSAL (DETALHADA) ---
  currentY = drawSectionHeader("Posição patrimonial mensal", currentY);
  doc.autoTable({
    startY: currentY,
    body: [
      ["Formação de Ativos (Aportes)", formatCurrency(aAtivos)],
      ["Formação de Ativos (Resgates)", formatCurrency(rAtivos)],
      [
        {
          content: "Taxa de aporte (Esforço de poupança)",
          styles: { fontStyle: "italic", textColor: [100, 100, 100] },
        },
        `${taxaAtivos.toFixed(1)}%`,
      ],
      ["Recursos para Amortização (Aportes)", formatCurrency(aAmortizacao)],
      ["Recursos para Amortização (Resgates)", formatCurrency(rAmortizacao)],
      [
        {
          content: "Taxa de aporte (Esforço de poupança)",
          styles: { fontStyle: "italic", textColor: [100, 100, 100] },
        },
        `${taxaAmortizacao.toFixed(1)}%`,
      ],
      [
        { content: "TOTAL DE APORTES", styles: { fontStyle: "bold" } },
        formatCurrency(totalAportesGeral),
      ],
      [
        { content: "TOTAL DE RESGATES", styles: { fontStyle: "bold" } },
        formatCurrency(totalResgatesGeral),
      ],
      [
        {
          content: "INVESTIMENTO LÍQUIDO",
          styles: { fontStyle: "bold", textColor: COLOR_BLUE },
        },
        formatCurrency(investimentoLiquidoGeral),
      ],
      [
        {
          content: "AMORTIZAÇÕES REALIZADAS (PAGAMENTOS)",
          styles: { fontStyle: "bold" },
        },
        formatCurrency(totalAmortizacoesReal),
      ],
      [
        {
          content: "TAXA GLOBAL DE APORTE",
          styles: { fontStyle: "bold" },
        },
        `${taxaGlobal.toFixed(1)}%`,
      ],
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didDrawCell: (data) => {
      if (data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // --- SEÇÃO 3: POSIÇÃO PATRIMONIAL ACUMULADA (HISTÓRICA) ---
  currentY = drawSectionHeader("Posição patrimonial acumulada", currentY);

  // O saldo acumulado deve considerar apenas transações até o mês do relatório (mesAno)
  const totalGeralEstoque = (state.patrimonioSubcategorias || []).reduce(
    (acc, sub) => {
      let saldo = Number(sub.saldoInicial) || 0;
      const hist = state.transacoes.filter(
        (t) => t.patrimonioId === sub.id && t.mesAnoReferencia <= mesAno,
      );
      hist.forEach((t) => {
        const v = Number(t.valor) || 0;
        if (t.operacao === "aporte") saldo += v;
        else if (t.operacao === "resgate") saldo -= v;
        else if (t.operacao === "ajuste") saldo += v;
      });
      return acc + saldo;
    },
    0,
  );

  const dadosEstoque = (state.patrimonioCategorias || [])
    .map((cat) => {
      const filhos = (state.patrimonioSubcategorias || []).filter(
        (s) => s.categoriaId === cat.id,
      );
      let totalCat = 0;
      filhos.forEach((sub) => {
        let saldo = Number(sub.saldoInicial) || 0;
        const hist = state.transacoes.filter(
          (t) => t.patrimonioId === sub.id && t.mesAnoReferencia <= mesAno,
        );
        hist.forEach((t) => {
          const v = Number(t.valor) || 0;
          if (t.operacao === "aporte") saldo += v;
          else if (t.operacao === "resgate") saldo -= v;
          else if (t.operacao === "ajuste") saldo += v;
        });
        totalCat += saldo;
      });
      return [
        cat.nome,
        cat.tipo === "ativo"
          ? "FORMAÇÃO DE ATIVOS"
          : "RECURSOS PARA AMORTIZAÇÃO",
        formatCurrency(totalCat),
        totalCat,
      ];
    })
    .filter((d) => d[3] !== 0)
    .sort((a, b) => b[3] - a[3]);

  doc.autoTable({
    startY: currentY,
    head: [["CATEGORIA", "NATUREZA", "VALOR ACUMULADO"]],
    body: [
      ...dadosEstoque.map((d) => [d[0], d[1], d[2]]),
      [
        {
          content: "PATRIMÔNIO ACUMULADO TOTAL (ESTOQUE)",
          colSpan: 2,
          styles: { fontStyle: "bold" },
        },
        {
          content: formatCurrency(totalGeralEstoque),
          styles: { fontStyle: "bold", halign: "right" },
        },
      ],
    ],
    theme: "plain",
    headStyles: {
      fontStyle: "bold",
      textColor: [100, 100, 100],
      halign: "left",
    },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: { 2: { halign: "right" } },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // --- SEÇÃO 4: RECEITAS (DETALHADO) ---
  currentY = drawSectionHeader("Receitas", currentY);
  doc.autoTable({
    startY: currentY - 5,
    showHead: false,
    body:
      receitas.length > 0
        ? [
            ...receitas.map((r) => [r.nome, formatCurrency(r.valor)]),
            [
              { content: "TOTAL DE RECEITAS", styles: { fontStyle: "bold" } },
              formatCurrency(totalReceitas),
            ],
          ]
        : [["Nenhuma receita registrada", "-"]],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // --- SEÇÃO 5: DESPESAS (DETALHADO) ---
  currentY = drawSectionHeader("Despesas", currentY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ORDINÁRIAS", margin, currentY);
  currentY += 4;

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
              { content: "TOTAL DE ORDINÁRIAS", styles: { fontStyle: "bold" } },
              formatCurrency(totalOrdLocal),
            ],
          ]
        : [["Nenhuma despesa ordinária", "-"]],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 8;

  doc.setFont("helvetica", "bold");
  doc.text("CARTÃO DE CRÉDITO", margin, currentY);
  currentY += 4;

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
    .sort((a, b) => b.valor - a.valor);

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
              { content: "TOTAL DE CARTÕES", styles: { fontStyle: "bold" } },
              formatCurrency(totalFaturasResumo),
            ],
          ]
        : [["Nenhuma despesa de cartão", "-"]],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
    },
  });

  // Rodapé final
  const finalY = Math.min(doc.lastAutoTable.finalY + 15, 285);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")} | Finan PWA - Inteligência Patrimonial`,
    margin,
    finalY,
  );

  doc.save(`Finan_Extrato_${mesAno}.pdf`);
}
