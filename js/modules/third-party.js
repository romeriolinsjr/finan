import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import { formatCurrency, getMesAnoChave } from "./utils.js";

export function renderizarDividasDoMes() {
  const listaUl = elements.listaDividasTerceirosUl;
  const tituloEl = elements.terceirosTitulo;
  const totalDisplayEl = elements.totalDividasTerceiros;

  if (!listaUl || !tituloEl || !totalDisplayEl) return;

  // CORRIGIDO: Removido o prefixo "utils."
  const mesAno = getMesAnoChave(state.dividasTerceirosDate);
  const nomeMes = state.dividasTerceirosDate.toLocaleString("pt-BR", {
    month: "long",
  });
  const ano = state.dividasTerceirosDate.getFullYear();
  tituloEl.textContent = `Dívidas de ${
    nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)
  }/${ano}`;

  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() + 24);

  if (elements.btnTerceirosProximo) {
    elements.btnTerceirosProximo.disabled =
      getMesAnoChave(state.dividasTerceirosDate) >= getMesAnoChave(limitDate);
  }

  const dividasDoMes = state.dividasTerceiros.filter(
    (d) => d.mesAnoReferencia === mesAno,
  );

  const totalMes = dividasDoMes.reduce(
    (soma, divida) => soma + divida.valor,
    0,
  );
  totalDisplayEl.textContent = `Total: ${formatCurrency(totalMes)}`;

  listaUl.innerHTML = "";
  if (dividasDoMes.length === 0) {
    listaUl.innerHTML =
      '<li style="text-align: center; padding: 20px; color: #777;">Nenhuma dívida para este mês.</li>';
    return;
  }

  const dividasAgrupadas = dividasDoMes.reduce((acc, divida) => {
    if (!acc[divida.pessoaId]) {
      const pessoaInfo = state.pessoas.find((p) => p.id === divida.pessoaId);
      acc[divida.pessoaId] = {
        nomePessoa: pessoaInfo ? pessoaInfo.nome : "Pessoa Desconhecida",
        dividas: [],
      };
    }
    acc[divida.pessoaId].dividas.push(divida);
    return acc;
  }, {});

  const listaOrdenada = Object.values(dividasAgrupadas).sort((a, b) =>
    a.nomePessoa.localeCompare(b.nomePessoa),
  );

  listaOrdenada.forEach((grupo) => {
    const tituloPessoa = document.createElement("h4");
    tituloPessoa.textContent = grupo.nomePessoa;
    tituloPessoa.style.cssText =
      "padding: 10px 15px 5px; margin: 15px 0 5px; background-color: #f8f9fa; border-top: 1px solid #eee; border-bottom: 1px solid #eee;";
    listaUl.appendChild(tituloPessoa);

    grupo.dividas.sort((a, b) => b.valor - a.valor);

    grupo.dividas.forEach((divida) => {
      const li = document.createElement("li");
      li.className = "divida-terceiro-item";
      if (divida.reembolsado) {
        li.classList.add("reembolsado");
      }
      let detalhesTransacao = divida.nomeTransacao;
      if (divida.frequencia === "parcelada") {
        detalhesTransacao += ` (${divida.parcelaAtual}/${divida.totalParcelas})`;
      }
      li.innerHTML = `
                    <input type="checkbox" data-divida-id="${divida.id}" ${
                      divida.reembolsado ? "checked" : ""
                    }>
                    <div class="divida-info">
                        <span class="transacao-detalhes">${detalhesTransacao}</span>
                        <span class="divida-valor">${formatCurrency(
                          divida.valor,
                        )}</span>
                    </div>
                    <div class="transaction-actions">
                        <button class="btn-edit btn-edit-divida" data-divida-id="${
                          divida.id
                        }" title="Editar Dívida">✎</button>
                        <button class="btn-delete btn-delete-divida" data-divida-id="${
                          divida.id
                        }" title="Excluir Dívida">✖</button>
                    </div>
                `;
      listaUl.appendChild(li);
    });
  });
}

export async function atualizarStatusReembolso(dividaId, novoStatus) {
  if (!state.currentUser) return;
  try {
    const docRef = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("dividasTerceiros")
      .doc(dividaId);
    await docRef.update({ reembolsado: novoStatus });
    console.log(
      `Status de reembolso da dívida ${dividaId} atualizado para ${novoStatus}.`,
    );
  } catch (error) {
    console.error("Erro ao atualizar status de reembolso:", error);
  }
}

