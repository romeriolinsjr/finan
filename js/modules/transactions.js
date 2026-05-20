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

      // Controla a exibição dos campos de parcelamento
      const isParceladaOrd = freqOrd === "parcelada";
      elements.containerTipoCadastroOrd.style.display = isParceladaOrd
        ? "block"
        : "none";
      elements.camposParceladaOrd.style.display = isParceladaOrd
        ? "block"
        : "none";

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

  // NOVO: Garante que seletores de cartão, orçamento e frequências sejam destravados
  elements.cartaoDespesa.disabled = false;
  elements.orcamentoVinculado.disabled = false;
  elements.frequenciaReceita.disabled = false;
  elements.frequenciaDespesaOrd.disabled = false;
  elements.frequenciaDespesaCartao.disabled = false;

  // Limpa avisos de campos travados (se houver)
  const notes = elements.modalNovaTransacao.querySelectorAll(
    ".form-note-injected",
  );
  notes.forEach((n) => n.remove());

  // Ordinária
  elements.frequenciaDespesaOrd.value = "unica";
  elements.frequenciaDespesaOrd.disabled = false;
  elements.valorDespesaOrd.value = "";
  elements.dataVencimentoDespesaOrd.value = new Date()
    .toISOString()
    .split("T")[0];
  elements.tipoCadastroParcelaOrd.value = "valor_total";
  elements.qtdParcelasOrd.value = "1"; // Valor padrão para evitar divisão por zero
  elements.parcelaAtualOrd.value = "1";

  // Cartão
  elements.frequenciaDespesaCartao.value = "unica";
  elements.frequenciaDespesaCartao.disabled = false;
  elements.valorDespesaCartao.value = "";
  elements.tipoCadastroParcelaCartao.value = "valor_total";
  elements.qtdParcelasCartao.value = "1"; // Valor padrão para evitar divisão por zero
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

// Função para limpar apenas os valores durante a adição rápida (dentro da fatura)
export function resetFormParaNovaDespesaCartao() {
  if (!elements.nomeTransacaoInput || !elements.quickAddFeedback) return;

  // Limpa apenas os campos de preenchimento, mantendo o cartão travado
  elements.nomeTransacaoInput.value = "";
  elements.valorDespesaCartao.value = "";
  elements.frequenciaDespesaCartao.value = "unica";
  elements.qtdParcelasCartao.value = "";
  elements.parcelaAtualCartao.value = "1";
  elements.orcamentoVinculado.value = "";

  // Mantém a cascata visível
  atualizarVisibilidadeFormulario();

  // Feedback visual de sucesso
  elements.quickAddFeedback.textContent = "✅ Operação salva com sucesso!";
  elements.quickAddFeedback.style.display = "block";
  elements.quickAddFeedback.style.color = "#27ae60";

  setTimeout(() => {
    if (elements.quickAddFeedback)
      elements.quickAddFeedback.style.display = "none";
  }, 3000);

  elements.nomeTransacaoInput.focus();
}

