import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import {
  getMesAnoChave,
  parseDateString,
  registrarUltimaAlteracao,
} from "./utils.js";

export function resetModalNovaTransacao() {
  if (
    !elements.tipoTransacaoSelect ||
    !elements.nomeTransacaoInput ||
    !elements.passo2Container ||
    !elements.btnAvancarTransacao ||
    !elements.btnSalvarTransacao ||
    !elements.btnVoltarTransacao ||
    !elements.modalHeaderNovaTransacao
  )
    return;

  elements.tipoTransacaoSelect.parentElement.style.display = "block";
  elements.nomeTransacaoInput.parentElement.style.display = "block";
  elements.btnAvancarTransacao.style.display = "inline-block";
  elements.btnSalvarTransacao.style.display = "none";
  elements.btnVoltarTransacao.style.display = "none";
  elements.passo2Container.innerHTML = "";
  elements.passo2Container.style.display = "none";
  elements.tipoTransacaoSelect.value = "";
  elements.nomeTransacaoInput.value = "";
  if (elements.quickAddFeedback)
    elements.quickAddFeedback.style.display = "none";
  state.currentModalStep = 1;

  const nomeLabel = elements.nomeTransacaoInput.previousElementSibling;
  if (state.isModoTerceiros) {
    elements.modalHeaderNovaTransacao.textContent =
      "Nova Dívida de Terceiro (Passo 1)";
    elements.tipoTransacaoSelect.value = "despesa";
    elements.tipoTransacaoSelect.disabled = true;
    elements.nomeTransacaoInput.placeholder = "Ex: Empréstimo, Compra Celular";
    if (nomeLabel) nomeLabel.textContent = "Descrição da Dívida:";
  } else {
    elements.modalHeaderNovaTransacao.textContent =
      "Nova Transação (Passo 1 de 2)";
    elements.tipoTransacaoSelect.disabled = false;
    elements.nomeTransacaoInput.placeholder = "Ex: Salário, Aluguel";
    if (nomeLabel) nomeLabel.textContent = "Nome:";
  }
}

export function preencherModalParaEdicao(id, callbackFechar) {
  if (
    !elements.tipoTransacaoSelect ||
    !elements.nomeTransacaoInput ||
    !elements.modalHeaderNovaTransacao
  )
    return;
  const transacao = state.transacoes.find((t) => t.id === id);
  if (!transacao) {
    console.error("Transação não encontrada para edição:", id);
    callbackFechar(elements.modalNovaTransacao);
    return;
  }
  const nomeOriginal = transacao.serieId
    ? transacao.nome
        .replace(/\s\(\d+\/\d+\)$/, "")
        .replace(/\s\(Recorrente\)$/, "")
    : transacao.nome;
  const nomeCurto =
    nomeOriginal.substring(0, 25) + (nomeOriginal.length > 25 ? "..." : "");
  elements.modalHeaderNovaTransacao.textContent = `Editar Transação: ${nomeCurto} (Passo 1)`;
  elements.tipoTransacaoSelect.value = transacao.tipo;
  elements.nomeTransacaoInput.value = nomeOriginal;
  elements.tipoTransacaoSelect.disabled = true;
}

export function carregarFormularioReceita(transacao = null) {
  const hoje = new Date().toISOString().split("T")[0];
  const template = document.getElementById("template-form-receita");
  const clone = template.content.cloneNode(true);

  clone.querySelector(".form-title-action").textContent = state.isEditMode
    ? "Editando"
    : "Nova";
  clone.querySelector(".form-title-name").textContent =
    `${elements.nomeTransacaoInput.value.substring(0, 30)}${
      elements.nomeTransacaoInput.value.length > 30 ? "..." : ""
    }`;
  clone.querySelector("#valorReceita").value =
    transacao && typeof transacao.valor !== "undefined" ? transacao.valor : "";
  const dataEntradaInput = clone.querySelector("#dataEntradaReceita");
  dataEntradaInput.value =
    transacao && transacao.dataEntrada ? transacao.dataEntrada : hoje;

  const freqSelect = clone.querySelector("#frequenciaReceita");
  if (transacao && transacao.frequencia) {
    freqSelect.value = transacao.frequencia;
  }
  if (state.isEditMode) {
    freqSelect.disabled = true;
    freqSelect.insertAdjacentHTML(
      "afterend",
      '<small class="form-note">A frequência não pode ser alterada em uma transação existente.</small>',
    );
  }
  if (state.editingSerieId) {
    dataEntradaInput.disabled = true;
    dataEntradaInput.insertAdjacentHTML(
      "afterend",
      '<small class="form-note">Data de início não pode ser alterada ao editar uma série.</small>',
    );
  }

  elements.passo2Container.innerHTML = "";
  elements.passo2Container.appendChild(clone);
}