export async function excluirDividaTerceiroUnica(dividaId) {
  if (!state.currentUser) {
    alert("Erro: Você precisa estar logado para excluir uma dívida.");
    return;
  }

  const dividaParaExcluir = state.dividasTerceiros.find(
    (d) => d.id === dividaId,
  );
  if (!dividaParaExcluir) {
    console.error("Dívida não encontrada para exclusão:", dividaId);
    return;
  }

  if (
    window.confirm(
      `Tem certeza que deseja excluir a dívida "${dividaParaExcluir.nomeTransacao}"? Esta ação não pode ser desfeita.`,
    )
  ) {
    try {
      const dividaRef = db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("dividasTerceiros")
        .doc(dividaId);
      await dividaRef.delete();
      console.log(`Dívida ${dividaId} excluída com sucesso do Firestore.`);
    } catch (error) {
      console.error("Erro ao excluir dívida do Firestore:", error);
      alert("Ocorreu um erro ao tentar excluir a dívida.");
    }
  }
}

export function obterDadosFormularioTerceiros() {
  const pessoaSelect = elements.passo2Container.querySelector("#pessoaSelect");
  const pessoaId = pessoaSelect ? pessoaSelect.value : null;

  const descricaoDivida = elements.nomeTransacaoInput.value.trim();

  const categoria =
    elements.passo2Container.querySelector("#categoriaDespesa").value;
  const frequencia =
    categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA
      ? elements.passo2Container.querySelector("#frequenciaDespesaOrd").value
      : elements.passo2Container.querySelector("#frequenciaDespesaCartao")
          .value;

  let dados = {
    pessoaId: pessoaId,
    nomeTransacao: descricaoDivida,
    categoria: categoria,
    frequencia: frequencia,
    cartaoId: null,
    valor: 0,
    totalParcelas: 1,
    parcelaAtual: 1,
    tipoCadastroParcela: null,
  };

  if (frequencia === CONSTS.FREQUENCIA.PARCELADA) {
    if (categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA) {
      dados.valor =
        parseFloat(
          elements.passo2Container.querySelector("#valorDespesaOrdParcelada")
            .value,
        ) || 0;
      dados.tipoCadastroParcela = elements.passo2Container.querySelector(
        "#tipoCadastroParcelaOrd",
      ).value;
      dados.totalParcelas = parseInt(
        elements.passo2Container.querySelector("#qtdParcelasOrd").value,
      );
      dados.parcelaAtual =
        parseInt(
          elements.passo2Container.querySelector("#parcelaAtualOrd").value,
        ) || 1;
    } else {
      dados.valor =
        parseFloat(
          elements.passo2Container.querySelector("#valorDespesaCartaoParcelada")
            .value,
        ) || 0;
      dados.tipoCadastroParcela = elements.passo2Container.querySelector(
        "#tipoCadastroParcelaCartao",
      ).value;
      dados.totalParcelas = parseInt(
        elements.passo2Container.querySelector("#qtdParcelasCartao").value,
      );
      dados.parcelaAtual =
        parseInt(
          elements.passo2Container.querySelector("#parcelaAtualCartao").value,
        ) || 1;
    }
  } else {
    if (categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA) {
      dados.valor =
        parseFloat(
          elements.passo2Container.querySelector(
            "#valorDespesaOrdUnicaRecorrente",
          ).value,
        ) || 0;
    } else {
      dados.valor =
        parseFloat(
          elements.passo2Container.querySelector(
            "#valorDespesaCartaoUnicaRecorrente",
          ).value,
        ) || 0;
    }
  }

  if (categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO) {
    const cartaoEl = elements.passo2Container.querySelector("#cartaoDespesa");
    dados.cartaoId = cartaoEl ? cartaoEl.value : null;
  }

  return dados;
}

export function atualizarSelectPessoas(idParaSelecionar = null) {
  const pessoaSelect = elements.passo2Container.querySelector("#pessoaSelect");
  if (!pessoaSelect) return;

  const valorSelecionadoAnteriormente = pessoaSelect.value;

  let opcoesHTML = '<option value="">-- Selecione a Pessoa --</option>';
  state.pessoas.forEach((p) => {
    opcoesHTML += `<option value="${p.id}">${p.nome}</option>`;
  });
  opcoesHTML +=
    '<option value="cadastrar_nova">Cadastrar nova pessoa...</option>';

  pessoaSelect.innerHTML = opcoesHTML;

  if (idParaSelecionar) {
    pessoaSelect.value = idParaSelecionar;
  } else {
    pessoaSelect.value = valorSelecionadoAnteriormente;
  }
}

