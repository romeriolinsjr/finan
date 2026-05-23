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

  const mesAnoAtual = getMesAnoChave(state.currentDate);
  const orcamentosDoMes = state.orcamentos.filter(
    (o) => o.mesAnoReferencia === mesAnoAtual,
  );

  if (orcamentosDoMes.length === 0) {
    elements.listaOrcamentosUl.innerHTML =
      "<li>Nenhum orçamento para este mês.</li>";
    return;
  }

  const orcamentosOrdenados = [...orcamentosDoMes].sort((a, b) => {
    if (a.isFixedOrdinary) return -1;
    if (b.isFixedOrdinary) return 1;
    if (a.isFixed) return -1;
    if (b.isFixed) return 1;
    return b.valor - a.valor;
  });

  orcamentosOrdenados.forEach((orcamento) => {
    const li = document.createElement("li");
    if (orcamento.isFixedOrdinary) li.classList.add("orcamento-item-ordinario");
    else if (orcamento.isFixed) li.classList.add("orcamento-item-outros");

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
  const orcamento = state.orcamentos.find(
    (o) => o.id === orcamentoId && o.mesAnoReferencia === mesAno,
  );
  if (!orcamento) return;
  const activeBudgetIds = state.orcamentos
    .filter((o) => o.mesAnoReferencia === mesAno)
    .map((o) => o.id);
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
  if (gastosVinculados.length === 0)
    elements.listaGastosOrcamento.innerHTML =
      "<li>Nenhum gasto vinculado.</li>";
  else {
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
  const mesAnoAtual = getMesAnoChave(state.currentDate);
  const orcamento = state.orcamentos.find(
    (o) => o.id === orcamentoId && o.mesAnoReferencia === mesAnoAtual,
  );
  if (!orcamento) return;
  elements.orcamentoEditIdInput.value = orcamento.id;
  elements.nomeOrcamentoInput.value = orcamento.nome;
  elements.valorOrcamentoInput.value = orcamento.valor;
  elements.diaOrcamentoInput.value = orcamento.dia;

  if (elements.modalFormOrcamentoTitulo) {
    elements.modalFormOrcamentoTitulo.textContent = "Editar Orçamento";
  }
  if (elements.btnSalvarOrcamento) {
    elements.btnSalvarOrcamento.textContent = "Salvar Alterações";
  }
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

  if (elements.modalFormOrcamentoTitulo) {
    elements.modalFormOrcamentoTitulo.textContent = "Cadastrar Novo Orçamento";
  }
  if (elements.btnSalvarOrcamento) {
    elements.btnSalvarOrcamento.textContent = "Salvar Orçamento";
  }
}

export async function alternarTodosOrcamentosDoMes() {
  if (!state.currentUser || state.orcamentos.length === 0) return;
  const mesAno = getMesAnoChave(state.currentDate);
  const orcamentosAbertos = state.orcamentos.filter(
    (orc) =>
      orc.mesAnoReferencia === mesAno && !isOrcamentoFechado(orc.id, mesAno),
  );
  const batch = db.batch();
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("orcamentosFechados");
  if (orcamentosAbertos.length > 0) {
    orcamentosAbertos.forEach((orc) => {
      const docId = `${orc.id}_${mesAno}`;
      batch.set(ref.doc(docId), { orcamentoId: orc.id, mesAno: mesAno });
    });
  } else {
    state.orcamentos
      .filter((o) => o.mesAnoReferencia === mesAno)
      .forEach((orc) => {
        const docId = `${orc.id}_${mesAno}`;
        batch.delete(ref.doc(docId));
      });
  }
  try {
    await batch.commit();
    await registrarUltimaAlteracao();
  } catch (error) {
    console.error(error);
  }
}

export async function migrarOrcamentosLegados(legacyBudgets, mesAnoDestino) {
  if (!state.currentUser) return;
  const batch = db.batch();
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("orcamentos");
  legacyBudgets.forEach((old) => {
    const newDoc = ref.doc();
    batch.set(newDoc, { ...old, mesAnoReferencia: mesAnoDestino });
    batch.delete(ref.doc(old.id));
  });
  await batch.commit();
}

/**
 * Motor de Propagação Robusto
 */
export async function propagarOrcamentos(ignorado, mesDestino) {
  if (!state.currentUser) return [];
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("orcamentos");

  try {
    const snapUltimo = await ref
      .where("mesAnoReferencia", "<", mesDestino)
      .orderBy("mesAnoReferencia", "desc")
      .limit(1)
      .get();

    if (snapUltimo.empty) {
      const fixos = [
        {
          nome: "Outros Gastos",
          valor: 0,
          dia: 1,
          isFixed: true,
          mesAnoReferencia: mesDestino,
        },
        {
          nome: "Gastos Ordinários",
          valor: 0,
          dia: 1,
          isFixedOrdinary: true,
          mesAnoReferencia: mesDestino,
        },
      ];
      const batch = db.batch();
      const novos = [];
      fixos.forEach((f) => {
        const newDoc = ref.doc();
        batch.set(newDoc, f);
        novos.push({ ...f, id: newDoc.id });
      });
      await batch.commit();
      return novos;
    }

    const mesBase = snapUltimo.docs[0].data().mesAnoReferencia;
    const snapBase = await ref.where("mesAnoReferencia", "==", mesBase).get();

    // Filtramos apenas documentos válidos e limpamos nomes para comparação
    const orcamentosBase = snapBase.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }))
      .filter((d) => d.nome);

    const snapDestino = await ref
      .where("mesAnoReferencia", "==", mesDestino)
      .get();
    const nomesNoDestino = snapDestino.docs.map((doc) =>
      (doc.data().nome || "").toString().trim(),
    );

    const batch = db.batch();
    const novosAdicionados = [];

    orcamentosBase.forEach((base) => {
      const nomeBaseLimpo = base.nome.toString().trim();
      if (!nomesNoDestino.includes(nomeBaseLimpo)) {
        const newDocRef = ref.doc();
        const { id, ...dataToClone } = base; // Removemos o ID antigo
        const newData = { ...dataToClone, mesAnoReferencia: mesDestino };
        batch.set(newDocRef, newData);
        novosAdicionados.push({ ...newData, id: newDocRef.id });
      }
    });

    if (novosAdicionados.length > 0) {
      await batch.commit();
    }

    const snapFinal = await ref
      .where("mesAnoReferencia", "==", mesDestino)
      .get();
    return snapFinal.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("ERRO NA PROPAGAÇÃO:", error);
    return [];
  }
}

