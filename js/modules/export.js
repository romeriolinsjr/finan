import { state } from "./state.js";
import { CONSTS } from "./constants.js";
import {
  formatCurrency,
  getMesAnoChave,
  calcularTotalAjustes,
  isOrcamentoFechado,
  parseDateString,
} from "./utils.js";
import { obterDadosFinanceirosAgrupados } from "./reports.js";
import { obterSaldoItemAteMes } from "./patrimony.js";

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

  const COLOR_BLUE = [52, 152, 219];
  const COLOR_GRAY = [189, 195, 199];
  const COLOR_DARK = [44, 62, 80];
  const COLOR_BG_HEADER = [241, 244, 247];
  const COLOR_BG_SECTION = [248, 250, 252]; // Fundo cinza-gelo suave para delimitar as seções

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

  // --- 1. CONSUMO DO MOTOR CENTRALIZADO ---
  const dados = obterDadosFinanceirosAgrupados(state.currentDate);
  const transacoes = state.transacoes.filter(
    (t) => t.mesAnoReferencia === mesAno,
  );

  const receitasLista = transacoes
    .filter((t) => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA)
    .sort((a, b) => b.valor - a.valor);

  // 1.2 Estoque Patrimonial (Consome o motor oficial e respeita a Máquina do Tempo)
  const dataMesAnterior = new Date(
    state.currentDate.getFullYear(),
    state.currentDate.getMonth() - 1,
    1,
  );
  const mesAnoAnterior = getMesAnoChave(dataMesAnterior);

  let saldoAcumuladoAtivos = 0;
  let saldoInicialAtivos = 0;

  const dadosEstoqueAtivos = (state.patrimonioCategorias || [])
    .filter(
      (cat) =>
        cat.tipo === CONSTS.SUBTIPO_PATRIMONIO.ATIVO || cat.tipo === "ativo",
    )
    .map((cat) => {
      // Filtra apenas itens existentes até o mês de referência consultado
      const filhos = (state.patrimonioSubcategorias || []).filter(
        (s) =>
          s.categoriaId === cat.id &&
          (!s.mesAnoCriacao || s.mesAnoCriacao <= mesAno),
      );
      let totalCat = 0;
      filhos.forEach((sub) => {
        const saldoFinalItem = obterSaldoItemAteMes(sub.id, mesAno);
        const saldoInicialItem = obterSaldoItemAteMes(sub.id, mesAnoAnterior);
        totalCat += saldoFinalItem;
        saldoInicialAtivos += saldoInicialItem;
      });
      saldoAcumuladoAtivos += totalCat;
      return { nome: cat.nome, saldo: totalCat };
    })
    .filter((d) => d.saldo !== 0)
    .sort((a, b) => b.saldo - a.saldo);

  // Cálculo TCP (Restrito à Formação de Ativos, capturando Aportes e Rendimentos/Ajustes)
  const deltaAtivos = saldoAcumuladoAtivos - saldoInicialAtivos;
  const crescimentoAtivos =
    saldoInicialAtivos > 0
      ? (deltaAtivos / saldoInicialAtivos) * 100
      : saldoAcumuladoAtivos > 0
        ? 100
        : 0;

  const activeBudgetIds = state.orcamentos.map((o) => o.id);
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
      return {
        nome: orc.nome,
        previsto: orc.valor,
        gasto: gasto,
        saldo: orc.valor - gasto,
      };
    })
    .sort((a, b) => b.previsto - a.previsto);

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
      ["Receitas Totais", formatCurrency(dados.totalReceitas)],
      ["Resgates", formatCurrency(dados.totalResgates)],
      ["Despesas Totais", formatCurrency(dados.despesasTotaisLiquidas)],
      ["Aportes", formatCurrency(dados.totalAportesGeral)],
      ["Amortizações", formatCurrency(dados.totalAmortizacoes)],
      ["Saldo Final", formatCurrency(dados.saldoFinal)],
      ["Saldo Real", formatCurrency(dados.saldoReal)],
    ],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4, fillColor: COLOR_BG_SECTION },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didDrawCell: (data) => {
      if (data.column.index === 0) {
        doc.setFillColor(...COLOR_GRAY);
        doc.rect(data.cell.x, data.cell.y + 1, 1.2, data.cell.height - 2, "F");
      }
      if (
        (data.row.index === 5 || data.row.index === 6) &&
        data.column.index === 1
      ) {
        const val = data.row.index === 5 ? dados.saldoFinal : dados.saldoReal;
        doc.setTextColor(
          val >= 0 ? 39 : 231,
          val >= 0 ? 174 : 76,
          val >= 0 ? 96 : 60,
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
      receitasLista.length > 0
        ? [
            ...receitasLista.map((r) => [r.nome, formatCurrency(r.valor)]),
            [
              {
                content: "TOTAL",
                styles: { fontStyle: "bold", fillColor: [240, 243, 246] },
              },
              {
                content: formatCurrency(dados.totalReceitas),
                styles: {
                  fontStyle: "bold",
                  halign: "right",
                  fillColor: [240, 243, 246],
                },
              },
            ],
          ]
        : [["Nenhuma receita registrada", "-"]],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, fillColor: COLOR_BG_SECTION },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 3. ORÇAMENTOS
  currentY = drawSectionHeader("Orçamentos", currentY);
  doc.autoTable({
    startY: currentY - 5,
    head: [
      [
        {
          content: "ORÇAMENTO",
          styles: { halign: "left", fillColor: [238, 242, 246] },
        },
        {
          content: "PREVISTO",
          styles: { halign: "right", fillColor: [238, 242, 246] },
        },
        {
          content: "GASTO",
          styles: { halign: "right", fillColor: [238, 242, 246] },
        },
        {
          content: "SALDO",
          styles: { halign: "right", fillColor: [238, 242, 246] },
        },
      ],
    ],
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
              {
                content: "TOTAL",
                styles: { fontStyle: "bold", fillColor: [240, 243, 246] },
              },
              {
                content: formatCurrency(
                  dadosOrcamentosTabela.reduce((s, o) => s + o.previsto, 0),
                ),
                styles: {
                  fontStyle: "bold",
                  halign: "right",
                  fillColor: [240, 243, 246],
                },
              },
              {
                content: formatCurrency(
                  dadosOrcamentosTabela.reduce((s, o) => s + o.gasto, 0),
                ),
                styles: {
                  fontStyle: "bold",
                  halign: "right",
                  fillColor: [240, 243, 246],
                },
              },
              {
                content: formatCurrency(
                  dadosOrcamentosTabela.reduce((s, o) => s + o.saldo, 0),
                ),
                styles: {
                  fontStyle: "bold",
                  halign: "right",
                  fillColor: [240, 243, 246],
                },
              },
            ],
          ]
        : [["Nenhum orçamento cadastrado", "-", "-", "-"]],
    theme: "plain",
    headStyles: { fontStyle: "bold", textColor: [100, 100, 100] },
    styles: { fontSize: 8.5, cellPadding: 2.5, fillColor: COLOR_BG_SECTION },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
    },
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 4. DESPESAS ANALÍTICAS
  currentY = drawSectionHeader("Despesas", currentY);
  doc.setFont("helvetica", "bold");
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
              {
                content: "TOTAL",
                styles: { fontStyle: "bold", fillColor: [240, 243, 246] },
              },
              {
                content: formatCurrency(dados.totalGastoRealOrdinario),
                styles: {
                  fontStyle: "bold",
                  halign: "right",
                  fillColor: [240, 243, 246],
                },
              },
            ],
          ]
        : [["Nenhuma despesa ordinária", "-"]],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5, fillColor: COLOR_BG_SECTION },
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
              {
                content: "TOTAL",
                styles: { fontStyle: "bold", fillColor: [240, 243, 246] },
              },
              {
                content: formatCurrency(
                  dados.totalGastoRealCartao - dados.totalAjustesDoMes,
                ),
                styles: {
                  fontStyle: "bold",
                  halign: "right",
                  fillColor: [240, 243, 246],
                },
              },
            ],
          ]
        : [["Nenhuma despesa de cartão", "-"]],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5, fillColor: COLOR_BG_SECTION },
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
  doc.text(
    `Aportes: ${formatCurrency(dados.totalAportesAtivos)}`,
    margin + 5,
    currentY + 15,
  );
  doc.text(
    `Resgates: ${formatCurrency(dados.totalResgates)}`,
    margin + 5,
    currentY + 20,
  );
  doc.setFont("helvetica", "bold");
  doc.text(
    `Investimento Líquido: ${formatCurrency(dados.totalAportesAtivos - dados.totalResgates)}`,
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
  doc.text(
    `Aportes: ${formatCurrency(dados.totalAportesReducao)}`,
    secondColX + 5,
    currentY + 15,
  );
  doc.text(`Resgates: ${formatCurrency(0)}`, secondColX + 5, currentY + 20);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Investimento Líquido: ${formatCurrency(dados.totalAportesReducao)}`,
    secondColX + 5,
    currentY + 27,
  );

  currentY += 40;
  const indDestAmortizacao =
    dados.totalResgates + dados.totalAmortizacoes > 0
      ? (dados.totalAmortizacoes /
          (dados.totalResgates + dados.totalAmortizacoes)) *
        100
      : 0;
  doc.autoTable({
    startY: currentY,
    body: [
      ["TOTAL DE APORTES", formatCurrency(dados.totalAportesGeral)],
      ["TOTAL DE RESGATES", formatCurrency(dados.totalResgates)],
      [
        {
          content: "INVESTIMENTO LÍQUIDO",
          styles: { fontStyle: "bold", textColor: COLOR_BLUE },
        },
        formatCurrency(dados.investimentoLiquido),
      ],
      ["AMORTIZAÇÕES REALIZADAS", formatCurrency(dados.totalAmortizacoes)],
      [
        {
          content: "ÍNDICE DE DESTINAÇÃO PARA AMORTIZAÇÃO",
          styles: { fontStyle: "bold" },
        },
        `${indDestAmortizacao.toFixed(2)}%`,
      ],
      [
        {
          content: "TAXA DE INVESTIMENTO LÍQUIDO",
          styles: { fontStyle: "bold" },
        },
        `${dados.taxaInvestimento.toFixed(2)}%`,
      ],
    ],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2, fillColor: COLOR_BG_SECTION },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });

  // --- RESTAURAÇÃO DA LEGENDA GERENCIAL ---
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

  // 6. POSIÇÃO PATRIMONIAL ACUMULADA
  currentY = drawSectionHeader("Posição patrimonial acumulada", currentY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Demonstrativo restrito às contas de Formação de Ativos (não inclui contas de Recursos para Amortização).",
    margin,
    currentY - 1,
  );
  currentY += 4;

  doc.autoTable({
    startY: currentY,
    head: [
      [
        {
          content: "CONTA",
          styles: { halign: "left", fillColor: [238, 242, 246] },
        },
        {
          content: "SALDO ACUMULADO",
          styles: { halign: "right", fillColor: [238, 242, 246] },
        },
      ],
    ],
    body: [
      ...dadosEstoqueAtivos.map((d) => [d.nome, formatCurrency(d.saldo)]),
      [
        {
          content: "TOTAL ACUMULADO",
          styles: { fontStyle: "bold", fillColor: [240, 243, 246] },
        },
        {
          content: formatCurrency(saldoAcumuladoAtivos),
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [240, 243, 246],
          },
        },
      ],
      [
        {
          content: "TAXA DE CRESCIMENTO PATRIMONIAL NO CICLO",
          styles: { fontStyle: "bold", fillColor: [240, 243, 246] },
        },
        {
          content: `${crescimentoAtivos.toFixed(2)}%`,
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [240, 243, 246],
          },
        },
      ],
    ],
    theme: "plain",
    headStyles: { fontStyle: "bold", textColor: [100, 100, 100] },
    styles: { fontSize: 8.5, cellPadding: 3.5, fillColor: COLOR_BG_SECTION },
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
