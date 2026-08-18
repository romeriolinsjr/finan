import { state } from "./state.js";
import { CONSTS } from "./constants.js";
import {
  formatCurrency,
  getMesAnoChave,
  calcularTotalAjustes,
  isOrcamentoFechado,
  parseDateString,
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

  // 1.1 Receitas
  const receitas = transacoes
    .filter((t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA)
    .sort((a, b) => b.valor - a.valor);
  const totalReceitas = receitas.reduce((s, t) => s + t.valor, 0);

  // 1.2 Lógica Patrimonial (Fluxo e Estoque)
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

  // FLUXO PATRIMONIAL MENSAL (PARA SEÇÃO 5)
  const aAtivos = patTrans
    .filter(
      (t) =>
        t.operacao === CONSTS.OPERACAO_PATRIMONIO.APORTE &&
        getNatureza(t.patrimonioId) === CONSTS.SUBTIPO_PATRIMONIO.ATIVO,
    )
    .reduce((s, t) => s + t.valor, 0);
  const rAtivos = patTrans
    .filter(
      (t) =>
        t.operacao === CONSTS.OPERACAO_PATRIMONIO.RESGATE &&
        getNatureza(t.patrimonioId) === CONSTS.SUBTIPO_PATRIMONIO.ATIVO,
    )
    .reduce((s, t) => s + t.valor, 0);
  const invLiquidoAtivos = aAtivos - rAtivos;

  const aAmort = patTrans
    .filter(
      (t) =>
        t.operacao === CONSTS.OPERACAO_PATRIMONIO.APORTE &&
        getNatureza(t.patrimonioId) === CONSTS.SUBTIPO_PATRIMONIO.AMORTIZACAO,
    )
    .reduce((s, t) => s + t.valor, 0);
  const rAmort = patTrans
    .filter(
      (t) =>
        t.operacao === CONSTS.OPERACAO_PATRIMONIO.RESGATE &&
        getNatureza(t.patrimonioId) === CONSTS.SUBTIPO_PATRIMONIO.AMORTIZACAO,
    )
    .reduce((s, t) => s + t.valor, 0);
  const invLiquidoAmort = aAmort - rAmort;

  const totalAportesGeral = aAtivos + aAmort;
  const totalResgatesGeral = rAtivos + rAmort;
  const totalAmortizacoesReal = patTrans
    .filter((t) => t.operacao === CONSTS.OPERACAO_PATRIMONIO.AMORTIZACAO)
    .reduce((s, t) => s + t.valor, 0);
  const investimentoLiquidoMensalTotal = totalAportesGeral - totalResgatesGeral;
  const taxaInvestimentoLiquido =
    totalReceitas > 0
      ? (investimentoLiquidoMensalTotal / totalReceitas) * 100
      : 0;

  const indDestAmortizacao =
    totalResgatesGeral + totalAmortizacoesReal > 0
      ? (totalAmortizacoesReal / (totalResgatesGeral + totalAmortizacoesReal)) *
        100
      : 0;

  // ESTOQUE PATRIMONIAL (ACUMULADO ATÉ O MÊS - APENAS FORMAÇÃO DE ATIVOS)
  let saldoAcumuladoAtivos = 0;
  let totalAjustesAtivosMes = 0;
  let totalAmortizacoesAtivosMes = 0;

  const dadosEstoqueAtivos = (state.patrimonioCategorias || [])
    .filter((cat) => cat.tipo === CONSTS.SUBTIPO_PATRIMONIO.ATIVO)
    .map((cat) => {
      const filhos = (state.patrimonioSubcategorias || []).filter(
        (s) => s.categoriaId === cat.id,
      );
      let totalCat = 0;
      filhos.forEach((sub) => {
        let saldo = Number(sub.saldoInicial) || 0;
        const historico = state.transacoes.filter(
          (t) => t.patrimonioId === sub.id && t.mesAnoReferencia <= mesAno,
        );
        historico.forEach((t) => {
          const v = Number(t.valor) || 0;
          if (t.operacao === CONSTS.OPERACAO_PATRIMONIO.APORTE) saldo += v;
          else if (t.operacao === CONSTS.OPERACAO_PATRIMONIO.RESGATE)
            saldo -= v;
          else if (t.operacao === CONSTS.OPERACAO_PATRIMONIO.AJUSTE) {
            saldo += v;
            if (t.mesAnoReferencia === mesAno) totalAjustesAtivosMes += v;
          } else if (t.operacao === CONSTS.OPERACAO_PATRIMONIO.AMORTIZACAO) {
            saldo -= v;
            if (t.mesAnoReferencia === mesAno) totalAmortizacoesAtivosMes += v;
          }
        });
        totalCat += saldo;
      });
      saldoAcumuladoAtivos += totalCat;
      return { nome: cat.nome, saldo: totalCat };
    })
    .filter((d) => d.saldo !== 0)
    .sort((a, b) => b.saldo - a.saldo);

  // CÁLCULO TCP (ATIVOS): Saldo Inicial = Saldo Final - Aportes + Resgates - Ajustes + Amortizações
  const saldoInicialAtivos =
    saldoAcumuladoAtivos -
    invLiquidoAtivos -
    totalAjustesAtivosMes +
    totalAmortizacoesAtivosMes;
  const crescimentoAtivos =
    saldoInicialAtivos > 0
      ? (invLiquidoAtivos / saldoInicialAtivos) * 100
      : saldoInicialAtivos === 0 && invLiquidoAtivos > 0
        ? 100
        : 0;

  // 1.3 Lógica de Orçamentos e Despesas
  let despesasProjetadasCalculoResumo = 0;
  const dadosOrcamentosTabela = state.orcamentos
    .filter((o) => o.mesAnoReferencia === mesAno)
    .map((orc) => {
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
      const fechado = isOrcamentoFechado(orc.id, mesAno);
      despesasProjetadasCalculoResumo += fechado
        ? gasto
        : Math.max(orc.valor, gasto);
      return {
        nome: orc.nome,
        previsto: orc.valor,
        gasto: gasto,
        saldo: orc.valor - gasto,
      };
    })
    .sort((a, b) => b.previsto - a.previsto);

  const totalAjustesMes = state.ajustesFatura
    .filter((a) => a.mesAnoReferencia === mesAno)
    .reduce((s, a) => s + a.valor, 0);
  const despesasTotaisResumo =
    despesasProjetadasCalculoResumo - totalAjustesMes;
  const saldoFinalResumo =
    totalReceitas +
    totalResgatesGeral -
    (despesasTotaisResumo + totalAportesGeral);

  // --- 2. GERAÇÃO DO PDF ---
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

  // 1. RESUMO GERAL
  currentY = drawSectionHeader("Resumo Geral", currentY);
  doc.autoTable({
    startY: currentY,
    body: [
      ["Receitas", formatCurrency(totalReceitas)],
      ["Resgates de Patrimônio (+)", formatCurrency(totalResgatesGeral)],
      ["Aportes em Patrimônio (-)", formatCurrency(totalAportesGeral)],
      ["Amortizações Realizadas", formatCurrency(totalAmortizacoesReal)],
      ["Despesas Totais (Consumo) (-)", formatCurrency(despesasTotaisResumo)],
      ["Saldo", formatCurrency(saldoFinalResumo)],
    ],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didDrawCell: (data) => {
      if (data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
      if (data.row.index === 5 && data.column.index === 1) {
        doc.setTextColor(
          saldoFinalResumo >= 0 ? 39 : 231,
          saldoFinalResumo >= 0 ? 174 : 76,
          saldoFinalResumo >= 0 ? 96 : 60,
        );
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 2. RECEITAS
  currentY = drawSectionHeader("Receitas", currentY);
  doc.autoTable({
    startY: currentY - 5,
    showHead: false,
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
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1, data.cell.height - 2, "F");
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 3. ORÇAMENTOS
  currentY = drawSectionHeader("Orçamentos", currentY);
  doc.autoTable({
    startY: currentY - 5,
    head: [["ORÇAMENTO", "PREVISTO", "GASTO", "SALDO"]],
    body:
      dadosOrcamentosTabela.length > 0
        ? [
            ...dadosOrcamentosTabela.map((o) => [
              o.nome,
              formatCurrency(o.previsto),
              formatCurrency(o.gasto),
              formatCurrency(o.saldo),
            ]),
            [
              { content: "TOTAL", styles: { fontStyle: "bold" } },
              {
                content: formatCurrency(
                  dadosOrcamentosTabela.reduce((s, o) => s + o.previsto, 0),
                ),
                styles: { fontStyle: "bold" },
              },
              {
                content: formatCurrency(
                  dadosOrcamentosTabela.reduce((s, o) => s + o.gasto, 0),
                ),
                styles: { fontStyle: "bold" },
              },
              {
                content: formatCurrency(
                  dadosOrcamentosTabela.reduce((s, o) => s + o.saldo, 0),
                ),
                styles: { fontStyle: "bold" },
              },
            ],
          ]
        : [["Nenhum orçamento cadastrado", "-", "-", "-"]],
    theme: "plain",
    headStyles: { fontStyle: "bold", textColor: [100, 100, 100] },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      if (
        data.section === "body" &&
        data.column.index === 3 &&
        data.cell.raw !== "R$ 0,00" &&
        !data.row.raw[0].content
      ) {
        const val = parseFloat(
          data.cell.raw.replace(/[R$\s.]/g, "").replace(",", "."),
        );
        if (val < 0) doc.setTextColor(231, 76, 60);
      }
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 4. DESPESAS
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
  doc.autoTable({
    startY: currentY,
    showHead: false,
    body:
      despesasOrd.length > 0
        ? [
            ...despesasOrd.map((d) => [d.nome, formatCurrency(d.valor)]),
            [
              { content: "TOTAL", styles: { fontStyle: "bold" } },
              formatCurrency(despesasOrd.reduce((s, t) => s + t.valor, 0)),
            ],
          ]
        : [["Nenhuma despesa ordinária", "-"]],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
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
      return totalGasto > 0
        ? { nome: `Fatura ${cartao.nome}`, valor: totalGasto - ajustes }
        : null;
    })
    .filter((item) => item !== null)
    .sort((a, b) => b.valor - a.valor);
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
              formatCurrency(
                resumoFaturasLista.reduce((s, i) => s + i.valor, 0),
              ),
            ],
          ]
        : [["Nenhuma despesa de cartão", "-"]],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 5. POSIÇÃO PATRIMONIAL MENSAL
  currentY = drawSectionHeader("Posição patrimonial mensal", currentY);
  const cardH = 35;
  doc.setFillColor(245, 250, 245);
  doc.rect(margin, currentY, (pageWidth - margin * 2) / 2 - 2, cardH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(39, 174, 96);
  doc.text("FORMAÇÃO DE ATIVOS", margin + 5, currentY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_DARK);
  doc.text(`Aportes: ${formatCurrency(aAtivos)}`, margin + 5, currentY + 15);
  doc.text(`Resgates: ${formatCurrency(rAtivos)}`, margin + 5, currentY + 20);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Investimento Líquido: ${formatCurrency(invLiquidoAtivos)}`,
    margin + 5,
    currentY + 27,
  );

  const secondColX = margin + (pageWidth - margin * 2) / 2 + 2;
  doc.setFillColor(240, 245, 250);
  doc.rect(secondColX, currentY, (pageWidth - margin * 2) / 2 - 2, cardH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(52, 152, 219);
  doc.text("RECURSOS PARA AMORTIZAÇÃO", secondColX + 5, currentY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_DARK);
  doc.text(`Aportes: ${formatCurrency(aAmort)}`, secondColX + 5, currentY + 15);
  doc.text(
    `Resgates: ${formatCurrency(rAmort)}`,
    secondColX + 5,
    currentY + 20,
  );
  doc.setFont("helvetica", "bold");
  doc.text(
    `Investimento Líquido: ${formatCurrency(invLiquidoAmort)}`,
    secondColX + 5,
    currentY + 27,
  );

  currentY += 40;
  doc.autoTable({
    startY: currentY,
    body: [
      ["TOTAL DE APORTES", formatCurrency(totalAportesGeral)],
      ["TOTAL DE RESGATES", formatCurrency(totalResgatesGeral)],
      [
        {
          content: "INVESTIMENTO LÍQUIDO",
          styles: { fontStyle: "bold", textColor: COLOR_BLUE },
        },
        formatCurrency(investimentoLiquidoMensalTotal),
      ],
      ["AMORTIZAÇÕES REALIZADAS", formatCurrency(totalAmortizacoesReal)],
      [
        {
          content: "ÍNDICE DE DESTINAÇÃO PARA AMORTIZAÇÃO",
          styles: { fontStyle: "bold" },
        },
        `${indDestAmortizacao.toFixed(1)}%`,
      ],
      [
        {
          content: "TAXA DE INVESTIMENTO LÍQUIDO",
          styles: { fontStyle: "bold" },
        },
        `${taxaInvestimentoLiquido.toFixed(1)}%`,
      ],
    ],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });

  currentY = doc.lastAutoTable.finalY + 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(
    "(a) Investimento líquido: Aportes realizados menos resgates efetuados.",
    margin,
    currentY,
  );
  doc.text(
    "(b) Índice de destinação: Amortizações em relação ao total de saídas do patrimônio (Resgates + Amortizações).",
    margin,
    currentY + 4,
  );
  doc.text(
    "(c) Taxa de investimento líquido: Percentual do rendimento mensal destinado ao aumento do patrimônio.",
    margin,
    currentY + 8,
  );
  currentY += 15;

  // 6. POSIÇÃO PATRIMONIAL ACUMULADA (FOCO EXCLUSIVO EM ATIVOS)
  currentY = drawSectionHeader("Posição patrimonial acumulada", currentY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Esta seção contempla exclusivamente as contas de Formação de Ativos.",
    margin,
    currentY - 2,
  );

  doc.autoTable({
    startY: currentY,
    head: [["CONTA (FORMAÇÃO DE ATIVOS)", "SALDO ACUMULADO"]],
    body: [
      ...dadosEstoqueAtivos.map((d) => [d.nome, formatCurrency(d.saldo)]),
      [
        {
          content: "TOTAL ACUMULADO",
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
        {
          content: formatCurrency(saldoAcumuladoAtivos),
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [240, 240, 240],
          },
        },
      ],
      [
        {
          content: "TAXA DE CRESCIMENTO PATRIMONIAL NO CICLO",
          styles: { fontStyle: "bold" },
        },
        {
          content: `${crescimentoAtivos.toFixed(1)}%`,
          styles: { fontStyle: "bold", halign: "right" },
        },
      ],
    ],
    theme: "plain",
    headStyles: { fontStyle: "bold", textColor: [100, 100, 100] },
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    columnStyles: { 1: { halign: "right" } },
  });

  const finalY = Math.min(doc.lastAutoTable.finalY + 15, 285);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")} | Finan PWA`,
    margin,
    finalY,
  );
  doc.save(`Finan_Extrato_${mesAno}.pdf`);
}