export function carregarFormularioDespesa(
  transacao = null,
  callbackOrd,
  callbackCartao,
) {
  const template = document.getElementById("template-form-despesa");
  const clone = template.content.cloneNode(true);

  clone.querySelector(".form-title-action").textContent = state.isEditMode
    ? "Editando"
    : "Nova";
  clone.querySelector(".form-title-name").textContent =
    `${elements.nomeTransacaoInput.value.substring(0, 30)}${
      elements.nomeTransacaoInput.value.length > 30 ? "..." : ""
    }`;

  const categoriaSelect = clone.querySelector("#categoriaDespesa");
  const formCamposAdicionaisContainer = clone.querySelector(
    "#formCamposAdicionaisDespesa",
  );

  if (transacao && transacao.categoria) {
    categoriaSelect.value = transacao.categoria;
  }

  categoriaSelect.addEventListener("change", (e) => {
    const categoriaSelecionada = e.target.value;
    formCamposAdicionaisContainer.innerHTML = "";
    const transacaoParaSubForm =
      state.isEditMode &&
      state.editingTransactionId &&
      transacao &&
      categoriaSelecionada === transacao.categoria
        ? transacao
        : null;
    const nomeCurto =
      elements.nomeTransacaoInput.value.substring(0, 25) +
      (elements.nomeTransacaoInput.value.length > 25 ? "..." : "");

    if (categoriaSelecionada === CONSTS.CATEGORIA_DESPESA.ORDINARIA) {
      callbackOrd(formCamposAdicionaisContainer, transacaoParaSubForm);
      elements.modalHeaderNovaTransacao.textContent = state.isEditMode
        ? `Editar Desp. Ordinária: ${nomeCurto} (Passo 2)`
        : "Nova Despesa Ordinária (Passo 2 de 2)";
    } else if (
      categoriaSelecionada === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO
    ) {
      callbackCartao(formCamposAdicionaisContainer, transacaoParaSubForm);
      elements.modalHeaderNovaTransacao.textContent = state.isEditMode
        ? `Editar Desp. Cartão: ${nomeCurto} (Passo 2)`
        : "Nova Despesa Cartão (Passo 2 de 2)";
    }
  });

  elements.passo2Container.appendChild(clone);

  if (transacao && transacao.categoria) {
    categoriaSelect.dispatchEvent(new Event("change"));
    if (state.isEditMode) {
      categoriaSelect.disabled = true;
      categoriaSelect.insertAdjacentHTML(
        "afterend",
        '<small class="form-note">Categoria não pode ser alterada.</small>',
      );
    }
  }
}

