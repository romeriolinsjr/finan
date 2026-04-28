import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import {
  formatCurrency,
  getMesAnoChave,
  parseDateString,
  calcularTotalAjustes,
  registrarUltimaAlteracao,
} from "./utils.js";

export function abrirModalDetalhesFatura(
  cartaoId,
  mesAnoFatura,
  callbackAbrirModal,
  callbackPopular,
) {
  state.currentFaturaDate = parseDateString(mesAnoFatura);
  callbackPopular(cartaoId, mesAnoFatura);
  callbackAbrirModal(
    elements.modalDetalhesFaturaCartao,
    null,
    "detalhesFatura",
  );
}

export function popularModalDetalhesFatura(cartaoId, mesAnoFatura) {
  if (
    !elements.faturaCartaoNomeTitulo ||
    !elements.faturaCartaoTotalValor ||
    !elements.faturaCartaoDataVencimento ||
    !elements.listaComprasFaturaCartaoUl ||
    !elements.btnAddDespesaFromFatura ||
    !elements.btnAjustesFatura
  )
    return;

  const cartao = state.cartoes.find((c) => c.id === cartaoId);
  if (!cartao) {
    elements.faturaCartaoNomeTitulo.textContent = "Cartão não encontrado";
    elements.listaComprasFaturaCartaoUl.innerHTML =
      "<li>Ocorreu um erro ao carregar os detalhes.</li>";
    return;
  }

  elements.btnAddDespesaFromFatura.dataset.cartaoId = cartao.id;
  elements.btnAddDespesaFromFatura.dataset.cartaoNome = cartao.nome;
  elements.btnAjustesFatura.dataset.cartaoId = cartao.id;
  elements.btnAjustesFatura.dataset.mesAnoReferencia = mesAnoFatura;
  elements.faturaCartaoNomeTitulo.dataset.cartaoId = cartaoId;
  elements.faturaCartaoNomeTitulo.dataset.mesAno = mesAnoFatura;
  elements.faturaCartaoNomeTitulo.textContent = `Fatura ${cartao.nome} - ${mesAnoFatura.substring(5, 7)}/${mesAnoFatura.substring(0, 4)}`;

  const [ano, mes] = mesAnoFatura.split("-").map(Number);
  const dataVenc = new Date(ano, mes - 1, cartao.diaVencimentoFatura);
  elements.faturaCartaoDataVencimento.textContent = dataVenc.toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "2-digit", year: "numeric" },
  );

  const comprasDaFatura = state.transacoes.filter(
    (t) =>
      t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
      t.cartaoId === cartaoId &&
      t.mesAnoReferencia === mesAnoFatura,
  );

  const ajustesDaFatura = state.ajustesFatura.filter(
    (a) => a.cartaoId === cartaoId && a.mesAnoReferencia === mesAnoFatura,
  );

  const totalFaturaBruto = comprasDaFatura.reduce(
    (total, compra) => total + compra.valor,
    0,
  );
  const totalAjustes = ajustesDaFatura.reduce(
    (total, ajuste) => total + ajuste.valor,
    0,
  );
  elements.faturaCartaoTotalValor.textContent = formatCurrency(
    totalFaturaBruto - totalAjustes,
  );

  let itensParaRenderizar = [
    ...comprasDaFatura.map((c) => ({ ...c, renderType: "compra" })),
    ...ajustesDaFatura.map((a) => ({ ...a, renderType: "ajuste" })),
  ];

  itensParaRenderizar.sort((a, b) => {
    if (a.renderType === "ajuste" && b.renderType === "compra") return 1;
    if (a.renderType === "compra" && b.renderType === "ajuste") return -1;
    const prioridade = {
      [CONSTS.FREQUENCIA.RECORRENTE]: 1,
      [CONSTS.FREQUENCIA.PARCELADA]: 2,
      [CONSTS.FREQUENCIA.UNICA]: 3,
    };
    const prioridadeA = prioridade[a.frequencia] || 4;
    const prioridadeB = prioridade[b.frequencia] || 4;
    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
    return b.valor - a.valor;
  });

  elements.listaComprasFaturaCartaoUl.innerHTML = "";
  if (itensParaRenderizar.length === 0) {
    elements.listaComprasFaturaCartaoUl.innerHTML =
      "<li>Nenhuma compra ou ajuste nesta fatura.</li>";
    return;
  }

  itensParaRenderizar.forEach((item) => {
    const li = document.createElement("li");
    li.classList.add("transaction-item");
    if (item.renderType === "compra") {
      li.dataset.transactionId = item.id;
      li.dataset.id = item.id;
      const detailsDiv = document.createElement("div");
      detailsDiv.classList.add("transaction-details");
      detailsDiv.innerHTML = `<span class="compra-nome">${item.nome}</span><span class="compra-valor">${formatCurrency(item.valor)}</span>`;
      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("transaction-actions");
      if (item.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
        const skipButton = document.createElement("button");
        skipButton.className = "btn-skip-parcela";
        skipButton.innerHTML = "⏩";
        skipButton.title = "Adiar esta parcela e as seguintes em um mês";
        skipButton.dataset.id = item.id;
        skipButton.dataset.serieId = item.serieId;
        skipButton.dataset.mesAnoReferencia = item.mesAnoReferencia;
        actionsDiv.appendChild(skipButton);
      }
      const editButton = document.createElement("button");
      editButton.className = "btn-edit";
      editButton.innerHTML = "✎";
      editButton.title = "Editar Compra"; // REINSERIDO
      editButton.dataset.id = item.id;
      actionsDiv.appendChild(editButton);
      const deleteButton = document.createElement("button");
      deleteButton.className = "btn-delete";
      deleteButton.innerHTML = "✖";
      deleteButton.title = "Excluir Compra"; // REINSERIDO
      deleteButton.dataset.id = item.id;
      actionsDiv.appendChild(deleteButton);
      li.appendChild(detailsDiv);
      li.appendChild(actionsDiv);
    } else if (item.renderType === "ajuste") {
      li.classList.add("ajuste-fatura-item");
      li.innerHTML = `<div class="transaction-details"><span class="compra-nome">${item.descricao}</span><span class="compra-valor">- ${formatCurrency(item.valor)}</span></div>`;
    }
    elements.listaComprasFaturaCartaoUl.appendChild(li);
  });
}