export async function adicionarNovaDividaTerceiro(dados) {
  if (!state.currentUser) {
    alert("Erro: Nenhum usuário logado para salvar a dívida.");
    return false;
  }
  if (!dados.pessoaId) {
    alert("Por favor, selecione uma pessoa.");
    return false;
  }
  if (!dados.nomeTransacao) {
    alert("Por favor, informe a descrição da dívida.");
    return false;
  }
  if (dados.valor <= 0) {
    alert("O valor da dívida deve ser maior que zero.");
    return false;
  }

  let dividasParaAdicionar = [];
  const mesAnoReferenciaBase = getMesAnoChave(state.currentDate);
  const serieId = db.collection("users").doc().id;

  const baseObject = {
    userId: state.currentUser.uid,
    pessoaId: dados.pessoaId,
    nomeTransacao: dados.nomeTransacao,
    categoria: dados.categoria,
    frequencia: dados.frequencia,
    cartaoId: dados.cartaoId,
    reembolsado: false,
    serieId: dados.frequencia !== "unica" ? serieId : null,
  };

  if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
    const totalParcelas = dados.totalParcelas;
    let valorDaParcela =
      dados.tipoCadastroParcela === CONSTS.CADASTRO_PARCELA.VALOR_TOTAL
        ? parseFloat((dados.valor / totalParcelas).toFixed(2))
        : dados.valor;
    let parcelaInicial = dados.parcelaAtual || 1;

    for (let i = 0; i < totalParcelas - parcelaInicial + 1; i++) {
      let mesReferenciaParcela = new Date(state.currentDate);
      mesReferenciaParcela.setMonth(mesReferenciaParcela.getMonth() + i);

      dividasParaAdicionar.push({
        ...baseObject,
        valor: valorDaParcela,
        parcelaAtual: parcelaInicial + i,
        totalParcelas: totalParcelas,
        mesAnoReferencia: getMesAnoChave(mesReferenciaParcela),
      });
    }
    // NOVA LÓGICA PARA TRATAR DÍVIDAS RECORRENTES
  } else if (dados.frequencia === CONSTS.FREQUENCIA.RECORRENTE) {
    for (let i = 0; i < CONSTS.RECORRENCIA_MESES; i++) {
      let mesReferenciaRecorrente = new Date(state.currentDate);
      mesReferenciaRecorrente.setMonth(mesReferenciaRecorrente.getMonth() + i);

      dividasParaAdicionar.push({
        ...baseObject,
        valor: dados.valor,
        mesAnoReferencia: getMesAnoChave(mesReferenciaRecorrente),
      });
    }
  } else {
    // Dívida Única
    dividasParaAdicionar.push({
      ...baseObject,
      valor: dados.valor,
      parcelaAtual: 1,
      totalParcelas: 1,
      mesAnoReferencia: mesAnoReferenciaBase,
    });
  }

  const batch = db.batch();
  const dividasCollectionRef = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("dividasTerceiros");

  dividasParaAdicionar.forEach((divida) => {
    const newDocRef = dividasCollectionRef.doc();
    batch.set(newDocRef, divida);
  });

  try {
    await batch.commit();
    console.log(
      `${dividasParaAdicionar.length} dívida(s) de terceiro salvas no Firestore.`,
    );
    return true;
  } catch (error) {
    console.error("Erro ao salvar dívidas de terceiro no Firestore:", error);
    alert("Ocorreu um erro ao salvar a dívida. Tente novamente.");
    return false;
  }
}