export function carregarFormularioDespesaOrdinaria(
  container,
  transacao = null,
) {
  const hoje = new Date().toISOString().split("T")[0];
  const template = document.getElementById("template-form-despesa-ordinaria");
  const clone = template.content.cloneNode(true);

  const dataVencimentoInput = clone.querySelector("#dataVencimentoDespesaOrd");
  dataVencimentoInput.value =
    transacao && transacao.dataVencimento ? transacao.dataVencimento : hoje;

  const frequenciaSelect = clone.querySelector("#frequenciaDespesaOrd");
  const valorUnicaRecorrenteInput = clone.querySelector(
    "#valorDespesaOrdUnicaRecorrente",
  );
  const valorParceladaInput = clone.querySelector("#valorDespesaOrdParcelada");
  const valorContainerOrdUnicaRecorrente = clone.querySelector(
    "#valorContainerOrdUnicaRecorrente",
  );
  const camposParceladaDiv = clone.querySelector("#camposParceladaOrd");
  const tipoCadastroParcelaSelect = clone.querySelector(
    "#tipoCadastroParcelaOrd",
  );
  const qtdParcelasInput = clone.querySelector("#qtdParcelasOrd");
  const parcelaAtualInput = clone.querySelector("#parcelaAtualOrd");

  if (transacao) {
    if (transacao.frequencia) frequenciaSelect.value = transacao.frequencia;
    if (transacao.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
      valorParceladaInput.value = transacao.valor || "";
      if (transacao.tipoCadastroParcela)
        tipoCadastroParcelaSelect.value = transacao.tipoCadastroParcela;
      if (transacao.totalParcelas)
        qtdParcelasInput.value = transacao.totalParcelas;
      if (transacao.parcelaAtual)
        parcelaAtualInput.value = transacao.parcelaAtual;
    } else {
      valorUnicaRecorrenteInput.value = transacao.valor || "";
    }
  }

  if (state.isEditMode) {
    frequenciaSelect.disabled = true;
    frequenciaSelect.insertAdjacentHTML(
      "afterend",
      '<small class="form-note">A frequência não pode ser alterada.</small>',
    );
    if (transacao?.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
      tipoCadastroParcelaSelect.disabled = true;
      qtdParcelasInput.disabled = true;
      parcelaAtualInput.disabled = true;
      camposParceladaDiv.insertAdjacentHTML(
        "beforeend",
        '<small class="form-note">Detalhes do parcelamento não podem ser alterados.</small>',
      );
    }
  }

  function toggleParceladaFieldsOrd() {
    const isParcelada = frequenciaSelect.value === CONSTS.FREQUENCIA.PARCELADA;
    camposParceladaDiv.style.display = isParcelada ? "block" : "none";
    valorContainerOrdUnicaRecorrente.style.display = isParcelada
      ? "none"
      : "block";
    valorParceladaInput.required = isParcelada && !frequenciaSelect.disabled;
    valorUnicaRecorrenteInput.required =
      !isParcelada && !frequenciaSelect.disabled;
    if (isParcelada) {
      qtdParcelasInput.required = !frequenciaSelect.disabled;
      parcelaAtualInput.required = !frequenciaSelect.disabled;
    } else if (!state.isEditMode) {
      parcelaAtualInput.value = "1";
      qtdParcelasInput.value = "";
    }
  }

  toggleParceladaFieldsOrd();
  frequenciaSelect.addEventListener("change", toggleParceladaFieldsOrd);

  if (state.editingSerieId) {
    dataVencimentoInput.disabled = true;
    dataVencimentoInput.insertAdjacentHTML(
      "afterend",
      '<small class="form-note">Data de início não pode ser alterada ao editar uma série.</small>',
    );
  }

  container.innerHTML = "";
  container.appendChild(clone);
}