export function preencherModalParaEdicao(id) {
  const transacao = state.transacoes.find((t) => t.id === id);
  if (!transacao) return;

  // NOVO: Popula os seletores (Cartões/Orçamentos) ANTES de tentar definir os valores
  popularSeletoresFixos();

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
      // Configuração para Cartão de Crédito
      // Garantimos que os seletores estejam vindo do estado mais atualizado
      popularSeletoresFixos();

      elements.cartaoDespesa.value = transacao.cartaoId;
      // LIBERADO: Permitimos a troca do cartão para correções de erros de cadastro
      elements.cartaoDespesa.disabled = false;

      // O Orçamento deve ser preenchido mas permanecer editável para correções
      elements.orcamentoVinculado.value = transacao.orcamentoId || "";
      elements.orcamentoVinculado.disabled = false;

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

  // 1. Captura o nome do orçamento selecionado para rastreio em outros meses
  const orcamentoOriginal = state.orcamentos.find(
    (o) => o.id === dados.orcamentoId,
  );
  const nomeOrcamentoAlvo = orcamentoOriginal ? orcamentoOriginal.nome : null;

  let nomeFinal = dados.nomeBase;
  if (
    dados.frequencia === CONSTS.FREQUENCIA.PARCELADA &&
    !state.editingSerieId
  ) {
    nomeFinal = `${dados.nomeBase} (${dados.parcelaAtual}/${dados.totalParcelas})`;
  }

  const dadosParaAtualizar = {
    nome: nomeFinal,
    valor: dados.valor,
    dataEntrada: dados.dataEntrada || null,
    dataVencimento: dados.dataVencimento || null,
    categoria: dados.categoria || null,
    cartaoId: dados.cartaoId || null,
    orcamentoId: dados.orcamentoId || null,
  };

  try {
    if (state.editingSerieId) {
      const itemAncora = state.transacoes.find(
        (t) => t.id === state.editingTransactionId,
      );
      if (!itemAncora) return false;

      // --- INÍCIO DO MOTOR ECONÔMICO ---

      // A. Busca TODOS os orçamentos do usuário de uma vez só (Economia de Cota)
      const allOrcsSnap = await db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("orcamentos")
        .get();

      // Organiza os orçamentos em um mapa de memória: { "2026-05": [orcs], "2026-06": [orcs] }
      let mapaMensalOrcamentos = {};
      allOrcsSnap.docs.forEach((doc) => {
        const d = doc.data();
        const mes = d.mesAnoReferencia;
        if (!mapaMensalOrcamentos[mes]) mapaMensalOrcamentos[mes] = [];
        mapaMensalOrcamentos[mes].push({ ...d, id: doc.id });
      });

      // B. Busca todas as transações da série do ponto atual em diante
      const querySnapshot = await db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("transacoes")
        .where("serieId", "==", state.editingSerieId)
        .where("mesAnoReferencia", ">=", itemAncora.mesAnoReferencia)
        .get();

      if (querySnapshot.empty) return false;

      const batch = db.batch();
      const mesesNaSerie = [
        ...new Set(
          querySnapshot.docs.map((doc) => doc.data().mesAnoReferencia),
        ),
      ].sort();

      // C. Pavimentação Preventiva: Garante que cada mês da série tenha orçamentos inicializados
      for (const mesReq of mesesNaSerie) {
        if (
          !mapaMensalOrcamentos[mesReq] ||
          mapaMensalOrcamentos[mesReq].length === 0
        ) {
          // Se o mês está vazio, buscamos o mês anterior mais próximo que tenha dados no nosso mapa
          const mesesDisponiveis = Object.keys(mapaMensalOrcamentos)
            .filter((m) => m < mesReq)
            .sort()
            .reverse();
          const mesBase = mesesDisponiveis[0];

          if (mesBase && mapaMensalOrcamentos[mesBase]) {
            console.log(`Pavimentando ${mesReq} usando base de ${mesBase}...`);
            mapaMensalOrcamentos[mesReq] = [];
            mapaMensalOrcamentos[mesBase].forEach((orcBase) => {
              const newRef = db
                .collection("users")
                .doc(state.currentUser.uid)
                .collection("orcamentos")
                .doc();
              const newData = { ...orcBase, mesAnoReferencia: mesReq };
              delete newData.id;
              batch.set(newRef, newData);
              mapaMensalOrcamentos[mesReq].push({ ...newData, id: newRef.id });
            });
          }
        }
      }

      // D. Atualização das Transações
      const dataAntigaStr = itemAncora.dataEntrada || itemAncora.dataVencimento;
      const dataNovaStr = dados.dataEntrada || dados.dataVencimento;
      let diffMeses = 0,
        novoDia = null,
        recalcularDatas = false;

      if (dataNovaStr && dataAntigaStr) {
        const dAntiga = new Date(dataAntigaStr + "T12:00:00");
        const dNova = new Date(dataNovaStr + "T12:00:00");
        diffMeses =
          (dNova.getFullYear() - dAntiga.getFullYear()) * 12 +
          (dNova.getMonth() - dAntiga.getMonth());
        novoDia = dataNovaStr.split("-")[2];
        recalcularDatas = true;
      }

      querySnapshot.docs.forEach((doc) => {
        const tDoc = doc.data();
        const nomeFinalItem =
          tDoc.frequencia === CONSTS.FREQUENCIA.PARCELADA
            ? `${dados.nomeBase} (${tDoc.parcelaAtual}/${tDoc.totalParcelas})`
            : dados.nomeBase;

        // Procura o orçamento pelo nome no nosso mapa de memória do mês correspondente
        let idOrcamentoAlvo = null;
        if (nomeOrcamentoAlvo && mapaMensalOrcamentos[tDoc.mesAnoReferencia]) {
          const alvo = mapaMensalOrcamentos[tDoc.mesAnoReferencia].find(
            (o) => o.nome === nomeOrcamentoAlvo,
          );
          idOrcamentoAlvo = alvo ? alvo.id : null;
        }

        const updates = {
          valor: dados.valor,
          nome: nomeFinalItem,
          orcamentoId: idOrcamentoAlvo,
          cartaoId: dados.cartaoId || null,
        };

        if (recalcularDatas) {
          const dItemOrig = new Date(
            (tDoc.dataEntrada || tDoc.dataVencimento) + "T12:00:00",
          );
          dItemOrig.setMonth(dItemOrig.getMonth() + diffMeses);
          const novaData = `${dItemOrig.getFullYear()}-${(dItemOrig.getMonth() + 1).toString().padStart(2, "0")}-${novoDia}`;
          updates[tDoc.tipo === "receita" ? "dataEntrada" : "dataVencimento"] =
            novaData;
        }

        batch.update(doc.ref, updates);

        // Atualização reativa imediata da memória local
        const indexLocal = state.transacoes.findIndex((t) => t.id === doc.id);
        if (indexLocal !== -1) {
          state.transacoes[indexLocal] = {
            ...state.transacoes[indexLocal],
            ...updates,
          };
        }
      });

      await batch.commit();
      console.log(`Sucesso: ${querySnapshot.size} meses atualizados.`);

      await registrarUltimaAlteracao();
      return querySnapshot.size; // Retorna o número de meses afetados na série
    } else {
      // Edição única (Reatividade já integrada)
      const transRef = db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("transacoes")
        .doc(state.editingTransactionId);
      await transRef.update(dadosParaAtualizar);

      // LÓGICA DE CAPTURA NA EDIÇÃO:
      // Se o usuário editou uma compra antiga e ela é Cartão, vincula ao Tracker para que apareça lá
      if (
        dadosParaAtualizar.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO
      ) {
        const ciclosAtivos = state.ciclosTracker
          .filter((c) => c.status === "ativo")
          .sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));

        const cicloAlvo =
          ciclosAtivos.length > 1 ? ciclosAtivos[1] : ciclosAtivos[0];

        if (cicloAlvo) {
          const trackerRef = db
            .collection("users")
            .doc(state.currentUser.uid)
            .collection("votos_tracker");
          await trackerRef.doc(state.editingTransactionId).set({
            transacaoId: state.editingTransactionId,
            cicloId: cicloAlvo.id,
          });
        }
      }

      const indexLocal = state.transacoes.findIndex(
        (t) => t.id === state.editingTransactionId,
      );
      if (indexLocal !== -1) {
        state.transacoes[indexLocal] = {
          ...state.transacoes[indexLocal],
          ...dadosParaAtualizar,
        };
      }

      await registrarUltimaAlteracao();
      return 1;
    }
  } catch (error) {
    console.error("Erro no motor de atualização:", error);
    return false;
  }
}