export function abrirModalEdicaoDivida(
  dividaId,
  contexto,
  callbackFecharConsulta,
  callbackAbrirModal,
) {
  const divida = state.dividasTerceiros.find((d) => d.id === dividaId);
  if (!divida) return;

  callbackFecharConsulta();

  elements.dividaEditIdInput.value = divida.id;
  elements.dividaEditSerieIdInput.value = divida.serieId || "";
  elements.dividaEditContextoInput.value = contexto;

  const nomeBase =
    divida.frequencia === "parcelada"
      ? divida.nomeTransacao.replace(/\s\(\d+\/\d+\)$/, "")
      : divida.nomeTransacao;

  elements.nomeDividaEditInput.value = nomeBase;
  elements.valorDividaEditInput.value = divida.valor;

  elements.modalEditarDividaTitulo.textContent = `Editar Dívida: ${nomeBase.substring(
    0,
    20,
  )}...`;

  // Adicionado "null" e "generic" para evitar o erro de reset
  callbackAbrirModal(elements.modalEditarDivida, null, "generic");
}

export async function atualizarDividaUnica(id, novoNome, novoValor) {
  if (!state.currentUser) return;
  try {
    const docRef = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("dividasTerceiros")
      .doc(id);
    await docRef.update({ nomeTransacao: novoNome, valor: novoValor });
    console.log("Dívida única atualizada com sucesso.");
  } catch (error) {
    console.error("Erro ao atualizar dívida única:", error);
    alert("Ocorreu um erro ao salvar as alterações.");
  }
}

export async function atualizarDividaSerie(id, serieId, novoNome, novoValor) {
  if (!state.currentUser) return;

  const dividaInicial = state.dividasTerceiros.find((d) => d.id === id);
  if (!dividaInicial) return;
  const mesAnoInicio = dividaInicial.mesAnoReferencia;

  try {
    const querySnapshot = await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("dividasTerceiros")
      .where("serieId", "==", serieId)
      .where("mesAnoReferencia", ">=", mesAnoInicio)
      .get();

    const batch = db.batch();
    querySnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { nomeTransacao: novoNome, valor: novoValor });
    });
    await batch.commit();
    console.log(
      `${querySnapshot.docs.length} dívidas da série foram atualizadas.`,
    );
  } catch (error) {
    console.error("Erro ao atualizar série de dívidas:", error);
    alert("Ocorreu um erro ao salvar as alterações na série.");
  }
}

export function renderizarListaPessoas() {
  // Busca o elemento diretamente caso o mapa falhe por algum motivo
  const listaUl =
    elements.listaPessoasCadastradasUl ||
    document.getElementById("listaPessoasCadastradas");
  if (!listaUl) return;

  listaUl.innerHTML = "";

  if (state.pessoas.length === 0) {
    listaUl.innerHTML =
      '<li style="text-align: center; padding: 15px; color: #777;">Nenhuma pessoa cadastrada.</li>';
    return;
  }

  state.pessoas.forEach((pessoa) => {
    const li = document.createElement("li");
    li.className = "cartao-item"; // Usando classe existente para manter o estilo
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "10px";
    li.style.borderBottom = "1px solid #eee";

    li.innerHTML = `
            <span style="font-weight: 500;">${pessoa.nome}</span>
            <div class="transaction-actions">
                <button class="btn-edit btn-edit-pessoa" data-id="${pessoa.id}" title="Editar Nome">✎</button>
                <button class="btn-delete btn-delete-pessoa" data-id="${pessoa.id}" title="Excluir Pessoa">✖</button>
            </div>`;
    listaUl.appendChild(li);
  });
}

export function preencherModalEdicaoPessoa(pessoaId) {
  const pessoa = state.pessoas.find((p) => p.id === pessoaId);
  if (pessoa) {
    elements.nomePessoaInputModal.value = pessoa.nome;
    document.querySelector("#modalCadastrarPessoa h2").textContent =
      "Editar Pessoa";
    elements.btnSalvarPessoaModal.textContent = "Salvar Alterações";
  }
}

export async function excluirPessoa(pessoaId) {
  if (!state.currentUser) return;

  // Verifica se a pessoa tem dívidas vinculadas antes de excluir
  const temDividas = state.dividasTerceiros.some(
    (d) => d.pessoaId === pessoaId,
  );
  if (temDividas) {
    alert(
      "Não é possível excluir esta pessoa pois ela possui dívidas vinculadas.",
    );
    return;
  }

  if (confirm("Tem certeza que deseja excluir este cadastro?")) {
    try {
      await db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("pessoas")
        .doc(pessoaId)
        .delete();
      // O onSnapshot no main.js cuidará de atualizar a lista local state.pessoas
      alert("Pessoa removida com sucesso.");
    } catch (error) {
      console.error("Erro ao excluir pessoa:", error);
    }
  }
}
