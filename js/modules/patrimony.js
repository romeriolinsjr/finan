import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import {
  formatCurrency,
  registrarUltimaAlteracao,
  getMesAnoChave,
} from "./utils.js";

/**
 * Calcula o saldo real de um item considerando o histórico até um determinado mês.
 * Útil para o motor de ajustes e para relatórios históricos.
 */
export function obterSaldoItemAteMes(subId, mesAnoCorte = "9999-12") {
  const sub = state.patrimonioSubcategorias.find((s) => s.id === subId);
  if (!sub) return 0;

  let saldo = Number(sub.saldoInicial) || 0;
  // Filtra transações de patrimônio vinculadas a este item até o mês de corte
  const historico = (state.transacoes || []).filter(
    (t) =>
      t.patrimonioId === subId &&
      t.mesAnoReferencia <= mesAnoCorte &&
      t.tipo === "patrimonio",
  );

  historico.forEach((t) => {
    const v = Number(t.valor) || 0;
    if (t.operacao === "aporte") saldo += v;
    else if (t.operacao === "resgate") saldo -= v;
    else if (t.operacao === "ajuste") saldo += v;
    else if (t.operacao === "amortizacao") saldo -= v;
  });
  return saldo;
}

/**
 * Renderiza a árvore hierárquica do Patrimônio.
 * @param {HTMLElement} targetUl - O elemento UL onde será renderizado (Modal ou Home).
 * @param {boolean} isHome - Se true, renderiza botões operacionais (+, -, ≈, ↓).
 */