export function carregarFormularioDespesaCartao(
  container,
  transacao = null,
  cartaoPredefinidoId = null,
  callbackAbrirModal,
) {
  const template = document.getElementById("template-form-despesa-cartao");
  const clone = template.content.cloneNode(true);

  const cartaoSelect = clone.querySelector("#cartaoDespesa");
  const orcamentoSelect = clone.querySelector("#orcamentoVinculado");

  let opcoesCartoes = '<option value="">-- Selecione --</option>';
  state.cartoes.forEach((cartao) => {
    opcoesCartoes += `<option value="${cartao.id}">${cartao.nome}</option>`;
  });
  if (!(state.isEditMode && transacao?.cartaoId)) {
    opcoesCartoes += `<option value="novo_cartao">Cadastrar novo cartão...</option>`;
  }
  cartaoSelect.innerHTML = opcoesCartoes;

  let opcoesOrcamentos = '<option value="">Nenhum</option>';
  state.orcamentos.forEach((orc) => {
    opcoesOrcamentos += `<option value="${orc.id}">${orc.nome}</option>`;
  });
  orcamentoSelect.innerHTML = opcoesOrcamentos;

  const cartaoSelecionadoId =
    cartaoPredefinidoId || (transacao ? transacao.cartaoId : null);
  if (cartaoSelecionadoId) cartaoSelect.value = cartaoSelecionadoId;
  if (transacao && transacao.orcamentoId)
    orcamentoSelect.value = transacao.orcamentoId;

  if ((state.isEditMode && transacao?.cartaoId) || !!cartaoPredefinidoId) {
    cartaoSelect.disabled = true;
    cartaoSelect.insertAdjacentHTML(
      "afterend",
      '<small class="form-note">Cartão não pode ser alterada.</small>',
    );
  }

  const frequenciaSelect = clone.querySelector("#frequenciaDespesaCartao");
  const camposParcelamentoDiv = clone.querySelector(
    "#camposParcelamentoCartao",
  );
  const tipoCadastroParcelaSelect = clone.querySelector(
    "#tipoCadastroParcelaCartao",
  );
  const valorDespesaCartaoParceladaInput = clone.querySelector(
    "#valorDespesaCartaoParcelada",
  );
  const qtdParcelasInput = clone.querySelector("#qtdParcelasCartao");
  const parcelaAtualInput = clone.querySelector("#parcelaAtualCartao");
  const valorContainerCartaoUnicaRecorrente = clone.querySelector(
    "#valorContainerCartaoUnicaRecorrente",
  );

  if (transacao) {
    if (transacao.frequencia) frequenciaSelect.value = transacao.frequencia;
    if (transacao.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
      if (transacao.tipoCadastroParcela)
        tipoCadastroParcelaSelect.value = transacao.tipoCadastroParcela;
      if (typeof transacao.valor !== "undefined")
        valorDespesaCartaoParceladaInput.value = transacao.valor;
      if (transacao.totalParcelas)
        qtdParcelasInput.value = transacao.totalParcelas;
      if (transacao.parcelaAtual)
        parcelaAtualInput.value = transacao.parcelaAtual;
    } else {
      const inputVal =
        valorContainerCartaoUnicaRecorrente.querySelector("input");
      if (inputVal && typeof transacao.valor !== "undefined") {
        inputVal.value = transacao.valor;
      }
    }
  }

  if (
    state.isEditMode &&
    (transacao?.frequencia === CONSTS.FREQUENCIA.PARCELADA ||
      transacao?.frequencia === CONSTS.FREQUENCIA.RECORRENTE)
  ) {
    frequenciaSelect.disabled = true;
    frequenciaSelect.insertAdjacentHTML(
      "afterend",
      '<small class="form-note">Frequência não pode ser alterada.</small>',
    );
    if (transacao?.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
      tipoCadastroParcelaSelect.disabled = true;
      qtdParcelasInput.disabled = true;
      parcelaAtualInput.disabled = true;
      camposParcelamentoDiv.insertAdjacentHTML(
        "beforeend",
        '<small class="form-note">Detalhes do parcelamento (exceto valor) não podem ser alterados.</small>',
      );
    }
  }

  function toggleCamposCartao() {
    const frequencia = frequenciaSelect.value;
    const isParcelada = frequencia === CONSTS.FREQUENCIA.PARCELADA;
    camposParcelamentoDiv.style.display = isParcelada ? "block" : "none";
    valorContainerCartaoUnicaRecorrente.style.display = isParcelada
      ? "none"
      : "block";
    valorDespesaCartaoParceladaInput.required =
      isParcelada && !frequenciaSelect.disabled;
    valorContainerCartaoUnicaRecorrente.querySelector("input").required =
      !isParcelada && !frequenciaSelect.disabled;
    if (isParcelada) {
      qtdParcelasInput.required = !frequenciaSelect.disabled;
      parcelaAtualInput.required = !frequenciaSelect.disabled;
    }
  }
  toggleCamposCartao();
  frequenciaSelect.addEventListener("change", toggleCamposCartao);

  cartaoSelect.addEventListener("change", (e) => {
    if (e.target.value === "novo_cartao" && !state.isEditMode) {
      callbackAbrirModal(
        elements.modalCadastrarCartao,
        null,
        "cartaoCadastroEdicao",
      );
      e.target.value = "";
    }
  });

  container.innerHTML = "";
  container.appendChild(clone);
}