export function renderizarListaCartoesCadastrados() {
  if (!elements.listaCartoesCadastradosUl) return;
  elements.listaCartoesCadastradosUl.innerHTML = "";
  if (state.cartoes.length === 0) {
    elements.listaCartoesCadastradosUl.innerHTML =
      "<li>Nenhum cartão cadastrado.</li>";
    return;
  }
  const cartoesOrdenados = [...state.cartoes].sort(
    (a, b) => a.diaVencimentoFatura - b.diaVencimentoFatura,
  );
  cartoesOrdenados.forEach((cartao) => {
    const li = document.createElement("li");
    li.innerHTML = `
                <div class="cartao-info" data-id="${cartao.id}">
                    <span class="cartao-nome">${cartao.nome}</span>
                    <span class="cartao-vencimento">Venc. dia: ${cartao.diaVencimentoFatura}</span>
                </div>
                <div class="transaction-actions">
                    <button class="btn-add-despesa-cartao" data-id="${cartao.id}" data-nome="${cartao.nome}" title="Adicionar Despesa neste Cartão">➕</button>
                    <button class="btn-edit-cartao" data-id="${cartao.id}" title="Editar Cartão">✎</button>
                    <button class="btn-delete-cartao" data-id="${cartao.id}" title="Excluir Cartão">✖</button>
                </div>`;
    elements.listaCartoesCadastradosUl.appendChild(li);
  });
}

export function preencherModalEdicaoCartao(cartaoId) {
  const cartao = state.cartoes.find((c) => c.id === cartaoId);
  if (cartao && elements.modalCadastrarCartao) {
    if (elements.modalCartaoTitulo)
      elements.modalCartaoTitulo.textContent = "Editar Cartão";
    if (elements.nomeCartaoInputModal)
      elements.nomeCartaoInputModal.value = cartao.nome;
    if (elements.diaVencimentoFaturaInputModal)
      elements.diaVencimentoFaturaInputModal.value = cartao.diaVencimentoFatura;
    if (elements.btnSalvarCartaoModalBtn)
      elements.btnSalvarCartaoModalBtn.textContent = "Salvar Alterações";
  }
}

export function abrirModalAjustesFatura(
  cartaoId,
  mesAno,
  callbackFecharFatura,
  callbackAbrirModal,
) {
  if (!elements.modalAjustesFatura) return;
  const cartao = state.cartoes.find((c) => c.id === cartaoId);
  if (!cartao) return;

  elements.modalAjustesFatura.dataset.cartaoId = cartaoId;
  elements.modalAjustesFatura.dataset.mesAno = mesAno;
  elements.modalAjustesFaturaTitulo.textContent = `Ajustes na Fatura ${cartao.nome}`;

  popularModalAjustes(cartaoId, mesAno);

  callbackFecharFatura(elements.modalDetalhesFaturaCartao);
  // Adicionado "null" e "generic" para evitar o erro de reset
  callbackAbrirModal(elements.modalAjustesFatura, null, "generic");
}

export function popularModalAjustes(cartaoId, mesAno) {
  elements.listaAjustesFaturaUl.innerHTML = "";
  const ajustesDoPeriodo = state.ajustesFatura.filter(
    (a) => a.cartaoId === cartaoId && a.mesAnoReferencia === mesAno,
  );
  if (ajustesDoPeriodo.length === 0) {
    elements.listaAjustesFaturaUl.innerHTML =
      "<li>Nenhum ajuste para esta fatura.</li>";
  } else {
    ajustesDoPeriodo.forEach((ajuste) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="ajuste-descricao">${ajuste.descricao}</span><span class="ajuste-valor">- ${formatCurrency(ajuste.valor)}</span><button class="btn-delete-ajuste" data-id="${ajuste.id}" title="Excluir Ajuste">✖</button>`;
      elements.listaAjustesFaturaUl.appendChild(li);
    });
  }
  const totalAjustes = calcularTotalAjustes(cartaoId, mesAno);
  elements.totalAjustesValorSpan.textContent = formatCurrency(totalAjustes);
}

export async function atualizarStatusPagoFatura(
  cartaoId,
  mesAno,
  novoStatus,
  callbackResumo,
) {
  if (!state.currentUser) return;
  try {
    const q = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes")
      .where("cartaoId", "==", cartaoId)
      .where("mesAnoReferencia", "==", mesAno);
    const querySnapshot = await q.get();
    const batch = db.batch();
    querySnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { paga: novoStatus });
    });
    await batch.commit();
    await registrarUltimaAlteracao();
    state.transacoes.forEach((t) => {
      if (t.cartaoId === cartaoId && t.mesAnoReferencia === mesAno) {
        t.paga = novoStatus;
      }
    });
    callbackResumo();
  } catch (error) {
    console.error("Erro ao atualizar status da fatura:", error);
  }
}
