import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import {
  formatCurrency,
  getMesAnoChave,
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

  // Ordenação: Gastos Ordinários (1º), Outros Gastos (2º), demais por valor decrescente
  const orcamentosOrdenados = [...state.orcamentos].sort((a, b) => {
    if (a.isFixedOrdinary) return -1;
    if (b.isFixedOrdinary) return 1;
    if (a.isFixed) return -1;
    if (b.isFixed) return 1;
    return b.valor - a.valor;
  });

  orcamentosOrdenados.forEach((orcamento) => {
    const li = document.createElement("li");

    // Adiciona classes para estilização especial
    if (orcamento.isFixedOrdinary) {
      li.classList.add("orcamento-item-ordinario");
    } else if (orcamento.isFixed) {
      li.classList.add("orcamento-item-outros");
    }

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
  const activeBudgetIds = state.orcamentos.map((o) => o.id);
  const gastosVinculados = state.transacoes.filter((t) => {
    const mesBate = t.mesAnoReferencia === mesAno;
    const vinculadoDiretamente = t.orcamentoId === orcamentoId;
    const ehOrfaoCartao =
      orcamento.isFixed &&
      t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
      (!t.orcamentoId || !activeBudgetIds.includes(t.orcamentoId));
    const ehGastoOrdinario =
      orcamento.isFixedOrdinary &&
      t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA;
    return (
      mesBate && (vinculadoDiretamente || ehOrfaoCartao || ehGastoOrdinario)
    );
  });

  const prioridade = {
    [CONSTS.FREQUENCIA.RECORRENTE]: 1,
    [CONSTS.FREQUENCIA.PARCELADA]: 2,
    [CONSTS.FREQUENCIA.UNICA]: 3,
  };
  gastosVinculados.sort(
    (a, b) =>
      (prioridade[a.frequencia] || 4) - (prioridade[b.frequencia] || 4) ||
      b.valor - a.valor,
  );

  const totalGasto = gastosVinculados.reduce(
    (total, gasto) => total + gasto.valor,
    0,
  );
  elements.orcamentoDetalhesTitulo.textContent = `Detalhes: ${orcamento.nome}`;
  elements.orcamentoDetalhesTotal.textContent = formatCurrency(orcamento.valor);
  elements.orcamentoDetalhesGasto.textContent = formatCurrency(totalGasto);
  elements.orcamentoDetalhesRestante.textContent = formatCurrency(
    orcamento.valor - totalGasto,
  );
  elements.orcamentoDetalhesRestante.style.color =
    orcamento.valor - totalGasto >= 0 ? "#27ae60" : "#c0392b";
  elements.listaGastosOrcamento.innerHTML = "";
  if (gastosVinculados.length === 0) {
    elements.listaGastosOrcamento.innerHTML =
      "<li>Nenhum gasto vinculado.</li>";
  } else {
    gastosVinculados.forEach((gasto) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${gasto.nome}</span><span>${formatCurrency(gasto.valor)}</span>`;
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
    if (deveFechar)
      await orcamentosFechadosRef.doc(docId).set({ orcamentoId, mesAno });
    else await orcamentosFechadosRef.doc(docId).delete();
    await registrarUltimaAlteracao();
  } catch (error) {
    console.error("Erro cadeado:", error);
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

export async function alternarTodosOrcamentosDoMes() {
  if (!state.currentUser || state.orcamentos.length === 0) return;

  const mesAno = getMesAnoChave(state.currentDate);
  const orcamentosAbertos = state.orcamentos.filter(
    (orc) => !isOrcamentoFechado(orc.id, mesAno),
  );

  const batch = db.batch();
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("orcamentosFechados");

  if (orcamentosAbertos.length > 0) {
    // FECHAR TODOS os que estão abertos
    orcamentosAbertos.forEach((orc) => {
      const docId = `${orc.id}_${mesAno}`;
      batch.set(ref.doc(docId), { orcamentoId: orc.id, mesAno: mesAno });
    });
  } else {
    // REABRIR TODOS (pois todos já estavam fechados)
    state.orcamentos.forEach((orc) => {
      const docId = `${orc.id}_${mesAno}`;
      batch.delete(ref.doc(docId));
    });
  }

  try {
    // Executa silenciosamente sem alertas
    await batch.commit();
    await registrarUltimaAlteracao();
  } catch (error) {
    console.error("Erro ao alternar orçamentos em lote:", error);
  }
}