export function resetFormParaNovaDespesaCartao() {
  if (
    !elements.passo2Container ||
    !elements.nomeTransacaoInput ||
    !elements.quickAddFeedback
  )
    return;
  elements.nomeTransacaoInput.value = "";
  const frequenciaSelect = elements.passo2Container.querySelector(
    "#frequenciaDespesaCartao",
  );
  if (frequenciaSelect) {
    frequenciaSelect.value = CONSTS.FREQUENCIA.UNICA;
    frequenciaSelect.dispatchEvent(new Event("change"));
  }
  const valorUnicaRecorrenteInput = elements.passo2Container.querySelector(
    "#valorDespesaCartaoUnicaRecorrente",
  );
  if (valorUnicaRecorrenteInput) valorUnicaRecorrenteInput.value = "";
  const valorParceladaInput = elements.passo2Container.querySelector(
    "#valorDespesaCartaoParcelada",
  );
  if (valorParceladaInput) valorParceladaInput.value = "";
  const qtdParcelasInput =
    elements.passo2Container.querySelector("#qtdParcelasCartao");
  if (qtdParcelasInput) qtdParcelasInput.value = "";
  const parcelaAtualInput = elements.passo2Container.querySelector(
    "#parcelaAtualCartao",
  );
  if (parcelaAtualInput) parcelaAtualInput.value = "1";
  const orcamentoSelect = elements.passo2Container.querySelector(
    "#orcamentoVinculado",
  );
  if (orcamentoSelect) orcamentoSelect.value = "";
  elements.quickAddFeedback.textContent = "Despesa salva! Adicione a próxima.";
  elements.quickAddFeedback.style.display = "block";
  setTimeout(() => {
    elements.quickAddFeedback.style.display = "none";
  }, 2500);
  elements.nomeTransacaoInput.focus();
}

export function obterDadosDoFormulario() {
  const dados = {
    nomeBase: elements.nomeTransacaoInput.value.trim(),
    tipo: elements.tipoTransacaoSelect.value,
  };

  if (dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA) {
    dados.valor =
      parseFloat(
        elements.passo2Container.querySelector("#valorReceita").value,
      ) || 0;
    dados.dataEntrada = elements.passo2Container.querySelector(
      "#dataEntradaReceita",
    ).value;
    dados.frequencia =
      elements.passo2Container.querySelector("#frequenciaReceita").value;
  } else if (dados.tipo === CONSTS.TIPO_TRANSACAO.DESPESA) {
    dados.categoria =
      elements.passo2Container.querySelector("#categoriaDespesa").value;

    if (dados.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA) {
      dados.dataVencimento = elements.passo2Container.querySelector(
        "#dataVencimentoDespesaOrd",
      ).value;
      dados.frequencia = elements.passo2Container.querySelector(
        "#frequenciaDespesaOrd",
      ).value;

      if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
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
            elements.passo2Container.querySelector(
              "#valorDespesaOrdUnicaRecorrente",
            ).value,
          ) || 0;
      }
    } else if (dados.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO) {
      dados.frequencia = elements.passo2Container.querySelector(
        "#frequenciaDespesaCartao",
      ).value;
      if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
        dados.valor =
          parseFloat(
            elements.passo2Container.querySelector(
              "#valorDespesaCartaoParcelada",
            ).value,
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
      } else {
        dados.valor =
          parseFloat(
            elements.passo2Container.querySelector(
              "#valorDespesaCartaoUnicaRecorrente",
            ).value,
          ) || 0;
      }
      const cartaoEl = elements.passo2Container.querySelector("#cartaoDespesa");
      dados.cartaoId = cartaoEl.value;
      dados.cartaoNome = cartaoEl.options[cartaoEl.selectedIndex].text;
      const orcamentoEl = elements.passo2Container.querySelector(
        "#orcamentoVinculado",
      );
      dados.orcamentoId =
        orcamentoEl && orcamentoEl.value ? orcamentoEl.value : null;
    }
  }
  return dados;
}

