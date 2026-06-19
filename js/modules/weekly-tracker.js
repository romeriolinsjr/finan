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

  // 1. Sincronização de Transações
  const transacoesIdsNecessarias = state.votosTracker.map((v) => v.transacaoId);
  const idsFaltantes = transacoesIdsNecessarias.filter(
    (id) => !state.transacoes.some((t) => t.id === id),
  );

  if (idsFaltantes.length > 0 && state.currentUser) {
    const userRef = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes");
    const snapshots = await Promise.all(
      idsFaltantes.map((id) => userRef.doc(id).get()),
    );
    snapshots.forEach((snap) => {
      if (snap.exists) {
        const data = snap.data();
        state.transacoes.push({ ...data, id: snap.id });
      }
    });
  }

  // 2. Limpeza Total
  container.innerHTML = "";
  if (elements.trackerTabsContainer) {
    elements.trackerTabsContainer.innerHTML = "";
    elements.trackerTabsContainer.style.display = "none";
  }

  const ciclosAtivos = state.ciclosTracker
    .filter((c) => c.status === "ativo")
    .sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));

  if (ciclosAtivos.length === 0) {
    state.trackerActiveTabIndex = null;
    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:#7f8c8d;">
        <p>Nenhum ciclo de acompanhamento ativo.</p>
        <button class="btn-tracker-main" onclick="window.trackerMod.abrirNovoCiclo()" style="margin-top:15px; border:none;">Abrir Novo Ciclo</button>
      </div>`;
    return;
  }

  if (ciclosAtivos.length > 1) {
    if (
      state.trackerActiveTabIndex === null ||
      state.trackerActiveTabIndex >= ciclosAtivos.length
    ) {
      state.trackerActiveTabIndex = 1;
    }
    const nav = document.createElement("div");
    nav.className = "tracker-tabs-nav";
    ciclosAtivos.forEach((ciclo, idx) => {
      const btn = document.createElement("button");
      btn.className = `tracker-tab-btn ${state.trackerActiveTabIndex === idx ? "active" : ""}`;
      btn.textContent = idx === 0 ? "Ciclo de Transição" : "Ciclo Corrente";
      btn.onclick = () => {
        state.trackerActiveTabIndex = idx;
        renderizarTracker();
      };
      nav.appendChild(btn);
    });
    if (elements.trackerTabsContainer) {
      elements.trackerTabsContainer.style.display = "flex";
      elements.trackerTabsContainer.appendChild(nav);
    }
    const cicloParaMostrar = ciclosAtivos[state.trackerActiveTabIndex];
    container.appendChild(
      construirHTMLCiclo(
        cicloParaMostrar,
        state.trackerActiveTabIndex,
        ciclosAtivos.length,
      ),
    );
  } else {
    state.trackerActiveTabIndex = 0;
    container.appendChild(construirHTMLCiclo(ciclosAtivos[0], 0, 1));
  }
}

/**
 * Constrói o HTML e aplica lógica de tempo e cores inteligentes baseadas em RECUPERABILIDADE.
 */
function construirHTMLCiclo(ciclo, index, totalCiclos) {
  const container = document.createElement("div");
  container.className = "tracker-cycle-card";
  container.style.marginBottom = "25px";

  // --- 1. CONSTANTES E CRONOLOGIA (Topo) ---
  const dataInic = new Date(ciclo.dataInicio + "T00:00:00");
  const dataFim = new Date(ciclo.dataFim + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(dataFim - dataInic);
  const totalDias = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const metaDiaria = ciclo.metaTotal / totalDias;

  let diasDecorridos = 0;
  let statusDiaTexto = "";

  if (hoje > dataFim) {
    statusDiaTexto = "<strong>Este ciclo está encerrado.</strong>";
    diasDecorridos = totalDias;
  } else if (hoje < dataInic) {
    const diffFutura = dataInic - hoje;
    const diasParaComecar = Math.round(diffFutura / (1000 * 60 * 60 * 24));
    statusDiaTexto = `O ciclo começa em <strong>${diasParaComecar} dia(s)</strong>.`;
    diasDecorridos = 0;
  } else {
    const diffHoje = hoje - dataInic;
    diasDecorridos = Math.floor(diffHoje / (1000 * 60 * 60 * 24)) + 1;
    statusDiaTexto = `Você está no <strong>${diasDecorridos}º dia</strong> do ciclo.`;
  }

  // --- 2. PROCESSAMENTO DE TRANSAÇÕES ---
  const transacoesDoCiclo = state.transacoes
    .filter((t) =>
      state.votosTracker.some(
        (v) => v.transacaoId === t.id && v.cicloId === ciclo.id,
      ),
    )
    .sort((a, b) => {
      const getVal = (item) => {
        if (!item.criadoEm) return 0;
        if (item.criadoEm.seconds) return item.criadoEm.seconds * 1000;
        return Number(item.criadoEm) || 0;
      };
      const valA = getVal(a),
        valB = getVal(b);
      if (valA === 0 && valB > 0) return 1;
      if (valB === 0 && valA > 0) return -1;
      return valB !== valA
        ? valB - valA
        : (a.nome || "").localeCompare(b.nome || "");
    });

  const totalGastoNovasCompras = transacoesDoCiclo.reduce(
    (s, t) => s + (Number(t.valor) || 0),
    0,
  );
  const valorBaseDoCiclo = parseFloat(ciclo.valorInicial) || 0;
  const totalCicloAteAgora = valorBaseDoCiclo + totalGastoNovasCompras;
  const pctMensal = (
    (totalCicloAteAgora / (ciclo.metaTotal || 1)) *
    100
  ).toFixed(1);

  // --- 3. MOTOR DE RECUPERABILIDADE (Lógica solicitada pelo usuário) ---
  const previstoAteHoje = metaDiaria * diasDecorridos;
  const excessoTotal = totalCicloAteAgora - previstoAteHoje;
  const faltaParaMeta = Math.max(0, ciclo.metaTotal - totalCicloAteAgora);

  let corSaudeCiclo = "status-normal"; // Verde

  if (totalCicloAteAgora > ciclo.metaTotal) {
    corSaudeCiclo = "status-danger"; // Estouro absoluto do mês
  } else if (excessoTotal > 0) {
    // Regra: Se o excesso for maior que 25% do que ainda falta gastar, fica Vermelho.
    // Caso contrário, Amarelo.
    const limiteManobra = faltaParaMeta * 0.25;
    corSaudeCiclo =
      excessoTotal > limiteManobra ? "status-danger" : "status-warning";
  }

  // --- 4. GERAÇÃO DE SEMANAS E DISTRIBUIÇÃO ---
  const semanas = [];
  let dRestantesProc = totalDias;
  while (dRestantesProc > 0) {
    const dSemana = Math.min(7, dRestantesProc);
    semanas.push({
      nome: `Semana ${semanas.length + 1}`,
      limite: dSemana * metaDiaria,
      valor: 0,
      dias: dSemana,
    });
    dRestantesProc -= dSemana;
  }

  let acumuladoGasto = totalCicloAteAgora;
  semanas.forEach((s, idx) => {
    if (acumuladoGasto > 0) {
      const vSemana = Math.min(acumuladoGasto, s.limite);
      s.valor = vSemana;
      acumuladoGasto -= vSemana;
    }
    // Estouro aloca no último balde
    if (idx === semanas.length - 1 && acumuladoGasto > 0)
      s.valor += acumuladoGasto;

    // A cor da barra segue a saúde global do ciclo se houver gasto na semana
    s.statusClass = s.valor > 0 ? corSaudeCiclo : "status-normal";
  });

  // --- 5. QUADRO DE IMPACTO ---
  const difP = totalCicloAteAgora - previstoAteHoje;
  const statusM =
    totalCicloAteAgora > previstoAteHoje
      ? `<span style="color:#e74c3c">acima do previsto (${formatCurrency(Math.abs(difP))})</span>`
      : `<span style="color:#27ae60">dentro do limite (${formatCurrency(Math.abs(difP))} de folga)</span>`;

  const infoImpactoHTML = `
    <div class="tracker-impact-box" style="background: #fdfefe; border: 1px solid #e0e0e0; border-left: 5px solid #3498db; padding: 12px; margin-bottom: 20px; border-radius: 6px; font-size: 0.95em; line-height: 1.5;">
      • ${statusDiaTexto}<br>
      • A previsão de gastos até hoje é de <strong>${formatCurrency(previstoAteHoje)}</strong> (${((previstoAteHoje / (ciclo.metaTotal || 1)) * 100).toFixed(1)}%).<br>
      • Seu gasto real até hoje é de <strong>${formatCurrency(totalCicloAteAgora)}</strong> (${pctMensal}%).<br>
      • Você está ${statusM}.
    </div>
  `;

  // --- 6. RENDERIZAÇÃO DO CARD ---
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
        <small>${formatCurrency(metaDiaria)}/dia | ${formatCurrency(metaDiaria * 7)}/sem</small>
      </div>
    </div>
    ${infoImpactoHTML}
    <div class="weeks-grid">
      ${semanas
        .map((s, i) => {
          const pS = s.limite > 0 ? ((s.valor / s.limite) * 100).toFixed(0) : 0;
          const iniS = i * 7;
          const dPassS =
            diasDecorridos > iniS ? Math.min(diasDecorridos - iniS, s.dias) : 0;

          let hT =
            '<div class="time-bar-container" title="Progresso do tempo na semana">';
          for (let d = 1; d <= s.dias; d++)
            hT += `<div class="time-segment ${d <= dPassS ? "past" : ""}"></div>`;
          hT += "</div>";

          const idxSAtual = Math.min(
            Math.floor((diasDecorridos - 1) / 7),
            semanas.length - 1,
          );
          const eAS = i === idxSAtual && diasDecorridos > 0;
          const eD = eAS
            ? "border-left: 5px solid #3498db; background-color: #f0f7ff;"
            : "border-left: 5px solid #bdc3c7;";

          return `
          <div class="week-bucket" style="${eD} padding: 12px; border-radius: 6px; margin-bottom: 5px;">
            <div class="week-title" style="display: flex; justify-content: space-between; font-size: 0.85em; color: #7f8c8d; margin-bottom: 5px;">
              <span style="font-weight: bold; ${eAS ? "color: #3498db;" : ""}">${s.nome}${eAS ? " (ATUAL)" : ""}</span>
              <span style="font-weight: bold;">${pS}%</span>
            </div>
            <div class="week-value" style="font-size: 1.1em; font-weight: 600; margin-bottom: 8px;">${formatCurrency(s.valor)}</div>
            ${hT}
            <div class="progress-bar-container" style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin-bottom: 5px;">
              <div class="progress-bar-fill ${s.statusClass}" style="width: ${Math.min(pS, 100)}%; height: 100%;"></div>
            </div>
            <div class="week-footer" style="font-size: 0.75em; color: #95a5a6; text-align: right;">Meta: ${formatCurrency(s.limite)}</div>
          </div>`;
        })
        .join("")}
    </div>
    <div class="tracker-items-summary">
      <div style="margin-bottom: 15px; border-bottom: 1px solid #f1f2f6; padding-bottom: 8px;">
        <strong style="color: #2c3e50; font-size: 1.1em;">Resumo do Ciclo</strong>
      </div>
      <div class="tracker-item-row" style="background:#f1f2f6; border-left:4px solid #34495e; margin-bottom: 15px;">
        <span>VALOR INICIAL (Parcelas Antigas/Fixos)</span>
        <strong>${formatCurrency(valorBaseDoCiclo)}</strong>
      </div>
      <div id="lista-itens-ciclo-${ciclo.id}">
        ${transacoesDoCiclo
          .map(
            (t) => `
          <div class="tracker-item-row">
            <span>${t.nome}</span>
            <div class="tracker-item-actions">
              <strong>${formatCurrency(t.valor)}</strong>
              ${totalCiclos > 1 ? `<button class="btn-transfer" data-trans-id="${t.id}" data-current-ciclo="${ciclo.id}" title="Mover para outro ciclo">⇄</button>` : ""}
              <button class="btn-remove-item-tracker" data-trans-id="${t.id}" title="Remover apenas deste acompanhamento">✖</button>
            </div>
          </div>`,
          )
          .join("")}
      </div>
    </div>
    <div class="tracker-card-footer">
       <button class="btn-tracker-main btn-tracker-alt" onclick="window.trackerMod.abrirNovoCiclo()">Abrir Novo Ciclo</button>
       <button class="btn-warning btn-tracker-alt" onclick="window.trackerMod.abrirConfig('${ciclo.id}')">Editar Datas/Meta</button>
       <button class="btn-primary btn-tracker-alt" onclick="window.trackerMod.abrirValorInicial('${ciclo.id}', ${ciclo.valorInicial || 0})">Ajustar Valor Inicial</button>
       <button class="btn-danger btn-tracker-alt" onclick="window.trackerMod.encerrarCiclo('${ciclo.id}')">Encerrar Ciclo</button>
    </div>
  `;
  return container;
}

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
        status: "ativo",
      });
    } else {
      const ativos = state.ciclosTracker.filter((c) => c.status === "ativo");
      if (ativos.length >= 2) {
        alert("Você já possui 2 ciclos ativos. Encerre um antes.");
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
    console.error(e);
    return false;
  }
}