export function renderizarListaPatrimonioHierarquica(
  targetUl = elements.listaPatrimonioHierarquicaUl,
  isHome = false,
) {
  if (!targetUl) return;
  targetUl.innerHTML = "";

  const categorias = state.patrimonioCategorias || [];
  const subcategorias = state.patrimonioSubcategorias || [];

  // Função de cálculo atualizada para incluir a Amortização como saída do item
  const calcularSaldoRealItem = (sub) => {
    let saldo = Number(sub.saldoInicial) || 0;
    const historico = (state.transacoes || []).filter(
      (t) => t.patrimonioId === sub.id,
    );
    historico.forEach((t) => {
      const v = Number(t.valor) || 0;
      if (t.operacao === "aporte") saldo += v;
      else if (t.operacao === "resgate") saldo -= v;
      else if (t.operacao === "ajuste") saldo += v;
      else if (t.operacao === "amortizacao") saldo -= v; // Amortização retira dinheiro da conta de patrimônio
    });
    return saldo;
  };

  if (categorias.length === 0) {
    targetUl.innerHTML =
      '<li style="padding: 20px; text-align: center; color: #7f8c8d;">Nenhuma categoria cadastrada.</li>';
  } else {
    // ALTERAÇÃO: Ordena as categorias pela 'posicao' (manual) e depois pelo nome (alfabético)
    const listaAtivos = categorias
      .filter((c) => c.tipo === "ativo")
      .sort(
        (a, b) =>
          (a.posicao || 0) - (b.posicao || 0) || a.nome.localeCompare(b.nome),
      );

    const listaAmortizacao = categorias
      .filter((c) => c.tipo === "passivo")
      .sort(
        (a, b) =>
          (a.posicao || 0) - (b.posicao || 0) || a.nome.localeCompare(b.nome),
      );

    const renderizarSecao = (listaDeCategorias, tituloSecao, corDestaque) => {
      if (listaDeCategorias.length === 0) return;
      let totalSecao = 0;
      const secaoFragmento = document.createDocumentFragment();

      listaDeCategorias.forEach((cat) => {
        const filhos = subcategorias.filter(
          (sub) => sub.categoriaId === cat.id,
        );
        let totalCategoria = 0;
        const containerItens = [];

        // Ordena os itens por Saldo Real (Decrescente)
        filhos
          .sort((a, b) => calcularSaldoRealItem(b) - calcularSaldoRealItem(a))
          .forEach((sub) => {
            const saldoReal = calcularSaldoRealItem(sub);
            totalCategoria += saldoReal;
            totalSecao += saldoReal;

            const botoesOperacionais = isHome
              ? `
            <div class="patrimonio-op-group">
              <button class="btn-pat-op" data-id="${sub.id}" data-op="aporte" title="Aporte (+)" style="color:#27ae60;">⊕</button>
              <button class="btn-pat-op" data-id="${sub.id}" data-op="resgate" title="Resgate (-)" style="color:#e74c3c;">⊖</button>
              <button class="btn-pat-op" data-id="${sub.id}" data-op="ajuste" title="Ajuste de Valor (≈)" style="color:#3498db;">≈</button>
              <button class="btn-pat-op" data-id="${sub.id}" data-op="amortizacao" title="Amortização (↓)" style="color:#008080;">↓</button>
            </div>`
              : "";

            containerItens.push(`
            <li class="patrimonio-item-row">
              <div class="patrimonio-info" data-id="${sub.id}">
                <span class="patrimonio-item-nome">${sub.nome}</span>
                <span class="patrimonio-item-valor">${formatCurrency(saldoReal)}</span>
              </div>
              <div class="patrimonio-item-actions-wrapper">
                ${botoesOperacionais}
                <div class="transaction-actions">
                  <button class="btn-edit-pat-sub" data-id="${sub.id}" title="Editar Item">✎</button>
                  <button class="btn-delete-pat-sub" data-id="${sub.id}" title="Excluir Item">✖</button>
                </div>
              </div>
            </li>`);
          });

        const liCat = document.createElement("li");
        liCat.className = "patrimonio-category-row";

        // ADICIONADO: Botões de mover ↑ e ↓ na categoria
        liCat.innerHTML = `
          <div class="patrimonio-category-info">
            <span class="patrimonio-category-nome">📂 ${cat.nome}</span> 
            <span class="patrimonio-category-valor">${formatCurrency(totalCategoria)}</span>
          </div>
          <div class="transaction-actions">
            <button class="btn-move-pat-cat" data-id="${cat.id}" data-dir="up" title="Mover para cima">▲</button>
            <button class="btn-move-pat-cat" data-id="${cat.id}" data-dir="down" title="Mover para baixo">▼</button>
            <button class="btn-edit-pat-cat" data-id="${cat.id}" title="Editar Categoria">✎</button>
            <button class="btn-delete-pat-cat" data-id="${cat.id}" title="Excluir Categoria">✖</button>
          </div>`;

        secaoFragmento.appendChild(liCat);
        const divFilhos = document.createElement("div");
        divFilhos.innerHTML =
          containerItens.length > 0
            ? containerItens.join("")
            : '<li style="padding: 8px 15px 8px 40px; font-size: 0.85em; color: #999; font-style: italic; background: #fff; border-bottom: 1px solid #eee;">Nenhum item vinculado</li>';
        secaoFragmento.appendChild(divFilhos);
      });

      const headerSecao = document.createElement("li");
      headerSecao.className = "patrimonio-section-header";
      headerSecao.style.backgroundColor = corDestaque;
      headerSecao.innerHTML = `<span>${tituloSecao}</span> <span>${formatCurrency(totalSecao)}</span>`;

      targetUl.appendChild(headerSecao);
      targetUl.appendChild(secaoFragmento);
    };

    renderizarSecao(listaAtivos, "Formação de Ativos", "#27ae60");
    renderizarSecao(listaAmortizacao, "Recursos para Amortização", "#3498db");
  }

  // Atualiza os resumos (Home ou Modal)
  const totalGeralCalculo = subcategorias.reduce(
    (acc, sub) => acc + calcularSaldoRealItem(sub),
    0,
  );
  const elementoExibicao = isHome
    ? elements.valorPatrimonioLiquidoHome
    : elements.valorPatrimonioLiquido;
  if (elementoExibicao)
    elementoExibicao.textContent = formatCurrency(totalGeralCalculo);
}

// --- CATEGORIAS ---
export function resetFormCategoria() {
  elements.patCategoriaEditIdInput.value = "";
  elements.nomePatCategoriaInput.value = "";
  elements.tipoPatCategoriaSelect.value = "ativo";
  elements.tituloModalPatCategoria.textContent = "Nova Categoria de Patrimônio";
}

export function preencherModalEdicaoCategoria(id) {
  const cat = state.patrimonioCategorias.find((c) => c.id === id);
  if (cat) {
    elements.patCategoriaEditIdInput.value = cat.id;
    elements.nomePatCategoriaInput.value = cat.nome;
    elements.tipoPatCategoriaSelect.value = cat.tipo;
    elements.tituloModalPatCategoria.textContent = "Editar Categoria";
  }
}

export async function salvarCategoria() {
  if (!state.currentUser) return;
  const nome = elements.nomePatCategoriaInput.value.trim();
  const tipo = elements.tipoPatCategoriaSelect.value;
  const id = elements.patCategoriaEditIdInput.value;
  if (!nome) return alert("Informe o nome.");

  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("patrimonioCategorias");
  try {
    if (id) await ref.doc(id).update({ nome, tipo });
    else await ref.add({ nome, tipo });
    await registrarUltimaAlteracao();
  } catch (e) {
    console.error(e);
  }
}

