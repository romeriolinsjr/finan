import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import {
  formatCurrency,
  isOrcamentoFechado,
  registrarUltimaAlteracao,
} from "./utils.js";

export function renderizarListaOrcamentos() {
  if (!elements.listaOrcamentosUl) return;
  elements.listaOrcamentosUl.innerHTML = "";
  if (state.orcamentos.length === 0) {
    elements.listaOrcamentosUl.innerHTML =
      "<li>Nenhum orçamento cadastrado.</li>";
    return;
  }
  const orcamentosOrdenados = [...state.orcamentos].sort(
    (a, b) => b.valor - a.valor,
  );
  orcamentosOrdenados.forEach((orcamento) => {
    const li = document.createElement("li");

    // LÓGICA ATUALIZADA: Só mostra o botão de excluir se NÃO for um dos orçamentos fixos
    const btnDeleteHTML =
      orcamento.isFixed || orcamento.isFixedOrdinary
        ? ""
        : `<button class="btn-delete-orcamento" data-id="${orcamento.id}" title="Excluir Orçamento">✖</button>`;

    li.innerHTML = `
                <div class="orcamento-info">
                    <span class="orcamento-nome">${orcamento.nome}</span>
                    <span class="orcamento-detalhes">${formatCurrency(orcamento.valor)} - Dia ${orcamento.dia}</span>
                </div>
                <div class="transaction-actions">
                    <button class="btn-edit-orcamento" data-id="${orcamento.id}" title="Editar Orçamento">✎</button>
                    ${btnDeleteHTML}
                </div>`;
    elements.listaOrcamentosUl.appendChild(li);
  });
}

export function abrirModalDetalhesOrcamento(
  orcamentoId,
  mesAno,
  callbackAbrirModal,
) {
  const orcamento = state.orcamentos.find((o) => o.id === orcamentoId);
  if (!orcamento) return;

  // LÓGICA ATUALIZADA: Filtra gastos diretos e também os capturados automaticamente
  const gastosVinculados = state.transacoes.filter((t) => {
    const mesBate = t.mesAnoReferencia === mesAno;
    const vinculadoDiretamente = t.orcamentoId === orcamentoId;

    // Captura despesas de cartão sem categoria para o "Outros Gastos"
    const ehGastoDeCartaoSemOrcamento =
      orcamento.isFixed &&
      t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
      !t.orcamentoId;

    // LÓGICA NOVA: Captura TODAS as despesas ordinárias para o "Gastos Ordinários"
    const ehGastoOrdinarioAutomatico =
      orcamento.isFixedOrdinary &&
      t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA;

    return (
      mesBate &&
      (vinculadoDiretamente ||
        ehGastoDeCartaoSemOrcamento ||
        ehGastoOrdinarioAutomatico)
    );
  });

  const prioridade = {
    [CONSTS.FREQUENCIA.RECORRENTE]: 1,
    [CONSTS.FREQUENCIA.PARCELADA]: 2,
    [CONSTS.FREQUENCIA.UNICA]: 3,
  };

  gastosVinculados.sort((a, b) => {
    const prioridadeA = prioridade[a.frequencia] || 4;
    const prioridadeB = prioridade[b.frequencia] || 4;
    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
    return b.valor - a.valor;
  });

  const totalGasto = gastosVinculados.reduce(
    (total, gasto) => total + gasto.valor,
    0,
  );
  const valorRestante = orcamento.valor - totalGasto;

  elements.orcamentoDetalhesTitulo.textContent = `Detalhes: ${orcamento.nome}`;
  elements.orcamentoDetalhesTotal.textContent = formatCurrency(orcamento.valor);
  elements.orcamentoDetalhesGasto.textContent = formatCurrency(totalGasto);
  elements.orcamentoDetalhesRestante.textContent =
    formatCurrency(valorRestante);
  elements.orcamentoDetalhesRestante.style.color =
    valorRestante >= 0 ? "#27ae60" : "#c0392b";

  elements.listaGastosOrcamento.innerHTML = "";
  if (gastosVinculados.length === 0) {
    elements.listaGastosOrcamento.innerHTML =
      "<li>Nenhum gasto vinculado neste mês.</li>";
  } else {
    gastosVinculados.forEach((gasto) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="gasto-nome">${gasto.nome}</span><span class="gasto-valor">${formatCurrency(gasto.valor)}</span>`;
      elements.listaGastosOrcamento.appendChild(li);
    });
  }
  callbackAbrirModal(
    elements.modalDetalhesOrcamento,
    null,
    "detalhesOrcamento",
  );
}

export function preencherModalEdicaoOrcamento(orcamentoId) {
  const orcamento = state.orcamentos.find((o) => o.id === orcamentoId);
  if (!orcamento) return;
  elements.orcamentoEditIdInput.value = orcamento.id;
  elements.nomeOrcamentoInput.value = orcamento.nome;
  elements.valorOrcamentoInput.value = orcamento.valor;
  elements.diaOrcamentoInput.value = orcamento.dia;
  elements.modalOrcamentoTitulo.textContent = "Editar Orçamento";
  elements.btnSalvarOrcamento.textContent = "Salvar Alterações";
}

export async function handleFecharAbrirOrcamento(button) {
  if (!state.currentUser) return;
  const orcamentoId = button.dataset.orcamentoId;
  const mesAno = button.dataset.mesAno;
  const deveFechar = button.classList.contains("btn-fechar-orcamento");
  const orcamentosFechadosRef = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("orcamentosFechados");

  try {
    const docId = `${orcamentoId}_${mesAno}`;
    if (deveFechar) {
      await orcamentosFechadosRef
        .doc(docId)
        .set({ orcamentoId: orcamentoId, mesAno: mesAno });
    } else {
      await orcamentosFechadosRef.doc(docId).delete();
    }
    await registrarUltimaAlteracao();
  } catch (error) {
    console.error("Erro ao alterar estado do orçamento:", error);
  }
}

export function resetFormOrcamento() {
  if (!elements.orcamentoEditIdInput) return;

  elements.orcamentoEditIdInput.value = "";
  elements.nomeOrcamentoInput.value = "";
  elements.valorOrcamentoInput.value = "";
  elements.diaOrcamentoInput.value = "";

  elements.modalOrcamentoTitulo.textContent = "Gerenciar Orçamentos";
  elements.btnSalvarOrcamento.textContent = "Salvar";
}
