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
import * as exportMod from "./modules/export.js";

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

      // NOVO: Desliga todas as escutas ativas do Firebase para evitar erros de permissão
      if (state.activeUnsubscribers) {
        state.activeUnsubscribers.forEach((unsub) => unsub());
        state.activeUnsubscribers = [];
      }

      state.currentUser = null;
      state.isRegisterMode = false;
      if (appContainer) appContainer.style.display = "none";
      authMod.resetAuthModalUI();
      utils.hideSpinner();

      // Limpa dados sensíveis da memória
      state.transacoes = [];
      state.cartoes = [];
      state.orcamentos = [];
      state.mesesCarregados = [];
    }
  });

  async function inicializarErenderizarApp() {
    elements.currentMonthDisplay.textContent = "Carregando dados...";
    elements.listaTransacoesUl.innerHTML = "<li>Carregando...</li>";
    await carregarDadosIniciais();

    // --- LÓGICA: Garantir existência dos orçamentos fixos (Cartão e Ordinários) ---
    const orcamentoFixoCartao = state.orcamentos.find(
      (o) => o.isFixed === true,
    );
    const orcamentoFixoOrdinario = state.orcamentos.find(
      (o) => o.isFixedOrdinary === true,
    );

    const promessasCriacao = [];

    // Cria "Outros Gastos" (Cartão) se não existir
    if (!orcamentoFixoCartao && state.currentUser) {
      console.log("Orçamento 'Outros Gastos' não encontrado. Criando...");
      promessasCriacao.push(
        db
          .collection("users")
          .doc(state.currentUser.uid)
          .collection("orcamentos")
          .add({
            nome: "Outros Gastos",
            valor: 0,
            dia: 1,
            isFixed: true,
          })
          .then((docRef) => {
            state.orcamentos.push({
              nome: "Outros Gastos",
              valor: 0,
              dia: 1,
              isFixed: true,
              id: docRef.id,
            });
          }),
      );
    }

    // Cria "Gastos Ordinários" (PIX/Débito) se não existir
    if (!orcamentoFixoOrdinario && state.currentUser) {
      console.log("Orçamento 'Gastos Ordinários' não encontrado. Criando...");
      promessasCriacao.push(
        db
          .collection("users")
          .doc(state.currentUser.uid)
          .collection("orcamentos")
          .add({
            nome: "Gastos Ordinários",
            valor: 0,
            dia: 1,
            isFixedOrdinary: true, // Identificador para despesas ordinárias
          })
          .then((docRef) => {
            state.orcamentos.push({
              nome: "Gastos Ordinários",
              valor: 0,
              dia: 1,
              isFixedOrdinary: true,
              id: docRef.id,
            });
          }),
      );
    }

    if (promessasCriacao.length > 0) {
      await Promise.all(promessasCriacao);
    }
    // --- FIM DA LÓGICA DE CRIAÇÃO ---

    ui.updateMonthDisplay(ui.renderizarTransacoesDoMes);
    carregarDadosDoFirestore();
    ui.inicializarVisibilidade();
  }

  async function carregarDadosIniciais() {
    if (!state.currentUser) return;
    const userCollections = db.collection("users").doc(state.currentUser.uid);

    // Define os 3 meses iniciais (Anterior, Atual, Próximo)
    const dataAtual = new Date();
    const mesesParaBaixar = [];
    for (let i = -1; i <= 1; i++) {
      const d = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + i, 1);
      mesesParaBaixar.push(utils.getMesAnoChave(d));
    }

    try {
      const [tSnap, cSnap, oSnap, ofSnap, aSnap, dSnap, pSnap] =
        await Promise.all([
          userCollections
            .collection("transacoes")
            .where("mesAnoReferencia", "in", mesesParaBaixar)
            .get(),
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

      // Marca esses meses como carregados no cache
      state.mesesCarregados = [...mesesParaBaixar];
    } catch (error) {
      console.error("Erro dados iniciais:", error);
    }
  }

  // NOVA FUNÇÃO: Carrega um mês específico se ele não estiver no cache
  async function garantirDadosDoMes(mesAno) {
    if (state.mesesCarregados.includes(mesAno)) return; // Já está no cache

    console.log(`Carregando dados sob demanda para: ${mesAno}`);
    // Exibe o spinner diretamente pelo elemento
    if (elements.loadingSpinnerOverlay)
      elements.loadingSpinnerOverlay.style.display = "flex";

    try {
      const userCollections = db.collection("users").doc(state.currentUser.uid);
      const snapshot = await userCollections
        .collection("transacoes")
        .where("mesAnoReferencia", "==", mesAno)
        .get();

      const novasTransacoes = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      // Adiciona as novas transações ao estado sem apagar as que já existem
      state.transacoes = [...state.transacoes, ...novasTransacoes];
      state.mesesCarregados.push(mesAno);
    } catch (error) {
      console.error(`Erro ao carregar mês ${mesAno}:`, error);
    } finally {
      // Oculta o spinner diretamente pelo elemento
      if (elements.loadingSpinnerOverlay)
        elements.loadingSpinnerOverlay.style.display = "none";
    }
  }

  function carregarDadosDoFirestore() {
    if (!state.currentUser) return;
    const userRef = db.collection("users").doc(state.currentUser.uid);

    // Limpa unsubscribers antigos se houver
    state.activeUnsubscribers.forEach((unsub) => unsub());
    state.activeUnsubscribers = [];

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

    // Armazenamos o retorno de cada onSnapshot (a função de desligar)
    // userRef.collection("transacoes").onSnapshot... (REMOVIDO PARA ECONOMIA)

    state.activeUnsubscribers.push(
      userRef.collection("cartoes").onSnapshot((s) => {
        state.cartoes = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        update();
      }),
    );

    state.activeUnsubscribers.push(
      userRef.collection("orcamentos").onSnapshot((s) => {
        state.orcamentos = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        update();
      }),
    );

    state.activeUnsubscribers.push(
      userRef.collection("orcamentosFechados").onSnapshot((s) => {
        state.orcamentosFechados = s.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }));
        update();
      }),
    );

    state.activeUnsubscribers.push(
      userRef.collection("ajustesFatura").onSnapshot((s) => {
        state.ajustesFatura = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        update();
      }),
    );

    state.activeUnsubscribers.push(
      userRef.collection("dividasTerceiros").onSnapshot((s) => {
        state.dividasTerceiros = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        update();
      }),
    );

    state.activeUnsubscribers.push(
      userRef.collection("pessoas").onSnapshot((s) => {
        state.pessoas = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        state.pessoas.sort((a, b) => a.nome.localeCompare(b.nome));
        if (elements.modalGerenciarPessoas.style.display === "flex") {
          third.renderizarListaPessoas();
        }
      }),
    );
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

  // Navegação de Mês (OTIMIZADA)
  elements.prevMonthBtn.addEventListener("click", async () => {
    if (elements.searchInput.value) {
      elements.searchInput.value = "";
      elements.clearSearchBtn.classList.remove("visible");
    }
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    const mesAno = utils.getMesAnoChave(state.currentDate);
    await garantirDadosDoMes(mesAno);
    ui.updateMonthDisplay(ui.renderizarTransacoesDoMes);
  });

  elements.nextMonthBtn.addEventListener("click", async () => {
    if (elements.searchInput.value) {
      elements.searchInput.value = "";
      elements.clearSearchBtn.classList.remove("visible");
    }
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    const mesAno = utils.getMesAnoChave(state.currentDate);
    await garantirDadosDoMes(mesAno);
    ui.updateMonthDisplay(ui.renderizarTransacoesDoMes);
  });

  // Novo: Seletor de mês direto (Calendário OTIMIZADO)
  elements.monthPicker.addEventListener("change", async (e) => {
    if (!e.target.value) return;
    const [ano, mes] = e.target.value.split("-");
    state.currentDate = new Date(ano, mes - 1, 1);
    const mesAno = e.target.value; // O input month já retorna YYYY-MM
    await garantirDadosDoMes(mesAno);
    ui.updateMonthDisplay(ui.renderizarTransacoesDoMes);
  });

  // Novo: Botão voltar para o mês atual (OTIMIZADO)
  elements.btnGoToToday.addEventListener("click", async () => {
    state.currentDate = new Date();
    const mesAno = utils.getMesAnoChave(state.currentDate);
    await garantirDadosDoMes(mesAno);
    ui.updateMonthDisplay(ui.renderizarTransacoesDoMes);
  });

  // Busca
  elements.searchInput.addEventListener("input", () => {
    const termo = elements.searchInput.value.trim();
    if (termo.length > 0) {
      elements.btnDeepSearch.style.display = "block";
    } else {
      elements.btnDeepSearch.style.display = "none";
    }

    search.executarBuscaGlobal(termo, ui.renderizarTransacoesDoMes);
  });
  elements.clearSearchBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.btnDeepSearch.style.display = "none"; // Oculta o botão de busca profunda
    search.executarBuscaGlobal("", ui.renderizarTransacoesDoMes);
    elements.searchInput.focus();
  });

  // Novo: Ouvinte para o botão de busca profunda
  elements.btnDeepSearch.addEventListener("click", () => {
    const termo = elements.searchInput.value.trim();
    if (termo) {
      search.executarBuscaProfunda(termo, db, state.currentUser);
    }
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
  elements.btnAbrirModalNovaTransacao.addEventListener("click", () => {
    // Garante que o estado de "Modo Terceiros" seja limpo ao entrar pelo menu geral
    state.isModoTerceiros = false;
    state.isQuickAddMode = false;

    trans.popularSeletoresFixos();
    ui.abrirModalEspecifico(elements.modalNovaTransacao, null, "transacao", {
      resetModalNovaTransacao: trans.resetModalNovaTransacao,
      preencherModalParaEdicao: trans.preencherModalParaEdicao,
    });
  });

  elements.btnSalvarTransacao.addEventListener("click", async () => {
    if (state.isModoTerceiros) {
      const d = third.obterDadosFormularioTerceiros();
      if (await third.adicionarNovaDividaTerceiro(d)) {
        alert("Dívida cadastrada com sucesso!");
        ui.fecharModalEspecifico(elements.modalNovaTransacao);
        // NOVO: Se o modal de consulta estiver aberto, atualiza a lista dele
        if (elements.modalConsultarTerceiros.style.display === "flex") {
          third.renderizarDividasDoMes();
        }
      }
      return;
    }
    const d = trans.obterDadosDoFormulario();
    if (!trans.validarDadosDaTransacao(d)) return;
    const s = state.isEditMode
      ? await trans.atualizarTransacaoExistente(d)
      : await trans.adicionarNovasTransacoes(d);
    if (s) {
      const mesVisualizado = utils.getMesAnoChave(state.currentDate);

      // NOVO: Limpa o mês atual E TODOS os meses futuros da memória local.
      // Isso garante que compras parceladas ou recorrentes apareçam ao navegar para frente.
      state.transacoes = state.transacoes.filter(
        (t) => t.mesAnoReferencia < mesVisualizado,
      );
      state.mesesCarregados = state.mesesCarregados.filter(
        (m) => m < mesVisualizado,
      );

      // Baixa novamente os dados apenas do mês que você está vendo agora
      await garantirDadosDoMes(mesVisualizado);

      // PADRONIZAÇÃO: Sempre fecha o modal após salvar
      ui.fecharModalEspecifico(elements.modalNovaTransacao);

      // Se o modal de detalhes da fatura estiver aberto ao fundo, atualiza ele
      if (elements.modalDetalhesFaturaCartao.style.display === "flex") {
        const cId = elements.faturaCartaoNomeTitulo.dataset.cartaoId;
        const mAno = elements.faturaCartaoNomeTitulo.dataset.mesAno;
        cards.popularModalDetalhesFatura(cId, mAno);
      }

      // Força a atualização da lista na tela inicial e do resumo financeiro
      ui.renderizarTransacoesDoMes();
    }
  });

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
      atualizarStatusPagoFatura: (id, m, s) => {
        // 1. Primeiro atualiza na memória local (Efeito Visual Instantâneo)
        state.transacoes
          .filter((t) => t.cartaoId === id && t.mesAnoReferencia === m)
          .forEach((t) => (t.paga = s));
        ui.renderizarTransacoesDoMes();

        // 2. Depois faz a atualização no banco de dados em segundo plano
        cards.atualizarStatusPagoFatura(id, m, s, ui.atualizarResumoFinanceiro);
      },
      atualizarStatusPago: (id, s) => {
        // 1. Primeiro atualiza na memória local (Efeito Visual Instantâneo)
        const t = state.transacoes.find((trans) => trans.id === id);
        if (t) t.paga = s;
        ui.renderizarTransacoesDoMes();

        // 2. Depois faz a atualização no banco de dados em segundo plano
        trans.atualizarStatusPago(id, s, ui.atualizarResumoFinanceiro);
      },
      abrirModalDetalhesOrcamento: (id, m) =>
        budgets.abrirModalDetalhesOrcamento(id, m, ui.abrirModalEspecifico),
      abrirModalDetalhesFatura: (id, m) =>
        cards.abrirModalDetalhesFatura(
          id,
          m,
          ui.abrirModalEspecifico,
          cards.popularModalDetalhesFatura,
        ),
      excluirTransacaoUnica: async (id) => {
        await trans.excluirTransacaoUnica(
          id,
          false,
          cards.popularModalDetalhesFatura,
        );
        // Remove da memória local para sumir da tela instantaneamente
        state.transacoes = state.transacoes.filter((t) => t.id !== id);
        ui.renderizarTransacoesDoMes();
      },
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
  elements.listaCartoesCadastradosUl.addEventListener("click", async (e) => {
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
      // Ajustado para esperar a busca da última parcela no banco
      await cards.prepararSoftDeleteCartao(cartaoId, ui.abrirModalEspecifico);
    }
  });

  // Faturas (Navegação Inteligente com Lazy Loading)
  elements.btnFaturaAnterior.addEventListener("click", async () => {
    state.currentFaturaDate.setMonth(state.currentFaturaDate.getMonth() - 1);
    const mesAno = utils.getMesAnoChave(state.currentFaturaDate);
    // Garante que os dados do mês existam antes de popular
    await garantirDadosDoMes(mesAno);
    cards.popularModalDetalhesFatura(
      elements.faturaCartaoNomeTitulo.dataset.cartaoId,
      mesAno,
    );
  });

  elements.btnFaturaProxima.addEventListener("click", async () => {
    state.currentFaturaDate.setMonth(state.currentFaturaDate.getMonth() + 1);
    const mesAno = utils.getMesAnoChave(state.currentFaturaDate);
    // Garante que os dados do mês existam antes de popular
    await garantirDadosDoMes(mesAno);
    cards.popularModalDetalhesFatura(
      elements.faturaCartaoNomeTitulo.dataset.cartaoId,
      mesAno,
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
        excluirTransacaoUnica: async (id) => {
          await trans.excluirTransacaoUnica(
            id,
            true,
            cards.popularModalDetalhesFatura,
          );
          // Remove da memória local
          state.transacoes = state.transacoes.filter((t) => t.id !== id);
          ui.renderizarTransacoesDoMes();
        },
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
      resetFormOrcamento: budgets.resetFormOrcamento, // ADICIONADO
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

  elements.btnFecharTodosOrcamentos.addEventListener("click", () => {
    budgets.alternarTodosOrcamentosDoMes();
  });

  if (elements.btnDownloadPDF) {
    elements.btnDownloadPDF.addEventListener("click", () => {
      exportMod.gerarExtratoMensalPDF();
    });
  }

  // Terceiros
  elements.btnDespesasTerceiros.addEventListener("click", () =>
    ui.abrirModalEspecifico(elements.modalMenuTerceiros),
  );
  elements.btnAbrirCadastroTerceiros.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalMenuTerceiros);
    state.isModoTerceiros = true;
    // NOVO: Popula os seletores (incluindo pessoas) antes de abrir
    trans.popularSeletoresFixos();
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

  // Relatórios (Navegação Inteligente com Lazy Loading)
  elements.btnRelatorios.addEventListener("click", () =>
    ui.abrirModalEspecifico(elements.modalRelatorios, null, "relatorios", {
      popularModalRelatorio: reports.popularModalRelatorio,
    }),
  );

  elements.btnRelatorioAnterior.addEventListener("click", async () => {
    state.reportDate.setMonth(state.reportDate.getMonth() - 1);
    const mesAno = utils.getMesAnoChave(state.reportDate);
    // Garante os dados antes de gerar o relatório
    await garantirDadosDoMes(mesAno);
    reports.popularModalRelatorio(state.reportDate);
  });

  elements.btnRelatorioProximo.addEventListener("click", async () => {
    state.reportDate.setMonth(state.reportDate.getMonth() + 1);
    const mesAno = utils.getMesAnoChave(state.reportDate);
    // Garante os dados antes de gerar o relatório
    await garantirDadosDoMes(mesAno);
    reports.popularModalRelatorio(state.reportDate);
  });

  // --- NOVO: Gerenciamento de Pessoas ---
  elements.btnAbrirConsultaPessoas.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalMenuTerceiros);
    ui.abrirModalEspecifico(
      elements.modalGerenciarPessoas,
      null,
      "gerenciarPessoas",
      {
        renderizarListaPessoas: third.renderizarListaPessoas,
      },
    );
  });

  elements.btnAbrirModalCadastroPessoaDirect.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalGerenciarPessoas);
    state.isPessoaEditMode = false;
    document.querySelector("#modalCadastrarPessoa h2").textContent =
      "Cadastrar Nova Pessoa";
    elements.btnSalvarPessoaModal.textContent = "Salvar Pessoa";
    ui.abrirModalEspecifico(elements.modalCadastrarPessoa);
  });

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

  // Séries e Confirmações
  elements.btnAcaoSerieApenasEsta.addEventListener("click", async () => {
    const { itemId, acao, context } = elements.modalConfirmarAcaoSerie.dataset;
    ui.fecharModalEspecifico(elements.modalConfirmarAcaoSerie);
    if (acao === "excluir") {
      if (context === "dividaTerceiro") {
        await third.excluirDividaTerceiroUnica(itemId);
      } else {
        // Lógica para despesas do usuário (Ordinária/Cartão)
        await trans.excluirTransacaoUnica(itemId);

        // Remove do cache local e atualiza a interface imediatamente
        state.transacoes = state.transacoes.filter((t) => t.id !== itemId);
        ui.renderizarTransacoesDoMes();

        // Se o modal de fatura estiver aberto, atualiza a lista interna dele
        if (elements.modalDetalhesFaturaCartao.style.display === "flex") {
          const cId = elements.faturaCartaoNomeTitulo.dataset.cartaoId;
          const mAno = elements.faturaCartaoNomeTitulo.dataset.mesAno;
          if (cId && mAno) cards.popularModalDetalhesFatura(cId, mAno);
        }
      }
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
      const itemInicial =
        context === "dividaTerceiro"
          ? state.dividasTerceiros.find((d) => d.id === itemId)
          : state.transacoes.find((t) => t.id === itemId);

      if (!itemInicial) {
        alert("Erro: Item de referência não encontrado.");
        return;
      }
      const mesAnoInicioExclusao = itemInicial.mesAnoReferencia;
      const querySnapshot = await db
        .collection("users")
        .doc(state.currentUser.uid)
        .collection(collectionName)
        .where("serieId", "==", serieId)
        .where("mesAnoReferencia", ">=", mesAnoInicioExclusao)
        .get();

      if (querySnapshot.empty) {
        alert("Nenhum item futuro encontrado.");
        return;
      }

      const batch = db.batch();
      querySnapshot.docs.forEach((doc) => batch.delete(doc.ref));

      try {
        await batch.commit();

        if (context !== "dividaTerceiro") {
          // Limpa a série da memória local das despesas do usuário
          state.transacoes = state.transacoes.filter(
            (t) => t.serieId !== serieId,
          );
          await utils.registrarUltimaAlteracao();

          // Redesenha a tela principal e os saldos
          ui.renderizarTransacoesDoMes();

          // Se estiver visualizando uma fatura, atualiza os dados do modal
          if (elements.modalDetalhesFaturaCartao.style.display === "flex") {
            const cId = elements.faturaCartaoNomeTitulo.dataset.cartaoId;
            const mAno = elements.faturaCartaoNomeTitulo.dataset.mesAno;
            if (cId && mAno) cards.popularModalDetalhesFatura(cId, mAno);
          }
        }

        alert(`${querySnapshot.docs.length} item(ns) excluídos.`);
      } catch (error) {
        console.error(`Erro ao excluir:`, error);
      }
    } else {
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

  // --- NOVO: Ouvinte para confirmar o Soft Delete do Cartão ---
  elements.btnConfirmarSoftDeleteCartao.addEventListener("click", async () => {
    const cartaoId = elements.modalConfirmarExclusaoCartao.dataset.cartaoId;
    const dataCorte = elements.dataCorteExclusaoCartao.value;
    if (!dataCorte) {
      alert("Por favor, selecione o mês de corte.");
      return;
    }
    if (cartaoId) {
      elements.btnConfirmarSoftDeleteCartao.disabled = true;
      elements.btnConfirmarSoftDeleteCartao.textContent = "Processando...";
      await cards.executarSoftDeleteCartao(
        cartaoId,
        dataCorte,
        ui.fecharModalEspecifico,
        ui.atualizarResumoFinanceiro,
      );
      elements.btnConfirmarSoftDeleteCartao.disabled = false;
      elements.btnConfirmarSoftDeleteCartao.textContent = "Confirmar e Excluir";
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

  // Lógica do Simulador de Diferença na Fatura
  if (elements.inputValorBanco) {
    elements.inputValorBanco.addEventListener("input", () => {
      const valorDigitado = elements.inputValorBanco.value.replace(",", ".");
      const valorBanco = parseFloat(valorDigitado) || 0;
      const totalEsperado =
        parseFloat(
          elements.auditTotalEsperado.getAttribute("data-valor-calculado"),
        ) || 0;
      const diferenca = valorBanco - totalEsperado;

      if (elements.inputValorBanco.value === "") {
        elements.resultadoDiferenca.style.display = "none";
        return;
      }

      elements.resultadoDiferenca.style.display = "block";
      if (Math.abs(diferenca) < 0.01) {
        elements.resultadoDiferenca.textContent =
          "✅ Tudo certo! Os valores coincidem.";
        elements.resultadoDiferenca.style.color = "#27ae60";
      } else {
        const valorDiffFormated = utils.formatCurrency(Math.abs(diferenca));
        if (diferenca > 0) {
          elements.resultadoDiferenca.textContent = `⚠️ Faltam cadastrar ${valorDiffFormated} no Finan.`;
          elements.resultadoDiferenca.style.color = "#e67e22";
        } else {
          elements.resultadoDiferenca.textContent = `❓ Você cadastrou ${valorDiffFormated} a mais no Finan.`;
          elements.resultadoDiferenca.style.color = "#3498db";
        }
      }
    });
  }
  // --- Ouvintes para o Formulário em Cascata ---
  elements.tipoTransacaoSelect.addEventListener("change", () => {
    trans.atualizarVisibilidadeFormulario();
  });

  elements.categoriaDespesa.addEventListener("change", () => {
    trans.atualizarVisibilidadeFormulario();
  });

  elements.frequenciaDespesaOrd.addEventListener("change", () => {
    trans.atualizarVisibilidadeFormulario();
  });

  elements.frequenciaDespesaCartao.addEventListener("change", () => {
    trans.atualizarVisibilidadeFormulario();
  });

  elements.cartaoDespesa.addEventListener("change", (e) => {
    if (e.target.value === "novo_cartao") {
      ui.abrirModalEspecifico(
        elements.modalCadastrarCartao,
        null,
        "cartaoCadastroEdicao",
        {
          resetModalCartao: () => {
            elements.nomeCartaoInputModal.value = "";
            elements.diaVencimentoFaturaInputModal.value = "";
          },
        },
      );
      e.target.value = "";
    }
  });

  elements.pessoaSelect.addEventListener("change", () => {
    if (elements.pessoaSelect.value === "cadastrar_nova") {
      ui.abrirModalEspecifico(elements.modalCadastrarPessoa);
      elements.pessoaSelect.value = "";
    }
  });
});
