// js/main.js
import { CONSTS } from "./modules/constants.js";
import { state } from "./modules/state.js";
import { elements } from "./modules/elements.js";
import { auth, db } from "./modules/firebase-config.js";
import * as utils from "./modules/utils.js";
import * as authMod from "./modules/auth.js";
import * as ui from "./modules/ui.js";
import * as trans from "./modules/transactions.js";
import * as cards from "./modules/cards.js";
import * as budgets from "./modules/budgets.js";
import * as third from "./modules/third-party.js";
import * as search from "./modules/search.js";
import * as reports from "./modules/reports.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Finan Modularizado - JS Carregado");

  // --- Lógica de Autenticação Blindada ---
  auth.onAuthStateChanged(async (user) => {
    const appContainer = document.querySelector(".app-container");
    if (state.isDuringRegistration) return;
    if (appContainer) appContainer.style.display = "none";

    if (user) {
      if (user.emailVerified) {
        console.log("Usuário verificado. Liberando acesso...");
        state.currentUser = user;
        state.isRegisterMode = false;
        elements.modalAuth.style.display = "none";
        if (appContainer) appContainer.style.display = "flex";
        elements.sidebarFooter.style.display = "block";

        try {
          const userDocRef = db.collection("users").doc(state.currentUser.uid);
          const userDoc = await userDocRef.get();
          if (userDoc.exists) {
            authMod.exibirDataUltimaAtualizacao(userDoc.data().lastModified);
          }
        } catch (error) {
          console.error("Erro ao buscar dados:", error);
        }
        utils.hideSpinner();
        inicializarErenderizarApp();
      } else {
        console.log("Usuário não verificado. Bloqueando...");
        state.currentUser = user;
        if (appContainer) appContainer.style.display = "none";
        if (elements.listaTransacoesUl)
          elements.listaTransacoesUl.innerHTML = "";
        authMod.showVerificationScreen(user);
        utils.hideSpinner();
      }
    } else {
      console.log("Sessão encerrada.");
      state.currentUser = null;
      state.isRegisterMode = false;
      if (appContainer) appContainer.style.display = "none";
      authMod.resetAuthModalUI();
      utils.hideSpinner();
      state.transacoes = [];
      state.cartoes = [];
      state.orcamentos = [];
    }
  });

  async function inicializarErenderizarApp() {
    elements.currentMonthDisplay.textContent = "Carregando dados...";
    elements.listaTransacoesUl.innerHTML = "<li>Carregando...</li>";
    await carregarDadosIniciais();

    // --- LÓGICA NOVA: Garantir existência do orçamento "Outros Gastos" ---
    const orcamentoFixo = state.orcamentos.find((o) => o.isFixed === true);

    if (!orcamentoFixo && state.currentUser) {
      console.log("Orçamento 'Outros Gastos' não encontrado. Criando...");
      const novoOrcamentoFixo = {
        nome: "Outros Gastos",
        valor: 0,
        dia: 1,
        isFixed: true, // Identificador blindado
      };

      try {
        const docRef = await db
          .collection("users")
          .doc(state.currentUser.uid)
          .collection("orcamentos")
          .add(novoOrcamentoFixo);

        // Adiciona ao estado local para renderização imediata
        state.orcamentos.push({ ...novoOrcamentoFixo, id: docRef.id });
        console.log("Orçamento fixo criado com sucesso.");
      } catch (error) {
        console.error("Erro ao criar orçamento fixo:", error);
      }
    }
    // --- FIM DA LÓGICA NOVA ---

    ui.updateMonthDisplay(ui.renderizarTransacoesDoMes);
    carregarDadosDoFirestore();
    ui.inicializarVisibilidade();
  }

  async function carregarDadosIniciais() {
    if (!state.currentUser) return;
    const userCollections = db.collection("users").doc(state.currentUser.uid);
    try {
      const [tSnap, cSnap, oSnap, ofSnap, aSnap, dSnap, pSnap] =
        await Promise.all([
          userCollections.collection("transacoes").get(),
          userCollections.collection("cartoes").get(),
          userCollections.collection("orcamentos").get(),
          userCollections.collection("orcamentosFechados").get(),
          userCollections.collection("ajustesFatura").get(),
          userCollections.collection("dividasTerceiros").get(),
          userCollections.collection("pessoas").get(),
        ]);
      state.transacoes = tSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      state.cartoes = cSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      state.orcamentos = oSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      state.orcamentosFechados = ofSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      state.ajustesFatura = aSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      state.dividasTerceiros = dSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      state.pessoas = pSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      state.pessoas.sort((a, b) => a.nome.localeCompare(b.nome));
    } catch (error) {
      console.error("Erro dados iniciais:", error);
    }
  }

  function carregarDadosDoFirestore() {
    if (!state.currentUser) return;
    const userRef = db.collection("users").doc(state.currentUser.uid);
    const update = () => {
      if (elements.searchInput.value.trim() === "")
        ui.renderizarTransacoesDoMes();
      else
        search.executarBuscaGlobal(
          elements.searchInput.value,
          ui.renderizarTransacoesDoMes,
        );
      if (elements.modalConsultarTerceiros.style.display === "flex")
        third.renderizarDividasDoMes();
    };
    userRef.collection("transacoes").onSnapshot((s) => {
      state.transacoes = s.docs.map((d) => ({ ...d.data(), id: d.id }));
      update();
    });
    userRef.collection("cartoes").onSnapshot((s) => {
      state.cartoes = s.docs.map((d) => ({ ...d.data(), id: d.id }));
      update();
    });
    userRef.collection("orcamentos").onSnapshot((s) => {
      state.orcamentos = s.docs.map((d) => ({ ...d.data(), id: d.id }));
      update();
    });
    userRef.collection("orcamentosFechados").onSnapshot((s) => {
      state.orcamentosFechados = s.docs.map((d) => ({ ...d.data(), id: d.id }));
      update();
    });
    userRef.collection("ajustesFatura").onSnapshot((s) => {
      state.ajustesFatura = s.docs.map((d) => ({ ...d.data(), id: d.id }));
      update();
    });
    userRef.collection("dividasTerceiros").onSnapshot((s) => {
      state.dividasTerceiros = s.docs.map((d) => ({ ...d.data(), id: d.id }));
      update();
    });
    userRef.collection("pessoas").onSnapshot((s) => {
      state.pessoas = s.docs.map((d) => ({ ...d.data(), id: d.id }));
      state.pessoas.sort((a, b) => a.nome.localeCompare(b.nome));

      // NOVO: Se o modal de gerenciar pessoas estiver aberto, atualiza a lista na hora
      if (elements.modalGerenciarPessoas.style.display === "flex") {
        third.renderizarListaPessoas();
      }
    });
  }

  // --- GATILHOS DE INTERFACE (VITAIS) ---

  // Fechar modais (Este era o erro principal)
  document
    .querySelectorAll(".close-button, .close-button-footer")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const modalId = button.dataset.modalId;
        const modalParaFechar = modalId
          ? document.getElementById(modalId)
          : button.closest(".modal");
        if (modalParaFechar) ui.fecharModalEspecifico(modalParaFechar);
      });
    });

  // Sidebar
  elements.btnToggleSidebar.addEventListener("click", () =>
    elements.bodyEl.classList.toggle("sidebar-visible"),
  );
  elements.modalOverlay.addEventListener("click", () =>
    elements.bodyEl.classList.remove("sidebar-visible"),
  );
  document.querySelector(".sidebar").addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON")
      elements.bodyEl.classList.remove("sidebar-visible");
  });

  // Navegação de Mês
  elements.prevMonthBtn.addEventListener("click", () => {
    if (elements.searchInput.value) {
      elements.searchInput.value = "";
      elements.clearSearchBtn.classList.remove("visible");
    }
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    ui.updateMonthDisplay(ui.renderizarTransacoesDoMes);
  });
  elements.nextMonthBtn.addEventListener("click", () => {
    if (elements.searchInput.value) {
      elements.searchInput.value = "";
      elements.clearSearchBtn.classList.remove("visible");
    }
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    ui.updateMonthDisplay(ui.renderizarTransacoesDoMes);
  });

  // Busca
  elements.searchInput.addEventListener("input", () =>
    search.executarBuscaGlobal(
      elements.searchInput.value,
      ui.renderizarTransacoesDoMes,
    ),
  );
  elements.clearSearchBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    search.executarBuscaGlobal("", ui.renderizarTransacoesDoMes);
    elements.searchInput.focus();
  });

  // Autenticação
  elements.btnAuthAction.addEventListener("click", () => {
    const email = elements.emailInput.value;
    const password = elements.passwordInput.value;
    if (!email || !password) {
      authMod.mostrarFeedbackAuth("Preencha os campos.", true);
      return;
    }
    if (state.isRegisterMode) {
      state.isDuringRegistration = true;
      auth
        .createUserWithEmailAndPassword(email, password)
        .then((u) => u.user.sendEmailVerification().then(() => auth.signOut()))
        .then(() => {
          authMod.resetAuthModalUI();
          authMod.mostrarFeedbackAuth("Verifique seu e-mail.", false);
          setTimeout(() => (state.isDuringRegistration = false), 500);
        })
        .catch((e) => {
          state.isDuringRegistration = false;
          authMod.mostrarFeedbackAuth(authMod.traduzirErroAuth(e.code), true);
        });
    } else {
      auth
        .signInWithEmailAndPassword(email, password)
        .catch((e) =>
          authMod.mostrarFeedbackAuth(authMod.traduzirErroAuth(e.code), true),
        );
    }
  });
  elements.btnToggleAuthMode.addEventListener("click", () => {
    state.isRegisterMode = !state.isRegisterMode;
    authMod.resetAuthModalUI();
    elements.btnToggleAuthMode.textContent = state.isRegisterMode
      ? "Já tem uma conta? Faça login"
      : "Não tem uma conta? Cadastre-se";
  });
  elements.btnLogout.addEventListener("click", () => {
    if (confirm("Deseja sair?")) auth.signOut();
  });

  // Transações
  elements.btnAbrirModalNovaTransacao.addEventListener("click", () =>
    ui.abrirModalEspecifico(elements.modalNovaTransacao, null, "transacao", {
      resetModalNovaTransacao: trans.resetModalNovaTransacao,
      preencherModalParaEdicao: trans.preencherModalParaEdicao,
    }),
  );

  elements.btnAvancarTransacao.addEventListener("click", () => {
    const tipo = elements.tipoTransacaoSelect.value;
    const nome = elements.nomeTransacaoInput.value.trim();
    if (!tipo || !nome) {
      alert("Preencha tipo e nome.");
      return;
    }
    elements.tipoTransacaoSelect.parentElement.style.display = "none";
    elements.nomeTransacaoInput.parentElement.style.display = "none";
    elements.passo2Container.style.display = "block";
    elements.btnAvancarTransacao.style.display = "none";
    elements.btnVoltarTransacao.style.display = "inline-block";
    elements.btnSalvarTransacao.style.display = "inline-block";
    state.currentModalStep = 2;
    const transacaoOriginal = state.isEditMode
      ? state.transacoes.find((t) => t.id === state.editingTransactionId)
      : null;
    if (tipo === "receita") trans.carregarFormularioReceita(transacaoOriginal);
    else
      trans.carregarFormularioDespesa(
        transacaoOriginal,
        trans.carregarFormularioDespesaOrdinaria,
        (cont, t) =>
          trans.carregarFormularioDespesaCartao(
            cont,
            t,
            null,
            ui.abrirModalEspecifico,
          ),
      );
    if (state.isModoTerceiros) {
      elements.passo2Container.insertAdjacentHTML(
        "afterbegin",
        '<div style="order:-1;"><label>Pessoa:</label><select id="pessoaSelect"></select></div>',
      );
      third.atualizarSelectPessoas();
      const pSel = elements.passo2Container.querySelector("#pessoaSelect");
      pSel.addEventListener("change", () => {
        if (pSel.value === "cadastrar_nova")
          ui.abrirModalEspecifico(elements.modalCadastrarPessoa);
      });
    }
  });

  elements.btnSalvarTransacao.addEventListener("click", async () => {
    if (state.isModoTerceiros) {
      const d = third.obterDadosFormularioTerceiros();
      if (await third.adicionarNovaDividaTerceiro(d)) {
        alert("Dívida cadastrada!");
        ui.fecharModalEspecifico(elements.modalNovaTransacao);
      }
      return;
    }
    const d = trans.obterDadosDoFormulario();
    if (!trans.validarDadosDaTransacao(d)) return;
    const s = state.isEditMode
      ? await trans.atualizarTransacaoExistente(d)
      : await trans.adicionarNovasTransacoes(d);
    if (s) {
      if (state.isQuickAddMode && !state.isEditMode)
        trans.resetFormParaNovaDespesaCartao();
      else ui.fecharModalEspecifico(elements.modalNovaTransacao);
    }
  });

  elements.btnVoltarTransacao.addEventListener(
    "click",
    trans.resetModalNovaTransacao,
  );

  // Listas Principais e Detalhes
  elements.listaTransacoesUl.addEventListener("click", async (e) => {
    const group = e.target.closest(".search-result-group.parcelada");
    if (group) {
      ui.abrirModalDetalhesSerie(
        group.dataset.serieId,
        ui.abrirModalEspecifico,
      );
      return;
    }

    const btnVencimento = e.target.closest(".btn-vencimento-adjust");
    if (btnVencimento) {
      e.stopPropagation();
      const cartaoId = btnVencimento.dataset.cartaoId;
      const cartao = state.cartoes.find((c) => c.id === cartaoId);
      if (!cartao || !state.currentUser) return;
      const novoEstado = !cartao.vencimentoNoMesSeguinte;
      const msg = novoEstado
        ? `Deseja configurar este cartão para que suas faturas sempre vençam no mês seguinte?`
        : `Deseja reverter a regra?`;
      if (window.confirm(msg)) {
        await db
          .collection("users")
          .doc(state.currentUser.uid)
          .collection("cartoes")
          .doc(cartaoId)
          .update({ vencimentoNoMesSeguinte: novoEstado });
        await utils.registrarUltimaAlteracao();
      }
      return;
    }

    ui.handleTransactionListClick(e, {
      handleFecharAbrirOrcamento: budgets.handleFecharAbrirOrcamento,
      atualizarStatusPagoFatura: (id, m, s) =>
        cards.atualizarStatusPagoFatura(id, m, s, ui.atualizarResumoFinanceiro),
      atualizarStatusPago: (id, s) =>
        trans.atualizarStatusPago(id, s, ui.atualizarResumoFinanceiro),
      abrirModalDetalhesOrcamento: (id, m) =>
        budgets.abrirModalDetalhesOrcamento(id, m, ui.abrirModalEspecifico),
      abrirModalDetalhesFatura: (id, m) =>
        cards.abrirModalDetalhesFatura(
          id,
          m,
          ui.abrirModalEspecifico,
          cards.popularModalDetalhesFatura,
        ),
      excluirTransacaoUnica: (id) =>
        trans.excluirTransacaoUnica(
          id,
          false,
          cards.popularModalDetalhesFatura,
        ),
      abrirModal: ui.abrirModalEspecifico,
      // REINSERIDO: Callbacks essenciais para a edição funcionar
      resetModalNovaTransacao: trans.resetModalNovaTransacao,
      preencherModalParaEdicao: trans.preencherModalParaEdicao,
    });
  });

  // Cartões
  elements.btnGerenciarCartoes.addEventListener("click", () =>
    ui.abrirModalEspecifico(
      elements.modalGerenciarCartoes,
      null,
      "gerenciarCartoes",
      {
        renderizarListaCartoesCadastrados:
          cards.renderizarListaCartoesCadastrados,
      },
    ),
  );
  elements.btnAbrirModalCadastroCartao.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalGerenciarCartoes);
    elements.modalCadastrarCartao.dataset.returnTo = "modalGerenciarCartoes";
    ui.abrirModalEspecifico(
      elements.modalCadastrarCartao,
      null,
      "cartaoCadastroEdicao",
      {
        resetModalCartao: () => {
          elements.nomeCartaoInputModal.value = "";
          elements.diaVencimentoFaturaInputModal.value = "";
          elements.modalCartaoTitulo.textContent = "Cadastrar Novo Cartão";
        },
      },
    );
  });
  elements.btnSalvarCartaoModalBtn.addEventListener("click", async () => {
    const n = elements.nomeCartaoInputModal.value.trim();
    const d = parseInt(elements.diaVencimentoFaturaInputModal.value);
    if (!n || isNaN(d) || d < 1 || d > 31) {
      alert("Dados inválidos.");
      return;
    }
    const ref = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("cartoes");
    if (state.isCartaoEditMode)
      await ref
        .doc(elements.cartaoEditIdInput.value)
        .update({ nome: n, diaVencimentoFatura: d });
    else
      await ref.add({
        nome: n,
        diaVencimentoFatura: d,
        vencimentoNoMesSeguinte: false,
      });
    ui.fecharModalEspecifico(elements.modalCadastrarCartao);
    if (
      elements.modalCadastrarCartao.dataset.returnTo === "modalGerenciarCartoes"
    )
      ui.abrirModalEspecifico(
        elements.modalGerenciarCartoes,
        null,
        "gerenciarCartoes",
        {
          renderizarListaCartoesCadastrados:
            cards.renderizarListaCartoesCadastrados,
        },
      );
  });
  elements.listaCartoesCadastradosUl.addEventListener("click", (e) => {
    const cartaoId =
      e.target.closest(".cartao-info")?.dataset.id ||
      e.target.closest("button")?.dataset.id;
    const nome = e.target.closest("button")?.dataset.nome;
    if (e.target.closest(".cartao-info")) {
      ui.fecharModalEspecifico(elements.modalGerenciarCartoes);
      cards.abrirModalDetalhesFatura(
        cartaoId,
        utils.getMesAnoChave(state.currentDate),
        ui.abrirModalEspecifico,
        cards.popularModalDetalhesFatura,
      );
    } else if (e.target.closest(".btn-add-despesa-cartao")) {
      ui.fecharModalEspecifico(elements.modalGerenciarCartoes);
      trans.abrirModalDespesaCartaoRapida(
        cartaoId,
        nome,
        ui.abrirModalEspecifico,
        trans.carregarFormularioDespesaOrdinaria,
        trans.carregarFormularioDespesaCartao,
      );
    } else if (e.target.closest(".btn-edit-cartao")) {
      ui.fecharModalEspecifico(elements.modalGerenciarCartoes);
      ui.abrirModalEspecifico(
        elements.modalCadastrarCartao,
        cartaoId,
        "cartaoCadastroEdicao",
        {
          resetModalCartao: () => {},
          preencherModalEdicaoCartao: cards.preencherModalEdicaoCartao,
        },
      );
    } else if (e.target.closest(".btn-delete-cartao")) {
      if (confirm("Excluir cartão?"))
        db.collection("users")
          .doc(state.currentUser.uid)
          .collection("cartoes")
          .doc(cartaoId)
          .delete();
    }
  });

  // Faturas
  elements.btnFaturaAnterior.addEventListener("click", () => {
    state.currentFaturaDate.setMonth(state.currentFaturaDate.getMonth() - 1);
    cards.popularModalDetalhesFatura(
      elements.faturaCartaoNomeTitulo.dataset.cartaoId,
      utils.getMesAnoChave(state.currentFaturaDate),
    );
  });
  elements.btnFaturaProxima.addEventListener("click", () => {
    state.currentFaturaDate.setMonth(state.currentFaturaDate.getMonth() + 1);
    cards.popularModalDetalhesFatura(
      elements.faturaCartaoNomeTitulo.dataset.cartaoId,
      utils.getMesAnoChave(state.currentFaturaDate),
    );
  });
  elements.btnAddDespesaFromFatura.addEventListener("click", () => {
    const id = elements.btnAddDespesaFromFatura.dataset.cartaoId;
    const nome = elements.btnAddDespesaFromFatura.dataset.cartaoNome;
    ui.fecharModalEspecifico(elements.modalDetalhesFaturaCartao);
    trans.abrirModalDespesaCartaoRapida(
      id,
      nome,
      ui.abrirModalEspecifico,
      trans.carregarFormularioDespesaOrdinaria,
      trans.carregarFormularioDespesaCartao,
    );
  });
  elements.btnAjustesFatura.addEventListener("click", () =>
    cards.abrirModalAjustesFatura(
      elements.btnAjustesFatura.dataset.cartaoId,
      elements.btnAjustesFatura.dataset.mesAnoReferencia,
      ui.fecharModalEspecifico,
      ui.abrirModalEspecifico,
    ),
  );
  elements.listaComprasFaturaCartaoUl.addEventListener("click", (e) => {
    if (e.target.closest(".btn-skip-parcela")) {
      const b = e.target.closest(".btn-skip-parcela");
      trans.adiarParcelaEmSerie(
        b.dataset.id,
        b.dataset.serieId,
        b.dataset.mesAnoReferencia,
        ui.fecharModalEspecifico,
      );
    } else {
      ui.handleTransactionListClick(e, {
        atualizarStatusPago: (id, s) =>
          trans.atualizarStatusPago(id, s, ui.atualizarResumoFinanceiro),
        excluirTransacaoUnica: (id) =>
          trans.excluirTransacaoUnica(
            id,
            true,
            cards.popularModalDetalhesFatura,
          ),
        abrirModal: ui.abrirModalEspecifico,
        abrirModalDetalhesFatura: cards.abrirModalDetalhesFatura,
        // REINSERIDO: Callbacks essenciais para a edição funcionar dentro da fatura
        resetModalNovaTransacao: trans.resetModalNovaTransacao,
        preencherModalParaEdicao: trans.preencherModalParaEdicao,
      });
    }
  });

  // Ajustes de Fatura
  elements.btnSalvarAjuste.addEventListener("click", async () => {
    const desc = elements.descricaoAjusteInput.value.trim();
    const val = parseFloat(elements.valorAjusteInput.value);
    const { cartaoId, mesAno } = elements.modalAjustesFatura.dataset;
    if (!desc || isNaN(val)) return;
    await db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("ajustesFatura")
      .add({ cartaoId, mesAnoReferencia: mesAno, descricao: desc, valor: val });
    elements.descricaoAjusteInput.value = "";
    elements.valorAjusteInput.value = "";
    cards.popularModalAjustes(cartaoId, mesAno);
  });
  elements.listaAjustesFaturaUl.addEventListener("click", async (e) => {
    if (
      e.target.classList.contains("btn-delete-ajuste") &&
      confirm("Excluir ajuste?")
    ) {
      await db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection("ajustesFatura")
        .doc(e.target.dataset.id)
        .delete();
      cards.popularModalAjustes(
        elements.modalAjustesFatura.dataset.cartaoId,
        elements.modalAjustesFatura.dataset.mesAno,
      );
    }
  });

  // Orçamentos
  elements.btnMenuOrcamentos.addEventListener("click", () =>
    ui.abrirModalEspecifico(elements.modalOrcamentos, null, "orcamentos", {
      renderizarListaOrcamentos: budgets.renderizarListaOrcamentos,
    }),
  );
  elements.btnSalvarOrcamento.addEventListener("click", async () => {
    const id = elements.orcamentoEditIdInput.value;
    const n = elements.nomeOrcamentoInput.value.trim();
    const v = parseFloat(elements.valorOrcamentoInput.value);
    const d = parseInt(elements.diaOrcamentoInput.value);
    if (!n || isNaN(v) || isNaN(d)) return;
    const ref = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("orcamentos");
    if (id) await ref.doc(id).update({ nome: n, valor: v, dia: d });
    else await ref.add({ nome: n, valor: v, dia: d });
    ui.fecharModalEspecifico(elements.modalOrcamentos);
  });
  elements.listaOrcamentosUl.addEventListener("click", (e) => {
    const id = e.target.closest("button")?.dataset.id;
    if (e.target.closest(".btn-edit-orcamento"))
      budgets.preencherModalEdicaoOrcamento(id);
    else if (
      e.target.closest(".btn-delete-orcamento") &&
      confirm("Excluir orçamento?")
    )
      db.collection("users")
        .doc(state.currentUser.uid)
        .collection("orcamentos")
        .doc(id)
        .delete();
  });

  // Terceiros
  elements.btnDespesasTerceiros.addEventListener("click", () =>
    ui.abrirModalEspecifico(elements.modalMenuTerceiros),
  );
  elements.btnAbrirCadastroTerceiros.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalMenuTerceiros);
    state.isModoTerceiros = true;
    ui.abrirModalEspecifico(elements.modalNovaTransacao, null, "transacao", {
      resetModalNovaTransacao: trans.resetModalNovaTransacao,
      preencherModalParaEdicao: trans.preencherModalParaEdicao,
    });
  });
  elements.btnAbrirConsultaTerceiros.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalMenuTerceiros);
    state.dividasTerceirosDate = new Date(state.currentDate);
    third.renderizarDividasDoMes();
    ui.abrirModalEspecifico(elements.modalConsultarTerceiros);
  });
  // REINSERIDO: Ouvintes das setas de navegação de Dívidas de Terceiros
  elements.btnTerceirosAnterior.addEventListener("click", () => {
    state.dividasTerceirosDate.setMonth(
      state.dividasTerceirosDate.getMonth() - 1,
    );
    third.renderizarDividasDoMes();
  });

  elements.btnTerceirosProximo.addEventListener("click", () => {
    state.dividasTerceirosDate.setMonth(
      state.dividasTerceirosDate.getMonth() + 1,
    );
    third.renderizarDividasDoMes();
  });
  elements.listaDividasTerceirosUl.addEventListener("click", (e) => {
    const id =
      e.target.dataset.dividaId || e.target.closest("button")?.dataset.dividaId;
    if (e.target.type === "checkbox")
      third.atualizarStatusReembolso(id, e.target.checked);
    else if (e.target.closest(".btn-delete-divida")) {
      const d = state.dividasTerceiros.find((x) => x.id === id);
      if (d.frequencia === "unica") third.excluirDividaTerceiroUnica(id);
      else
        ui.abrirModalConfirmarAcaoSerie(
          id,
          CONSTS.ACAO_SERIE.EXCLUIR,
          "dividaTerceiro",
          ui.abrirModalEspecifico,
        );
    } else if (e.target.closest(".btn-edit-divida")) {
      const d = state.dividasTerceiros.find((x) => x.id === id);
      if (d.frequencia === "unica")
        third.abrirModalEdicaoDivida(
          id,
          "unica",
          () => ui.fecharModalEspecifico(elements.modalConsultarTerceiros),
          ui.abrirModalEspecifico,
        );
      else
        ui.abrirModalConfirmarAcaoSerie(
          id,
          CONSTS.ACAO_SERIE.EDITAR,
          "dividaTerceiro",
          ui.abrirModalEspecifico,
        );
    }
  });
  elements.btnSalvarPessoaModal.addEventListener("click", async () => {
    const n = elements.nomePessoaInputModal.value.trim();
    if (!n) return;
    const ref = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("pessoas");

    if (state.isPessoaEditMode && state.editingPessoaId) {
      await ref.doc(state.editingPessoaId).update({ nome: n });
      alert("Nome atualizado!");
    } else {
      const doc = await ref.add({ nome: n });
      // Se estiver no fluxo de Nova Transação, já seleciona a pessoa
      if (
        state.isModoTerceiros &&
        elements.passo2Container.style.display === "block"
      ) {
        third.atualizarSelectPessoas(doc.id);
      }
    }

    elements.nomePessoaInputModal.value = "";
    ui.fecharModalEspecifico(elements.modalCadastrarPessoa);
    if (state.isPessoaEditMode) {
      ui.abrirModalEspecifico(elements.modalGerenciarPessoas, null, "generic", {
        renderizarListaCartoesCadastrados: third.renderizarListaPessoas,
      });
    }
    state.isPessoaEditMode = false;
    state.editingPessoaId = null;
  });

  // Relatórios
  elements.btnRelatorios.addEventListener("click", () =>
    ui.abrirModalEspecifico(elements.modalRelatorios, null, "relatorios", {
      popularModalRelatorio: reports.popularModalRelatorio,
    }),
  );
  elements.btnRelatorioAnterior.addEventListener("click", () => {
    state.reportDate.setMonth(state.reportDate.getMonth() - 1);
    reports.popularModalRelatorio(state.reportDate);
  });
  elements.btnRelatorioProximo.addEventListener("click", () => {
    state.reportDate.setMonth(state.reportDate.getMonth() + 1);
    reports.popularModalRelatorio(state.reportDate);
  });

  // Séries e Confirmações
  elements.btnAcaoSerieApenasEsta.addEventListener("click", async () => {
    const { itemId, acao, context } = elements.modalConfirmarAcaoSerie.dataset;
    ui.fecharModalEspecifico(elements.modalConfirmarAcaoSerie);
    if (acao === "excluir") {
      if (context === "dividaTerceiro")
        await third.excluirDividaTerceiroUnica(itemId);
      else await trans.excluirTransacaoUnica(itemId);
    } else {
      if (context === "dividaTerceiro")
        third.abrirModalEdicaoDivida(
          itemId,
          "unica",
          () => ui.fecharModalEspecifico(elements.modalConsultarTerceiros),
          ui.abrirModalEspecifico,
        );
      else {
        state.editingSerieId = null;
        ui.abrirModalEspecifico(
          elements.modalNovaTransacao,
          itemId,
          "transacao",
          {
            resetModalNovaTransacao: trans.resetModalNovaTransacao,
            preencherModalParaEdicao: trans.preencherModalParaEdicao,
          },
        );
      }
    }
  });
  elements.btnAcaoSerieToda.addEventListener("click", async () => {
    const { itemId, serieId, acao, context } =
      elements.modalConfirmarAcaoSerie.dataset;
    ui.fecharModalEspecifico(elements.modalConfirmarAcaoSerie);

    if (!state.currentUser || !serieId) {
      alert("Erro: Não foi possível realizar a ação em série.");
      return;
    }

    if (acao === "excluir") {
      const collectionName =
        context === "dividaTerceiro" ? "dividasTerceiros" : "transacoes";

      // Localiza o item de referência para saber a partir de qual data excluir
      const itemInicial =
        context === "dividaTerceiro"
          ? state.dividasTerceiros.find((d) => d.id === itemId)
          : state.transacoes.find((t) => t.id === itemId);

      if (!itemInicial) {
        alert("Erro: Item de referência não encontrado.");
        return;
      }
      const mesAnoInicioExclusao = itemInicial.mesAnoReferencia;

      console.log(
        `Excluindo a série ${serieId} a partir de ${mesAnoInicioExclusao}...`,
      );

      // REINSTITUIDO: Filtro que protege o passado (>= mesAnoInicioExclusao)
      const querySnapshot = await db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection(collectionName)
        .where("serieId", "==", serieId)
        .where("mesAnoReferencia", ">=", mesAnoInicioExclusao)
        .get();

      if (querySnapshot.empty) {
        alert("Nenhum item futuro encontrado para excluir.");
        return;
      }

      const batch = db.batch();
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      try {
        await batch.commit();
        if (context !== "dividaTerceiro") {
          await utils.registrarUltimaAlteracao();
        }
        alert(
          `${querySnapshot.docs.length} item(ns) da série (a partir deste mês) foram excluídos.`,
        );
      } catch (error) {
        console.error(`Erro ao excluir série:`, error);
        alert("Ocorreu um erro ao excluir a série.");
      }
    } else {
      // Lógica de Edição em Série (Mantida)
      if (context === "dividaTerceiro") {
        third.abrirModalEdicaoDivida(
          itemId,
          "serie",
          () => ui.fecharModalEspecifico(elements.modalConsultarTerceiros),
          ui.abrirModalEspecifico,
        );
      } else {
        state.editingSerieId = serieId;
        ui.abrirModalEspecifico(
          elements.modalNovaTransacao,
          itemId,
          "transacao",
          {
            resetModalNovaTransacao: trans.resetModalNovaTransacao,
            preencherModalParaEdicao: trans.preencherModalParaEdicao,
          },
        );
      }
    }
  });

  // Edição de Dívida de Terceiro
  elements.btnSalvarEdicaoDivida.addEventListener("click", async () => {
    const id = elements.dividaEditIdInput.value;
    const serieId = elements.dividaEditSerieIdInput.value;
    const contexto = elements.dividaEditContextoInput.value;
    const n = elements.nomeDividaEditInput.value.trim();
    const v = parseFloat(elements.valorDividaEditInput.value);
    if (contexto === "unica") await third.atualizarDividaUnica(id, n, v);
    else await third.atualizarDividaSerie(id, serieId, n, v);
    ui.fecharModalEspecifico(elements.modalEditarDivida);
  });
  elements.btnCancelarEdicaoDivida.addEventListener("click", () =>
    ui.fecharModalEspecifico(elements.modalEditarDivida),
  );

  // Visibilidade
  elements.btnToggleVisibility.addEventListener("click", () => {
    state.areValuesHidden = !state.areValuesHidden;
    localStorage.setItem("finanValuesHidden", state.areValuesHidden);
    ui.renderizarEstadoVisibilidade();
  });
  // Ouvinte para abrir o gerenciador de pessoas
  elements.btnAbrirConsultaPessoas.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalMenuTerceiros);
    // TIPO ALTERADO PARA "gerenciarPessoas" e callback ajustado
    ui.abrirModalEspecifico(
      elements.modalGerenciarPessoas,
      null,
      "gerenciarPessoas",
      {
        renderizarListaPessoas: third.renderizarListaPessoas,
      },
    );
  });

  // Ouvinte para cadastrar pessoa a partir do gerenciador
  elements.btnAbrirModalCadastroPessoaDirect.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalGerenciarPessoas);
    state.isPessoaEditMode = false;
    document.querySelector("#modalCadastrarPessoa h2").textContent =
      "Cadastrar Nova Pessoa";
    elements.btnSalvarPessoaModal.textContent = "Salvar Pessoa";
    ui.abrirModalEspecifico(elements.modalCadastrarPessoa);
  });

  // Ouvinte para a lista de pessoas (Editar/Excluir)
  elements.listaPessoasCadastradasUl.addEventListener("click", (e) => {
    const id = e.target.closest("button")?.dataset.id;
    if (!id) return;

    if (e.target.closest(".btn-edit-pessoa")) {
      ui.fecharModalEspecifico(elements.modalGerenciarPessoas);
      state.isPessoaEditMode = true;
      state.editingPessoaId = id;
      third.preencherModalEdicaoPessoa(id);
      ui.abrirModalEspecifico(elements.modalCadastrarPessoa);
    } else if (e.target.closest(".btn-delete-pessoa")) {
      third.excluirPessoa(id);
    }
  });
});