export function validarDadosDaTransacao(dados) {
  if (!dados.nomeBase) {
    alert("O nome da transação não pode ficar em branco.");
    return false;
  }
  if (!dados.tipo) {
    alert("O tipo de transação é obrigatório.");
    return false;
  }
  if (dados.valor <= 0) {
    alert("O valor deve ser maior que zero.");
    return false;
  }
  if (dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA && !dados.dataEntrada) {
    alert("Data de entrada é obrigatória.");
    return false;
  }
  if (
    dados.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA &&
    !dados.dataVencimento
  ) {
    alert("Data de vencimento é obrigatória.");
    return false;
  }
  if (
    dados.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO &&
    !dados.cartaoId
  ) {
    alert("Selecione um cartão válido.");
    return false;
  }
  if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
    if (isNaN(dados.totalParcelas) || dados.totalParcelas < 1) {
      alert("Quantidade de parcelas inválida.");
      return false;
    }
    if (
      isNaN(dados.parcelaAtual) ||
      dados.parcelaAtual < 1 ||
      dados.parcelaAtual > dados.totalParcelas
    ) {
      alert("Número da parcela atual inválido.");
      return false;
    }
  }
  return true;
}

export async function atualizarTransacaoExistente(dados) {
  if (!state.currentUser) {
    alert("Erro: Nenhum usuário logado.");
    return false;
  }

  const dadosParaAtualizar = {
    nome: dados.nomeBase,
    valor: dados.valor,
    dataEntrada: dados.dataEntrada || null,
    dataVencimento: dados.dataVencimento || null,
    categoria: dados.categoria || null,
    cartaoId: dados.cartaoId || null,
    orcamentoId: dados.orcamentoId || null,
  };

  try {
    if (state.editingSerieId) {
      const transacaoInicial = state.transacoes.find(
        (t) => t.id === state.editingTransactionId,
      );
      if (!transacaoInicial) {
        alert(
          "Erro: Transação de referência não encontrada para iniciar a alteração em série.",
        );
        return false;
      }
      const mesAnoInicioAlteracao = transacaoInicial.mesAnoReferencia;

      console.log(
        `Atualizando a série ${state.editingSerieId} a partir de ${mesAnoInicioAlteracao}...`,
      );

      const querySnapshot = await db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("transacoes")
        .where("serieId", "==", state.editingSerieId)
        .where("mesAnoReferencia", ">=", mesAnoInicioAlteracao)
        .get();

      const batch = db.batch();
      querySnapshot.docs.forEach((doc) => {
        const transacaoOriginal = doc.data();
        const nomeAtualizado =
          transacaoOriginal.frequencia === CONSTS.FREQUENCIA.PARCELADA
            ? `${dados.nomeBase} (${transacaoOriginal.parcelaAtual}/${transacaoOriginal.totalParcelas})`
            : dados.nomeBase;

        batch.update(doc.ref, {
          valor: dados.valor,
          nome: nomeAtualizado,
        });
      });
      await batch.commit();
      console.log(
        `${querySnapshot.docs.length} transações da série foram atualizadas (presente e futuras).`,
      );
    } else {
      const docRef = db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("transacoes")
        .doc(state.editingTransactionId);
      await docRef.update(dadosParaAtualizar);
      console.log(
        "Transação única atualizada no Firestore:",
        state.editingTransactionId,
      );
    }
    await registrarUltimaAlteracao();
    return true;
  } catch (error) {
    console.error("Erro ao atualizar transação no Firestore:", error);
    alert("Ocorreu um erro ao atualizar a transação.");
    return false;
  }
}

