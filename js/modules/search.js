import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { formatCurrency, parseDateString } from "./utils.js";

export function executarBuscaGlobal(termo, callbackRenderPadrao) {
  const termoBusca = termo.trim().toLowerCase();

  // Mantido exatamente como no original
  elements.clearSearchBtn.classList.toggle("visible", termoBusca.length > 0);

  if (termoBusca === "") {
    callbackRenderPadrao();
    return;
  }

  const resultadosFiltrados = state.transacoes.filter((t) =>
    t.nome.toLowerCase().includes(termoBusca),
  );

  const resultadosAgrupados = [];
  const seriesProcessadas = new Set();

  resultadosFiltrados.forEach((t) => {
    if (t.serieId) {
      if (seriesProcessadas.has(t.serieId)) {
        return;
      }
      const todasDaSerie = state.transacoes.filter(
        (item) => item.serieId === t.serieId,
      );
      const nomeBase = t.nome
        .replace(/\s\(\d+\/\d+\)$/, "")
        .replace(/\s\(Recorrente\)$/, "");

      resultadosAgrupados.push({
        isGroup: true,
        serieId: t.serieId,
        nome: nomeBase,
        frequencia: t.frequencia,
        tipo: t.tipo,
        ocorrencias: todasDaSerie.length,
        valor: t.valor,
        primeiraOcorrencia: todasDaSerie.sort((a, b) =>
          a.mesAnoReferencia.localeCompare(b.mesAnoReferencia),
        )[0],
      });
      seriesProcessadas.add(t.serieId);
    } else {
      resultadosAgrupados.push({ ...t, isGroup: false });
    }
  });

  renderizarResultadosBusca(resultadosAgrupados, termoBusca);
}

export function renderizarResultadosBusca(resultados, termoBusca) {
  elements.listaTransacoesUl.innerHTML = "";

  if (resultados.length === 0) {
    const liEmpty = document.createElement("li");
    liEmpty.textContent = `Nenhum resultado encontrado para "${termoBusca}".`;
    liEmpty.style.textAlign = "center";
    liEmpty.style.padding = "20px";
    liEmpty.style.color = "#777";
    elements.listaTransacoesUl.appendChild(liEmpty);
    return;
  }

  resultados.sort((a, b) => {
    const dataA = parseDateString(
      a.isGroup
        ? a.primeiraOcorrencia.mesAnoReferencia
        : a.dataEntrada || a.dataVencimento || a.mesAnoReferencia,
    );
    const dataB = parseDateString(
      b.isGroup
        ? b.primeiraOcorrencia.mesAnoReferencia
        : b.dataEntrada || b.dataVencimento || b.mesAnoReferencia,
    );
    return dataB - dataA;
  });

  resultados.forEach((item) => {
    const li = document.createElement("li");
    li.className = "search-result-item";
    const valorFormatado =
      item.tipo === "receita"
        ? `+ ${formatCurrency(item.valor)}`
        : `- ${formatCurrency(item.valor)}`;
    const classeValor = item.tipo;
    let nomeExibicao = item.nome;
    let contexto = "";
    let transacaoRepresentativa = item.isGroup ? item.primeiraOcorrencia : item;

    if (item.isGroup) {
      if (item.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
        li.classList.add("search-result-group", "parcelada");
        li.dataset.serieId = item.serieId;
        li.style.cursor = "pointer";
        contexto = `${item.ocorrencias} parcelas encontradas. (Clique para ver)`;
      } else if (item.frequencia === CONSTS.FREQUENCIA.RECORRENTE) {
        contexto = `Transação recorrente`;
      }
    } else {
      const [ano, mes] = item.mesAnoReferencia.split("-");
      const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
        month: "short",
      });
      contexto = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano}`;
    }

    if (
      transacaoRepresentativa.categoria ===
      CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO
    ) {
      const cartao = state.cartoes.find(
        (c) => c.id === transacaoRepresentativa.cartaoId,
      );
      if (cartao) {
        contexto += ` (Cartão: ${cartao.nome})`;
      }
    }

    li.innerHTML = `
                <div class="search-result-info">
                    <span class="result-name">${nomeExibicao}</span>
                    <span class="result-context">${contexto}</span>
                </div>
                <span class="result-value ${classeValor}">${valorFormatado}</span>
            `;
    elements.listaTransacoesUl.appendChild(li);
  });
}