export async function adicionarNovasTransacoes(dados) {
  if (!state.currentUser) return false;
  let transacoesParaAdicionar = [];
  const mesAnoBase = getMesAnoChave(state.currentDate);

  const orcamentoOriginal = state.orcamentos.find(
    (o) => o.id === dados.orcamentoId,
  );
  const nomeOrcamentoAlvo = orcamentoOriginal ? orcamentoOriginal.nome : null;

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
      let mesReferenciaObj = new Date(state.currentDate);
      mesReferenciaObj.setMonth(mesReferenciaObj.getMonth() + i);
      const mesReferenciaChave = getMesAnoChave(mesReferenciaObj);

      const valorFinal =
        dados.frequencia === "parcelada" &&
        dados.tipoCadastroParcela === "valor_total"
          ? parseFloat((dados.valor / dados.totalParcelas).toFixed(2))
          : dados.valor;

      let orcamentoIdVinculo = null;
      if (nomeOrcamentoAlvo) {
        const orcNoMes = state.orcamentos.find(
          (o) =>
            o.nome === nomeOrcamentoAlvo &&
            o.mesAnoReferencia === mesReferenciaChave,
        );
        orcamentoIdVinculo = orcNoMes ? orcNoMes.id : null;
      }

      transacoesParaAdicionar.push({
        ...dados,
        serieId,
        orcamentoId: orcamentoIdVinculo,
        valor: valorFinal,
        parcelaAtual:
          dados.frequencia === "parcelada" ? dados.parcelaAtual + i : null,
        mesAnoReferencia: mesReferenciaChave,
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
  const trackerRef = db
    .collection("users")
    .doc(state.currentUser.uid)
    .collection("votos_tracker");

  transacoesParaAdicionar.forEach((t, index) => {
    const d = { ...t };
    delete d.nomeBase;
    const newTransRef = ref.doc();
    batch.set(newTransRef, d);

    // LÓGICA DE CAPTURA AUTOMÁTICA (Weekly Tracker) - CORRIGIDA
    if (
      index === 0 &&
      d.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO
    ) {
      const ciclosAtivos = state.ciclosTracker
        .filter((c) => c.status === "ativo")
        .sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));

      const cicloAlvo =
        ciclosAtivos.length > 1 ? ciclosAtivos[1] : ciclosAtivos[0];

      if (cicloAlvo) {
        batch.set(trackerRef.doc(newTransRef.id), {
          transacaoId: newTransRef.id,
          cicloId: cicloAlvo.id,
        });
      }
    }
  });

  try {
    await batch.commit();
    return transacoesParaAdicionar.length;
  } catch (e) {
    return false;
  }
}

