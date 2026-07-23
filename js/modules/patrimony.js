import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import { formatCurrency, registrarUltimaAlteracao } from "./utils.js";

/**
 * Renderiza a árvore hierárquica do Patrimônio no modal de Gerenciamento.
 */
export function renderizarListaPatrimonioHierarquica() {
  if (!elements.listaPatrimonioHierarquicaUl) return;
  elements.listaPatrimonioHierarquicaUl.innerHTML = "";

  const categorias = state.patrimonioCategorias || [];
  const subcategorias = state.patrimonioSubcategorias || [];

  if (categorias.length === 0) {
    elements.listaPatrimonioHierarquicaUl.innerHTML =
      '<li style="padding: 20px; text-align: center; color: #7f8c8d;">Nenhuma categoria cadastrada.</li>';
  } else {
    const listaAtivos = categorias
      .filter((c) => c.tipo === "ativo")
      .sort((a, b) => a.nome.localeCompare(b.nome));
    const listaAmortizacao = categorias
      .filter((c) => c.tipo === "passivo")
      .sort((a, b) => a.nome.localeCompare(b.nome));

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
      });
      return saldo;
    };

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

        filhos
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .forEach((sub) => {
            const saldoReal = calcularSaldoRealItem(sub);
            totalCategoria += saldoReal;
            totalSecao += saldoReal;

            containerItens.push(`
            <li style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px 10px 40px; border-bottom:1px solid #eee; background: #fff;">
              <div class="patrimonio-info" data-id="${sub.id}" style="flex-grow:1; cursor:pointer;">
                <span style="font-size: 0.95em; color: #333; font-weight: 500;">${sub.nome}</span>
                <span style="font-size:0.8em; color:#7f8c8d; display:block;">Saldo Atual: <strong>${formatCurrency(saldoReal)}</strong></span>
              </div>
              <div class="transaction-actions">
                <button class="btn-edit-pat-sub" data-id="${sub.id}" title="Editar Item">✎</button>
                <button class="btn-delete-pat-sub" data-id="${sub.id}" title="Excluir Item">✖</button>
              </div>
            </li>`);
          });

        const liCat = document.createElement("li");
        liCat.style.cssText =
          "background: #f1f2f6; padding: 10px 15px; font-weight: bold; border-bottom: 1px solid #dfe4ea; display: flex; justify-content: space-between; margin-top: 10px; border-radius: 5px 5px 0 0;";
        liCat.innerHTML = `<span>📂 ${cat.nome}</span> <span>${formatCurrency(totalCategoria)}</span>
          <div class="transaction-actions">
            <button class="btn-edit-pat-cat" data-id="${cat.id}" title="Editar Categoria" style="margin-left:10px;">✎</button>
            <button class="btn-delete-pat-cat" data-id="${cat.id}" title="Excluir Categoria">✖</button>
          </div>`;

        secaoFragmento.appendChild(liCat);

        const ulFilhos = document.createElement("div");
        ulFilhos.innerHTML =
          containerItens.length > 0
            ? containerItens.join("")
            : '<li style="padding: 8px 15px 8px 40px; font-size: 0.85em; color: #999; font-style: italic; background: #fff; border-bottom: 1px solid #eee;">Nenhum item vinculado</li>';
        secaoFragmento.appendChild(ulFilhos);
      });

      const headerSecao = document.createElement("li");
      headerSecao.style.cssText = `background: ${corDestaque}; color: white; padding: 10px 15px; font-weight: bold; font-size: 0.95em; text-transform: uppercase; border-radius: 4px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center;`;
      headerSecao.innerHTML = `<span>${tituloSecao}</span> <span>${formatCurrency(totalSecao)}</span>`;

      elements.listaPatrimonioHierarquicaUl.appendChild(headerSecao);
      elements.listaPatrimonioHierarquicaUl.appendChild(secaoFragmento);
    };

    renderizarSecao(listaAtivos, "Formação de Ativos", "#27ae60");
    renderizarSecao(listaAmortizacao, "Recursos para Amortização", "#3498db");
  }

  const totalGeral = (state.patrimonioSubcategorias || []).reduce(
    (acc, sub) => {
      let saldo = Number(sub.saldoInicial) || 0;
      const historico = (state.transacoes || []).filter(
        (t) => t.patrimonioId === sub.id,
      );
      historico.forEach((t) => {
        const v = Number(t.valor) || 0;
        if (t.operacao === "aporte") saldo += v;
        else if (t.operacao === "resgate") saldo -= v;
        else if (t.operacao === "ajuste") saldo += v;
      });
      return acc + saldo;
    },
    0,
  );

  if (elements.valorPatrimonioLiquido) {
    elements.valorPatrimonioLiquido.textContent = formatCurrency(totalGeral);
  }
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
            sinal = "↓"; // Seta para baixo indicando saída para liquidação de dívida
            cor = "#d35400"; // Laranja escuro para diferenciar de resgate e ajuste
            // Nota: Não altera o saldoCorrente, pois a amortização não afeta o estoque do ativo
          }

          const dataFmt = t.dataOperacao
            ? t.dataOperacao.split("-").reverse().join("/")
            : "N/D";
          const li = document.createElement("li");
          li.style.cssText =
            "display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #f1f1f1;";
          li.innerHTML = `
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:0.8em; color:#7f8c8d;">${dataFmt} - ${op.toUpperCase()}</span>
              <span style="font-weight:500; color:#2c3e50;">${t.nome || sub.nome}</span>
            </div>
            <div style="text-align:right;">
              <span style="color:${cor}; font-weight:bold; display:block;">${sinal} ${formatCurrency(v)}</span>
              <small style="color:#95a5a6;">Saldo: ${formatCurrency(saldoCorrente)}</small>
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

  // IMPORTANTE: Passamos o ID como idParaEditar (2º argumento) para sincronizar com o ui.js
  callbackAbrir(
    elements.modalDetalhesPatrimonio,
    id,
    "patrimonioHistorico",
    callbacksExtrato,
  );
}
