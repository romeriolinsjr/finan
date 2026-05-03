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
    !elements.btnAjustesFatura ||
    !elements.auditMinhasCompras ||
    !elements.auditTerceiros ||
    !elements.auditTotalEsperado
  )
    return;

  const cartao = state.cartoes.find((c) => c.id === cartaoId);
  if (!cartao) {
    elements.faturaCartaoNomeTitulo.textContent = "Cartão não encontrado";
    elements.listaComprasFaturaCartaoUl.innerHTML =
      "<li>Ocorreu um erro ao carregar os detalhes.</li>";
    return;
  }

  // Reset do Simulador ao abrir
  if (elements.inputValorBanco) elements.inputValorBanco.value = "";
  if (elements.resultadoDiferenca)
    elements.resultadoDiferenca.style.display = "none";

  if (cartao.deletado) {
    elements.btnAddDespesaFromFatura.style.display = "none";
  } else {
    elements.btnAddDespesaFromFatura.style.display = "inline-block";
    elements.btnAjustesFatura.style.display = "inline-block";
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

  // 1. Minhas Compras e Ajustes
  const minhasCompras = state.transacoes.filter(
    (t) =>
      t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
      t.cartaoId === cartaoId &&
      t.mesAnoReferencia === mesAnoFatura,
  );
  const ajustes = state.ajustesFatura.filter(
    (a) => a.cartaoId === cartaoId && a.mesAnoReferencia === mesAnoFatura,
  );
  const totalMinhasBruto = minhasCompras.reduce(
    (total, compra) => total + compra.valor,
    0,
  );
  const totalAjustes = ajustes.reduce(
    (total, ajuste) => total + ajuste.valor,
    0,
  );
  const minhaParteLiquida = totalMinhasBruto - totalAjustes;

  // 2. Compras de Terceiros (Auditoria)
  const comprasTerceiros = state.dividasTerceiros.filter(
    (d) =>
      d.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
      d.cartaoId === cartaoId &&
      d.mesAnoReferencia === mesAnoFatura,
  );
  const totalTerceiros = comprasTerceiros.reduce(
    (total, d) => total + d.valor,
    0,
  );

  // 3. Atualizar Bloco de Conferência
  const totalEsperado = minhaParteLiquida + totalTerceiros;
  elements.auditMinhasCompras.textContent = formatCurrency(minhaParteLiquida);
  elements.auditTerceiros.textContent = formatCurrency(totalTerceiros);
  elements.auditTotalEsperado.textContent = formatCurrency(totalEsperado);
  elements.auditTotalEsperado.dataset.valor = totalEsperado; // Guarda para o simulador

  elements.faturaCartaoTotalValor.textContent =
    formatCurrency(minhaParteLiquida);

  let itensParaRenderizar = [
    ...minhasCompras.map((c) => ({ ...c, renderType: "compra" })),
    ...ajustes.map((a) => ({ ...a, renderType: "ajuste" })),
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
      editButton.title = "Editar Compra";
      editButton.dataset.id = item.id;
      actionsDiv.appendChild(editButton);
      const deleteButton = document.createElement("button");
      deleteButton.className = "btn-delete";
      deleteButton.innerHTML = "✖";
      deleteButton.title = "Excluir Compra";
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

  const cartoesAtivos = state.cartoes.filter((c) => !c.deletado);
  if (cartoesAtivos.length === 0) {
    elements.listaCartoesCadastradosUl.innerHTML =
      "<li>Nenhum cartão ativo.</li>";
    return;
  }

  const mesAnoAtual = getMesAnoChave(state.currentDate);
  const cartoesOrdenados = [...cartoesAtivos].sort(
    (a, b) => a.diaVencimentoFatura - b.diaVencimentoFatura,
  );

  cartoesOrdenados.forEach((cartao) => {
    // Cálculo do total total (Meu + Terceiros) para o mês atual
    const minhas = state.transacoes.filter(
      (t) => t.cartaoId === cartao.id && t.mesAnoReferencia === mesAnoAtual,
    );
    const terceiros = state.dividasTerceiros.filter(
      (d) => d.cartaoId === cartao.id && d.mesAnoReferencia === mesAnoAtual,
    );
    const ajustes = state.ajustesFatura.filter(
      (a) => a.cartaoId === cartao.id && a.mesAnoReferencia === mesAnoAtual,
    );

    const totalMes =
      minhas.reduce((s, t) => s + t.valor, 0) +
      terceiros.reduce((s, t) => s + t.valor, 0) -
      ajustes.reduce((s, t) => s + t.valor, 0);

    const li = document.createElement("li");
    li.innerHTML = `
                <div class="cartao-info" data-id="${cartao.id}" style="cursor:pointer; flex-grow: 1;">
                    <span class="cartao-nome" style="font-weight:bold;">${cartao.nome}</span>
                    <span class="cartao-vencimento" style="font-size:0.85em; color:#666;">Venc. dia: ${cartao.diaVencimentoFatura} | Total no Mês: <strong>${formatCurrency(totalMes)}</strong></span>
                </div>
                <div class="transaction-actions">
                    <button class="btn-add-despesa-cartao" data-id="${cartao.id}" data-nome="${cartao.nome}" title="Adicionar Despesa">➕</button>
                    <button class="btn-edit-cartao" data-id="${cartao.id}" title="Editar">✎</button>
                    <button class="btn-delete-cartao" data-id="${cartao.id}" title="Excluir">✖</button>
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

export function prepararSoftDeleteCartao(cartaoId, callbackAbrirModal) {
  const cartao = state.cartoes.find((c) => c.id === cartaoId);
  if (!cartao) return;

  // Busca todas as transações deste cartão para achar a última
  const transacoesDoCartao = state.transacoes.filter(
    (t) => t.cartaoId === cartaoId,
  );

  let textoInformativo = "";
  let dataSugerida = "";

  if (transacoesDoCartao.length > 0) {
    // Ordena para achar o mês/ano mais distante
    const ultimaTransacao = transacoesDoCartao.sort((a, b) =>
      b.mesAnoReferencia.localeCompare(a.mesAnoReferencia),
    )[0];

    const [ano, mes] = ultimaTransacao.mesAnoReferencia.split("-");
    const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", {
      month: "long",
    });

    textoInformativo = `A última fatura com compras para o cartão "${cartao.nome}" é ${nomeMes} de ${ano}.`;

    // Sugere o mês seguinte à última compra como data de corte padrão
    let dataCorte = new Date(ano, mes, 1); // mes já é o próximo (0-indexed)
    dataSugerida = `${dataCorte.getFullYear()}-${(dataCorte.getMonth() + 1).toString().padStart(2, "0")}`;
  } else {
    textoInformativo = `O cartão "${cartao.nome}" não possui compras cadastradas.`;
    const hoje = new Date();
    dataSugerida = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, "0")}`;
  }

  elements.infoUltimaCompraCartao.textContent = textoInformativo;
  elements.dataCorteExclusaoCartao.value = dataSugerida;

  // Salva o ID no modal para uso posterior
  elements.modalConfirmarExclusaoCartao.dataset.cartaoId = cartaoId;

  callbackAbrirModal(elements.modalConfirmarExclusaoCartao, null, "generic");
}

export async function executarSoftDeleteCartao(
  cartaoId,
  dataCorte,
  callbackFechar,
  callbackResumo,
) {
  if (!state.currentUser) return;

  try {
    const batch = db.batch();
    const userRef = db.collection("users").doc(state.currentUser.uid);

    // 1. Marcar o cartão como deletado e registrar a data de corte
    const cartaoRef = userRef.collection("cartoes").doc(cartaoId);
    batch.update(cartaoRef, {
      deletado: true,
      dataExclusao: dataCorte,
    });

    // 2. Localizar e apagar permanentemente transações DESTE CARTÃO do mês de corte em diante
    const comprasParaApagar = state.transacoes.filter(
      (t) => t.cartaoId === cartaoId && t.mesAnoReferencia >= dataCorte,
    );

    comprasParaApagar.forEach((t) => {
      const tRef = userRef.collection("transacoes").doc(t.id);
      batch.delete(tRef);
    });

    await batch.commit();
    await registrarUltimaAlteracao();

    alert("Cartão excluído com sucesso. O histórico anterior foi preservado.");
    callbackFechar(elements.modalConfirmarExclusaoCartao);
    callbackResumo(); // Atualiza o saldo da tela
  } catch (error) {
    console.error("Erro ao executar soft delete:", error);
    alert("Ocorreu um erro ao excluir o cartão.");
  }
}
