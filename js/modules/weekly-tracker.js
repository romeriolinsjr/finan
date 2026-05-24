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

  // FILTRAGEM CORRETA: Itens vinculados e ordenados por cadastro (Mais recentes no topo)
  const transacoesDoCiclo = state.transacoes
    .filter((t) => {
      const vinculo = state.votosTracker.find(
        (v) => v.transacaoId === t.id && v.cicloId === ciclo.id,
      );
      return !!vinculo;
    })
    .sort((a, b) => {
      const getVal = (item) => {
        if (!item.criadoEm) return 0;
        // Converte Timestamp do Firebase ou número (ms) para valor comparável
        if (item.criadoEm.seconds) return item.criadoEm.seconds * 1000;
        return Number(item.criadoEm) || 0;
      };

      const valA = getVal(a);
      const valB = getVal(b);

      // 1. Prioridade: Quem tem data de criação (novos) fica no topo.
      // Compras antigas (sem o campo) descem para a base da lista.
      if (valA === 0 && valB > 0) return 1;
      if (valB === 0 && valA > 0) return -1;

      // 2. Se ambos têm data, ordena do mais recente para o mais antigo
      if (valB !== valA) return valB - valA;

      // 3. Desempate: Se foram criados no mesmo milissegundo (comum em lotes/parcelados),
      // usamos a ordem alfabética para evitar que a lista fique "pulando".
      return (a.nome || "").localeCompare(b.nome || "");
    });

  const totalGastoNovasCompras = transacoesDoCiclo.reduce(
    (s, t) => s + (Number(t.valor) || 0),
    0,
  );
  const valorBaseDoCiclo = parseFloat(ciclo.valorInicial) || 0;
  const totalCicloAteAgora = valorBaseDoCiclo + totalGastoNovasCompras;

  // --- GERAÇÃO DINÂMICA DE SEMANAS (REGRA DO RESTO) ---
  const semanas = [];
  let diasRestantesParaProcessar = totalDias;
  let contadorSemana = 1;

  while (diasRestantesParaProcessar > 0) {
    const diasDestaSemana = Math.min(7, diasRestantesParaProcessar);
    const limiteDestaSemana = diasDestaSemana * metaDiaria;

    semanas.push({
      nome: `Semana ${contadorSemana}`,
      limite: limiteDestaSemana,
      valor: 0,
      dias: diasDestaSemana,
    });

    diasRestantesParaProcessar -= diasDestaSemana;
    contadorSemana++;
  }

  // Distribuição Waterfall (Balde Transbordante)
  let acumulado = totalCicloAteAgora;
  semanas.forEach((s) => {
    if (acumulado > 0) {
      const valorParaEstaSemana = Math.min(acumulado, s.limite);
      s.valor = valorParaEstaSemana;
      acumulado -= valorParaEstaSemana;
    }
    // Se estourar a meta total do ciclo, o excesso acumula na última semana
    else if (acumulado > 0 && s.nome === `Semana ${semanas.length}`) {
      s.valor += acumulado;
      acumulado = 0;
    }
  });
  // Tratamento de estouro: se após passar por todas as semanas ainda sobrar acumulado
  if (acumulado > 0) {
    semanas[semanas.length - 1].valor += acumulado;
  }

  const pctMensal = (
    (totalCicloAteAgora / (ciclo.metaTotal || 1)) *
    100
  ).toFixed(1);

  // --- NOVO: LÓGICA DE FEEDBACK DE IMPACTO (CRONOGRAMA) ---
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let diasDecorridos = 0;
  let statusDiaTexto = "";

  if (hoje < dataInic) {
    // Caso o ciclo ainda não tenha começado
    const diffFutura = dataInic - hoje;
    const diasParaComecar = Math.ceil(diffFutura / (1000 * 60 * 60 * 24));
    statusDiaTexto = `O ciclo começa em <strong>${diasParaComecar} dia(s)</strong>.`;
    diasDecorridos = 0;
  } else {
    // Caso o ciclo já esteja em andamento ou tenha terminado
    const diffHoje = hoje - dataInic;
    diasDecorridos = Math.min(
      Math.ceil(diffHoje / (1000 * 60 * 60 * 24)) + 1,
      totalDias,
    );
    statusDiaTexto = `Você está no <strong>${diasDecorridos}º dia</strong> do ciclo.`;
  }

  const gastoEsperadoAteHoje = metaDiaria * diasDecorridos;
  const diferencaDoPrevisto = totalCicloAteAgora - gastoEsperadoAteHoje;

  const statusMensagem =
    totalCicloAteAgora > gastoEsperadoAteHoje
      ? `<span style="color:#e74c3c">acima do previsto (${formatCurrency(Math.abs(diferencaDoPrevisto))})</span>`
      : `<span style="color:#27ae60">dentro do limite (${formatCurrency(Math.abs(diferencaDoPrevisto))} de folga)</span>`;

  const infoImpactoHTML = `
    <div class="tracker-impact-box" style="background: #fdfefe; border: 1px solid #e0e0e0; border-left: 5px solid #3498db; padding: 12px; margin-bottom: 20px; border-radius: 6px; font-size: 0.95em; line-height: 1.5;">
      • ${statusDiaTexto}<br>
      • O previsto de gastos até hoje era de <strong>${formatCurrency(gastoEsperadoAteHoje)}</strong> (${((gastoEsperadoAteHoje / (ciclo.metaTotal || 1)) * 100).toFixed(1)}%).<br>
      • Seu gasto real até hoje é de <strong>${formatCurrency(totalCicloAteAgora)}</strong> (${pctMensal}%).<br>
      • Você está ${statusMensagem}.
    </div>
  `;
  // --- FIM DA NOVA LÓGICA ---

  container.innerHTML = `
    <div class="tracker-cycle-header">
      <div>
        <h3 style="color: ${index === 0 && totalCiclos > 1 ? "#7f8c8d" : "#2c3e50"}">
          ${index === 0 && totalCiclos > 1 ? "Ciclo de Transição (Anterior)" : "Ciclo Corrente (Principal)"}
        </h3>
        <small>${dataInic.toLocaleDateString("pt-BR")} até ${dataFim.toLocaleDateString("pt-BR")} (${totalDias} dias)</small>
      </div>
      <div class="tracker-header-meta">
        <span class="meta-label">Meta: ${formatCurrency(ciclo.metaTotal)}</span><br>
        <small>${formatCurrency(metaDiaria)}/dia | ${formatCurrency(metaSemanal)}/sem</small>
      </div>
    </div>

    ${infoImpactoHTML}

    <div class="weeks-grid">
      ${semanas
        .map((s, i) => {
          const pctSemana =
            s.limite > 0 ? ((s.valor / s.limite) * 100).toFixed(0) : 0;
          let statusClass = "status-normal";
          if (pctSemana >= 100) statusClass = "status-danger";
          else if (pctSemana >= 80) statusClass = "status-warning";

          // Identifica se esta é a semana cronológica atual
          const indiceSemanaAtual = Math.min(
            Math.floor((diasDecorridos - 1) / 7),
            semanas.length - 1,
          );
          const eASemanaAtual = i === indiceSemanaAtual && diasDecorridos > 0;

          // Estilo de destaque para a semana atual (Passo 3: Estilização)
          const estiloDestaque = eASemanaAtual
            ? "border-left: 5px solid #3498db; background-color: #f0f7ff; box-shadow: 0 2px 8px rgba(52, 152, 219, 0.15);"
            : "border-left: 5px solid #bdc3c7;";

          return `
          <div class="week-bucket" style="${estiloDestaque} padding: 12px; border-radius: 6px; margin-bottom: 5px;">
            <div class="week-title" style="display: flex; justify-content: space-between; font-size: 0.85em; color: #7f8c8d; margin-bottom: 5px;">
              <span style="font-weight: bold; ${eASemanaAtual ? "color: #3498db;" : ""}">${s.nome}${eASemanaAtual ? " (ATUAL)" : ""}</span>
              <span style="font-weight: bold;">${pctSemana}%</span>
            </div>
            <div class="week-value" style="font-size: 1.1em; font-weight: 600; margin-bottom: 8px;">${formatCurrency(s.valor)}</div>
            <div class="progress-bar-container" style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin-bottom: 5px;">
              <div class="progress-bar-fill ${statusClass}" style="width: ${Math.min(pctSemana, 100)}%; height: 100%;"></div>
            </div>
            <div class="week-footer" style="font-size: 0.75em; color: #95a5a6; text-align: right;">Meta: ${formatCurrency(s.limite)}</div>
          </div>
        `;
        })
        .join("")}
    </div>

    <div class="tracker-items-summary">
      <div class="tracker-summary-header">
        <strong>Resumo do Ciclo</strong>
        <span class="tracker-summary-total" style="color:${totalCicloAteAgora > ciclo.metaTotal ? "#e74c3c" : "#27ae60"}">
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
