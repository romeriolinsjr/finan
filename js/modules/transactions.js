import { CONSTS } from "./constants.js";
import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";
import {
  getMesAnoChave,
  parseDateString,
  registrarUltimaAlteracao,
} from "./utils.js";

// Função para gerenciar o que aparece ou some no formulário
export function atualizarVisibilidadeFormulario() {
  const tipo = elements.tipoTransacaoSelect.value;
  const categoria = elements.categoriaDespesa.value;
  const freqOrd = elements.frequenciaDespesaOrd.value;
  const freqCartao = elements.frequenciaDespesaCartao.value;

  // Reseta todas as seções primeiro
  elements.secaoReceita.style.display = "none";
  elements.secaoCategoriaDespesa.style.display = "none";
  elements.secaoDespesaOrdinaria.style.display = "none";
  elements.secaoDespesaCartao.style.display = "none";
  elements.blocoPessoaTerceiros.style.display = state.isModoTerceiros
    ? "block"
    : "none";

  if (tipo === "receita") {
    elements.secaoReceita.style.display = "block";
    elements.btnSalvarTransacao.style.display = "inline-block";
  } else if (tipo === "despesa") {
    elements.secaoCategoriaDespesa.style.display = "block";

    if (categoria === "ordinaria") {
      elements.secaoDespesaOrdinaria.style.display = "block";
      elements.camposParceladaOrd.style.display =
        freqOrd === "parcelada" ? "block" : "none";
      elements.btnSalvarTransacao.style.display = "inline-block";
    } else if (categoria === "cartao_credito") {
      elements.secaoDespesaCartao.style.display = "block";
      // Controla a cascata do parcelamento
      const isParcelada = freqCartao === "parcelada";
      elements.containerTipoCadastroCartao.style.display = isParcelada
        ? "block"
        : "none";
      elements.camposParcelamentoCartao.style.display = isParcelada
        ? "block"
        : "none";

      elements.containerOrcamentoVinculado.style.display = state.isModoTerceiros
        ? "none"
        : "block";
      elements.btnSalvarTransacao.style.display = "inline-block";
    } else {
      elements.btnSalvarTransacao.style.display = "none";
    }
  } else {
    elements.btnSalvarTransacao.style.display = "none";
  }
}

export function resetModalNovaTransacao() {
  // Limpa textos e seletores
  elements.tipoTransacaoSelect.value = "";
  elements.nomeTransacaoInput.value = "";
  elements.tipoTransacaoSelect.disabled = false;
  elements.nomeTransacaoInput.placeholder = "Ex: Salário, Aluguel";

  // Limpa campos de Receita
  elements.valorReceita.value = "";
  elements.dataEntradaReceita.value = new Date().toISOString().split("T")[0];
  elements.frequenciaReceita.value = "unica";

  // Limpa campos de Despesa
  elements.categoriaDespesa.value = "";
  elements.categoriaDespesa.disabled = false;

  // Ordinária
  elements.frequenciaDespesaOrd.value = "unica";
  elements.frequenciaDespesaOrd.disabled = false;
  elements.valorDespesaOrd.value = "";
  elements.dataVencimentoDespesaOrd.value = new Date()
    .toISOString()
    .split("T")[0];
  elements.tipoCadastroParcelaOrd.value = "valor_total";
  elements.qtdParcelasOrd.value = "";
  elements.parcelaAtualOrd.value = "1";

  // Cartão
  elements.frequenciaDespesaCartao.value = "unica";
  elements.frequenciaDespesaCartao.disabled = false;
  elements.valorDespesaCartao.value = "";
  elements.tipoCadastroParcelaCartao.value = "valor_total";
  elements.qtdParcelasCartao.value = "";
  elements.parcelaAtualCartao.value = "1";

  if (elements.quickAddFeedback)
    elements.quickAddFeedback.style.display = "none";

  // Ajusta títulos
  if (state.isModoTerceiros) {
    elements.modalHeaderNovaTransacao.textContent = "Nova Dívida de Terceiro";
    elements.tipoTransacaoSelect.value = "despesa";
    elements.tipoTransacaoSelect.disabled = true;
  } else {
    elements.modalHeaderNovaTransacao.textContent = state.isEditMode
      ? "Editar Transação"
      : "Nova Transação";
  }

  // Atualiza visibilidade inicial
  atualizarVisibilidadeFormulario();
}

