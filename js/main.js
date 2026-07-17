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
import * as tracker from "./modules/weekly-tracker.js";

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

        // NOVO: Exibe o email do usuário logado na sidebar
        if (elements.userEmailDisplay) {
          elements.userEmailDisplay.textContent = user.email;
        }

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

      // NOVO: Limpa o email da sidebar ao sair
      if (elements.userEmailDisplay) {
        elements.userEmailDisplay.textContent = "";
      }

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

    // --- LÓGICA: Garantir existência dos orçamentos fixos para o mês atual ---
    const mesAnoAtual = utils.getMesAnoChave(state.currentDate);
    const orcamentoFixoCartao = state.orcamentos.find(
      (o) => o.isFixed === true && o.mesAnoReferencia === mesAnoAtual,
    );
    const orcamentoFixoOrdinario = state.orcamentos.find(
      (o) => o.isFixedOrdinary === true && o.mesAnoReferencia === mesAnoAtual,
    );

    const promessasCriacao = [];

    if (!orcamentoFixoCartao && state.currentUser) {
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
            mesAnoReferencia: mesAnoAtual,
          })
          .then((docRef) => {
            state.orcamentos.push({
              id: docRef.id,
              nome: "Outros Gastos",
              valor: 0,
              dia: 1,
              isFixed: true,
              mesAnoReferencia: mesAnoAtual,
            });
          }),
      );
    }

    if (!orcamentoFixoOrdinario && state.currentUser) {
      promessasCriacao.push(
        db
          .collection("users")
          .doc(state.currentUser.uid)
          .collection("orcamentos")
          .add({
            nome: "Gastos Ordinários",
            valor: 0,
            dia: 1,
            isFixedOrdinary: true,
            mesAnoReferencia: mesAnoAtual,
          })
          .then((docRef) => {
            state.orcamentos.push({
              id: docRef.id,
              nome: "Gastos Ordinários",
              valor: 0,
              dia: 1,
              isFixedOrdinary: true,
              mesAnoReferencia: mesAnoAtual,
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

    const dataAtual = new Date();
    const mesesParaBaixar = [];
    for (let i = -1; i <= 1; i++) {
      const d = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + i, 1);
      mesesParaBaixar.push(utils.getMesAnoChave(d));
    }

    try {
      const [tSnap, cSnap, oSnap, ofSnap, aSnap, dSnap, pSnap, fcSnap] =
        await Promise.all([
          userCollections
            .collection("transacoes")
            .where("mesAnoReferencia", "in", mesesParaBaixar)
            .get(),
          userCollections.collection("cartoes").get(),
          userCollections
            .collection("orcamentos")
            .where("mesAnoReferencia", "in", mesesParaBaixar)
            .get(),
          userCollections.collection("orcamentosFechados").get(),
          userCollections.collection("ajustesFatura").get(),
          userCollections.collection("dividasTerceiros").get(),
          userCollections.collection("pessoas").get(),
          userCollections.collection("faturasConferidas").get(), // NOVO
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
      state.faturasConferidas = fcSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })); // NOVO

      // 1. Migração de Legados (caso não existam orçamentos com mês)
      const orcsComMes = state.orcamentos.filter((o) => o.mesAnoReferencia);
      if (orcsComMes.length === 0) {
        const legacySnap = await userCollections.collection("orcamentos").get();
        const legacyBudgets = legacySnap.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter((doc) => !doc.mesAnoReferencia);
        if (legacyBudgets.length > 0) {
          await budgets.migrarOrcamentosLegados(
            legacyBudgets,
            mesesParaBaixar[1],
          );
          const freshSnap = await userCollections
            .collection("orcamentos")
            .where("mesAnoReferencia", "==", mesesParaBaixar[1])
            .get();
          state.orcamentos = freshSnap.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          }));
        }
      }

      // 2. Garantir orçamentos para os 3 meses iniciais (Propagação Automática no Load)
      for (const mes of mesesParaBaixar) {
        const orcsDoMes = state.orcamentos.filter(
          (o) => o.mesAnoReferencia === mes,
        );
        if (orcsDoMes.length === 0) {
          console.log(`Propagando orçamento inicial para ${mes}...`);
          const novos = await budgets.propagarOrcamentos(null, mes);
          state.orcamentos = [...state.orcamentos, ...novos];
        }
      }

      state.mesesCarregados = [...mesesParaBaixar];
    } catch (error) {
      console.error("Erro dados iniciais:", error);
    }
  }

  // NOVA FUNÇÃO: Carrega um mês específico se ele não estiver no cache
  async function garantirDadosDoMes(mesAno) {
    if (state.mesesCarregados.includes(mesAno)) return;

    console.log(`Carregando dados sob demanda para: ${mesAno}`);
    if (elements.loadingSpinnerOverlay)
      elements.loadingSpinnerOverlay.style.display = "flex";

    try {
      const userCollections = db.collection("users").doc(state.currentUser.uid);

      const [snapTrans, snapOrc] = await Promise.all([
        userCollections
          .collection("transacoes")
          .where("mesAnoReferencia", "==", mesAno)
          .get(),
        userCollections
          .collection("orcamentos")
          .where("mesAnoReferencia", "==", mesAno)
          .get(),
      ]);

      const novasTransacoes = snapTrans.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      const transacoesFiltradas = novasTransacoes.filter(
        (nova) =>
          !state.transacoes.some((existente) => existente.id === nova.id),
      );
      state.transacoes = [...state.transacoes, ...transacoesFiltradas];

      let orcamentosDoMes = snapOrc.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      // LÓGICA DE PROPAGAÇÃO MELHORADA
      if (orcamentosDoMes.length === 0) {
        console.log(`Mês ${mesAno} vazio. Iniciando propagação...`);
        orcamentosDoMes = await budgets.propagarOrcamentos(null, mesAno);
      }

      // Adiciona ao estado local removendo qualquer lixo que pudesse existir daquele mês
      state.orcamentos = state.orcamentos.filter(
        (o) => o.mesAnoReferencia !== mesAno,
      );
      state.orcamentos = [...state.orcamentos, ...orcamentosDoMes];

      if (!state.mesesCarregados.includes(mesAno)) {
        state.mesesCarregados.push(mesAno);
      }
    } catch (error) {
      console.error(`Erro ao carregar mês ${mesAno}:`, error);
    } finally {
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
      // Atualiza os seletores (Cartões, Orçamentos, Pessoas) para manter a reatividade nos modais
      trans.popularSeletoresFixos();

      if (elements.searchInput.value.trim() === "")
        ui.renderizarTransacoesDoMes();
      else
        search.executarBuscaGlobal(
          elements.searchInput.value,
          ui.renderizarTransacoesDoMes,
        );

      // REATIVIDADE: Atualiza o modal de cartões se estiver aberto
      if (elements.modalGerenciarCartoes.style.display === "flex") {
        cards.renderizarListaCartoesCadastrados();
      }

      if (elements.modalConsultarTerceiros.style.display === "flex")
        third.renderizarDividasDoMes();
    };

    // 1. ESCUTA DO DOCUMENTO DO USUÁRIO (Restaura e mantém Data da Última Alteração)
    state.activeUnsubscribers.push(
      userRef.onSnapshot((doc) => {
        if (doc.exists) {
          authMod.exibirDataUltimaAtualizacao(doc.data().lastModified);
        }
      }),
    );

    // ESCUTA DE CARTÕES (Garante reatividade em tempo real na exclusão/edição)
    state.activeUnsubscribers.push(
      userRef.collection("cartoes").onSnapshot((s) => {
        state.cartoes = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        update();
      }),
    );

    // 2. ESCUTA DE ORÇAMENTOS
    state.activeUnsubscribers.push(
      userRef.collection("orcamentos").onSnapshot((s) => {
        state.orcamentos = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        console.log("State: Orçamentos atualizados via Snapshot.");
        update();
      }),
    );

    // 3. ESCUTA DE CADEADOS (ORÇAMENTOS FECHADOS)
    state.activeUnsubscribers.push(
      userRef.collection("orcamentosFechados").onSnapshot((s) => {
        state.orcamentosFechados = s.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }));
        update();
      }),
    );

    // 4. ESCUTA DE AJUSTES DE FATURA
    state.activeUnsubscribers.push(
      userRef.collection("ajustesFatura").onSnapshot((s) => {
        state.ajustesFatura = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        update();
      }),
    );

    // 5. ESCUTA DE DÍVIDAS DE TERCEIROS
    state.activeUnsubscribers.push(
      userRef.collection("dividasTerceiros").onSnapshot((s) => {
        state.dividasTerceiros = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        update();
      }),
    );

    // 6. ESCUTA DE PESSOAS
    state.activeUnsubscribers.push(
      userRef.collection("pessoas").onSnapshot((s) => {
        state.pessoas = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        state.pessoas.sort((a, b) => a.nome.localeCompare(b.nome));
        if (elements.modalGerenciarPessoas.style.display === "flex") {
          third.renderizarListaPessoas();
        }
      }),
    );

    // ESCUTA DE FATURAS CONFERIDAS (Selo de Conferência)
    state.activeUnsubscribers.push(
      userRef.collection("faturasConferidas").onSnapshot((s) => {
        state.faturasConferidas = s.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }));
        update();
      }),
    );

    // 7. ESCUTAS DO WEEKLY TRACKER (Persistência e Reatividade)
    state.activeUnsubscribers.push(
      userRef.collection("ciclos_tracker").onSnapshot((s) => {
        state.ciclosTracker = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        console.log("Ciclos Tracker atualizados:", state.ciclosTracker.length);
        if (elements.modalWeeklyTracker.style.display === "flex") {
          tracker.renderizarTracker();
        }
      }),
    );

    state.activeUnsubscribers.push(
      userRef.collection("votos_tracker").onSnapshot((s) => {
        state.votosTracker = s.docs.map((d) => ({ ...d.data(), id: d.id }));
        if (elements.modalWeeklyTracker.style.display === "flex") {
          tracker.renderizarTracker();
        }
      }),
    );
  }

  // --- GATILHOS DE INTERFACE (VITAIS) ---

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
    // Fix: Seta o dia para 1 antes de mudar o mês para evitar o bug do dia 31
    state.currentDate.setDate(1);
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
    // Fix: Seta o dia para 1 antes de mudar o mês para evitar o bug do dia 31
    state.currentDate.setDate(1);
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
    const hoje = new Date();
    // Fix: Forçamos o dia 1 para garantir navegação estável a partir de hoje
    hoje.setDate(1);
    state.currentDate = hoje;

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
    // NOVO: Limpa o estado de edição para garantir um formulário novo e limpo
    state.isEditMode = false;
    state.editingTransactionId = null;
    state.editingSerieId = null;

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

        const returnTo = elements.modalNovaTransacao.dataset.returnTo;
        elements.modalNovaTransacao.dataset.returnTo = "";

        ui.fecharModalEspecifico(elements.modalNovaTransacao);

        // PADRONIZAÇÃO: Se veio da consulta, reabre a consulta atualizada
        if (returnTo === "modalConsultarTerceiros") {
          third.renderizarDividasDoMes();
          ui.abrirModalEspecifico(elements.modalConsultarTerceiros);
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
      // Feedback visual dinâmico com contador de meses/parcelas
      if (state.isEditMode && state.editingSerieId) {
        alert(
          `Sucesso! A série de transações foi atualizada em ${s} meses no histórico.`,
        );
      } else if (
        !state.isEditMode &&
        (d.frequencia === "recorrente" || d.frequencia === "parcelada")
      ) {
        alert(`Sucesso! A nova série foi registrada para ${s} meses adiante.`);
      }

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

      // REATIVIDADE: Se o gerenciador de cartões estiver aberto ao fundo, atualiza os totais
      if (elements.modalGerenciarCartoes.style.display === "flex") {
        cards.renderizarListaCartoesCadastrados();
      }

      // Força a atualização da lista na tela inicial e do resumo financeiro
      ui.renderizarTransacoesDoMes();

      // REATIVIDADE WEEKLY TRACKER: Atualiza o tracker se estiver aberto
      if (elements.modalWeeklyTracker.style.display === "flex") {
        tracker.renderizarTracker();
      }
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

        // REATIVIDADE IMEDIATA: Atualiza localmente para mudar o ícone na hora
        const idx = state.cartoes.findIndex((c) => c.id === cartaoId);
        if (idx !== -1) state.cartoes[idx].vencimentoNoMesSeguinte = novoEstado;

        await utils.registrarUltimaAlteracao();
        ui.renderizarTransacoesDoMes();
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

    try {
      let cartaoId = elements.cartaoEditIdInput.value;
      const isNew = !state.isCartaoEditMode;

      let dadosCartao;
      if (!isNew) {
        dadosCartao = { nome: n, diaVencimentoFatura: d };
        await ref.doc(cartaoId).update(dadosCartao);

        // Atualização local imediata para reatividade instantânea
        const idx = state.cartoes.findIndex((c) => c.id === cartaoId);
        if (idx > -1) {
          state.cartoes[idx] = { ...state.cartoes[idx], ...dadosCartao };
        }
      } else {
        dadosCartao = {
          nome: n,
          diaVencimentoFatura: d,
          vencimentoNoMesSeguinte: false,
          deletado: false,
        };
        const docRef = await ref.add(dadosCartao);
        cartaoId = docRef.id;

        // Injeta na memória local imediatamente
        state.cartoes.push({ id: cartaoId, ...dadosCartao });
      }

      const returnTo = elements.modalCadastrarCartao.dataset.returnTo;
      elements.modalCadastrarCartao.dataset.returnTo = "";

      ui.fecharModalEspecifico(elements.modalCadastrarCartao);

      // Re-renderiza os seletores e listas de cartões em tempo real
      trans.popularSeletoresFixos();

      // Se estiver no modal de transação, seleciona o novo cartão automaticamente
      if (elements.modalNovaTransacao.style.display === "flex") {
        elements.cartaoDespesa.value = cartaoId;
      }

      // Se deve retornar ao gerenciador, garante que a lista está atualizada
      if (returnTo === "modalGerenciarCartoes") {
        ui.abrirModalEspecifico(
          elements.modalGerenciarCartoes,
          null,
          "gerenciarCartoes",
          {
            renderizarListaCartoesCadastrados:
              cards.renderizarListaCartoesCadastrados,
          },
        );
      }

      // Caso o modal gerenciador esteja aberto ao fundo, força o refresh da lista
      if (elements.modalGerenciarCartoes.style.display === "flex") {
        cards.renderizarListaCartoesCadastrados();
      }
    } catch (error) {
      console.error("Erro ao salvar cartão:", error);
      alert("Ocorreu um erro ao salvar o cartão.");
    }
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
      // PADRONIZAÇÃO: Não fechamos mais o gerenciador, permitindo o empilhamento do modal
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
    // PADRONIZAÇÃO: Não fechamos mais os detalhes da fatura, para permitir conferência imediata após o save
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

  // NOVO: Ouvinte para o checkbox de "Fatura Conferida"
  if (elements.checkFaturaConferida) {
    elements.checkFaturaConferida.addEventListener("change", (e) => {
      const cartaoId = elements.faturaCartaoNomeTitulo.dataset.cartaoId;
      const mesAno = elements.faturaCartaoNomeTitulo.dataset.mesAno;
      const status = e.target.checked;
      if (cartaoId && mesAno) {
        cards.atualizarStatusConferenciaFatura(cartaoId, mesAno, status);
      }
    });
  }
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
    }),
  );

  // Novo: Abre o modal de cadastro/edição (Padronizado com Cartões)
  elements.btnAbrirModalCadastroOrcamento.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalOrcamentos);
    elements.modalCadastrarOrcamento.dataset.returnTo = "modalOrcamentos";
    ui.abrirModalEspecifico(
      elements.modalCadastrarOrcamento,
      null,
      "orcamentoCadastroEdicao", // Nome para o seletor de reset no ui.js
      {
        resetFormOrcamento: budgets.resetFormOrcamento,
      },
    );
  });

  // Dispara a escolha de escopo ao salvar um orçamento
  elements.btnSalvarOrcamento.addEventListener("click", () => {
    const id = elements.orcamentoEditIdInput.value;
    const n = elements.nomeOrcamentoInput.value.trim();
    const v = parseFloat(elements.valorOrcamentoInput.value);
    const d = parseInt(elements.diaOrcamentoInput.value);

    if (!n || isNaN(v) || isNaN(d)) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    if (id) {
      // Se for edição, abre o modal de escolha de escopo
      ui.abrirModalEspecifico(elements.modalConfirmarEscopoOrcamento);
    } else {
      // Se for novo orçamento, dispara salvamento com flag de criação
      executarSalvamentoOrcamento("novo");
    }
  });

  // Função interna para processar o salvamento de orçamentos (Temporal)
  async function executarSalvamentoOrcamento(tipoEdicao) {
    const dados = {
      id: elements.orcamentoEditIdInput.value,
      nome: elements.nomeOrcamentoInput.value.trim(),
      valor: parseFloat(elements.valorOrcamentoInput.value),
      dia: parseInt(elements.diaOrcamentoInput.value),
      tipoEdicao: tipoEdicao,
    };

    const sucesso = await budgets.salvarOrcamentoTemporal(dados);

    if (sucesso) {
      const mesAnoAtual = utils.getMesAnoChave(state.currentDate);

      // Se for um NOVO orçamento ou alteração de série, limpamos o cache de meses futuros
      if (tipoEdicao === "futuros" || tipoEdicao === "novo") {
        state.mesesCarregados = state.mesesCarregados.filter(
          (m) => m <= mesAnoAtual,
        );
        state.orcamentos = state.orcamentos.filter(
          (o) => o.mesAnoReferencia <= mesAnoAtual,
        );
      } else {
        // Se mudou só este mês, invalida apenas este mês no cache
        state.mesesCarregados = state.mesesCarregados.filter(
          (m) => m !== mesAnoAtual,
        );
        state.orcamentos = state.orcamentos.filter(
          (o) => o.mesAnoReferencia !== mesAnoAtual,
        );
      }

      // Re-sincroniza a memória com o banco
      await garantirDadosDoMes(mesAnoAtual);

      const returnTo = elements.modalCadastrarOrcamento.dataset.returnTo;
      elements.modalCadastrarOrcamento.dataset.returnTo = "";

      // Fecha os modais de formulário e confirmação
      ui.fecharModalEspecifico(elements.modalConfirmarEscopoOrcamento);
      ui.fecharModalEspecifico(elements.modalCadastrarOrcamento);

      // Se deve retornar ao gerenciador, reabre ele com a lista atualizada
      if (returnTo === "modalOrcamentos") {
        ui.abrirModalEspecifico(elements.modalOrcamentos, null, "orcamentos", {
          renderizarListaOrcamentos: budgets.renderizarListaOrcamentos,
        });
      }

      // Atualiza visualmente a tela inicial e o resumo
      ui.renderizarTransacoesDoMes();
    }
  }

  // Ouvintes para o modal de confirmação de escopo de orçamento
  elements.btnOrcamentoApenasEste.addEventListener("click", () =>
    executarSalvamentoOrcamento("unico"),
  );
  elements.btnOrcamentoEsteEFuturos.addEventListener("click", () =>
    executarSalvamentoOrcamento("futuros"),
  );
  elements.btnOrcamentoCancelar.addEventListener("click", () =>
    ui.fecharModalEspecifico(elements.modalConfirmarEscopoOrcamento),
  );
  // Ouvinte para a lista de orçamentos (Edição e Exclusão)
  elements.listaOrcamentosUl.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    const id = button?.dataset.id;
    if (!id) return;

    if (button.classList.contains("btn-edit-orcamento")) {
      ui.fecharModalEspecifico(elements.modalOrcamentos);
      elements.modalCadastrarOrcamento.dataset.returnTo = "modalOrcamentos";

      ui.abrirModalEspecifico(
        elements.modalCadastrarOrcamento,
        id,
        "orcamentoCadastroEdicao",
        {
          resetFormOrcamento: budgets.resetFormOrcamento,
          preencherModalEdicaoOrcamento: budgets.preencherModalEdicaoOrcamento,
        },
      );
    } else if (button.classList.contains("btn-delete-orcamento")) {
      const orcamento = state.orcamentos.find((o) => o.id === id);
      if (!orcamento) return;

      // Armazena o ID do orçamento no dataset do modal para uso posterior
      elements.modalConfirmarExclusaoEscopoOrcamento.dataset.orcamentoIdParaExcluir =
        id;
      elements.modalConfirmarExclusaoEscopoOrcamento.dataset.orcamentoNomeParaExcluir =
        orcamento.nome;

      document.getElementById(
        "textoConfirmarExclusaoEscopoOrcamento",
      ).textContent =
        `Como você deseja excluir o orçamento "${orcamento.nome}"?`;

      ui.abrirModalEspecifico(elements.modalConfirmarExclusaoEscopoOrcamento);
    }
  });

  // Função auxiliar para processar a exclusão após a escolha
  async function executarExclusaoOrcamento(tipoExclusao) {
    const id =
      elements.modalConfirmarExclusaoEscopoOrcamento.dataset
        .orcamentoIdParaExcluir;
    const mesAnoAtual = utils.getMesAnoChave(state.currentDate);

    if (await budgets.excluirOrcamentoTemporal(id, tipoExclusao)) {
      // Limpa cache local para refletir a exclusão
      if (tipoExclusao === "futuros") {
        state.mesesCarregados = state.mesesCarregados.filter(
          (m) => m < mesAnoAtual,
        );
        state.orcamentos = state.orcamentos.filter(
          (o) => o.mesAnoReferencia < mesAnoAtual,
        );
      } else {
        state.mesesCarregados = state.mesesCarregados.filter(
          (m) => m !== mesAnoAtual,
        );
        state.orcamentos = state.orcamentos.filter(
          (o) => o.mesAnoReferencia !== mesAnoAtual,
        );
      }

      // Re-sincroniza memória com o banco
      await garantirDadosDoMes(mesAnoAtual);

      // Fecha os modais
      ui.fecharModalEspecifico(elements.modalConfirmarExclusaoEscopoOrcamento);

      // Atualiza as listas
      ui.renderizarTransacoesDoMes();
      budgets.renderizarListaOrcamentos();
    }
  }

  // Ouvintes para o novo modal de confirmação de EXCLUSÃO
  elements.btnExcluirOrcamentoApenasEste.addEventListener("click", () =>
    executarExclusaoOrcamento("unico"),
  );
  elements.btnExcluirOrcamentoEsteEFuturos.addEventListener("click", () =>
    executarExclusaoOrcamento("futuros"),
  );
  elements.btnExcluirOrcamentoCancelar.addEventListener("click", () =>
    ui.fecharModalEspecifico(elements.modalConfirmarExclusaoEscopoOrcamento),
  );

  elements.btnFecharTodosOrcamentos.addEventListener("click", () => {
    budgets.alternarTodosOrcamentosDoMes();
  });

  if (elements.btnDownloadPDF) {
    elements.btnDownloadPDF.addEventListener("click", () => {
      exportMod.gerarExtratoMensalPDF();
    });
  }

  if (elements.btnQuickAddOrdinary) {
    elements.btnQuickAddOrdinary.addEventListener("click", () => {
      trans.abrirModalDespesaOrdinariaRapida(ui.abrirModalEspecifico);
    });
  }

  // Terceiros: Atalho Direto para Consulta de Dívidas
  elements.btnDespesasTerceiros.addEventListener("click", () => {
    state.dividasTerceirosDate = new Date(state.currentDate);
    third.renderizarDividasDoMes();
    ui.abrirModalEspecifico(elements.modalConsultarTerceiros);
  });

  // Cadastro de Nova Dívida a partir da Consulta
  if (elements.btnAbrirCadastroTerceiros) {
    elements.btnAbrirCadastroTerceiros.addEventListener("click", () => {
      ui.fecharModalEspecifico(elements.modalConsultarTerceiros);
      elements.modalNovaTransacao.dataset.returnTo = "modalConsultarTerceiros";
      state.isEditMode = false;
      state.editingTransactionId = null;
      state.editingSerieId = null;
      state.isModoTerceiros = true;
      trans.popularSeletoresFixos();
      ui.abrirModalEspecifico(elements.modalNovaTransacao, null, "transacao", {
        resetModalNovaTransacao: trans.resetModalNovaTransacao,
        preencherModalParaEdicao: trans.preencherModalParaEdicao,
      });
    });
  }

  // Navegação de Meses nas Dívidas
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

  // Clique na Lista de Dívidas (Checkbox Mestre, Individual e Ações)
  elements.listaDividasTerceirosUl.addEventListener("click", (e) => {
    // 1. Checkbox Mestre (Por pessoa)
    if (e.target.classList.contains("master-checkbox-pessoa")) {
      e.stopPropagation();
      const pessoaId = e.target.dataset.pessoaId;
      third.atualizarReembolsoEmLote(pessoaId, e.target.checked);
      return;
    }

    const id =
      e.target.dataset.dividaId || e.target.closest("button")?.dataset.dividaId;
    if (!id) return;

    // 2. Checkbox Individual
    if (e.target.type === "checkbox") {
      third.atualizarStatusReembolso(id, e.target.checked);
      return;
    }

    // 3. Botões de Ação
    if (e.target.closest(".btn-delete-divida")) {
      const d = state.dividasTerceiros.find((x) => x.id === id);
      if (d && d.frequencia === "unica") third.excluirDividaTerceiroUnica(id);
      else if (d)
        ui.abrirModalConfirmarAcaoSerie(
          id,
          CONSTS.ACAO_SERIE.EXCLUIR,
          "dividaTerceiro",
          ui.abrirModalEspecifico,
        );
    } else if (e.target.closest(".btn-edit-divida")) {
      const d = state.dividasTerceiros.find((x) => x.id === id);
      if (d && d.frequencia === "unica") {
        third.abrirModalEdicaoDivida(
          id,
          "unica",
          () => ui.fecharModalEspecifico(elements.modalConsultarTerceiros),
          ui.abrirModalEspecifico,
        );
      } else if (d) {
        ui.abrirModalConfirmarAcaoSerie(
          id,
          CONSTS.ACAO_SERIE.EDITAR,
          "dividaTerceiro",
          ui.abrirModalEspecifico,
        );
      }
    }
  });
  elements.btnSalvarPessoaModal.addEventListener("click", async () => {
    const n = elements.nomePessoaInputModal.value.trim();
    if (!n) return;
    const ref = db
      .collection("users")
      .doc(state.currentUser.uid)
      .collection("pessoas");

    try {
      let pessoaId = state.editingPessoaId;
      const isNew = !state.isPessoaEditMode;

      if (!isNew) {
        await ref.doc(pessoaId).update({ nome: n });
      } else {
        const docRef = await ref.add({ nome: n });
        pessoaId = docRef.id;
      }

      const returnTo = elements.modalCadastrarPessoa.dataset.returnTo;
      elements.modalCadastrarPessoa.dataset.returnTo = "";

      ui.fecharModalEspecifico(elements.modalCadastrarPessoa);

      // Se o modal de Nova Transação estiver aberto, atualiza o seletor e seleciona a nova pessoa
      if (elements.modalNovaTransacao.style.display === "flex") {
        trans.popularSeletoresFixos();
        elements.pessoaSelect.value = pessoaId;
      }

      // Se deve retornar ao gerenciador de pessoas
      if (returnTo === "modalGerenciarPessoas") {
        ui.abrirModalEspecifico(
          elements.modalGerenciarPessoas,
          null,
          "gerenciarPessoas",
          {
            renderizarListaPessoas: third.renderizarListaPessoas,
          },
        );
      }

      // Limpeza de estado
      state.isPessoaEditMode = false;
      state.editingPessoaId = null;
      elements.nomePessoaInputModal.value = "";
    } catch (error) {
      console.error("Erro ao salvar pessoa:", error);
      alert("Ocorreu um erro ao salvar o cadastro.");
    }
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

  // Interatividade Drill-down nos Relatórios (Atualizado para Patrimônio)
  elements.relatorioCorpo.addEventListener("click", (e) => {
    const itemClicavel = e.target.closest(".relatorio-item-analise.clicavel");
    if (itemClicavel) {
      // Captura categoria, frequência OU o novo tipoPatrimonio do dataset do elemento
      const { cat, freq, tipoPatrimonio } = itemClicavel.dataset;

      reports.abrirDetalhesFiltroRelatorio(
        cat,
        freq,
        state.reportDate,
        ui.abrirModalEspecifico,
        tipoPatrimonio, // Passa o parâmetro de patrimônio para a função lógica
      );
    }
  });

  // --- NOVO: Gerenciamento de Pessoas (Ajustado para o novo local no rodapé) ---
  const btnPessoas = document.getElementById("btnAbrirConsultaPessoas");
  if (btnPessoas) {
    btnPessoas.addEventListener("click", () => {
      ui.fecharModalEspecifico(elements.modalConsultarTerceiros);
      ui.abrirModalEspecifico(
        elements.modalGerenciarPessoas,
        null,
        "gerenciarPessoas",
        {
          renderizarListaPessoas: third.renderizarListaPessoas,
        },
      );
    });
  }

  elements.btnAbrirModalCadastroPessoaDirect.addEventListener("click", () => {
    ui.fecharModalEspecifico(elements.modalGerenciarPessoas);
    elements.modalCadastrarPessoa.dataset.returnTo = "modalGerenciarPessoas";
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
          // LIMPEZA LOCAL: Remove da memória apenas os itens do mês de referência para frente, preservando o passado
          state.transacoes = state.transacoes.filter(
            (t) =>
              !(
                t.serieId === serieId &&
                t.mesAnoReferencia >= mesAnoInicioExclusao
              ),
          );

          await utils.registrarUltimaAlteracao();
          ui.renderizarTransacoesDoMes();

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
        () => {
          ui.renderizarTransacoesDoMes();
          // NOVO: Atualiza a lista de cartões no modal de gerenciamento imediatamente
          cards.renderizarListaCartoesCadastrados();
        },
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

  // NOVO: Ouvinte para Patrimônio (PROTEGIDO)
  if (elements.frequenciaPatrimonio) {
    elements.frequenciaPatrimonio.addEventListener("change", () => {
      trans.atualizarVisibilidadeFormulario();
    });
  }

  elements.frequenciaDespesaOrd.addEventListener("change", () => {
    trans.atualizarVisibilidadeFormulario();
  });

  elements.frequenciaDespesaCartao.addEventListener("change", () => {
    trans.atualizarVisibilidadeFormulario();
  });

  // Ouvinte para o seletor de Cartões (Cadastro Rápido)
  if (elements.cartaoDespesa) {
    elements.cartaoDespesa.addEventListener("change", (e) => {
      if (e.target.value === "novo_cartao") {
        elements.modalCadastrarCartao.dataset.returnTo = "";
        ui.abrirModalEspecifico(
          elements.modalCadastrarCartao,
          null,
          "cartaoCadastroEdicao",
          {
            resetModalCartao: () => {
              elements.nomeCartaoInputModal.value = "";
              elements.diaVencimentoFaturaInputModal.value = "";
              elements.modalCartaoTitulo.textContent = "Cadastrar Novo Cartão";
              elements.btnSalvarCartaoModalBtn.textContent = "Salvar Cartão";
            },
          },
        );
        e.target.value = "";
      }
    });
  }

  // Ouvinte para o seletor de Pessoas (Cadastro Rápido)
  if (elements.pessoaSelect) {
    elements.pessoaSelect.addEventListener("change", () => {
      if (elements.pessoaSelect.value === "cadastrar_nova") {
        elements.modalCadastrarPessoa.dataset.returnTo = "";
        state.isPessoaEditMode = false;
        document.querySelector("#modalCadastrarPessoa h2").textContent =
          "Cadastrar Nova Pessoa";
        elements.btnSalvarPessoaModal.textContent = "Salvar Pessoa";
        ui.abrirModalEspecifico(elements.modalCadastrarPessoa);
        elements.pessoaSelect.value = "";
      }
    });
  }

  // =========================================
  //      EVENTOS DO WEEKLY TRACKER
  // =========================================

  // Abrir o Painel Principal do Weekly Tracker
  if (elements.btnWeeklyTracker) {
    elements.btnWeeklyTracker.addEventListener("click", async () => {
      // Usamos await para garantir que transações fora do cache sejam carregadas
      await tracker.renderizarTracker();
      ui.abrirModalEspecifico(elements.modalWeeklyTracker);
    });
  }

  if (elements.btnAbrirNovoCiclo) {
    elements.btnAbrirNovoCiclo.addEventListener("click", () => {
      // Bloqueio Proativo: Verifica se já existem 2 ciclos ativos antes de abrir o modal
      const ativos = state.ciclosTracker.filter((c) => c.status === "ativo");
      if (ativos.length >= 2) {
        alert(
          "Você já possui 2 ciclos ativos (Principal e Transição). Encerre o mais antigo antes de abrir um novo.",
        );
        return;
      }

      elements.cicloEditIdInput.value = "";
      elements.dataInicioCicloInput.value = "";
      elements.dataFimCicloInput.value = "";
      elements.metaCicloInput.value = "";
      elements.modalConfigCicloTitulo.textContent = "Abrir Novo Ciclo";
      ui.abrirModalEspecifico(elements.modalConfigCiclo);
    });
  }

  if (elements.btnSalvarConfigCiclo) {
    elements.btnSalvarConfigCiclo.addEventListener("click", async () => {
      const dados = {
        id: elements.cicloEditIdInput.value,
        dataInicio: elements.dataInicioCicloInput.value,
        dataFim: elements.dataFimCicloInput.value,
        metaTotal: parseFloat(elements.metaCicloInput.value) || 0,
      };
      if (!dados.dataInicio || !dados.dataFim || dados.metaTotal <= 0) {
        alert("Por favor, preencha as datas e uma meta válida.");
        return;
      }
      if (await tracker.salvarConfigCiclo(dados)) {
        ui.fecharModalEspecifico(elements.modalConfigCiclo);
      }
    });
  }

  if (elements.btnSalvarValorInicial) {
    elements.btnSalvarValorInicial.addEventListener("click", async () => {
      const id = elements.cicloValorInicialIdInput.value;
      const valor = parseFloat(elements.valorInicialCicloInput.value) || 0;
      if (await tracker.salvarValorInicial(id, valor)) {
        ui.fecharModalEspecifico(elements.modalValorInicialCiclo);
      }
    });
  }

  if (elements.containerCiclosTracker) {
    elements.containerCiclosTracker.addEventListener("click", (e) => {
      const btnTransfer = e.target.closest(".btn-transfer");
      const btnRemove = e.target.closest(".btn-remove-item-tracker");

      if (btnTransfer) {
        const { transId, currentCiclo } = btnTransfer.dataset;
        tracker.transferirItem(transId, currentCiclo);
      } else if (btnRemove) {
        const { transId } = btnRemove.dataset;
        tracker.removerItemDoTracker(transId);
      }
    });
  }

  window.trackerMod = {
    abrirConfig: (id) => {
      const ciclo = state.ciclosTracker.find((c) => c.id === id);
      if (ciclo) {
        elements.cicloEditIdInput.value = ciclo.id;
        elements.dataInicioCicloInput.value = ciclo.dataInicio;
        elements.dataFimCicloInput.value = ciclo.dataFim;
        elements.metaCicloInput.value = ciclo.metaTotal;
        elements.modalConfigCicloTitulo.textContent = "Editar Dados do Ciclo";
        ui.abrirModalEspecifico(elements.modalConfigCiclo);
      }
    },
    abrirValorInicial: (id, valorAtual) => {
      elements.cicloValorInicialIdInput.value = id;
      elements.valorInicialCicloInput.value = valorAtual;
      ui.abrirModalEspecifico(elements.modalValorInicialCiclo);
    },
    encerrarCiclo: (id) => tracker.encerrarCiclo(id),
    abrirNovoCiclo: () => {
      const ativos = state.ciclosTracker.filter((c) => c.status === "ativo");
      if (ativos.length >= 2) {
        alert(
          "Você já possui 2 ciclos ativos (Principal e Transição). Encerre o mais antigo antes de abrir um novo.",
        );
        return;
      }
      elements.cicloEditIdInput.value = "";
      elements.dataInicioCicloInput.value = "";
      elements.dataFimCicloInput.value = "";
      elements.metaCicloInput.value = "";
      elements.modalConfigCicloTitulo.textContent = "Abrir Novo Ciclo";
      ui.abrirModalEspecifico(elements.modalConfigCiclo);
    },
  };
}); // Fim do DOMContentLoaded