export async function transferirItem(transacaoId, cicloAtualId) {
  if (!state.currentUser) return;
  const outros = state.ciclosTracker.filter(
    (c) => c.id !== cicloAtualId && c.status === "ativo",
  );
  if (outros.length === 0) return;
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("votos_tracker");
  try {
    await ref.doc(transacaoId).set({ transacaoId, cicloId: outros[0].id });
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

export async function encerrarCiclo(cicloId) {
  if (
    !confirm(
      "Tem certeza que deseja encerrar e APAGAR este ciclo? Esta ação removerá o acompanhamento das compras vinculadas.",
    )
  )
    return;
  const userRef = db.collection("users").doc(state.currentUser.uid);
  const batch = db.batch();
  try {
    batch.delete(userRef.collection("ciclos_tracker").doc(cicloId));
    const votosSnap = await userRef
      .collection("votos_tracker")
      .where("cicloId", "==", cicloId)
      .get();
    votosSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    await registrarUltimaAlteracao();
  } catch (e) {
    console.error(e);
  }
}

export async function removerItemDoTracker(transacaoId) {
  if (!state.currentUser) return;
  if (!confirm("Remover esta compra do acompanhamento semanal?")) return;
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("votos_tracker");
  try {
    await ref.doc(transacaoId).delete();
    await registrarUltimaAlteracao();
  } catch (e) {
    console.error(e);
  }
}