export function preencherModalParaEdicao(id) {
  const transacao = state.transacoes.find((t) => t.id === id);
  if (!transacao) return;

  const nomeOriginal = transacao.serieId
    ? transacao.nome
        .replace(/\s\(\d+\/\d+\)$/, "")
        .replace(/\s\(Recorrente\)$/, "")
    : transacao.nome;

  elements.tipoTransacaoSelect.value = transacao.tipo;
  elements.nomeTransacaoInput.value = nomeOriginal;
  elements.tipoTransacaoSelect.disabled = true;

  if (transacao.tipo === "receita") {
    elements.valorReceita.value = transacao.valor;
    elements.dataEntradaReceita.value = transacao.dataEntrada;
    elements.frequenciaReceita.value = transacao.frequencia;
    elements.frequenciaReceita.disabled = true;
  } else {
    elements.categoriaDespesa.value = transacao.categoria;
    elements.categoriaDespesa.disabled = true;

    if (transacao.categoria === "ordinaria") {
      elements.frequenciaDespesaOrd.value = transacao.frequencia;
      elements.frequenciaDespesaOrd.disabled = true;
      elements.valorDespesaOrd.value = transacao.valor;
      elements.dataVencimentoDespesaOrd.value = transacao.dataVencimento;
      if (transacao.frequencia === "parcelada") {
        elements.qtdParcelasOrd.value = transacao.totalParcelas;
        elements.parcelaAtualOrd.value = transacao.parcelaAtual;
      }
    } else {
      elements.cartaoDespesa.value = transacao.cartaoId;
      elements.cartaoDespesa.disabled = true;
      elements.orcamentoVinculado.value = transacao.orcamentoId || "";
      elements.frequenciaDespesaCartao.value = transacao.frequencia;
      elements.frequenciaDespesaCartao.disabled = true;
      elements.valorDespesaCartao.value = transacao.valor;
      if (transacao.frequencia === "parcelada") {
        elements.qtdParcelasCartao.value = transacao.totalParcelas;
        elements.parcelaAtualCartao.value = transacao.parcelaAtual;
      }
    }
  }

  atualizarVisibilidadeFormulario();
}

export function obterDadosDoFormulario() {
  const tipo = elements.tipoTransacaoSelect.value;
  const dados = {
    nomeBase: elements.nomeTransacaoInput.value.trim(),
    tipo: tipo,
  };

  if (tipo === "receita") {
    dados.valor = parseFloat(elements.valorReceita.value) || 0;
    dados.dataEntrada = elements.dataEntradaReceita.value;
    dados.frequencia = elements.frequenciaReceita.value;
  } else {
    dados.categoria = elements.categoriaDespesa.value;
    if (dados.categoria === "ordinaria") {
      dados.frequencia = elements.frequenciaDespesaOrd.value;
      dados.valor = parseFloat(elements.valorDespesaOrd.value) || 0;
      dados.dataVencimento = elements.dataVencimentoDespesaOrd.value;
      if (dados.frequencia === "parcelada") {
        dados.tipoCadastroParcela = elements.tipoCadastroParcelaOrd.value;
        dados.totalParcelas = parseInt(elements.qtdParcelasOrd.value);
        dados.parcelaAtual = parseInt(elements.parcelaAtualOrd.value) || 1;
      }
    } else {
      dados.frequencia = elements.frequenciaDespesaCartao.value;
      dados.valor = parseFloat(elements.valorDespesaCartao.value) || 0;
      dados.cartaoId = elements.cartaoDespesa.value;
      dados.cartaoNome =
        elements.cartaoDespesa.options[
          elements.cartaoDespesa.selectedIndex
        ]?.text;
      dados.orcamentoId = elements.orcamentoVinculado.value || null;
      if (dados.frequencia === "parcelada") {
        dados.tipoCadastroParcela = elements.tipoCadastroParcelaCartao.value;
        dados.totalParcelas = parseInt(elements.qtdParcelasCartao.value);
        dados.parcelaAtual = parseInt(elements.parcelaAtualCartao.value) || 1;
      }
    }
  }
  return dados;
}

export function validarDadosDaTransacao(dados) {
  if (!dados.nomeBase) {
    alert("Informe o nome.");
    return false;
  }
  if (!dados.valor || dados.valor <= 0) {
    alert("Informe um valor válido.");
    return false;
  }
  if (dados.tipo === "receita" && !dados.dataEntrada) {
    alert("Informe a data.");
    return false;
  }
  if (dados.categoria === "ordinaria" && !dados.dataVencimento) {
    alert("Informe o vencimento.");
    return false;
  }
  if (dados.categoria === "cartao_credito" && !dados.cartaoId) {
    alert("Selecione um cartão.");
    return false;
  }
  if (
    dados.frequencia === "parcelada" &&
    (isNaN(dados.totalParcelas) || dados.totalParcelas < 1)
  ) {
    alert("Quantidade de parcelas inválida.");
    return false;
  }
  return true;
}