export async function adicionarNovasTransacoes(dados) {
  if (!state.currentUser) {
    alert("Erro: Nenhum usuário logado para salvar a transação.");
    return false;
  }

  let transacoesParaAdicionar = [];
  const mesAnoReferenciaBase = getMesAnoChave(state.currentDate);

  if (
    dados.frequencia === CONSTS.FREQUENCIA.RECORRENTE ||
    dados.frequencia === CONSTS.FREQUENCIA.PARCELADA
  ) {
    const serieId = db.collection("users").doc().id;

    const baseObject = { ...dados };
    delete baseObject.nomeBase;
    delete baseObject.id;

    if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
      const totalParcelas = dados.totalParcelas;
      let valorDaParcela =
        dados.tipoCadastroParcela === CONSTS.CADASTRO_PARCELA.VALOR_TOTAL
          ? parseFloat((dados.valor / totalParcelas).toFixed(2))
          : dados.valor;
      let parcelaInicial = dados.parcelaAtual || 1;

      for (let i = 0; i < totalParcelas - parcelaInicial + 1; i++) {
        let dataTransacaoParcela = new Date(
          parseDateString(dados.dataEntrada || dados.dataVencimento),
        );
        dataTransacaoParcela.setMonth(dataTransacaoParcela.getMonth() + i);
        let mesReferenciaParcela = new Date(state.currentDate);
        mesReferenciaParcela.setMonth(mesReferenciaParcela.getMonth() + i);

        transacoesParaAdicionar.push({
          ...baseObject,
          serieId: serieId,
          valor: valorDaParcela,
          parcelaAtual: parcelaInicial + i,
          totalParcelas: totalParcelas,
          dataVencimento:
            dados.tipo === CONSTS.TIPO_TRANSACAO.DESPESA
              ? dataTransacaoParcela.toISOString().split("T")[0]
              : null,
          dataEntrada:
            dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA
              ? dataTransacaoParcela.toISOString().split("T")[0]
              : null,
          mesAnoReferencia: getMesAnoChave(mesReferenciaParcela),
          nome: `${dados.nomeBase} (${parcelaInicial + i}/${totalParcelas})`,
        });
      }
    } else {
      for (let i = 0; i < CONSTS.RECORRENCIA_MESES; i++) {
        let dataTransacaoRecorrente = new Date(
          parseDateString(dados.dataEntrada || dados.dataVencimento),
        );
        dataTransacaoRecorrente.setMonth(
          dataTransacaoRecorrente.getMonth() + i,
        );
        let mesReferenciaRecorrente = new Date(state.currentDate);
        mesReferenciaRecorrente.setMonth(
          mesReferenciaRecorrente.getMonth() + i,
        );

        transacoesParaAdicionar.push({
          ...baseObject,
          serieId: serieId,
          mesAnoReferencia: getMesAnoChave(mesReferenciaRecorrente),
          dataEntrada:
            dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA
              ? dataTransacaoRecorrente.toISOString().split("T")[0]
              : null,
          dataVencimento:
            dados.tipo === CONSTS.TIPO_TRANSACAO.DESPESA
              ? dataTransacaoRecorrente.toISOString().split("T")[0]
              : null,
          nome: dados.nomeBase,
        });
      }
    }
  } else {
    const transacaoUnica = {
      nome: dados.nomeBase,
      tipo: dados.tipo,
      frequencia: dados.frequencia,
      valor: dados.valor,
      paga: false,
      serieId: null,
      mesAnoReferencia: mesAnoReferenciaBase,
      categoria: dados.categoria || null,
      dataEntrada: dados.dataEntrada || null,
      dataVencimento: dados.dataVencimento || null,
      cartaoId: dados.cartaoId || null,
      orcamentoId: dados.orcamentoId || null,
    };
    transacoesParaAdicionar.push(transacaoUnica);
  }

  if (transacoesParaAdicionar.length > 0) {
    const batch = db.batch();
    const transacoesCollectionRef = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes");

    transacoesParaAdicionar.forEach((transacao) => {
      const newDocRef = transacoesCollectionRef.doc();
      batch.set(newDocRef, transacao);
    });

    try {
      await batch.commit();
      console.log(
        `${transacoesParaAdicionar.length} transação(ões) salvas no Firestore.`,
      );
      return true;
    } catch (error) {
      console.error("Erro ao salvar transações em lote no Firestore:", error);
      alert("Ocorreu um erro ao salvar a transação. Tente novamente.");
      return false;
    }
  }
  return false;
}

export async function excluirTransacaoUnica(
  transacaoId,
  isInModal = false,
  callbackPopularFatura,
) {
  if (!state.currentUser) {
    alert("Erro: Nenhum usuário logado.");
    return;
  }

  try {
    const transacao = state.transacoes.find((t) => t.id === transacaoId);
    await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes")
      .doc(transacaoId)
      .delete();
    console.log("Transação única excluída do Firestore:", transacaoId);

    if (transacao && transacao.tipo === CONSTS.TIPO_TRANSACAO.DESPESA) {
      await registrarUltimaAlteracao();
    }

    if (
      isInModal &&
      elements.modalDetalhesFaturaCartao.style.display === "flex"
    ) {
      const cartaoIdDetalhes = elements.faturaCartaoNomeTitulo.dataset.cartaoId;
      const mesAnoDetalhes = elements.faturaCartaoNomeTitulo.dataset.mesAno;
      if (cartaoIdDetalhes && mesAnoDetalhes) {
        callbackPopularFatura(cartaoIdDetalhes, mesAnoDetalhes);
      }
    }
  } catch (error) {
    console.error("Erro ao excluir transação no Firestore:", error);
    alert("Ocorreu um erro ao excluir a transação.");
  }
}