export async function excluirCategoria(id) {
  const possuiFilhos = state.patrimonioSubcategorias.some(
    (s) => s.categoriaId === id,
  );
  if (possuiFilhos) return alert("Exclua os itens vinculados primeiro.");
  if (!confirm("Excluir categoria?")) return;
  try {
    await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("patrimonioCategorias")
      .doc(id)
      .delete();
    await registrarUltimaAlteracao();
  } catch (e) {
    console.error(e);
  }
}

// --- SUB-CATEGORIAS ---
export function popularSelectCategoriasPai() {
  if (!elements.selectCategoriaPai) return;
  const categorias = state.patrimonioCategorias || [];
  let h = '<option value="">-- Selecione a Categoria Pai --</option>';
  categorias
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .forEach((cat) => {
      h += `<option value="${cat.id}">${cat.nome} (${cat.tipo === "ativo" ? "Ativo" : "Amortização"})</option>`;
    });
  elements.selectCategoriaPai.innerHTML = h;
}

export function resetFormSubcategoria() {
  elements.patSubcategoriaEditIdInput.value = "";
  elements.nomePatSubcategoriaInput.value = "";
  elements.saldoInicialPatrimonioInput.value = "";
  elements.tituloModalPatSubcategoria.textContent = "Novo Item de Patrimônio";
  popularSelectCategoriasPai();
}

export function preencherModalEdicaoSubcategoria(id) {
  const sub = state.patrimonioSubcategorias.find((s) => s.id === id);
  if (sub) {
    popularSelectCategoriasPai();
    elements.patSubcategoriaEditIdInput.value = sub.id;
    elements.selectCategoriaPai.value = sub.categoriaId;
    elements.nomePatSubcategoriaInput.value = sub.nome || "";
    elements.saldoInicialPatrimonioInput.value = sub.saldoInicial || 0;
    elements.tituloModalPatSubcategoria.textContent = "Editar Item";
  }
}

export async function salvarSubcategoria() {
  if (!state.currentUser) return;
  const catId = elements.selectCategoriaPai.value;
  const nome = elements.nomePatSubcategoriaInput.value.trim();
  const saldo = parseFloat(elements.saldoInicialPatrimonioInput.value) || 0;
  const id = elements.patSubcategoriaEditIdInput.value;
  if (!catId || !nome) return alert("Preencha todos os campos.");

  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("patrimonioSubcategorias");
  try {
    if (id)
      await ref
        .doc(id)
        .update({ categoriaId: catId, nome, saldoInicial: saldo });
    else await ref.add({ categoriaId: catId, nome, saldoInicial: saldo });
    await registrarUltimaAlteracao();
  } catch (e) {
    console.error(e);
  }
}

export async function excluirSubcategoria(id) {
  if (!confirm("Excluir este item?")) return;
  try {
    await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("patrimonioSubcategorias")
      .doc(id)
      .delete();
    await registrarUltimaAlteracao();
  } catch (e) {
    console.error(e);
  }
}

/**
 * HISTÓRICO (EXTRATO) DO ITEM
 */