export async function adicionarNovaDividaTerceiro(dados) {
  if (!state.currentUser) return false;

  // Validação extra de segurança
  if (
    dados.frequencia === CONSTS.FREQUENCIA.PARCELADA &&
    (!dados.totalParcelas || dados.totalParcelas < 1)
  ) {
    alert("Por favor, informe o número de parcelas.");
    return false;
  }

  const serieId = db.collection("users").doc().id;
  const mesAnoBase = getMesAnoChave(state.currentDate);
  let lista = [];

  const base = {
    userId: state.currentUser.uid,
    pessoaId: dados.pessoaId, // Corrigido para usar o dado validado
    nomeTransacao: dados.nomeBase,
    categoria: dados.categoria,
    frequencia: dados.frequencia,
    cartaoId: dados.cartaoId,
    reembolsado: false,
    serieId: dados.frequencia !== CONSTS.FREQUENCIA.UNICA ? serieId : null,
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
  // Se estivermos editando, precisamos incluir o cartão da transação mesmo que ele esteja "deletado" (Soft Delete)
  // para que o nome apareça corretamente no seletor.
  let hCartoes = '<option value="">-- Selecione --</option>';
  state.cartoes
    .filter(
      (c) =>
        !c.deletado ||
        (state.isEditMode &&
          state.editingTransactionId &&
          state.transacoes.find((t) => t.id === state.editingTransactionId)
            ?.cartaoId === c.id),
    )
    .forEach((c) => (hCartoes += `<option value="${c.id}">${c.nome}</option>`));
  hCartoes += '<option value="novo_cartao">Cadastrar novo...</option>';
  elements.cartaoDespesa.innerHTML = hCartoes;

  // Orçamentos
  // Obtemos o mês que está sendo exibido na tela para filtrar a lista
  const mesAnoAtualVisivel = getMesAnoChave(state.currentDate);

  // Filtramos apenas os orçamentos que pertencem a este mês e que não são os fixos
  let hOrc = '<option value="">Nenhum (Outros Gastos)</option>';
  state.orcamentos
    .filter(
      (o) =>
        o.mesAnoReferencia === mesAnoAtualVisivel &&
        !o.isFixed &&
        !o.isFixedOrdinary,
    )
    .forEach((o) => (hOrc += `<option value="${o.id}">${o.nome}</option>`));

  elements.orcamentoVinculado.innerHTML = hOrc;

  // Pessoas (Para Despesas de Terceiros)
  atualizarSelectPessoas();
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

  // Limpa o modal para o estado inicial
  resetModalNovaTransacao();

  // NOVO: Popula as listas de cartões e orçamentos antes de definir os valores
  popularSeletoresFixos();

  elements.modalHeaderNovaTransacao.textContent = `Nova Despesa: ${cartaoNome}`;

  // Define os valores fixos do fluxo rápido
  elements.tipoTransacaoSelect.value = "despesa";
  elements.tipoTransacaoSelect.disabled = true;

  elements.categoriaDespesa.value = "cartao_credito";
  elements.categoriaDespesa.disabled = true;

  elements.cartaoDespesa.value = cartaoId;
  elements.cartaoDespesa.disabled = true;

  // Injeta nota visual para o usuário
  elements.cartaoDespesa.insertAdjacentHTML(
    "afterend",
    '<small class="form-note form-note-injected" style="color: #7f8c8d;">Cartão fixado pela fatura.</small>',
  );

  // Atualiza quais blocos devem aparecer na cascata
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
  try {
    await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("transacoes")
      .doc(transacaoId)
      .delete();

    // NOVO: Remove o item da memória local IMEDIATAMENTE
    state.transacoes = state.transacoes.filter((t) => t.id !== transacaoId);

    await registrarUltimaAlteracao();

    // Se estivermos dentro de um modal (como o da fatura), manda atualizar a lista do modal
    if (isInModal) {
      const cId = elements.faturaCartaoNomeTitulo.dataset.cartaoId;
      const mAno = elements.faturaCartaoNomeTitulo.dataset.mesAno;
      if (cId && mAno) {
        callbackPopularFatura(cId, mAno);
      }
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