export function abrirModalDespesaCartaoRapida(
  cartaoId,
  cartaoNome,
  callbackAbrirModal,
  callbackOrd,
  callbackCartao,
) {
  resetModalNovaTransacao();
  state.isEditMode = false;
  state.editingTransactionId = null;
  state.isQuickAddMode = true;
  elements.modalNovaTransacao.style.display = "flex";
  elements.modalHeaderNovaTransacao.textContent = `Nova Despesa para: ${cartaoNome}`;
  elements.tipoTransacaoSelect.value = CONSTS.TIPO_TRANSACAO.DESPESA;
  elements.tipoTransacaoSelect.disabled = true;
  elements.tipoTransacaoSelect.parentElement.style.display = "none";
  elements.nomeTransacaoInput.parentElement.style.display = "block";
  elements.btnAvancarTransacao.style.display = "none";
  elements.btnVoltarTransacao.style.display = "none";
  elements.passo2Container.style.display = "block";
  elements.btnSalvarTransacao.style.display = "inline-block";

  const transacaoOriginal = null;
  carregarFormularioDespesa(transacaoOriginal, callbackOrd, callbackCartao);

  const categoriaSelect =
    elements.passo2Container.querySelector("#categoriaDespesa");
  if (categoriaSelect) {
    categoriaSelect.value = CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO;
    categoriaSelect.dispatchEvent(new Event("change"));
    categoriaSelect.parentElement.style.display = "none";
    const cartaoDespesaSelect =
      elements.passo2Container.querySelector("#cartaoDespesa");
    if (cartaoDespesaSelect) {
      cartaoDespesaSelect.value = cartaoId;
      cartaoDespesaSelect.disabled = true;
      cartaoDespesaSelect.insertAdjacentHTML(
        "afterend",
        '<small class="form-note">Cartão pré-selecionado.</small>',
      );
    }
  }
  elements.nomeTransacaoInput.focus();
}

export async function atualizarStatusPago(
  transacaoId,
  novoStatus,
  callbackResumo,
) {
  if (!state.currentUser) return;
  try {
    const docRef = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes")
      .doc(transacaoId);
    await docRef.update({ paga: novoStatus });
    await registrarUltimaAlteracao();
    console.log(
      `Status da transação ${transacaoId} atualizado para ${novoStatus}.`,
    );
    const transacaoLocal = state.transacoes.find((t) => t.id === transacaoId);
    if (transacaoLocal) transacaoLocal.paga = novoStatus;
    callbackResumo();
  } catch (error) {
    console.error("Erro ao atualizar status de pagamento:", error);
  }
}

export async function adiarParcelaEmSerie(
  id,
  serieId,
  mesAnoInicio,
  callbackFecharModal,
) {
  if (!state.currentUser || !serieId) {
    alert("Erro: Não foi possível identificar a série da parcela.");
    return;
  }

  const confirmacao = window.confirm(
    `Você tem certeza que deseja adiar esta parcela e todas as futuras em um mês?`,
  );

  if (!confirmacao) return;

  try {
    const querySnapshot = await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes")
      .where("serieId", "==", serieId)
      .where("mesAnoReferencia", ">=", mesAnoInicio)
      .get();

    const batch = db.batch();
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const dataParcela = parseDateString(data.mesAnoReferencia);
      dataParcela.setMonth(dataParcela.getMonth() + 1);
      const novoMesAno = getMesAnoChave(dataParcela);
      batch.update(doc.ref, { mesAnoReferencia: novoMesAno });
    });

    await batch.commit();
    await registrarUltimaAlteracao();
    alert("Parcelas adiadas com sucesso.");
    callbackFecharModal(elements.modalDetalhesFaturaCartao);
  } catch (error) {
    console.error("Erro ao adiar parcelas:", error);
  }
}