export function abrirHistoricoPatrimonio(id, callbackAbrir) {
  // Prepara o objeto de callbacks com a função 'popularHistorico' esperada pelo ui.js
  const callbacksExtrato = {
    popularHistorico: (idItem) => {
      const sub = (state.patrimonioSubcategorias || []).find(
        (s) => s.id === idItem,
      );
      if (!sub) return;

      if (elements.tituloDetalhesPatrimonio) {
        elements.tituloDetalhesPatrimonio.textContent = `Extrato: ${sub.nome}`;
      }

      if (!elements.listaHistoricoPatrimonioUl) return;
      elements.listaHistoricoPatrimonioUl.innerHTML = "";

      // 1. Saldo Inicial
      const liInicial = document.createElement("li");
      liInicial.style.cssText =
        "display:flex; justify-content:space-between; padding:12px; border-bottom: 2px solid #eee; background:#f9f9f9; border-left: 5px solid #bdc3c7;";
      liInicial.innerHTML = `<span><strong>SALDO INICIAL</strong></span> <strong>${formatCurrency(sub.saldoInicial)}</strong>`;
      elements.listaHistoricoPatrimonioUl.appendChild(liInicial);

      let saldoCorrente = Number(sub.saldoInicial) || 0;

      // 2. Movimentações
      const historico = (state.transacoes || [])
        .filter((t) => t.patrimonioId === idItem)
        .sort((a, b) => new Date(a.dataOperacao) - new Date(b.dataOperacao));

      if (historico.length === 0) {
        const liVazio = document.createElement("li");
        liVazio.style.cssText =
          "padding: 20px; text-align: center; color: #7f8c8d;";
        liVazio.textContent = "Nenhuma movimentação registrada.";
        elements.listaHistoricoPatrimonioUl.appendChild(liVazio);
      } else {
        historico.forEach((t) => {
          const v = Number(t.valor) || 0;
          let sinal = "";
          let cor = "#333";
          const op = t.operacao || "";

          if (op === "aporte") {
            sinal = "+";
            cor = "#27ae60";
            saldoCorrente += v;
          } else if (op === "resgate") {
            sinal = "-";
            cor = "#e74c3c";
            saldoCorrente -= v;
          } else if (op === "ajuste") {
            sinal = v >= 0 ? "+" : "";
            cor = "#3498db";
            saldoCorrente += v;
          } else if (op === "amortizacao") {
            sinal = "-";
            cor = "#008080";
            saldoCorrente -= v;
          }

          const dataFmt = t.dataOperacao
            ? t.dataOperacao.split("-").reverse().join("/")
            : "N/D";
          const li = document.createElement("li");
          li.style.cssText =
            "display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #f1f1f1;";

          // LÓGICA DE EXCLUSÃO: Apenas se for 'ajuste'
          const btnExcluirAjuste =
            op === "ajuste"
              ? `<button class="btn-delete-ajuste-pat" data-id="${t.id}" title="Excluir este ajuste" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1.1em; padding:5px; margin-left:10px;">✖</button>`
              : "";

          li.innerHTML = `
            <div style="display:flex; flex-direction:column; flex-grow: 1;">
              <span style="font-size:0.8em; color:#7f8c8d;">${dataFmt} - ${op.toUpperCase()}</span>
              <small style="color:#95a5a6;">Saldo: ${formatCurrency(saldoCorrente)}</small>
            </div>
            <div style="display:flex; align-items:center; gap:5px;">
              <span style="color:${cor}; font-weight:bold; display:block; text-align:right;">${sinal} ${formatCurrency(v)}</span>
              ${btnExcluirAjuste}
            </div>`;
          elements.listaHistoricoPatrimonioUl.appendChild(li);
        });
      }

      // 3. Saldo Atual Final
      const liFinal = document.createElement("li");
      liFinal.style.cssText =
        "display:flex; justify-content:space-between; padding:15px 12px; margin-top:10px; background:#2c3e50; color:white; border-radius:5px;";
      liFinal.innerHTML = `<span><strong>SALDO ATUAL ACUMULADO</strong></span> <strong>${formatCurrency(saldoCorrente)}</strong>`;
      elements.listaHistoricoPatrimonioUl.appendChild(liFinal);
    },
  };

  callbackAbrir(
    elements.modalDetalhesPatrimonio,
    id,
    "patrimonioHistorico",
    callbacksExtrato,
  );
}

/**
 * Altera a posição de uma categoria na árvore (Reclassificação Manual).
 */
export async function moverCategoriaPatrimonio(id, direcao) {
  if (!state.currentUser) return;
  const categoriaAlvo = state.patrimonioCategorias.find((c) => c.id === id);
  if (!categoriaAlvo) return;

  // 1. Filtra categorias da mesma natureza e as ordena pela posição atual
  const irmas = state.patrimonioCategorias
    .filter((c) => c.tipo === categoriaAlvo.tipo)
    .sort(
      (a, b) =>
        (a.posicao || 0) - (b.posicao || 0) || a.nome.localeCompare(b.nome),
    );

  const index = irmas.findIndex((c) => c.id === id);
  if (direcao === "up" && index === 0) return;
  if (direcao === "down" && index === irmas.length - 1) return;

  const vizinhoIndex = direcao === "up" ? index - 1 : index + 1;
  const categoriaVizinha = irmas[vizinhoIndex];

  const batch = db.batch();
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("patrimonioCategorias");

  // Troca as posições. Se não existirem (posicao 0), inicializa baseado no index.
  const novaPosicaoAlvo = categoriaVizinha.posicao || vizinhoIndex;
  const novaPosicaoVizinho = categoriaAlvo.posicao || index;

  // Se as posições forem idênticas (ex: ambas 0), forçamos uma diferenciação
  if (novaPosicaoAlvo === novaPosicaoVizinho) {
    batch.update(ref.doc(categoriaAlvo.id), {
      posicao: direcao === "up" ? vizinhoIndex : vizinhoIndex,
    });
    batch.update(ref.doc(categoriaVizinha.id), {
      posicao: direcao === "up" ? index : index,
    });
  } else {
    batch.update(ref.doc(categoriaAlvo.id), { posicao: novaPosicaoAlvo });
    batch.update(ref.doc(categoriaVizinha.id), { posicao: novaPosicaoVizinho });
  }

  try {
    await batch.commit();
    await registrarUltimaAlteracao();
  } catch (error) {
    console.error("Erro ao mover categoria:", error);
  }
}