// Lógica de Salvamento e Outros (Permanecem similares, apenas adaptados para os novos campos)
export async function atualizarTransacaoExistente(dados) {
  if (!state.currentUser) return false;
  const dadosParaAtualizar = {
    nome:
      dados.frequencia === "parcelada" && !state.editingSerieId
        ? `${dados.nomeBase} (${elements.parcelaAtualOrd.value || elements.parcelaAtualCartao.value}/${elements.qtdParcelasOrd.value || elements.qtdParcelasCartao.value})`
        : dados.nomeBase,
    valor: dados.valor,
    dataEntrada: dados.dataEntrada || null,
    dataVencimento: dados.dataVencimento || null,
    categoria: dados.categoria || null,
    cartaoId: dados.cartaoId || null,
    orcamentoId: dados.orcamentoId || null,
  };

  try {
    if (state.editingSerieId) {
      const querySnapshot = await db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("transacoes")
        .where("serieId", "==", state.editingSerieId)
        .get();
      const batch = db.batch();
      querySnapshot.docs.forEach((doc) => {
        const t = doc.data();
        const nomeFinal =
          t.frequencia === "parcelada"
            ? `${dados.nomeBase} (${t.parcelaAtual}/${t.totalParcelas})`
            : dados.nomeBase;
        batch.update(doc.ref, { valor: dados.valor, nome: nomeFinal });
      });
      await batch.commit();
    } else {
      await db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("transacoes")
        .doc(state.editingTransactionId)
        .update(dadosParaAtualizar);
    }
    await registrarUltimaAlteracao();
    return true;
  } catch (error) {
    return false;
  }
}

export async function adicionarNovasTransacoes(dados) {
  if (!state.currentUser) return false;
  let transacoesParaAdicionar = [];
  const mesAnoBase = getMesAnoChave(state.currentDate);

  if (dados.frequencia === "recorrente" || dados.frequencia === "parcelada") {
    const serieId = db.collection("users").doc().id;
    const totalMeses =
      dados.frequencia === "parcelada"
        ? dados.totalParcelas - dados.parcelaAtual + 1
        : 60;

    for (let i = 0; i < totalMeses; i++) {
      let dataRef = new Date(
        parseDateString(dados.dataEntrada || dados.dataVencimento),
      );
      dataRef.setMonth(dataRef.getMonth() + i);
      let mesReferencia = new Date(state.currentDate);
      mesReferencia.setMonth(mesReferencia.getMonth() + i);

      const valorFinal =
        dados.frequencia === "parcelada" &&
        dados.tipoCadastroParcela === "valor_total"
          ? parseFloat((dados.valor / dados.totalParcelas).toFixed(2))
          : dados.valor;

      transacoesParaAdicionar.push({
        ...dados,
        serieId,
        valor: valorFinal,
        parcelaAtual:
          dados.frequencia === "parcelada" ? dados.parcelaAtual + i : null,
        mesAnoReferencia: getMesAnoChave(mesReferencia),
        dataVencimento: dados.dataVencimento
          ? dataRef.toISOString().split("T")[0]
          : null,
        dataEntrada: dados.dataEntrada
          ? dataRef.toISOString().split("T")[0]
          : null,
        nome:
          dados.frequencia === "parcelada"
            ? `${dados.nomeBase} (${dados.parcelaAtual + i}/${dados.totalParcelas})`
            : dados.nomeBase,
      });
    }
  } else {
    transacoesParaAdicionar.push({
      ...dados,
      nome: dados.nomeBase,
      paga: false,
      serieId: null,
      mesAnoReferencia: mesAnoBase,
    });
  }

  const batch = db.batch();
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("transacoes");
  transacoesParaAdicionar.forEach((t) => {
    const d = { ...t };
    delete d.nomeBase;
    batch.set(ref.doc(), d);
  });

  try {
    await batch.commit();
    return true;
  } catch (e) {
    return false;
  }
}

export async function adicionarNovaDividaTerceiro(dados) {
  if (!state.currentUser) return false;
  const serieId = db.collection("users").doc().id;
  const mesAnoBase = getMesAnoChave(state.currentDate);
  let lista = [];

  const base = {
    userId: state.currentUser.uid,
    pessoaId: elements.pessoaSelect.value,
    nomeTransacao: dados.nomeBase,
    categoria: dados.categoria,
    frequencia: dados.frequencia,
    cartaoId: dados.cartaoId,
    reembolsado: false,
    serieId: dados.frequencia !== "unica" ? serieId : null,
  };

  if (dados.frequencia === "parcelada") {
    const valorParcela =
      dados.tipoCadastroParcela === "valor_total"
        ? parseFloat((dados.valor / dados.totalParcelas).toFixed(2))
        : dados.valor;
    for (let i = 0; i < dados.totalParcelas - dados.parcelaAtual + 1; i++) {
      let mesRef = new Date(state.currentDate);
      mesRef.setMonth(mesRef.getMonth() + i);
      lista.push({
        ...base,
        valor: valorParcela,
        parcelaAtual: dados.parcelaAtual + i,
        totalParcelas: dados.totalParcelas,
        mesAnoReferencia: getMesAnoChave(mesRef),
      });
    }
  } else if (dados.frequencia === "recorrente") {
    for (let i = 0; i < 60; i++) {
      let mesRef = new Date(state.currentDate);
      mesRef.setMonth(mesRef.getMonth() + i);
      lista.push({
        ...base,
        valor: dados.valor,
        mesAnoReferencia: getMesAnoChave(mesRef),
      });
    }
  } else {
    lista.push({
      ...base,
      valor: dados.valor,
      parcelaAtual: 1,
      totalParcelas: 1,
      mesAnoReferencia: mesAnoBase,
    });
  }

  const batch = db.batch();
  const ref = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("dividasTerceiros");
  lista.forEach((d) => batch.set(ref.doc(), d));
  try {
    await batch.commit();
    return true;
  } catch (e) {
    return false;
  }
}

