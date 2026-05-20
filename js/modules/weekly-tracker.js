import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import {
  formatCurrency,
  getMesAnoChave,
  registrarUltimaAlteracao,
} from "./utils.js";

/**
 * Renderiza o painel do Weekly Tracker no modal.
 */
export async function renderizarTracker() {
  const container =
    document.getElementById("containerCiclosTracker") ||
    elements.containerCiclosTracker;
  if (!container) return;

  // 1. Busca todos os IDs de transações vinculados aos ciclos ativos
  const transacoesIdsNecessarias = state.votosTracker.map((v) => v.transacaoId);

  // 2. Verifica se temos todas as transações na memória. Se não, busca as faltantes.
  const idsFaltantes = transacoesIdsNecessarias.filter(
    (id) => !state.transacoes.some((t) => t.id === id),
  );

  if (idsFaltantes.length > 0 && state.currentUser) {
    console.log(
      `Weekly Tracker: Carregando ${idsFaltantes.length} transações fora do cache...`,
    );
    const userRef = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes");

    // O Firestore limita 'in' a 10 itens por vez. Vamos buscar um por um para garantir integridade.
    const promessas = idsFaltantes.map((id) => userRef.doc(id).get());
    const snapshots = await Promise.all(promessas);

    snapshots.forEach((snap) => {
      if (snap.exists) {
        const data = snap.data();
        state.transacoes.push({ ...data, id: snap.id });
      }
    });
  }

  container.innerHTML = "";

  const ciclosAtivos = state.ciclosTracker
    .filter((c) => c.status === "ativo")
    .sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));

  if (ciclosAtivos.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:#7f8c8d;">
        <p>Nenhum ciclo de acompanhamento ativo.</p>
        <p style="font-size:0.8em;">Clique em "Abrir Novo Ciclo" para começar.</p>
      </div>`;
    return;
  }

  ciclosAtivos.forEach((ciclo, index) => {
    const htmlCiclo = construirHTMLCiclo(ciclo, index, ciclosAtivos.length);
    container.appendChild(htmlCiclo);
  });
}

/**
 * Constrói o HTML e calcula a lógica de transbordo (Waterfall).
 */
function construirHTMLCiclo(ciclo, index, totalCiclos) {
  const container = document.createElement("div");
  container.className = "tracker-cycle-card";
  container.style.marginBottom = "25px";

  const dataInic = new Date(ciclo.dataInicio + "T12:00:00");
  const dataFim = new Date(ciclo.dataFim + "T12:00:00");
  const diffTime = Math.abs(dataFim - dataInic);
  const totalDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const metaDiaria = ciclo.metaTotal / totalDias;
  const metaSemanal = metaDiaria * 7;

  // FILTRAGEM CORRETA: Exibe TODOS os itens que possuem vínculo explícito com este ciclo,
  // independentemente do mês de referência estar carregado no cache da tela inicial.
  const transacoesDoCiclo = state.transacoes.filter((t) => {
    const vinculo = state.votosTracker.find(
      (v) => v.transacaoId === t.id && v.cicloId === ciclo.id,
    );
    return !!vinculo;
  });

  const totalGastoNovasCompras = transacoesDoCiclo.reduce(
    (s, t) => s + (Number(t.valor) || 0),
    0,
  );
  const valorBaseDoCiclo = parseFloat(ciclo.valorInicial) || 0;
  const totalCicloAteAgora = valorBaseDoCiclo + totalGastoNovasCompras;

  let acumulado = totalCicloAteAgora;
  const semanas = [
    { nome: "Semana 1", limite: metaSemanal, valor: 0 },
    { nome: "Semana 2", limite: metaSemanal, valor: 0 },
    { nome: "Semana 3", limite: metaSemanal, valor: 0 },
    { nome: "Semana 4", limite: metaSemanal, valor: 0 },
    {
      nome: "Semana 5",
      limite: Math.max(0, ciclo.metaTotal - metaSemanal * 4),
      valor: 0,
    },
  ];

  semanas.forEach((s) => {
    if (acumulado > 0) {
      const valorParaEstaSemana = Math.min(acumulado, s.limite);
      s.valor = valorParaEstaSemana;
      acumulado -= valorParaEstaSemana;
    }
  });

  const pctMensal = (
    (totalCicloAteAgora / (ciclo.metaTotal || 1)) *
    100
  ).toFixed(1);

  container.innerHTML = `
    <div class="tracker-cycle-header">
      <div>
        <h3 style="color: ${index === 0 && totalCiclos > 1 ? "#7f8c8d" : "#2c3e50"}">
          ${index === 0 && totalCiclos > 1 ? "Ciclo de Transição (Anterior)" : "Ciclo Corrente (Principal)"}
        </h3>
        <small>${dataInic.toLocaleDateString("pt-BR")} até ${dataFim.toLocaleDateString("pt-BR")} (${totalDias} dias)</small>
      </div>
      <div style="text-align: right;">
        <span style="font-weight: bold; font-size: 1.1em;">Meta: ${formatCurrency(ciclo.metaTotal)}</span><br>
        <small>${formatCurrency(metaDiaria)}/dia | ${formatCurrency(metaSemanal)}/sem</small>
      </div>
    </div>

    <div class="weeks-grid">
      ${semanas
        .map((s) => {
          const pctSemana =
            s.limite > 0 ? ((s.valor / s.limite) * 100).toFixed(0) : 0;
          let statusClass = "status-normal";
          if (pctSemana >= 100) statusClass = "status-danger";
          else if (pctSemana >= 80) statusClass = "status-warning";

          return `
          <div class="week-bucket ${s.valor > 0 && s.valor < s.limite ? "active" : ""}">
            <div class="week-title"><span>${s.nome}</span><span>${pctSemana}%</span></div>
            <div class="week-value">${formatCurrency(s.valor)}</div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill ${statusClass}" style="width: ${Math.min(pctSemana, 100)}%"></div>
            </div>
            <div class="week-footer">Limite: ${formatCurrency(s.limite)}</div>
          </div>
        `;
        })
        .join("")}
    </div>

    <div class="tracker-items-summary">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <strong>Resumo do Ciclo</strong>
        <span style="font-size:1.1em; color:${totalCicloAteAgora > ciclo.metaTotal ? "#e74c3c" : "#27ae60"}">
          Gasto Total: ${formatCurrency(totalCicloAteAgora)} (${pctMensal}%)
        </span>
      </div>
      
      <div class="tracker-item-row" style="background:#f1f2f6; border-left:4px solid #34495e;">
        <span>VALOR INICIAL (Parcelas Antigas/Fixos)</span>
        <strong>${formatCurrency(valorBaseDoCiclo)}</strong>
      </div>

      <div id="lista-itens-ciclo-${ciclo.id}" style="margin-top:10px;">
        ${transacoesDoCiclo
          .map(
            (t) => `
          <div class="tracker-item-row">
            <span>${t.nome}</span>
            <div class="tracker-item-actions">
              <strong>${formatCurrency(t.valor)}</strong>
              ${
                totalCiclos > 1
                  ? `<button class="btn-transfer" data-trans-id="${t.id}" data-current-ciclo="${ciclo.id}" title="Mover para outro ciclo">⇄</button>`
                  : ""
              }
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <div class="tracker-card-footer">
       <button class="btn-secondary btn-tracker-alt" onclick="window.trackerMod.abrirConfig('${ciclo.id}')">Editar Datas/Meta</button>
       <button class="btn-secondary btn-tracker-alt" onclick="window.trackerMod.abrirValorInicial('${ciclo.id}', ${ciclo.valorInicial || 0})">Ajustar Valor Inicial</button>
       <button class="btn-danger btn-tracker-alt" onclick="window.trackerMod.encerrarCiclo('${ciclo.id}')">Encerrar Ciclo</button>
    </div>
  `;

  return container;
}

/**
 * Salva ou Atualiza um ciclo com status garantido.
 */
export async function salvarConfigCiclo(dados) {
  if (!state.currentUser) return;
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("ciclos_tracker");

  try {
    if (dados.id) {
      await ref.doc(dados.id).update({
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim,
        metaTotal: dados.metaTotal,
        status: "ativo", // Garante que o status se mantém ativo na edição
      });
    } else {
      // Bloqueio de segurança: impede ter mais de 2 ciclos ativos ao mesmo tempo
      const ativos = state.ciclosTracker.filter((c) => c.status === "ativo");
      if (ativos.length >= 2) {
        alert(
          "Você já possui 2 ciclos ativos (Principal e Transição). Encerre o mais antigo antes de abrir um novo.",
        );
        return false;
      }

      await ref.add({
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim,
        metaTotal: dados.metaTotal,
        valorInicial: 0,
        status: "ativo",
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    await registrarUltimaAlteracao();
    return true;
  } catch (e) {
    console.error("Erro ao salvar ciclo:", e);
    return false;
  }
}

export async function transferirItem(transacaoId, cicloAtualId) {
  if (!state.currentUser) return;
  const outrosCiclos = state.ciclosTracker.filter(
    (c) => c.id !== cicloAtualId && c.status === "ativo",
  );
  if (outrosCiclos.length === 0) return;

  const novoCicloId = outrosCiclos[0].id;
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("votos_tracker");
  try {
    await ref.doc(transacaoId).set({ transacaoId, cicloId: novoCicloId });
    await registrarUltimaAlteracao();
  } catch (e) {
    console.error(e);
  }
}

export async function salvarValorInicial(cicloId, valor) {
  if (!state.currentUser) return;
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("ciclos_tracker");
  try {
    await ref.doc(cicloId).update({ valorInicial: valor });
    await registrarUltimaAlteracao();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Exclui definitivamente um ciclo e todos os seus vínculos de transações.
 */
export async function encerrarCiclo(cicloId) {
  if (
    !confirm(
      "Tem certeza que deseja encerrar e APAGAR este ciclo? Esta ação não pode ser desfeita e removerá o acompanhamento das compras vinculadas.",
    )
  )
    return;

  const userRef = db.collection("users").doc(state.currentUser.uid);
  const batch = db.batch();

  try {
    // 1. Referência do documento do ciclo
    const cicloRef = userRef.collection("ciclos_tracker").doc(cicloId);
    batch.delete(cicloRef);

    // 2. Busca e remove todos os vínculos (votos) associados a este ciclo específico
    const votosSnap = await userRef
      .collection("votos_tracker")
      .where("cicloId", "==", cicloId)
      .get();

    votosSnap.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 3. Executa a limpeza em lote
    await batch.commit();
    await registrarUltimaAlteracao();

    console.log(
      `Ciclo ${cicloId} e seus ${votosSnap.size} vínculos foram excluídos com sucesso.`,
    );
  } catch (e) {
    console.error("Erro ao encerrar/apagar ciclo:", e);
    alert("Ocorreu um erro ao tentar excluir o ciclo do banco de dados.");
  }
}