export async function salvarOrcamentoTemporal(dados) {
  if (!state.currentUser) return;
  const mesAnoAtual = getMesAnoChave(state.currentDate);
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("orcamentos");
  const { id, nome, valor, dia, tipoEdicao } = dados;

  // Busca o nome original no estado local antes da atualização para rastreio futuro
  const orcamentoNoEstado = state.orcamentos.find((o) => o.id === id);
  const nomeAntigoParaBusca = orcamentoNoEstado ? orcamentoNoEstado.nome : nome;

  try {
    if (id && tipoEdicao === "futuros") {
      // 1. Atualiza o documento do mês atual (pode mudar nome, valor e dia)
      await ref.doc(id).update({ nome, valor, dia });

      // 2. Atualiza os clones futuros baseando-se no NOME ANTIGO
      try {
        const snap = await ref
          .where("nome", "==", nomeAntigoParaBusca)
          .where("mesAnoReferencia", ">", mesAnoAtual)
          .get();

        if (!snap.empty) {
          const batch = db.batch();
          snap.docs.forEach((doc) => {
            batch.update(doc.ref, { nome, valor, dia });
          });
          await batch.commit();
        }
      } catch (indexError) {
        console.error("Erro de índice:", indexError);
        alert(
          "O mês atual foi salvo, mas a atualização futura falhou por falta de índice. Veja o console (F12).",
        );
      }
    } else if (id) {
      // Atualização de apenas um mês (permite renomear apenas este mês)
      await ref.doc(id).update({ nome, valor, dia });
    } else {
      // NOVO ORÇAMENTO: Propaga para o futuro evitando duplicatas por nome
      const batch = db.batch();

      // 1. Busca meses futuros já inicializados para saber onde pavimentar
      const snapshotMesesFuturos = await ref
        .where("mesAnoReferencia", ">", mesAnoAtual)
        .get();

      // 2. Busca especificamente onde JÁ EXISTE este nome para não duplicar
      const snapshotNomesExistentes = await ref
        .where("nome", "==", nome)
        .where("mesAnoReferencia", ">=", mesAnoAtual)
        .get();

      const mesesQueJaTemEsseNome = new Set(
        snapshotNomesExistentes.docs.map((doc) => doc.data().mesAnoReferencia),
      );

      const mesesParaProcessar = new Set();
      mesesParaProcessar.add(mesAnoAtual);
      snapshotMesesFuturos.docs.forEach((doc) =>
        mesesParaProcessar.add(doc.data().mesAnoReferencia),
      );

      let criadosCount = 0;
      mesesParaProcessar.forEach((mes) => {
        // SÓ cria o documento se o nome não existir naquele mês
        if (!mesesQueJaTemEsseNome.has(mes)) {
          const newDocRef = ref.doc();
          batch.set(newDocRef, {
            nome: nome,
            valor: valor,
            dia: dia,
            mesAnoReferencia: mes,
            isFixed: false,
            isFixedOrdinary: false,
          });
          criadosCount++;
        }
      });

      await batch.commit();
      console.log(
        `Criação concluída: ${criadosCount} meses preenchidos para o orçamento "${nome}".`,
      );
    }

    await registrarUltimaAlteracao();
    return true;
  } catch (error) {
    console.error("Erro ao salvar orçamento temporal:", error);
    return false;
  }
}

/**
 * Exclui um orçamento com lógica de escopo (único ou futuro).
 */
export async function excluirOrcamentoTemporal(orcamentoId, tipoExclusao) {
  if (!state.currentUser) return false;
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("orcamentos");

  const orcamento = state.orcamentos.find((o) => o.id === orcamentoId);
  if (!orcamento) return false;

  try {
    if (tipoExclusao === "futuros") {
      const mesAnoAtual = orcamento.mesAnoReferencia;
      const nomeParaExcluir = orcamento.nome;

      // Busca todos os clones futuros com o mesmo nome
      const snap = await ref
        .where("nome", "==", nomeParaExcluir)
        .where("mesAnoReferencia", ">=", mesAnoAtual)
        .get();

      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(
        `${snap.size} orçamentos da série "${nomeParaExcluir}" excluídos.`,
      );
    } else {
      // Exclusão apenas do documento atual
      await ref.doc(orcamentoId).delete();
    }

    await registrarUltimaAlteracao();
    return true;
  } catch (error) {
    console.error("Erro ao excluir orçamento:", error);
    return false;
  }
}