export function popularSeletoresFixos() {
  // Cartões
  let hCartoes = '<option value="">-- Selecione --</option>';
  state.cartoes
    .filter((c) => !c.deletado)
    .forEach((c) => (hCartoes += `<option value="${c.id}">${c.nome}</option>`));
  hCartoes += '<option value="novo_cartao">Cadastrar novo...</option>';
  elements.cartaoDespesa.innerHTML = hCartoes;

  // Orçamentos
  let hOrc = '<option value="">Nenhum</option>';
  state.orcamentos.forEach(
    (o) => (hOrc += `<option value="${o.id}">${o.nome}</option>`),
  );
  elements.orcamentoVinculado.innerHTML = hOrc;
}

export function atualizarSelectPessoas(idParaSelecionar = null) {
  let h = '<option value="">-- Selecione a Pessoa --</option>';
  state.pessoas.forEach(
    (p) => (h += `<option value="${p.id}">${p.nome}</option>`),
  );
  h += '<option value="cadastrar_nova">Cadastrar nova...</option>';
  elements.pessoaSelect.innerHTML = h;
  if (idParaSelecionar) elements.pessoaSelect.value = idParaSelecionar;
}

export function abrirModalDespesaCartaoRapida(
  cartaoId,
  cartaoNome,
  callbackAbrirModal,
) {
  state.isEditMode = false;
  state.editingTransactionId = null;
  state.isQuickAddMode = true;
  resetModalNovaTransacao();

  elements.modalHeaderNovaTransacao.textContent = `Nova Despesa: ${cartaoNome}`;
  elements.tipoTransacaoSelect.value = "despesa";
  elements.tipoTransacaoSelect.disabled = true;
  elements.categoriaDespesa.value = "cartao_credito";
  elements.categoriaDespesa.disabled = true;
  elements.cartaoDespesa.value = cartaoId;
  elements.cartaoDespesa.disabled = true;

  atualizarVisibilidadeFormulario();
  elements.nomeTransacaoInput.focus();
  callbackAbrirModal(elements.modalNovaTransacao, null, "transacao");
}

export async function adiarParcelaEmSerie(
  id,
  serieId,
  mesAnoInicio,
  callbackFecharModal,
) {
  if (!confirm("Adiar esta parcela e as futuras em um mês?")) return;
  try {
    const snap = await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes")
      .where("serieId", "==", serieId)
      .where("mesAnoReferencia", ">=", mesAnoInicio)
      .get();
    const batch = db.batch();
    snap.docs.forEach((doc) => {
      let d = parseDateString(doc.data().mesAnoReferencia);
      d.setMonth(d.getMonth() + 1);
      batch.update(doc.ref, { mesAnoReferencia: getMesAnoChave(d) });
    });
    await batch.commit();
    await registrarUltimaAlteracao();
    callbackFecharModal(elements.modalDetalhesFaturaCartao);
  } catch (e) {
    console.error(e);
  }
}

export async function excluirTransacaoUnica(
  transacaoId,
  isInModal = false,
  callbackPopularFatura,
) {
  if (!confirm("Excluir esta transação?")) return;
  try {
    await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes")
      .doc(transacaoId)
      .delete();
    await registrarUltimaAlteracao();
    if (isInModal) {
      const cId = elements.faturaCartaoNomeTitulo.dataset.cartaoId;
      const mAno = elements.faturaCartaoNomeTitulo.dataset.mesAno;
      callbackPopularFatura(cId, mAno);
    }
  } catch (e) {
    console.error(e);
  }
}

export async function atualizarStatusPago(
  transacaoId,
  novoStatus,
  callbackResumo,
) {
  try {
    await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes")
      .doc(transacaoId)
      .update({ paga: novoStatus });
    await registrarUltimaAlteracao();
    const t = state.transacoes.find((x) => x.id === transacaoId);
    if (t) t.paga = novoStatus;
    callbackResumo();
  } catch (e) {
    console.error(e);
  }
}
