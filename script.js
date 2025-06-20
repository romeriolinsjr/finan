// script.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("Meu Controle Financeiro - JS Carregado");

    const CHAVE_TRANSACOES = 'meuControleFinanceiro_transacoes';
    const CHAVE_CARTOES = 'meuControleFinanceiro_cartoes';
    const CHAVE_AJUSTES = 'meuControleFinanceiro_ajustes';
    const CHAVE_ORCAMENTOS = 'meuControleFinanceiro_orcamentos';
    const CHAVE_ORCAMENTOS_FECHADOS = 'meuControleFinanceiro_orcamentos_fechados';

    // --- Constantes da Aplicação ---
    const CONSTS = {
        TIPO_TRANSACAO: {
            RECEITA: 'receita',
            DESPESA: 'despesa'
        },
        CATEGORIA_DESPESA: {
            ORDINARIA: 'ordinaria',
            CARTAO_CREDITO: 'cartao_credito'
        },
        FREQUENCIA: {
            UNICA: 'unica',
            RECORRENTE: 'recorrente',
            PARCELADA: 'parcelada'
        },
        CADASTRO_PARCELA: {
            VALOR_TOTAL: 'valor_total',
            VALOR_PARCELA: 'valor_parcela'
        },
        ACAO_SERIE: {
            EXCLUIR: 'excluir',
            EDITAR: 'editar'
        },
        TIPO_RENDERIZACAO: {
            RECEITA: 'receita_individual',
            DESPESA: 'despesa_ordinaria',
            FATURA: 'fatura_cartao',
            ORCAMENTO: 'orcamento'
        },
        RECORRENCIA_MESES: 24,
    };

    // --- Elementos do DOM ---
    const loadingSpinnerOverlay = document.getElementById('loading-spinner-overlay'); // NOVO
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const modalOverlay = document.getElementById('modalOverlay');
    const bodyEl = document.body;
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');
    const totalReceitasDisplay = document.getElementById('totalReceitas');
    const totalDespesasDisplay = document.getElementById('totalDespesas');
    const saldoMesDisplay = document.getElementById('saldoMes');
    const listaTransacoesUl = document.getElementById('listaTransacoes');
    
    // NOVO: Elementos da busca
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    const modalNovaTransacao = document.getElementById('modalNovaTransacao');
    const btnAbrirModalNovaTransacao = document.getElementById('btnNovaTransacao');
    const tipoTransacaoSelect = document.getElementById('tipoTransacao');
    const nomeTransacaoInput = document.getElementById('nomeTransacao');
    const passo2Container = document.getElementById('passo2Container');
    const btnAvancarTransacao = document.getElementById('btnAvancarTransacao');
    const btnVoltarTransacao = document.getElementById('btnVoltarTransacao');
    const btnSalvarTransacao = document.getElementById('btnSalvarTransacao');
    const modalHeaderNovaTransacao = document.getElementById('modalNovaTransacaoTitulo');
    
    const btnGerenciarCartoes = document.getElementById('btnGerenciarCartoes');
    const modalGerenciarCartoes = document.getElementById('modalGerenciarCartoes');
    const btnAbrirModalCadastroCartao = document.getElementById('btnAbrirModalCadastroCartao');
    const listaCartoesCadastradosUl = document.getElementById('listaCartoesCadastrados');
    
    const btnMenuOrcamentos = document.getElementById('btnMenuOrcamentos');
    const modalCadastrarCartao = document.getElementById('modalCadastrarCartao');
    const modalCartaoTitulo = document.getElementById('modalCartaoTitulo');
    const nomeCartaoInputModal = document.getElementById('nomeCartao');
    const diaVencimentoFaturaInputModal = document.getElementById('diaVencimentoFatura');
    const btnSalvarCartaoModalBtn = document.getElementById('btnSalvarCartaoModal');
    const cartaoEditIdInput = document.getElementById('cartaoEditId');
    const modalDetalhesFaturaCartao = document.getElementById('modalDetalhesFaturaCartao');
    const faturaCartaoNomeTitulo = document.getElementById('faturaCartaoNomeTitulo');
    const faturaCartaoTotalValor = document.getElementById('faturaCartaoTotalValor');
    const faturaCartaoDataVencimento = document.getElementById('faturaCartaoDataVencimento');
    const listaComprasFaturaCartaoUl = document.getElementById('listaComprasFaturaCartao');
    const btnAddDespesaFromFatura = document.getElementById('btnAddDespesaFromFatura');
    const btnAjustesFatura = document.getElementById('btnAjustesFatura');
    const btnFaturaAnterior = document.getElementById('btnFaturaAnterior');
    const btnFaturaProxima = document.getElementById('btnFaturaProxima');
    const quickAddFeedback = document.getElementById('quickAddFeedback');   
    const modalOrcamentos = document.getElementById('modalOrcamentos');
    const modalOrcamentoTitulo = document.getElementById('modalOrcamentoTitulo');
    const orcamentoEditIdInput = document.getElementById('orcamentoEditId');
    const nomeOrcamentoInput = document.getElementById('nomeOrcamento');
    const valorOrcamentoInput = document.getElementById('valorOrcamento');
    const diaOrcamentoInput = document.getElementById('diaOrcamento');
    const btnSalvarOrcamento = document.getElementById('btnSalvarOrcamento');
    const listaOrcamentosUl = document.getElementById('listaOrcamentos');

    const modalDetalhesOrcamento = document.getElementById('modalDetalhesOrcamento');
    const orcamentoDetalhesTitulo = document.getElementById('orcamentoDetalhesTitulo');
    const orcamentoDetalhesTotal = document.getElementById('orcamentoDetalhesTotal');
    const orcamentoDetalhesGasto = document.getElementById('orcamentoDetalhesGasto');
    const orcamentoDetalhesRestante = document.getElementById('orcamentoDetalhesRestante');
    const listaGastosOrcamento = document.getElementById('listaGastosOrcamento');

    const modalAjustesFatura = document.getElementById('modalAjustesFatura');
    const modalAjustesFaturaTitulo = document.getElementById('modalAjustesFaturaTitulo');
    const descricaoAjusteInput = document.getElementById('descricaoAjuste');
    const valorAjusteInput = document.getElementById('valorAjuste');
    const btnSalvarAjuste = document.getElementById('btnSalvarAjuste');
    const listaAjustesFaturaUl = document.getElementById('listaAjustesFatura');
    const totalAjustesValorSpan = document.getElementById('totalAjustesValor');

    const modalConfirmarAcaoSerie = document.getElementById('modalConfirmarAcaoSerie');
    const modalConfirmarAcaoSerieTitulo = document.getElementById('modalConfirmarAcaoSerieTitulo');
    const modalConfirmarAcaoSerieTexto = document.getElementById('modalConfirmarAcaoSerieTexto');
    const btnAcaoSerieApenasEsta = document.getElementById('btnAcaoSerieApenasEsta');
    const btnAcaoSerieToda = document.getElementById('btnAcaoSerieToda');
    
    // --- Elementos do DOM - Relatórios ---
    const btnRelatorios = document.getElementById('btnRelatorios');
    const modalRelatorios = document.getElementById('modalRelatorios');
    const relatorioTitulo = document.getElementById('relatorioTitulo');
    const relatorioCorpo = document.getElementById('relatorioCorpo');
    const btnRelatorioAnterior = document.getElementById('btnRelatorioAnterior');
    const btnRelatorioProximo = document.getElementById('btnRelatorioProximo');
    // --- Estado da Aplicação ---
let currentDate = new Date();
let reportDate = new Date(); // Para controlar o mês do relatório
let userAguardandoVerificacao = null; // Guarda o usuário que acabou de se cadastrar
let isDuringRegistration = false; // NOVO: Impede a tela errada de piscar durante o cadastro
let transacoes = inicializarTransacoes();
    let cartoes = inicializarCartoes();
    let ajustesFatura = inicializarAjustes();
    let orcamentos = inicializarOrcamentos();
    let orcamentosFechados = inicializarOrcamentosFechados();
    let currentFaturaDate = null;
    let currentModalStep = 1;
    let isEditMode = false;
    let editingTransactionId = null;
    let editingSerieId = null;
    let isCartaoEditMode = false;
    let isQuickAddMode = false;
        // --- Conexão com o Firebase ---
    // ATENÇÃO: Substitua o objeto abaixo pelo SEU objeto de configuração que você copiou do Firebase.
    const firebaseConfig = {
        apiKey: "AIzaSyBTx-q8xsQcqVfo03bFyqoMtfQaSua_fy4",
        authDomain: "meu-controle-financeiro-8922a.firebaseapp.com",
        projectId: "meu-controle-financeiro-8922a",
        storageBucket: "meu-controle-financeiro-8922a.firebasestorage.app",
        messagingSenderId: "696910887824",
        appId: "1:696910887824:web:210ce8f444fc8139a49115"
    };

    // Inicializa o Firebase com a configuração do seu projeto
    firebase.initializeApp(firebaseConfig);

    // Cria "atalhos" para os serviços de Autenticação e Banco de Dados (Firestore)
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Variável para guardar informações do usuário quando ele estiver logado
    let currentUser = null; 

    // --- Elementos do DOM - Autenticação ---
const modalAuth = document.getElementById('modalAuth');
const modalAuthTitulo = document.getElementById('modalAuthTitulo');
const authFeedback = document.getElementById('authFeedback');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const btnAuthAction = document.getElementById('btnAuthAction');
const btnToggleAuthMode = document.getElementById('btnToggleAuthMode');
const btnLogout = document.getElementById('btnLogout');
const btnResendVerification = document.getElementById('btnResendVerification');
// NOVOS ELEMENTOS PARA O MODAL DE VERIFICAÇÃO
const modalVerificacaoEmail = document.getElementById('modalVerificacaoEmail');
const btnIrParaLogin = document.getElementById('btnIrParaLogin');
const btnReenviarVerificacaoModal = document.getElementById('btnReenviarVerificacaoModal');

// NOVOS ELEMENTOS DO RODAPÉ DA BARRA LATERAL
const sidebarFooter = document.querySelector('.sidebar-footer');
const lastUpdatedDisplay = document.getElementById('lastUpdatedDisplay');

// --- Estado da Autenticação ---
let isRegisterMode = false;

    // --- Lógica de Autenticação (O "Porteiro" do App) ---

// Esta função é o coração da autenticação. O Firebase a chama automaticamente.
auth.onAuthStateChanged(async (user) => { // TORNADO ASYNC
    const appContainer = document.querySelector('.app-container');

    if (user) {
        // O USUÁRIO EXISTE. AGORA, VERIFICAMOS SE O E-MAIL FOI CONFIRMADO.
        
        if (user.emailVerified) {
            // 1. O USUÁRIO ESTÁ LOGADO E VERIFICADO
            console.log("Usuário verificado e logado:", user.email, "ID:", user.uid);
            currentUser = user; 
            isRegisterMode = false;

            modalAuth.style.display = 'none';
            appContainer.style.display = 'flex';

            sidebarFooter.style.display = 'block'; // Mostra o rodapé da barra lateral
            
            // NOVO: Busca o documento do usuário para ler a data da última modificação
            try {
                const userDocRef = db.collection('users').doc(currentUser.uid);
                const userDoc = await userDocRef.get();
                if (userDoc.exists) {
                    const lastModifiedTimestamp = userDoc.data().lastModified;
                    exibirDataUltimaAtualizacao(lastModifiedTimestamp); // Usa a nova função para exibir a data
                } else {
                    exibirDataUltimaAtualizacao(null); // Caso o documento não exista ainda
                }
            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);
                exibirDataUltimaAtualizacao(null);
            }
            
            hideSpinner(); // ESCONDE O SPINNER PARA MOSTRAR O APP
            inicializarErenderizarApp();

        } else if (!isDuringRegistration) { 
            // 2. O USUÁRIO TENTOU LOGAR, MAS NÃO VERIFICOU O E-MAIL
            console.log("Usuário logado, mas e-mail não verificado:", user.email);
            currentUser = user; 

            appContainer.style.display = 'none';
            showVerificationScreen(user);
            sidebarFooter.style.display = 'block'; // Mostra o rodapé mesmo na tela de verificação
            hideSpinner(); // ESCONDE O SPINNER PARA MOSTRAR A TELA DE VERIFICAÇÃO
        }

    } else {
        // 3. NINGUÉM ESTÁ LOGADO
        console.log("Nenhum usuário logado.");
        currentUser = null;
        isRegisterMode = false;

        appContainer.style.display = 'none';
        resetAuthModalUI(); 
        sidebarFooter.style.display = 'none'; // Esconde o rodapé quando deslogado
        
        hideSpinner(); // ESCONDE O SPINNER PARA MOSTRAR A TELA DE LOGIN

        transacoes = [];
        cartoes = [];
        orcamentos = [];
        ajustesFatura = [];
        orcamentosFechados = [];
        atualizarTudo();
    }
});

// Função para lidar com o clique no botão "Entrar" / "Cadastrar"
btnAuthAction.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        mostrarFeedbackAuth("Por favor, preencha o e-mail e a senha.", true);
        return;
    }

    if (isRegisterMode) {
        // MODO CADASTRO
        isDuringRegistration = true; // SINALIZADOR ATIVADO
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                console.log("Usuário cadastrado, enviando e-mail de verificação para:", user.email);
                
                userAguardandoVerificacao = user;
                
                return user.sendEmailVerification().then(() => {
                    return auth.signOut();
                });
            })
            .then(() => {
                fecharModalEspecifico(modalAuth); 
                abrirModalEspecifico(modalVerificacaoEmail);
                isDuringRegistration = false; // SINALIZADOR DESATIVADO
            })
            .catch(error => {
                console.error("Erro ao cadastrar:", error.message);
                mostrarFeedbackAuth(traduzirErroAuth(error.code), true);
                isDuringRegistration = false; // SINALIZADOR DESATIVADO EM CASO DE ERRO
            });
    } else {
        // MODO LOGIN 
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log("Tentativa de login bem-sucedida para:", userCredential.user.email);
            })
            .catch(error => {
                console.error("Erro ao logar:", error.message);
                mostrarFeedbackAuth(traduzirErroAuth(error.code), true);
            });
    }
});

// Função para alternar entre as telas de Login e Cadastro
btnToggleAuthMode.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    resetAuthModalUI(); 
    btnToggleAuthMode.textContent = isRegisterMode ? "Já tem uma conta? Faça login" : "Não tem uma conta? Cadastre-se";
});

// Função para fazer logout
btnLogout.addEventListener('click', () => {
    if (confirm("Tem certeza que deseja sair?")) {
        auth.signOut().then(() => {
            console.log("Logout realizado com sucesso.");
        }).catch(error => {
            console.error("Erro ao fazer logout:", error);
        });
    }
});

// Listener para o botão de reenviar verificação (da tela de "verifique seu e-mail")
btnResendVerification.addEventListener('click', () => {
    if (currentUser) {
        currentUser.sendEmailVerification()
            .then(() => {
                mostrarFeedbackAuth("Um novo link de verificação foi enviado para o seu e-mail.", false);
            })
            .catch(error => {
                console.error("Erro ao reenviar e-mail de verificação:", error);
                mostrarFeedbackAuth("Ocorreu um erro ao reenviar o e-mail. Tente novamente mais tarde.", true);
            });
    }
});

// AÇÕES PARA OS BOTÕES DO MODAL DE VERIFICAÇÃO PÓS-CADASTRO - CORRIGIDAS
btnIrParaLogin.addEventListener('click', () => {
    fecharModalEspecifico(modalVerificacaoEmail);
    auth.signOut(); 
    isRegisterMode = false;
    resetAuthModalUI();
});

btnReenviarVerificacaoModal.addEventListener('click', () => {
    if (userAguardandoVerificacao) {
        userAguardandoVerificacao.sendEmailVerification()
            .then(() => {
                alert("Um novo e-mail de verificação foi enviado!");
            })
            .catch(error => {
                console.error("Erro ao reenviar e-mail:", error);
                alert("Ocorreu um erro ao reenviar o e-mail. Tente novamente.");
            });
    } else {
        alert("Não foi possível identificar o usuário. Por favor, tente fazer o login e reenviar pela tela de verificação.");
    }
});

    // Funções auxiliares para feedback e tradução de erros
    function mostrarFeedbackAuth(mensagem, isError = false) {
        authFeedback.textContent = mensagem;
        authFeedback.style.color = isError ? '#e74c3c' : '#27ae60';
        authFeedback.style.display = 'block';
    }

    function traduzirErroAuth(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'O formato do e-mail é inválido.';
        case 'auth/user-not-found':
            return 'E-mail não cadastrado.'; // MENSAGEM MAIS CLARA
        case 'auth/wrong-password':
            return 'Senha inválida. Tente novamente.'; // MENSAGEM MAIS CLARA
        case 'auth/email-already-in-use':
            return 'Este e-mail já está cadastrado.';
        case 'auth/weak-password':
            return 'A senha precisa ter no mínimo 6 caracteres.';
        default:
            // MENSAGEM PADRÃO MAIS ESPECÍFICA
            return 'Ocorreu um erro de autenticação. Tente novamente.';
    }
}

// NOVO: Funções para controlar a UI do modal de autenticação
function showVerificationScreen(user) {
    if (!user) return;
    
    modalAuth.style.display = 'flex';
    modalAuthTitulo.textContent = 'Verifique seu E-mail';
    
    // Esconde campos e botões de login/cadastro
    emailInput.parentElement.style.display = 'none';
    passwordInput.parentElement.style.display = 'none';
    btnAuthAction.style.display = 'none';
    btnToggleAuthMode.style.display = 'none';
    
    // Mostra mensagem e botões de verificação/logout
    mostrarFeedbackAuth(`Olá, ${user.email}! Um link de confirmação foi enviado para seu e-mail. Por favor, verifique sua caixa de entrada (e spam) para continuar.`, false);
    btnResendVerification.style.display = 'block';
    btnLogout.style.display = 'block';
}

function resetAuthModalUI() {
    modalAuth.style.display = 'flex';
    
    // Define o título e o texto do botão de ação com base no modo
    modalAuthTitulo.textContent = isRegisterMode ? "Cadastre-se" : "Login";
    btnAuthAction.textContent = isRegisterMode ? "Cadastrar" : "Entrar"; // CORREÇÃO APLICADA AQUI

    // Mostra campos e botões de login/cadastro
    emailInput.parentElement.style.display = 'block';
    passwordInput.parentElement.style.display = 'block';
    btnAuthAction.style.display = 'block';
    btnToggleAuthMode.style.display = 'block';

    // Esconde os de verificação
    btnResendVerification.style.display = 'none';
    authFeedback.style.display = 'none';
}

// --- NOVAS FUNÇÕES PARA CONTROLE DE "ÚLTIMA ATUALIZAÇÃO" ---

/**
 * Registra a data e hora atuais no documento do usuário no Firestore.
 * Deve ser chamada APÓS qualquer operação de escrita (criar, editar, excluir) bem-sucedida.
 */
async function registrarUltimaAlteracao() {
    if (!currentUser) return; // Segurança: não faz nada se não houver usuário

    try {
        const userDocRef = db.collection('users').doc(currentUser.uid);
        // Usa o timestamp do servidor para garantir a precisão, independente do relógio do cliente.
        // { merge: true } garante que não vamos apagar outros campos do documento do usuário.
        await userDocRef.set({
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log("Timestamp de última alteração registrado no Firestore.");

    } catch (error) {
        console.error("Erro ao registrar timestamp de última alteração:", error);
    }
}

/**
 * Exibe a data da última atualização na barra lateral.
 * @param {firebase.firestore.Timestamp} timestamp - O objeto de timestamp vindo do Firestore.
 */
function exibirDataUltimaAtualizacao(timestamp) {
    if (!lastUpdatedDisplay) return;

    if (timestamp && typeof timestamp.toDate === 'function') {
        const data = timestamp.toDate(); // Converte o timestamp do Firestore para um objeto Date do JS
        const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        lastUpdatedDisplay.textContent = `Atualizado em ${dataFormatada}, às ${horaFormatada.replace(':', 'h')}.`;
    } else {
        // Mensagem padrão se o usuário nunca fez uma alteração
        lastUpdatedDisplay.textContent = 'Nenhuma despesa registrada.';
    }
}

            // Função para configurar os "ouvintes" em tempo real do Firestore
    function carregarDadosDoFirestore() {
        if (!currentUser) return;

        console.log("Configurando ouvintes em tempo real para o usuário:", currentUser.uid);
        const userCollections = db.collection('users').doc(currentUser.uid);

        // --- Ouvinte para Transações ---
        userCollections.collection('transacoes').onSnapshot(snapshot => {
            transacoes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            console.log("Dados de 'transacoes' atualizados em tempo real.");
            updateMonthDisplay();
        }, error => console.error("Erro no ouvinte de transações:", error));

        // --- Ouvinte para Cartões ---
        userCollections.collection('cartoes').onSnapshot(snapshot => {
            cartoes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            console.log("Dados de 'cartoes' atualizados em tempo real.");
            updateMonthDisplay();
        }, error => console.error("Erro no ouvinte de cartões:", error));

        // --- Ouvinte para Orçamentos ---
        userCollections.collection('orcamentos').onSnapshot(snapshot => {
            orcamentos = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            console.log("Dados de 'orcamentos' atualizados em tempo real.");
            updateMonthDisplay();
        }, error => console.error("Erro no ouvinte de orçamentos:", error));

        // --- Ouvinte para Orçamentos Fechados ---
        userCollections.collection('orcamentosFechados').onSnapshot(snapshot => {
            orcamentosFechados = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            console.log("Dados de 'orcamentosFechados' atualizados em tempo real.");
            updateMonthDisplay();
        }, error => console.error("Erro no ouvinte de orçamentosFechados:", error));

        // --- Ouvinte para Ajustes de Fatura ---
        userCollections.collection('ajustesFatura').onSnapshot(snapshot => {
            ajustesFatura = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            console.log("Dados de 'ajustesFatura' atualizados em tempo real.");
            updateMonthDisplay();
        }, error => console.error("Erro no ouvinte de ajustesFatura:", error));
    }

    // Função para agrupar a inicialização do app (agora é 'async')
    async function inicializarErenderizarApp() {
        // Mostra um feedback de carregamento (opcional, mas bom para o usuário)
        currentMonthDisplay.textContent = 'Carregando dados...';
        listaTransacoesUl.innerHTML = '<li>Carregando...</li>';

        // 1. Substitui a leitura do LocalStorage pela busca no Firestore
        await carregarDadosDoFirestore();
        
        // 2. O resto da lógica continua a mesma, mas agora com os dados da nuvem
        verificarEGerarTransacoesFuturas(); // Gera transações recorrentes se necessário
        updateMonthDisplay(); // Renderiza a tela com os dados atualizados
    }

    // --- Funções de Persistência ---
    function salvarDadosNoLocalStorage() { try { localStorage.setItem(CHAVE_TRANSACOES, JSON.stringify(transacoes)); localStorage.setItem(CHAVE_CARTOES, JSON.stringify(cartoes)); localStorage.setItem(CHAVE_AJUSTES, JSON.stringify(ajustesFatura)); localStorage.setItem(CHAVE_ORCAMENTOS, JSON.stringify(orcamentos)); localStorage.setItem(CHAVE_ORCAMENTOS_FECHADOS, JSON.stringify(orcamentosFechados)); console.log("Dados salvos no LocalStorage."); } catch (error) { console.error("Erro ao salvar dados no LocalStorage:", error); } }
    function inicializarTransacoes() { const dadosSalvos = localStorage.getItem(CHAVE_TRANSACOES); if (dadosSalvos) { try { const transacoesSalvas = JSON.parse(dadosSalvos); return Array.isArray(transacoesSalvas) ? transacoesSalvas : []; } catch (e) { return []; } } return []; }
    function inicializarCartoes() { const dadosSalvos = localStorage.getItem(CHAVE_CARTOES); if (dadosSalvos) { try { const cartoesSalvos = JSON.parse(dadosSalvos); return Array.isArray(cartoesSalvos) ? cartoesSalvos.map(c => ({...c, vencimentoNoMesSeguinte: c.vencimentoNoMesSeguinte || false })) : []; } catch (e) { return []; } } return []; }
    function inicializarAjustes() { const dadosSalvos = localStorage.getItem(CHAVE_AJUSTES); if (dadosSalvos) { try { const ajustesSalvos = JSON.parse(dadosSalvos); return Array.isArray(ajustesSalvos) ? ajustesSalvos : []; } catch (e) { return []; } } return []; }
    function inicializarOrcamentos() { const dadosSalvos = localStorage.getItem(CHAVE_ORCAMENTOS); if (dadosSalvos) { try { const orcamentosSalvos = JSON.parse(dadosSalvos); return Array.isArray(orcamentosSalvos) ? orcamentosSalvos : []; } catch (e) { return []; } } return []; }
    function inicializarOrcamentosFechados() { const dadosSalvos = localStorage.getItem(CHAVE_ORCAMENTOS_FECHADOS); if (dadosSalvos) { try { const fechados = JSON.parse(dadosSalvos); return Array.isArray(fechados) ? fechados : []; } catch (e) { return []; } } return []; }

    // --- Funções de Utilidade ---
    function formatCurrency(value) { return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
    function getMesAnoChave(date) { const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); return `${year}-${month}`; }
    function parseDateString(dateString) { if (!dateString) return null; const parts = dateString.split('-'); if (parts.length === 2) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1); else if (parts.length === 3) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])); return null; }
    function calcularTotalAjustes(cartaoId, mesAno) { return ajustesFatura.filter(a => a.cartaoId === cartaoId && a.mesAnoReferencia === mesAno).reduce((total, a) => total + a.valor, 0); }
    function isOrcamentoFechado(orcamentoId, mesAno) { return orcamentosFechados.some(o => o.orcamentoId === orcamentoId && o.mesAno === mesAno); }
    
    // NOVO: Função para esconder o spinner de carregamento
    function hideSpinner() {
        if (loadingSpinnerOverlay) {
        loadingSpinnerOverlay.classList.add('hidden');
        }
    }

        // --- NOVAS FUNÇÕES DE BUSCA GLOBAL ---

    function executarBuscaGlobal(termo) {
        const termoBusca = termo.trim().toLowerCase();
        
        // Controla a visibilidade do botão de limpar
        clearSearchBtn.classList.toggle('visible', termoBusca.length > 0);

        if (termoBusca === '') {
            // Se a busca está vazia, volta para a visão normal do mês
            renderizarTransacoesDoMes();
            return;
        }

        // Filtra TODAS as transações, não apenas as do mês atual
        const resultados = transacoes.filter(t => 
            t.nome.toLowerCase().includes(termoBusca)
        );

        renderizarResultadosBusca(resultados, termoBusca);
    }

    function renderizarResultadosBusca(resultados, termoBusca) {
        listaTransacoesUl.innerHTML = '';

        if (resultados.length === 0) {
            const liEmpty = document.createElement('li');
            liEmpty.textContent = `Nenhum resultado encontrado para "${termoBusca}".`;
            liEmpty.style.textAlign = 'center';
            liEmpty.style.padding = '20px';
            liEmpty.style.color = '#777';
            listaTransacoesUl.appendChild(liEmpty);
            return;
        }
        
        // Ordena os resultados por data (do mais recente para o mais antigo)
        resultados.sort((a, b) => {
            const dataA = parseDateString(a.dataEntrada || a.dataVencimento || a.mesAnoReferencia);
            const dataB = parseDateString(b.dataEntrada || b.dataVencimento || b.mesAnoReferencia);
            return dataB - dataA;
        });

        resultados.forEach(t => {
            const li = document.createElement('li');
            li.className = 'search-result-item';

            const valorFormatado = t.tipo === 'receita' 
                ? `+ ${formatCurrency(t.valor)}` 
                : `- ${formatCurrency(t.valor)}`;
            
            const classeValor = t.tipo; // 'receita' ou 'despesa'

            // Cria o texto de contexto (mês/ano ou fatura)
            let contexto = '';
            const [ano, mes] = t.mesAnoReferencia.split('-');
            const nomeMes = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'short' });
            const contextoData = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano}`;

            if (t.categoria === 'cartao_credito') {
                const cartao = cartoes.find(c => c.id === t.cartaoId);
                const nomeCartao = cartao ? cartao.nome : 'Cartão Desconhecido';
                contexto = `Fatura ${nomeCartao} - ${contextoData}`;
            } else {
                contexto = contextoData;
            }

            li.innerHTML = `
                <div class="search-result-info">
                    <span class="result-name">${t.nome}</span>
                    <span class="result-context">${contexto}</span>
                </div>
                <span class="result-value ${classeValor}">${valorFormatado}</span>
            `;
            listaTransacoesUl.appendChild(li);
        });
    }

    // --- EVENTOS DA BUSCA ---
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            executarBuscaGlobal(searchInput.value);
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = ''; // Limpa o campo
            executarBuscaGlobal(''); // Executa a busca com termo vazio para restaurar a tela
            searchInput.focus(); // Devolve o foco ao campo de busca
        });
    }
    
    // --- Funções Principais de UI ---
    function updateMonthDisplay() {
        if (!currentMonthDisplay) return;
        const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
        const year = currentDate.getFullYear();
        currentMonthDisplay.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${year}`;
        
        const limitDate = new Date();
        limitDate.setMonth(limitDate.getMonth() + 6);
        nextMonthBtn.disabled = getMesAnoChave(currentDate) >= getMesAnoChave(limitDate);

        renderizarTransacoesDoMes();
    }
    
    // BLOCO 2 (para atualizarResumoFinanceiro)

// BLOCO PARA SUBSTITUIR A FUNÇÃO 'atualizarResumoFinanceiro'

function atualizarResumoFinanceiro() {
    if (!totalReceitasDisplay || !totalDespesasDisplay || !saldoMesDisplay) return;
    const mesAnoAtual = getMesAnoChave(currentDate);
    const transacoesDoMesReferencia = transacoes.filter(t => t.mesAnoReferencia === mesAnoAtual);
    
    let receitasDoMes = 0;
    let despesasDoMes = 0;

    // 1. Soma todas as receitas do mês
    receitasDoMes = transacoesDoMesReferencia
        .filter(t => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA)
        .reduce((total, t) => total + t.valor, 0);

    // 2. Soma as despesas que NÃO estão vinculadas a nenhum orçamento
    const despesasNaoOrcadas = transacoesDoMesReferencia
        .filter(t => t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA && !t.orcamentoId);
    despesasDoMes += despesasNaoOrcadas.reduce((total, t) => total + t.valor, 0);

    // 3. Soma o valor de CADA orçamento, usando a lógica de (valor planejado vs. gasto real)
    orcamentos.forEach(orcamento => {
        const gastosNesteOrcamento = transacoesDoMesReferencia
            .filter(t => t.orcamentoId === orcamento.id)
            .reduce((total, t) => total + t.valor, 0);

        if (isOrcamentoFechado(orcamento.id, mesAnoAtual)) {
            // Se o orçamento foi fechado, ele contribui com seu gasto real.
            despesasDoMes += gastosNesteOrcamento;
        } else {
            // Se está aberto, contribui com o valor que for maior: o planejado ou o gasto.
            despesasDoMes += Math.max(orcamento.valor, gastosNesteOrcamento);
        }
    });
    
    // 4. Subtrai o total de ajustes (cashback, etc.) do valor final das despesas.
    // Isso é feito aqui para não interferir na lógica de orçamento vs. gasto.
    const totalAjustesDoMes = ajustesFatura
        .filter(a => a.mesAnoReferencia === mesAnoAtual)
        .reduce((total, a) => total + a.valor, 0);
    despesasDoMes -= totalAjustesDoMes;
    
    // 5. Calcula e exibe o saldo final
    const saldoDoMes = receitasDoMes - despesasDoMes;
    totalReceitasDisplay.textContent = formatCurrency(receitasDoMes);
    totalDespesasDisplay.textContent = formatCurrency(despesasDoMes);
    saldoMesDisplay.textContent = formatCurrency(saldoDoMes);
    saldoMesDisplay.style.color = saldoDoMes > 0 ? '#27ae60' : (saldoDoMes < 0 ? '#e74c3c' : '#3498db');
}

    // --- Lógica de Modais ---
    function resetModalCartao() { if (!nomeCartaoInputModal || !diaVencimentoFaturaInputModal || !cartaoEditIdInput || !modalCartaoTitulo || !btnSalvarCartaoModalBtn) return; if (!isCartaoEditMode) { nomeCartaoInputModal.value = ''; diaVencimentoFaturaInputModal.value = ''; cartaoEditIdInput.value = ''; modalCartaoTitulo.textContent = "Cadastrar Novo Cartão"; btnSalvarCartaoModalBtn.textContent = "Salvar Cartão"; } }
        function abrirModalEspecifico(modalElement, idParaEditar = null, tipoModal = 'transacao') {
        if (!modalElement) return;
        if (tipoModal === 'transacao') {
            isEditMode = !!idParaEditar;
            editingTransactionId = idParaEditar;
            resetModalNovaTransacao();
            if (isEditMode) {
                preencherModalParaEdicao(editingTransactionId);
            } else {
                if (modalHeaderNovaTransacao) modalHeaderNovaTransacao.textContent = 'Nova Transação (Passo 1 de 2)';
            }
        } else if (tipoModal === 'cartaoCadastroEdicao') {
            isCartaoEditMode = !!idParaEditar;
            resetModalCartao();
            if (isCartaoEditMode) {
                cartaoEditIdInput.value = idParaEditar;
                preencherModalEdicaoCartao(idParaEditar);
            }
        } else if (tipoModal === 'gerenciarCartoes') {
            renderizarListaCartoesCadastrados();
        } else if (tipoModal === 'orcamentos') {
            renderizarListaOrcamentos();
                 } else if (tipoModal === 'relatorios') {
            // Sincroniza a data do relatório com a data principal ao abrir
            reportDate = new Date(currentDate);
            popularModalRelatorio(reportDate);
        }
        modalElement.style.display = 'flex';
        // Adiciona a classe ao body para travar a rolagem da página principal
        bodyEl.classList.add('modal-aberto');
    }
    
        function fecharModalEspecifico(modalElement) {
        if (!modalElement) return;
        modalElement.style.display = 'none';
        // Remove a classe do body para restaurar a rolagem da página principal
        bodyEl.classList.remove('modal-aberto');
        if (modalElement.id === 'modalNovaTransacao') {
            isQuickAddMode = false;
            isEditMode = false;
            editingTransactionId = null;
            editingSerieId = null;
            if (tipoTransacaoSelect) tipoTransacaoSelect.disabled = false;
        } else if (modalElement.id === 'modalCadastrarCartao') {
            isCartaoEditMode = false;
            if (cartaoEditIdInput) cartaoEditIdInput.value = '';
        } else if (modalElement.id === 'modalDetalhesFaturaCartao') {
            if (listaComprasFaturaCartaoUl) listaComprasFaturaCartaoUl.innerHTML = '';
            currentFaturaDate = null;
        } else if (modalElement.id === 'modalGerenciarCartoes') {
            if (listaCartoesCadastradosUl) listaCartoesCadastradosUl.innerHTML = '';
        } else if (modalElement.id === 'modalDetalhesOrcamento') {
            if(listaGastosOrcamento) listaGastosOrcamento.innerHTML = '';
        } else if (modalElement.id === 'modalAjustesFatura') {
            if(listaAjustesFaturaUl) listaAjustesFaturaUl.innerHTML = '';
            if(descricaoAjusteInput) descricaoAjusteInput.value = '';
            if(valorAjusteInput) valorAjusteInput.value = '';
        } else if (modalElement.id === 'modalOrcamentos') {
            nomeOrcamentoInput.value = '';
            valorOrcamentoInput.value = '';
            diaOrcamentoInput.value = '';
            orcamentoEditIdInput.value = '';
            modalOrcamentoTitulo.textContent = "Gerenciar Orçamentos";
            btnSalvarOrcamento.textContent = "Salvar";
        }
    }
    document.querySelectorAll('.close-button, .close-button-footer').forEach(button => { button.addEventListener('click', () => { const modalId = button.dataset.modalId; const modalParaFechar = modalId ? document.getElementById(modalId) : button.closest('.modal'); if (modalParaFechar) fecharModalEspecifico(modalParaFechar); }); });
    window.addEventListener('click', (event) => { if (event.target.classList.contains('modal')) { fecharModalEspecifico(event.target); } });

    // --- Fluxo de Nova Transação ---
    function resetModalNovaTransacao() { if (!tipoTransacaoSelect || !nomeTransacaoInput || !passo2Container || !btnAvancarTransacao || !btnSalvarTransacao || !btnVoltarTransacao || !modalHeaderNovaTransacao) return; tipoTransacaoSelect.value = ""; nomeTransacaoInput.value = ""; tipoTransacaoSelect.parentElement.style.display = 'block'; nomeTransacaoInput.parentElement.style.display = 'block'; tipoTransacaoSelect.disabled = false; passo2Container.innerHTML = ""; passo2Container.style.display = 'none'; btnAvancarTransacao.style.display = 'inline-block'; btnSalvarTransacao.style.display = 'none'; btnVoltarTransacao.style.display = 'none'; if (isEditMode) {} else { modalHeaderNovaTransacao.textContent = 'Nova Transação (Passo 1 de 2)'; } if(quickAddFeedback) quickAddFeedback.style.display = 'none'; currentModalStep = 1; }
    function preencherModalParaEdicao(id) { if (!tipoTransacaoSelect || !nomeTransacaoInput || !modalHeaderNovaTransacao) return; const transacao = transacoes.find(t => t.id === id); if (!transacao) { console.error("Transação não encontrada para edição:", id); fecharModalEspecifico(modalNovaTransacao); return; } const nomeOriginal = transacao.serieId ? transacao.nome.replace(/\s\(\d+\/\d+\)$/, '').replace(/\s\(Recorrente\)$/, '') : transacao.nome; const nomeCurto = nomeOriginal.substring(0, 25) + (nomeOriginal.length > 25 ? '...' : ''); modalHeaderNovaTransacao.textContent = `Editar Transação: ${nomeCurto} (Passo 1)`; tipoTransacaoSelect.value = transacao.tipo; nomeTransacaoInput.value = nomeOriginal; tipoTransacaoSelect.disabled = true; }
    if (btnAbrirModalNovaTransacao) { btnAbrirModalNovaTransacao.addEventListener('click', () => abrirModalEspecifico(modalNovaTransacao, null, 'transacao')); }
    if (btnAvancarTransacao) { btnAvancarTransacao.addEventListener('click', () => { if (!tipoTransacaoSelect || !nomeTransacaoInput || !passo2Container || !btnAvancarTransacao || !btnVoltarTransacao || !btnSalvarTransacao || !modalHeaderNovaTransacao) return; const tipo = tipoTransacaoSelect.value; const nome = nomeTransacaoInput.value.trim(); if (!tipo) { alert("Por favor, selecione o tipo de transação."); tipoTransacaoSelect.focus(); return; } if (!nome) { alert("Por favor, informe o nome da transação."); nomeTransacaoInput.focus(); return; } tipoTransacaoSelect.parentElement.style.display = 'none'; nomeTransacaoInput.parentElement.style.display = 'none'; passo2Container.style.display = 'block'; btnAvancarTransacao.style.display = 'none'; btnVoltarTransacao.style.display = 'inline-block'; btnSalvarTransacao.style.display = 'inline-block'; currentModalStep = 2; const transacaoOriginal = isEditMode ? transacoes.find(t => t.id === editingTransactionId) : null; const nomeCurto = nome.substring(0, 25) + (nome.length > 25 ? '...' : ''); if (tipo === CONSTS.TIPO_TRANSACAO.RECEITA) { modalHeaderNovaTransacao.textContent = isEditMode ? `Editar Receita: ${nomeCurto} (Passo 2)` : 'Nova Receita (Passo 2 de 2)'; carregarFormularioReceita(transacaoOriginal); } else if (tipo === CONSTS.TIPO_TRANSACAO.DESPESA) { modalHeaderNovaTransacao.textContent = isEditMode ? `Editar Despesa: ${nomeCurto} (Passo 2)` : 'Nova Despesa (Passo 2 de 2)'; carregarFormularioDespesa(transacaoOriginal); } }); }
    if (btnVoltarTransacao) { btnVoltarTransacao.addEventListener('click', () => { if (!passo2Container || !tipoTransacaoSelect || !nomeTransacaoInput || !btnAvancarTransacao || !btnVoltarTransacao || !btnSalvarTransacao || !modalHeaderNovaTransacao) return; passo2Container.innerHTML = ""; passo2Container.style.display = 'none'; tipoTransacaoSelect.parentElement.style.display = 'block'; nomeTransacaoInput.parentElement.style.display = 'block'; btnAvancarTransacao.style.display = 'inline-block'; btnVoltarTransacao.style.display = 'none'; btnSalvarTransacao.style.display = 'none'; if (isEditMode && editingTransactionId) { const transacao = transacoes.find(t => t.id === editingTransactionId); if (transacao) { const nomeOriginal = transacao.serieId ? transacao.nome.replace(/\s\(\d+\/\d+\)$/, '').replace(/\s\(Recorrente\)$/, '') : transacao.nome; tipoTransacaoSelect.value = transacao.tipo; nomeTransacaoInput.value = nomeOriginal; const nomeCurto = nomeOriginal.substring(0, 25) + (nomeOriginal.length > 25 ? '...' : ''); modalHeaderNovaTransacao.textContent = `Editar Transação: ${nomeCurto} (Passo 1)`; } } else { modalHeaderNovaTransacao.textContent = 'Nova Transação (Passo 1 de 2)'; } currentModalStep = 1; }); }
   // BLOCO DE CÓDIGO PARA SUBSTITUIR AS 4 FUNÇÕES DE CARREGAMENTO DE FORMULÁRIO

function carregarFormularioReceita(transacao = null) {
    const hoje = new Date().toISOString().split('T')[0];
    const template = document.getElementById('template-form-receita');
    const clone = template.content.cloneNode(true);

    // Preenche os títulos e valores
    clone.querySelector('.form-title-action').textContent = isEditMode ? 'Editando' : 'Nova';
    clone.querySelector('.form-title-name').textContent = `${nomeTransacaoInput.value.substring(0, 30)}${nomeTransacaoInput.value.length > 30 ? '...' : ''}`;
    clone.querySelector('#valorReceita').value = (transacao && typeof transacao.valor !== 'undefined') ? transacao.valor : '';
    const dataEntradaInput = clone.querySelector('#dataEntradaReceita');
    dataEntradaInput.value = (transacao && transacao.dataEntrada) ? transacao.dataEntrada : hoje;

    const freqSelect = clone.querySelector('#frequenciaReceita');
    freqSelect.querySelector(`option[value="${CONSTS.FREQUENCIA.UNICA}"]`).value = CONSTS.FREQUENCIA.UNICA;
    freqSelect.querySelector(`option[value="${CONSTS.FREQUENCIA.RECORRENTE}"]`).value = CONSTS.FREQUENCIA.RECORRENTE;

    if (transacao && transacao.frequencia) {
        freqSelect.value = transacao.frequencia;
    }
        // CORREÇÃO: Desabilita a alteração de frequência em QUALQUER modo de edição.
    if (isEditMode) {
        freqSelect.disabled = true;
        freqSelect.insertAdjacentHTML('afterend', '<small class="form-note">A frequência não pode ser alterada em uma transação existente.</small>');
    }
    if (editingSerieId) {
        dataEntradaInput.disabled = true;
        dataEntradaInput.insertAdjacentHTML('afterend', '<small class="form-note">Data de início não pode ser alterada ao editar uma série.</small>');
    }
    
    passo2Container.innerHTML = '';
    passo2Container.appendChild(clone);
}

function carregarFormularioDespesa(transacao = null) {
    const template = document.getElementById('template-form-despesa');
    const clone = template.content.cloneNode(true);

    // Preenche os títulos
    clone.querySelector('.form-title-action').textContent = isEditMode ? 'Editando' : 'Nova';
    clone.querySelector('.form-title-name').textContent = `${nomeTransacaoInput.value.substring(0, 30)}${nomeTransacaoInput.value.length > 30 ? '...' : ''}`;
    
    // Configura os valores corretos para as options do select de categoria
    const categoriaSelect = clone.querySelector('#categoriaDespesa');
    categoriaSelect.querySelector(`option[value="${CONSTS.CATEGORIA_DESPESA.ORDINARIA}"]`).value = CONSTS.CATEGORIA_DESPESA.ORDINARIA;
    categoriaSelect.querySelector(`option[value="${CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO}"]`).value = CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO;
    
    const formCamposAdicionaisContainer = clone.querySelector('#formCamposAdicionaisDespesa');
    
    if (transacao && transacao.categoria) {
        categoriaSelect.value = transacao.categoria;
    }

    categoriaSelect.addEventListener('change', (e) => {
        const categoriaSelecionada = e.target.value;
        formCamposAdicionaisContainer.innerHTML = '';
        const transacaoParaSubForm = (isEditMode && editingTransactionId && transacao && categoriaSelecionada === transacao.categoria) ? transacao : null;
        const nomeCurto = nomeTransacaoInput.value.substring(0, 25) + (nomeTransacaoInput.value.length > 25 ? '...' : '');

        if (categoriaSelecionada === CONSTS.CATEGORIA_DESPESA.ORDINARIA) {
            carregarFormularioDespesaOrdinaria(formCamposAdicionaisContainer, transacaoParaSubForm);
            modalHeaderNovaTransacao.textContent = isEditMode ? `Editar Desp. Ordinária: ${nomeCurto} (Passo 2)` : 'Nova Despesa Ordinária (Passo 2 de 2)';
        } else if (categoriaSelecionada === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO) {
            carregarFormularioDespesaCartao(formCamposAdicionaisContainer, transacaoParaSubForm);
            modalHeaderNovaTransacao.textContent = isEditMode ? `Editar Desp. Cartão: ${nomeCurto} (Passo 2)` : 'Nova Despesa Cartão (Passo 2 de 2)';
        } else {
            modalHeaderNovaTransacao.textContent = isEditMode ? `Editar Despesa: ${nomeCurto} (Passo 2)` : 'Nova Despesa (Passo 2 de 2)';
        }
    });

    passo2Container.innerHTML = '';
    passo2Container.appendChild(clone);

    if (transacao && transacao.categoria) {
        categoriaSelect.dispatchEvent(new Event('change'));
        if (isEditMode) {
            categoriaSelect.disabled = true;
            categoriaSelect.insertAdjacentHTML('afterend', '<small class="form-note">Categoria não pode ser alterada.</small>');
        }
    }
}

function carregarFormularioDespesaOrdinaria(container, transacao = null) {
    const hoje = new Date().toISOString().split('T')[0];
    const template = document.getElementById('template-form-despesa-ordinaria');
    const clone = template.content.cloneNode(true);

    const dataVencimentoInput = clone.querySelector('#dataVencimentoDespesaOrd');
    dataVencimentoInput.value = (transacao && transacao.dataVencimento) ? transacao.dataVencimento : hoje;

    // Elementos do formulário
    const frequenciaSelect = clone.querySelector('#frequenciaDespesaOrd');
    const valorUnicaRecorrenteInput = clone.querySelector('#valorDespesaOrdUnicaRecorrente');
    const valorParceladaInput = clone.querySelector('#valorDespesaOrdParcelada');
    const valorContainerOrdUnicaRecorrente = clone.querySelector('#valorContainerOrdUnicaRecorrente');
    const camposParceladaDiv = clone.querySelector('#camposParceladaOrd');
    const tipoCadastroParcelaSelect = clone.querySelector('#tipoCadastroParcelaOrd');
    const qtdParcelasInput = clone.querySelector('#qtdParcelasOrd');
    const parcelaAtualInput = clone.querySelector('#parcelaAtualOrd');

    // Preenche os valores se estiver em modo de edição
    if (transacao) {
        if (transacao.frequencia) frequenciaSelect.value = transacao.frequencia;
        if (transacao.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
            valorParceladaInput.value = transacao.valor || '';
            if (transacao.tipoCadastroParcela) tipoCadastroParcelaSelect.value = transacao.tipoCadastroParcela;
            if (transacao.totalParcelas) qtdParcelasInput.value = transacao.totalParcelas;
            if (transacao.parcelaAtual) parcelaAtualInput.value = transacao.parcelaAtual;
        } else {
            valorUnicaRecorrenteInput.value = transacao.valor || '';
        }
    }

    if (isEditMode) {
        frequenciaSelect.disabled = true;
        frequenciaSelect.insertAdjacentHTML('afterend', '<small class="form-note">A frequência não pode ser alterada.</small>');
        if (transacao?.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
            tipoCadastroParcelaSelect.disabled = true;
            qtdParcelasInput.disabled = true;
            parcelaAtualInput.disabled = true;
            camposParceladaDiv.insertAdjacentHTML('beforeend', '<small class="form-note">Detalhes do parcelamento não podem ser alterados.</small>');
        }
    }

    function toggleParceladaFieldsOrd() {
        const isParcelada = frequenciaSelect.value === CONSTS.FREQUENCIA.PARCELADA;
        camposParceladaDiv.style.display = isParcelada ? 'block' : 'none';
        valorContainerOrdUnicaRecorrente.style.display = isParcelada ? 'none' : 'block';

        // Atualiza os campos obrigatórios
        valorParceladaInput.required = isParcelada && !frequenciaSelect.disabled;
        valorUnicaRecorrenteInput.required = !isParcelada && !frequenciaSelect.disabled;
        
        if (isParcelada) {
            qtdParcelasInput.required = !frequenciaSelect.disabled;
            parcelaAtualInput.required = !frequenciaSelect.disabled;
        } else if (!isEditMode) {
            parcelaAtualInput.value = '1';
            qtdParcelasInput.value = '';
        }
    }
    
    toggleParceladaFieldsOrd();
    frequenciaSelect.addEventListener('change', toggleParceladaFieldsOrd);

    if (editingSerieId) {
        dataVencimentoInput.disabled = true;
        dataVencimentoInput.insertAdjacentHTML('afterend', '<small class="form-note">Data de início não pode ser alterada ao editar uma série.</small>');
    }

    container.innerHTML = '';
    container.appendChild(clone);
}

function carregarFormularioDespesaCartao(container, transacao = null, cartaoPredefinidoId = null) {
    if (!modalCadastrarCartao) return;
    const template = document.getElementById('template-form-despesa-cartao');
    const clone = template.content.cloneNode(true);
    
    const cartaoSelect = clone.querySelector('#cartaoDespesa');
    const orcamentoSelect = clone.querySelector('#orcamentoVinculado');
    
    // Preenche Select de Cartões
    let opcoesCartoes = '<option value="">-- Selecione --</option>';
    cartoes.forEach(cartao => { opcoesCartoes += `<option value="${cartao.id}">${cartao.nome}</option>`; });
    if (!(isEditMode && transacao?.cartaoId)) { opcoesCartoes += `<option value="novo_cartao">Cadastrar novo cartão...</option>`; }
    cartaoSelect.innerHTML = opcoesCartoes;
    
    // Preenche Select de Orçamentos
    let opcoesOrcamentos = '<option value="">Nenhum</option>';
    orcamentos.forEach(orc => { opcoesOrcamentos += `<option value="${orc.id}">${orc.nome}</option>`; });
    orcamentoSelect.innerHTML = opcoesOrcamentos;

    // Lógica de pré-seleção e preenchimento
    const cartaoSelecionadoId = cartaoPredefinidoId || (transacao ? transacao.cartaoId : null);
    if (cartaoSelecionadoId) cartaoSelect.value = cartaoSelecionadoId;
    if (transacao && transacao.orcamentoId) orcamentoSelect.value = transacao.orcamentoId;

    const cartaoSelectDisabled = (isEditMode && transacao?.cartaoId) || !!cartaoPredefinidoId;
    if(cartaoSelectDisabled) {
        cartaoSelect.disabled = true;
        cartaoSelect.insertAdjacentHTML('afterend', '<small class="form-note">Cartão não pode ser alterado.</small>');
    }

    const frequenciaSelect = clone.querySelector('#frequenciaDespesaCartao');
    const camposParcelamentoDiv = clone.querySelector('#camposParcelamentoCartao');
    const tipoCadastroParcelaSelect = clone.querySelector('#tipoCadastroParcelaCartao');
    const valorDespesaCartaoParceladaInput = clone.querySelector('#valorDespesaCartaoParcelada');
    const qtdParcelasInput = clone.querySelector('#qtdParcelasCartao');
    const parcelaAtualInput = clone.querySelector('#parcelaAtualCartao');
    const valorContainerCartaoUnicaRecorrente = clone.querySelector('#valorContainerCartaoUnicaRecorrente');

    if (transacao) {
        if (transacao.frequencia) frequenciaSelect.value = transacao.frequencia;
        if (transacao.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
            if (transacao.tipoCadastroParcela) tipoCadastroParcelaSelect.value = transacao.tipoCadastroParcela;
            if (typeof transacao.valor !== 'undefined') valorDespesaCartaoParceladaInput.value = transacao.valor;
            if (transacao.totalParcelas) qtdParcelasInput.value = transacao.totalParcelas;
            if (transacao.parcelaAtual) parcelaAtualInput.value = transacao.parcelaAtual;
        } else {
            if (valorContainerCartaoUnicaRecorrente.querySelector('input') && typeof transacao.valor !== 'undefined') {
                valorContainerCartaoUnicaRecorrente.querySelector('input').value = transacao.valor;
            }
        }
    }
    
    if (isEditMode && (transacao?.frequencia === CONSTS.FREQUENCIA.PARCELADA || transacao?.frequencia === CONSTS.FREQUENCIA.RECORRENTE)) {
        frequenciaSelect.disabled = true;
        frequenciaSelect.insertAdjacentHTML('afterend', '<small class="form-note">Frequência não pode ser alterada.</small>');
        if (transacao?.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
            tipoCadastroParcelaSelect.disabled = true;
            qtdParcelasInput.disabled = true;
            parcelaAtualInput.disabled = true;
            camposParcelamentoDiv.insertAdjacentHTML('beforeend', '<small class="form-note">Detalhes do parcelamento (exceto valor) não podem ser alterados.</small>');
        }
    }

    function toggleCamposCartao() {
        const frequencia = frequenciaSelect.value;
        const isParcelada = frequencia === CONSTS.FREQUENCIA.PARCELADA;
        camposParcelamentoDiv.style.display = isParcelada ? 'block' : 'none';
        valorContainerCartaoUnicaRecorrente.style.display = isParcelada ? 'none' : 'block';
        valorDespesaCartaoParceladaInput.required = isParcelada && !frequenciaSelect.disabled;
        valorContainerCartaoUnicaRecorrente.querySelector('input').required = !isParcelada && !frequenciaSelect.disabled;
        if (isParcelada) {
            qtdParcelasInput.required = !frequenciaSelect.disabled;
            parcelaAtualInput.required = !frequenciaSelect.disabled;
        }
    }
    toggleCamposCartao();
    frequenciaSelect.addEventListener('change', toggleCamposCartao);
    
    cartaoSelect.addEventListener('change', (e) => {
        if (e.target.value === 'novo_cartao' && !isEditMode) {
            abrirModalEspecifico(modalCadastrarCartao, null, 'cartaoCadastroEdicao');
            e.target.value = "";
        }
    });

    container.innerHTML = '';
    container.appendChild(clone);
}

    function resetFormParaNovaDespesaCartao() { if (!passo2Container || !nomeTransacaoInput || !quickAddFeedback) return; nomeTransacaoInput.value = ''; const frequenciaSelect = passo2Container.querySelector('#frequenciaDespesaCartao'); if (frequenciaSelect) { frequenciaSelect.value = CONSTS.FREQUENCIA.UNICA; frequenciaSelect.dispatchEvent(new Event('change')); } const valorUnicaRecorrenteInput = passo2Container.querySelector('#valorDespesaCartaoUnicaRecorrente'); if (valorUnicaRecorrenteInput) valorUnicaRecorrenteInput.value = ''; const valorParceladaInput = passo2Container.querySelector('#valorDespesaCartaoParcelada'); if (valorParceladaInput) valorParceladaInput.value = ''; const qtdParcelasInput = passo2Container.querySelector('#qtdParcelasCartao'); if (qtdParcelasInput) qtdParcelasInput.value = ''; const parcelaAtualInput = passo2Container.querySelector('#parcelaAtualCartao'); if (parcelaAtualInput) parcelaAtualInput.value = '1'; const orcamentoSelect = passo2Container.querySelector('#orcamentoVinculado'); if (orcamentoSelect) orcamentoSelect.value = ''; quickAddFeedback.textContent = 'Despesa salva! Adicione a próxima.'; quickAddFeedback.style.display = 'block'; setTimeout(() => { quickAddFeedback.style.display = 'none'; }, 2500); nomeTransacaoInput.focus(); }
// BLOCO DE CÓDIGO PARA SUBSTITUIR O LISTENER DE 'btnSalvarTransacao' (VERSÃO EM PORTUGUÊS)

// --- Novas Funções Auxiliares para Salvar Transação ---

function obterDadosDoFormulario() {
    const dados = {
        nomeBase: nomeTransacaoInput.value.trim(),
        tipo: tipoTransacaoSelect.value,
    };

    if (dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA) {
        dados.valor = parseFloat(passo2Container.querySelector('#valorReceita').value) || 0;
        dados.dataEntrada = passo2Container.querySelector('#dataEntradaReceita').value;
        dados.frequencia = passo2Container.querySelector('#frequenciaReceita').value;
    } else if (dados.tipo === CONSTS.TIPO_TRANSACAO.DESPESA) {
        dados.categoria = passo2Container.querySelector('#categoriaDespesa').value;

        if (dados.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA) {
            dados.dataVencimento = passo2Container.querySelector('#dataVencimentoDespesaOrd').value;
            dados.frequencia = passo2Container.querySelector('#frequenciaDespesaOrd').value;
            
            if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
                dados.valor = parseFloat(passo2Container.querySelector('#valorDespesaOrdParcelada').value) || 0;
                dados.tipoCadastroParcela = passo2Container.querySelector('#tipoCadastroParcelaOrd').value;
                dados.totalParcelas = parseInt(passo2Container.querySelector('#qtdParcelasOrd').value);
                dados.parcelaAtual = parseInt(passo2Container.querySelector('#parcelaAtualOrd').value) || 1;
            } else {
                dados.valor = parseFloat(passo2Container.querySelector('#valorDespesaOrdUnicaRecorrente').value) || 0;
            }
        } else if (dados.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO) {
            dados.frequencia = passo2Container.querySelector('#frequenciaDespesaCartao').value;
            if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
                dados.valor = parseFloat(passo2Container.querySelector('#valorDespesaCartaoParcelada').value) || 0;
                dados.tipoCadastroParcela = passo2Container.querySelector('#tipoCadastroParcelaCartao').value;
                dados.totalParcelas = parseInt(passo2Container.querySelector('#qtdParcelasCartao').value);
                dados.parcelaAtual = parseInt(passo2Container.querySelector('#parcelaAtualCartao').value) || 1;
            } else {
                dados.valor = parseFloat(passo2Container.querySelector('#valorDespesaCartaoUnicaRecorrente').value) || 0;
            }
        const cartaoEl = passo2Container.querySelector('#cartaoDespesa');
            // Mantém o ID do cartão como string, que é o formato do Firestore.
            dados.cartaoId = cartaoEl.value; 
            dados.cartaoNome = cartaoEl.options[cartaoEl.selectedIndex].text;
            const orcamentoEl = passo2Container.querySelector('#orcamentoVinculado');
            // CORREÇÃO: Pega o ID do orçamento (string) diretamente, sem parseInt().
            dados.orcamentoId = orcamentoEl && orcamentoEl.value ? orcamentoEl.value : null;
        }
    }
    return dados;
}

function validarDadosDaTransacao(dados) {
    if (!dados.nomeBase) { alert("O nome da transação não pode ficar em branco."); return false; }
    if (!dados.tipo) { alert("O tipo de transação é obrigatório."); return false; }
    if (dados.valor <= 0) { alert("O valor deve ser maior que zero."); return false; }

    if (dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA && !dados.dataEntrada) {
        alert("Data de entrada é obrigatória."); return false;
    }
    if (dados.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA && !dados.dataVencimento) {
        alert("Data de vencimento é obrigatória."); return false;
    }
    
    // CORREÇÃO: A validação agora apenas checa se o campo 'cartaoId' não está vazio.
    // Como o ID é uma string, a verificação isNaN() foi removida.
    if (dados.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO && !dados.cartaoId) {
        alert("Selecione um cartão válido."); return false;
    }
    
    if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
        if (isNaN(dados.totalParcelas) || dados.totalParcelas < 1) {
            alert("Quantidade de parcelas inválida."); return false;
        }
        if (isNaN(dados.parcelaAtual) || dados.parcelaAtual < 1 || dados.parcelaAtual > dados.totalParcelas) {
            alert("Número da parcela atual inválido."); return false;
        }
    }
    return true;
}
// BLOCO CORRIGIDO PARA SUBSTITUIR A FUNÇÃO 'atualizarTransacaoExistente'

async function atualizarTransacaoExistente(dados) {
    if (!currentUser) {
        alert("Erro: Nenhum usuário logado.");
        return false;
    }

    // Prepara o objeto com os dados atualizados a serem salvos
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
        if (editingSerieId) {
            // ATUALIZAR UMA SÉRIE INTEIRA
            console.log("Atualizando toda a série no Firestore:", editingSerieId);
            const querySnapshot = await db.collection('users').doc(currentUser.uid).collection('transacoes').where('serieId', '==', editingSerieId).get();
            
            const batch = db.batch();
            querySnapshot.docs.forEach(doc => {
                const transacaoOriginal = doc.data();
                const nomeAtualizado = (transacaoOriginal.frequencia === CONSTS.FREQUENCIA.PARCELADA)
                    ? `${dados.nomeBase} (${transacaoOriginal.parcelaAtual}/${transacaoOriginal.totalParcelas})`
                    : dados.nomeBase;
                
                batch.update(doc.ref, { 
                    valor: dados.valor,
                    nome: nomeAtualizado
                    // Nota: Outros campos como data não são alterados em série na lógica atual.
                });
            });
            await batch.commit();
            console.log("Série atualizada com sucesso.");

        } else {
            // ATUALIZAR UMA ÚNICA TRANSAÇÃO
            const docRef = db.collection('users').doc(currentUser.uid).collection('transacoes').doc(editingTransactionId);
            await docRef.update(dadosParaAtualizar);
            console.log("Transação única atualizada no Firestore:", editingTransactionId);
        }
        return true;
    } catch (error) {
        console.error("Erro ao atualizar transação no Firestore:", error);
        alert("Ocorreu um erro ao atualizar a transação.");
        return false;
    }
}

async function adicionarNovasTransacoes(dados) {
    if (!currentUser) {
        alert("Erro: Nenhum usuário logado para salvar a transação.");
        return false;
    }

    let transacoesParaAdicionar = [];
    const mesAnoReferenciaBase = getMesAnoChave(currentDate);

    if (dados.frequencia === CONSTS.FREQUENCIA.RECORRENTE || dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
        // LÓGICA PARA SÉRIES (RECORRENTE/PARCELADA)
        const serieId = db.collection('users').doc().id; 
        
        const baseObject = { ...dados };
        delete baseObject.nomeBase;
        delete baseObject.id;

        if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
            const totalParcelas = dados.totalParcelas;
            let valorDaParcela = (dados.tipoCadastroParcela === CONSTS.CADASTRO_PARCELA.VALOR_TOTAL)
                ? parseFloat((dados.valor / totalParcelas).toFixed(2))
                : dados.valor;
            let parcelaInicial = dados.parcelaAtual || 1;

            for (let i = 0; i < (totalParcelas - parcelaInicial + 1); i++) {
                let dataTransacaoParcela = new Date(parseDateString(dados.dataEntrada || dados.dataVencimento));
                dataTransacaoParcela.setMonth(dataTransacaoParcela.getMonth() + i);
                let mesReferenciaParcela = new Date(currentDate);
                mesReferenciaParcela.setMonth(mesReferenciaParcela.getMonth() + i);

                transacoesParaAdicionar.push({
                    ...baseObject,
                    serieId: serieId,
                    valor: valorDaParcela,
                    parcelaAtual: parcelaInicial + i,
                    totalParcelas: totalParcelas,
                    dataVencimento: dados.tipo === CONSTS.TIPO_TRANSACAO.DESPESA ? dataTransacaoParcela.toISOString().split('T')[0] : null,
                    dataEntrada: dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA ? dataTransacaoParcela.toISOString().split('T')[0] : null,
                    mesAnoReferencia: getMesAnoChave(mesReferenciaParcela),
                    nome: `${dados.nomeBase} (${parcelaInicial + i}/${totalParcelas})`
                });
            }
        } else { // Lógica para RECORRENTE
            for (let i = 0; i < CONSTS.RECORRENCIA_MESES; i++) {
                let dataTransacaoRecorrente = new Date(parseDateString(dados.dataEntrada || dados.dataVencimento));
                dataTransacaoRecorrente.setMonth(dataTransacaoRecorrente.getMonth() + i);
                let mesReferenciaRecorrente = new Date(currentDate);
                mesReferenciaRecorrente.setMonth(mesReferenciaRecorrente.getMonth() + i);

                transacoesParaAdicionar.push({
                    ...baseObject,
                    serieId: serieId,
                    mesAnoReferencia: getMesAnoChave(mesReferenciaRecorrente),
                    dataEntrada: dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA ? dataTransacaoRecorrente.toISOString().split('T')[0] : null,
                    dataVencimento: dados.tipo === CONSTS.TIPO_TRANSACAO.DESPESA ? dataTransacaoRecorrente.toISOString().split('T')[0] : null,
                    nome: dados.nomeBase
                });
            }
        }
    } else { // Transação Única - LÓGICA CORRIGIDA E EXPLÍCITA
        
        const transacaoUnica = {
            // Informações base
            nome: dados.nomeBase,
            tipo: dados.tipo,
            frequencia: dados.frequencia,
            valor: dados.valor,
            paga: false,
            serieId: null,
            mesAnoReferencia: mesAnoReferenciaBase,
            // Informações condicionais (com valor padrão 'null')
            categoria: dados.categoria || null,
            dataEntrada: dados.dataEntrada || null,
            dataVencimento: dados.dataVencimento || null,
            cartaoId: dados.cartaoId || null,
            orcamentoId: dados.orcamentoId || null
        };
        
        transacoesParaAdicionar.push(transacaoUnica);
    }

    if (transacoesParaAdicionar.length > 0) {
        const batch = db.batch();
        const transacoesCollectionRef = db.collection('users').doc(currentUser.uid).collection('transacoes');

        transacoesParaAdicionar.forEach(transacao => {
            const newDocRef = transacoesCollectionRef.doc();
            batch.set(newDocRef, transacao);
        });

        try {
            await batch.commit();
            console.log(`${transacoesParaAdicionar.length} transação(ões) salvas no Firestore.`);
            return true;
        } catch (error) {
            console.error("Erro ao salvar transações em lote no Firestore:", error);
            alert("Ocorreu um erro ao salvar a transação. Tente novamente.");
            return false;
        }
    }
    return false;
}

// --- Listener do Botão Salvar (Refatorado e Assíncrono) ---
if (btnSalvarTransacao) {
    btnSalvarTransacao.addEventListener('click', async () => { // Adicionado 'async'
        const dadosFormulario = obterDadosDoFormulario();
        
        if (!validarDadosDaTransacao(dadosFormulario)) {
            return; 
        }

        let sucesso = false;
        if (isEditMode) {
            // AINDA USA A LÓGICA ANTIGA. VAMOS MUDAR DEPOIS.
            sucesso = await atualizarTransacaoExistente(dadosFormulario); 
        } else {
            // AGORA SALVA NO FIRESTORE
            sucesso = await adicionarNovasTransacoes(dadosFormulario);
        }

        if (sucesso) {
            // NOVO: Verifica se a operação foi em uma despesa para registrar a alteração
            if (dadosFormulario.tipo === CONSTS.TIPO_TRANSACAO.DESPESA) {
                await registrarUltimaAlteracao();
            }

            // O ouvinte do Firestore já cuidará de recarregar os dados, então não precisamos chamar inicializarErenderizarApp() aqui.
            
            if (isQuickAddMode && !isEditMode) {
                resetFormParaNovaDespesaCartao();
            } else {
                fecharModalEspecifico(modalNovaTransacao);
            }
        }
    });
}
        // --- Navegação e Ações na Lista ---
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            if (searchInput.value) {
                searchInput.value = '';
                clearSearchBtn.classList.remove('visible');
            }
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateMonthDisplay();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            if (searchInput.value) {
                searchInput.value = '';
                clearSearchBtn.classList.remove('visible');
            }
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateMonthDisplay();
        });
    }
    if (btnAddDespesaFromFatura) {
        btnAddDespesaFromFatura.addEventListener('click', () => {
            // CORREÇÃO: Removido o parseInt. O ID do cartão é uma string.
            const cartaoId = btnAddDespesaFromFatura.dataset.cartaoId;
            const cartaoNome = btnAddDespesaFromFatura.dataset.cartaoNome;
            if (cartaoId && cartaoNome) {
                fecharModalEspecifico(modalDetalhesFaturaCartao);
                abrirModalDespesaCartaoRapida(cartaoId, cartaoNome);
            }
        });
    }
        if (btnAjustesFatura) {
        btnAjustesFatura.addEventListener('click', () => {
            // CORREÇÃO: Removido o parseInt. O ID do cartão é uma string.
            const cartaoId = btnAjustesFatura.dataset.cartaoId;
            const mesAno = btnAjustesFatura.dataset.mesAnoReferencia;
            if (cartaoId && mesAno) {
                abrirModalAjustesFatura(cartaoId, mesAno);
            }
        });
    }
        if (btnFaturaAnterior) {
        btnFaturaAnterior.addEventListener('click', () => {
            if (!currentFaturaDate) return;
            currentFaturaDate.setMonth(currentFaturaDate.getMonth() - 1);
            
            // CORREÇÃO: Pega o ID do dataset do título do modal, sem parseInt.
            const cartaoId = faturaCartaoNomeTitulo.dataset.cartaoId;
            if (!cartaoId) {
                console.error("Não foi possível encontrar o ID do cartão para navegar a fatura.");
                return;
            }

            const novoMesAno = getMesAnoChave(currentFaturaDate);
            popularModalDetalhesFatura(cartaoId, novoMesAno);
        });
    }

    if (btnFaturaProxima) {
        btnFaturaProxima.addEventListener('click', () => {
            if (!currentFaturaDate) return;
            currentFaturaDate.setMonth(currentFaturaDate.getMonth() + 1);

            // CORREÇÃO: Pega o ID do dataset do título do modal, sem parseInt.
            const cartaoId = faturaCartaoNomeTitulo.dataset.cartaoId;
            if (!cartaoId) {
                console.error("Não foi possível encontrar o ID do cartão para navegar a fatura.");
                return;
            }

            const novoMesAno = getMesAnoChave(currentFaturaDate);
            popularModalDetalhesFatura(cartaoId, novoMesAno);
        });
    }
    
                        async function handleTransactionListClick(event, ulElement, isInModal = false) {
        const target = event.target;
        const button = target.closest('button');
        const listItem = target.closest('li.transaction-item');

        if (!listItem) return;

        // LÓGICA CENTRALIZADA: Verifica se o clique foi no botão de cadeado
        if (button && (button.classList.contains('btn-fechar-orcamento') || button.classList.contains('btn-abrir-orcamento'))) {
            await handleFecharAbrirOrcamento(button); // Chama a função correta
            return; // E para a execução aqui
        }

        // --- LÓGICA DO CHECKBOX ---
        if (target.type === 'checkbox') {
            event.stopPropagation();
            const marcarComoPaga = target.checked;
            const isFaturaCheckbox = target.classList.contains('fatura-checkbox');
            
            listItem.classList.toggle('paga', marcarComoPaga);
            const valueDateContainer = listItem.querySelector('.transaction-value-date');
            if (valueDateContainer) {
                const statusSpanExistente = valueDateContainer.querySelector('.status-paga');
                if (marcarComoPaga && !statusSpanExistente) {
                    const statusSpan = document.createElement('span');
                    statusSpan.classList.add('status-paga');
                    statusSpan.textContent = 'Paga';
                    valueDateContainer.appendChild(statusSpan);
                } else if (!marcarComoPaga && statusSpanExistente) {
                    statusSpanExistente.remove();
                }
            }

            if (isFaturaCheckbox) {
                const cartaoId = target.dataset.cartaoId;
                const mesAnoFatura = target.dataset.mesAnoFatura;
                atualizarStatusPagoFatura(cartaoId, mesAnoFatura, marcarComoPaga);
            } else {
                const transacaoId = target.dataset.transactionId;
                if (transacaoId) {
                    atualizarStatusPago(transacaoId, marcarComoPaga);
                }
            }
            return;
        }

        // --- AJUSTE DE VENCIMENTO DA FATURA ---
        const btnVencimento = target.closest('.btn-vencimento-adjust');
        if (btnVencimento) {
            event.stopPropagation();
            const cartaoId = btnVencimento.dataset.cartaoId;
            const cartao = cartoes.find(c => c.id === cartaoId);
            if (!cartao || !currentUser) return;
        
            const novoEstado = !cartao.vencimentoNoMesSeguinte;
            const msg = novoEstado 
                ? `Deseja configurar este cartão para que suas faturas sempre vençam no mês seguinte?\n\nEsta regra será aplicada a todos os meses.`
                : `Deseja reverter a regra e fazer com que as faturas deste cartão voltem a vencer no mês corrente?`;
        
            if (window.confirm(msg)) {
                try {
                    const cartaoRef = db.collection('users').doc(currentUser.uid).collection('cartoes').doc(cartaoId);
                    await cartaoRef.update({ vencimentoNoMesSeguinte: novoEstado });
                    console.log("Regra de vencimento do cartão atualizada no Firestore.");
                    // O ouvinte cuidará da atualização da tela
                } catch (error) {
                    console.error("Erro ao atualizar regra de vencimento:", error);
                    alert("Ocorreu um erro ao salvar a alteração.");
                }
            }
            return;
        }

        // --- LÓGICA DOS OUTROS BOTÕES ---
        if (!button) {
            if (listItem.classList.contains('orcamento')) {
                const orcamentoId = listItem.dataset.orcamentoId.replace('orcamento-', '');
                abrirModalDetalhesOrcamento(orcamentoId, getMesAnoChave(currentDate));
            }
            return;
        }
        
        if (button.classList.contains('btn-view-fatura')) {
            event.stopPropagation();
            const cartaoId = button.dataset.cartaoId;
            const mesAno = button.dataset.mesAnoFatura;
            if (cartaoId && mesAno) {
                abrirModalDetalhesFatura(cartaoId, mesAno);
            } else {
                console.error("Não foi possível obter cartaoId ou mesAno do botão da fatura.");
            }
            return;
        }
        
        const transacaoId = button.dataset.id;
        if (!transacaoId) return;

        const transacao = transacoes.find(t => t.id === transacaoId);
        if (!transacao) {
            console.error("Transação não encontrada no array local. ID:", transacaoId);
            return;
        }
        
        const isSerie = transacao.serieId;

        if (button.classList.contains('btn-delete')) {
            if (isSerie) {
                abrirModalConfirmarAcaoSerie(transacaoId, CONSTS.ACAO_SERIE.EXCLUIR);
            } else {
                if (window.confirm(`Tem certeza que deseja excluir "${transacao.nome}"?`)) {
                    await excluirTransacaoUnica(transacaoId, isInModal);
                }
            }
        } else if (button.classList.contains('btn-edit')) {
            if (isInModal) fecharModalEspecifico(modalDetalhesFaturaCartao);
            if (isSerie) {
                abrirModalConfirmarAcaoSerie(transacaoId, CONSTS.ACAO_SERIE.EDITAR);
            } else {
                abrirModalEspecifico(modalNovaTransacao, transacaoId, 'transacao');
            }
        }
    }
    if (listaTransacoesUl) { listaTransacoesUl.addEventListener('click', (event) => handleTransactionListClick(event, listaTransacoesUl, false)); }
    if (listaComprasFaturaCartaoUl) { listaComprasFaturaCartaoUl.addEventListener('click', (event) => handleTransactionListClick(event, listaComprasFaturaCartaoUl, true)); }
    function abrirModalConfirmarAcaoSerie(transacaoId, acao) { if (!modalConfirmarAcaoSerie) return; const transacao = transacoes.find(t => t.id === transacaoId); if (!transacao) return; modalConfirmarAcaoSerie.dataset.transacaoId = transacaoId; modalConfirmarAcaoSerie.dataset.serieId = transacao.serieId; modalConfirmarAcaoSerie.dataset.acao = acao; if (acao === CONSTS.ACAO_SERIE.EXCLUIR) { modalConfirmarAcaoSerieTitulo.textContent = "Excluir Transação em Série"; modalConfirmarAcaoSerieTexto.textContent = `Deseja excluir apenas a transação "${transacao.nome}" deste mês, ou todas as transações desta série?`; } else if (acao === CONSTS.ACAO_SERIE.EDITAR) { modalConfirmarAcaoSerieTitulo.textContent = "Editar Transação em Série"; modalConfirmarAcaoSerieTexto.textContent = `Deseja editar apenas esta transação, ou aplicar as alterações a todas as transações desta série?`; } modalConfirmarAcaoSerie.style.display = 'flex'; }
    if (btnAcaoSerieApenasEsta) {
        btnAcaoSerieApenasEsta.addEventListener('click', async () => { // Adicionado async
            // CORREÇÃO: Removemos o parseInt. O ID agora é tratado como string.
            const transacaoId = modalConfirmarAcaoSerie.dataset.transacaoId; 
            const acao = modalConfirmarAcaoSerie.dataset.acao;
            fecharModalEspecifico(modalConfirmarAcaoSerie);

            if (acao === CONSTS.ACAO_SERIE.EXCLUIR) {
                // A função de exclusão já é async
                await excluirTransacaoUnica(transacaoId);
            } else if (acao === CONSTS.ACAO_SERIE.EDITAR) {
                // A edição de uma única instância não precisa da série
                editingSerieId = null; 
                abrirModalEspecifico(modalNovaTransacao, transacaoId, 'transacao');
            }
        });
    }        if (btnAcaoSerieToda) {
        btnAcaoSerieToda.addEventListener('click', async () => { // Adicionado async
            const transacaoId = modalConfirmarAcaoSerie.dataset.transacaoId;
            const serieId = modalConfirmarAcaoSerie.dataset.serieId; // serieId é uma string, não precisa de parseFloat
            const acao = modalConfirmarAcaoSerie.dataset.acao;
            fecharModalEspecifico(modalConfirmarAcaoSerie);

            if (!currentUser) { alert("Erro: Nenhum usuário logado."); return; }
            if (!serieId) { alert("Erro: ID da série não encontrado."); return; }

            if (acao === CONSTS.ACAO_SERIE.EXCLUIR) {
                const transacaoModelo = transacoes.find(t => t.id === transacaoId);
                
                console.log("Excluindo toda a série:", serieId);
                const querySnapshot = await db.collection('users').doc(currentUser.uid).collection('transacoes').where('serieId', '==', serieId).get();
                
                const batch = db.batch();
                querySnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref); // Adiciona cada exclusão ao lote
                });

                try {
                    await batch.commit(); // Executa a exclusão em lote
                    
                    // NOVO: Só registra se a série for de despesas
                    if (transacaoModelo && transacaoModelo.tipo === CONSTS.TIPO_TRANSACAO.DESPESA) {
                        await registrarUltimaAlteracao();
                    }

                    alert("Toda a série de transações foi excluída.");
                    // O ouvinte do Firestore cuidará de recarregar os dados.
                } catch (error) {
                    console.error("Erro ao excluir série de transações:", error);
                    alert("Ocorreu um erro ao excluir a série.");
                }

            } else if (acao === CONSTS.ACAO_SERIE.EDITAR) {
                editingSerieId = serieId;
                abrirModalEspecifico(modalNovaTransacao, transacaoId, 'transacao');
            }
        });
    }
        async function excluirTransacaoUnica(transacaoId, isInModal = false) {
        if (!currentUser) {
            alert("Erro: Nenhum usuário logado.");
            return;
        }

        try {
            const transacao = transacoes.find(t => t.id === transacaoId);

            // Deleta o documento específico no Firestore
            await db.collection('users').doc(currentUser.uid).collection('transacoes').doc(transacaoId).delete();
            console.log("Transação única excluída do Firestore:", transacaoId);
            
            // NOVO: Só registra se a transação excluída for uma despesa
            if (transacao && transacao.tipo === CONSTS.TIPO_TRANSACAO.DESPESA) {
                await registrarUltimaAlteracao();
            }

            // Atualiza a tela após a exclusão
            if (isInModal && modalDetalhesFaturaCartao && modalDetalhesFaturaCartao.style.display === 'flex') {
                const cartaoIdDetalhes = faturaCartaoNomeTitulo ? parseInt(faturaCartaoNomeTitulo.dataset.cartaoId) : null;
                const mesAnoDetalhes = faturaCartaoNomeTitulo ? faturaCartaoNomeTitulo.dataset.mesAno : null;
                // Recarrega os dados para atualizar o modal da fatura
                await inicializarErenderizarApp();
                if (cartaoIdDetalhes && mesAnoDetalhes) popularModalDetalhesFatura(cartaoIdDetalhes, mesAnoDetalhes);
            } else {
                await inicializarErenderizarApp();
            }
        } catch (error) {
            console.error("Erro ao excluir transação no Firestore:", error);
            alert("Ocorreu um erro ao excluir a transação.");
        }
    }
    function atualizarTudo() { renderizarTransacoesDoMes(); salvarDadosNoLocalStorage(); }
    // --- Fatura do Cartão, Renderização e Gestão de Dados ---
    function abrirModalDetalhesFatura(cartaoId, mesAnoFatura) {
        currentFaturaDate = parseDateString(mesAnoFatura);
        popularModalDetalhesFatura(cartaoId, mesAnoFatura);
        abrirModalEspecifico(modalDetalhesFaturaCartao, null, 'detalhesFatura');
    }
        function popularModalDetalhesFatura(cartaoId, mesAnoFatura) {
        if (!faturaCartaoNomeTitulo || !faturaCartaoTotalValor || !faturaCartaoDataVencimento || !listaComprasFaturaCartaoUl || !btnAddDespesaFromFatura || !btnAjustesFatura) return;
        
        // CORREÇÃO: Comparação de ID como string
        const cartao = cartoes.find(c => c.id === cartaoId);
        if (!cartao) {
            console.error("Cartão não encontrado para detalhes:", cartaoId);
            faturaCartaoNomeTitulo.textContent = "Cartão não encontrado";
            listaComprasFaturaCartaoUl.innerHTML = '<li>Ocorreu um erro ao carregar os detalhes.</li>';
            return;
        }

        btnAddDespesaFromFatura.dataset.cartaoId = cartao.id;
        btnAddDespesaFromFatura.dataset.cartaoNome = cartao.nome;
        btnAjustesFatura.dataset.cartaoId = cartao.id;
        btnAjustesFatura.dataset.mesAnoReferencia = mesAnoFatura;
        faturaCartaoNomeTitulo.dataset.cartaoId = cartaoId;
        faturaCartaoNomeTitulo.dataset.mesAno = mesAnoFatura;
        faturaCartaoNomeTitulo.textContent = `Fatura ${cartao.nome} - ${mesAnoFatura.substring(5, 7)}/${mesAnoFatura.substring(0, 4)}`;

        const [ano, mes] = mesAnoFatura.split('-').map(Number);
        const dataVenc = new Date(ano, mes - 1, cartao.diaVencimentoFatura);
        faturaCartaoDataVencimento.textContent = dataVenc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // CORREÇÃO: A comparação `t.cartaoId === cartaoId` agora funciona (string com string)
        const comprasDaFatura = transacoes.filter(t => 
            t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO && 
            t.cartaoId === cartaoId && 
            t.mesAnoReferencia === mesAnoFatura
        );

        const ajustesDaFatura = ajustesFatura.filter(a => a.cartaoId === cartaoId && a.mesAnoReferencia === mesAnoFatura);
        
        const totalFaturaBruto = comprasDaFatura.reduce((total, compra) => total + compra.valor, 0);
        const totalAjustes = ajustesDaFatura.reduce((total, ajuste) => total + ajuste.valor, 0);
        faturaCartaoTotalValor.textContent = formatCurrency(totalFaturaBruto - totalAjustes);

        let itensParaRenderizar = [
            ...comprasDaFatura.map(c => ({ ...c, renderType: 'compra' })),
            ...ajustesDaFatura.map(a => ({ ...a, renderType: 'ajuste' }))
        ];
        
                // Ordenação e renderização com novos critérios
        itensParaRenderizar.sort((a, b) => {
            // 1. Coloca os ajustes sempre no final
            if (a.renderType === 'ajuste' && b.renderType === 'compra') return 1;
            if (a.renderType === 'compra' && b.renderType === 'ajuste') return -1;
            if (a.renderType === 'ajuste' && b.renderType === 'ajuste') return 0;

            // 2. Ordena as compras por prioridade de frequência
            const prioridade = { [CONSTS.FREQUENCIA.RECORRENTE]: 1, [CONSTS.FREQUENCIA.PARCELADA]: 2, [CONSTS.FREQUENCIA.UNICA]: 3 };
            const prioridadeA = prioridade[a.frequencia] || 4;
            const prioridadeB = prioridade[b.frequencia] || 4;
            if (prioridadeA !== prioridadeB) {
                return prioridadeA - prioridadeB;
            }

            // 3. Critérios de desempate para cada frequência
            const valorA = a.valor || 0;
            const valorB = b.valor || 0;

            if (a.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
                // Para parceladas, ordena por parcelas restantes (as que terminam antes, primeiro)
                const restantesA = (a.totalParcelas || 0) - (a.parcelaAtual || 0);
                const restantesB = (b.totalParcelas || 0) - (b.parcelaAtual || 0);
                if (restantesA !== restantesB) {
                    return restantesA - restantesB;
                }
            } else {
                // Para recorrentes e únicas, ordena por valor (maior primeiro)
                if (valorA !== valorB) {
                    return valorB - valorA;
                }
            }
            
            // 4. Critério final de desempate: nome, em ordem alfabética
            return a.nome.localeCompare(b.nome);
        });        
        listaComprasFaturaCartaoUl.innerHTML = '';
        if (itensParaRenderizar.length === 0) {
            listaComprasFaturaCartaoUl.innerHTML = '<li>Nenhuma compra ou ajuste nesta fatura.</li>';
            return;
        }
        itensParaRenderizar.forEach(item => {
            const li = document.createElement('li');
            li.classList.add('transaction-item');
            if (item.renderType === 'compra') {
                li.dataset.transactionId = item.id;
                li.dataset.id = item.id;
                const detailsDiv = document.createElement('div');
                detailsDiv.classList.add('transaction-details');
                detailsDiv.innerHTML = `<span class="compra-nome">${item.nome}</span><span class="compra-valor">${formatCurrency(item.valor)}</span>`;
                const actionsDiv = document.createElement('div');
                actionsDiv.classList.add('transaction-actions');
                const editButton = document.createElement('button');
                editButton.classList.add('btn-edit');
                editButton.innerHTML = '✎';
                editButton.title = "Editar Compra";
                editButton.dataset.id = item.id;
                actionsDiv.appendChild(editButton);
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('btn-delete');
                deleteButton.innerHTML = '✖';
                deleteButton.title = "Excluir Compra";
                deleteButton.dataset.id = item.id;
                actionsDiv.appendChild(deleteButton);
                li.appendChild(detailsDiv);
                li.appendChild(actionsDiv);
            } else if (item.renderType === 'ajuste') {
                li.classList.add('ajuste-fatura-item');
                li.innerHTML = `<div class="transaction-details"><span class="compra-nome">${item.descricao}</span><span class="compra-valor">- ${formatCurrency(item.valor)}</span></div>`;
            }
            listaComprasFaturaCartaoUl.appendChild(li);
        });
    }
// BLOCO DE CÓDIGO PARA SUBSTITUIR A FUNÇÃO 'renderizarTransacoesDoMes' E ADICIONAR AS FUNÇÕES AUXILIARES

// --- Novas Funções Auxiliares de Renderização ---

function criarElementoReceita(item, actionsDiv) {
    const dataFormatada = item.dataEntrada ? new Date(parseDateString(item.dataEntrada)).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) : 'N/D';
    
    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.innerHTML = '✎';
    editButton.title = "Editar";
    editButton.dataset.id = item.id;
    actionsDiv.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.innerHTML = '✖';
    deleteButton.title = "Excluir";
    deleteButton.dataset.id = item.id;
    actionsDiv.appendChild(deleteButton);

    return `<span class="transaction-name">${item.nome}</span>
            <div class="transaction-value-date-group">
                <span class="transaction-value">${formatCurrency(item.valor)}</span>
                <span class="transaction-date">Entrada: ${dataFormatada}</span>
            </div>`;
}

function criarElementoDespesa(item, actionsDiv) {
    let categoriaDisplay = `(Ordinária${item.frequencia === CONSTS.FREQUENCIA.PARCELADA && item.totalParcelas ? ` - ${item.parcelaAtual || '?'}/${item.totalParcelas}` : ''})`;
    let nomeDisplay = item.nome;
    if (item.frequencia === CONSTS.FREQUENCIA.PARCELADA) { 
        nomeDisplay = item.nome.replace(/\s\(\d+\/\d+\)$/, ''); 
    }
    const dataFormatada = item.dataVencimento ? new Date(parseDateString(item.dataVencimento)).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) : 'N/D';

    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.innerHTML = '✎';
    editButton.title = "Editar";
    editButton.dataset.id = item.id;
    actionsDiv.appendChild(editButton);
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.innerHTML = '✖';
    deleteButton.title = "Excluir";
    deleteButton.dataset.id = item.id;
    actionsDiv.appendChild(deleteButton);

    return `<label class="transaction-main-info" for="despesa-${item.id}">
                <input type="checkbox" id="despesa-${item.id}" data-transaction-id="${item.id}" ${item.paga ? 'checked' : ''}>
                <div class="transaction-name-category">
                    <span class="transaction-name">${nomeDisplay}</span>
                    <span class="transaction-category">${categoriaDisplay}</span>
                </div>
            </label>
            <div class="transaction-value-date">
                <span class="transaction-value">- ${formatCurrency(item.valor)}</span>
                <span class="transaction-date">Venc: ${dataFormatada}</span>
                ${item.paga ? '<span class="status-paga">Paga</span>' : ''}
            </div>`;
}

function criarElementoFatura(item, actionsDiv) {
    const dataFormatada = item.dataVencimentoDisplay ? new Date(parseDateString(item.dataVencimentoDisplay)).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) : 'N/D';
    const btnAjusteHTML = `<button class="btn-vencimento-adjust ${item.vencimentoNoMesSeguinte ? 'ativo' : ''}" data-cartao-id="${item.cartaoId}" title="Ajustar mês de vencimento">🗓️</button>`;

    const viewButton = document.createElement('button');
    viewButton.className = 'btn-view-fatura';
    viewButton.innerHTML = '👁️';
    viewButton.title = "Ver Detalhes da Fatura";
    viewButton.dataset.cartaoId = item.cartaoId;
    viewButton.dataset.mesAnoFatura = item.mesAnoReferencia;
    actionsDiv.appendChild(viewButton);

    return `<label class="transaction-main-info" for="fatura-check-${item.cartaoId}">
                <input type="checkbox" id="fatura-check-${item.cartaoId}" class="fatura-checkbox" data-cartao-id="${item.cartaoId}" data-mes-ano-fatura="${item.mesAnoReferencia}" ${item.paga ? 'checked' : ''}>
                <div class="transaction-name-category">
                    <span class="transaction-name">${item.nome}</span>
                    <span class="transaction-category">(Fatura do Cartão)</span>
                </div>
            </label>
            <div class="transaction-value-date">
                <span class="transaction-value">- ${formatCurrency(item.valor)}</span>
                <div class="fatura-date-container">
                    <span class="transaction-date">Venc: ${dataFormatada}</span>
                    ${btnAjusteHTML}
                </div>
                ${item.paga ? '<span class="status-paga">Paga</span>' : ''}
            </div>`;
}

function criarElementoOrcamento(item, actionsDiv) {
    const mesAnoAtual = getMesAnoChave(currentDate);
    const fechado = isOrcamentoFechado(item.orcamentoId, mesAnoAtual);
    const classeRestante = item.valor < 0 ? 'negativo' : '';

    const actionButton = document.createElement('button');
    if (fechado) {
        actionButton.className = 'btn-abrir-orcamento';
        actionButton.innerHTML = '🔓';
        actionButton.title = "Reabrir orçamento do mês";
    } else {
        actionButton.className = 'btn-fechar-orcamento';
        actionButton.innerHTML = '🔒';
        actionButton.title = "Fechar orçamento do mês";
    }
    actionButton.dataset.orcamentoId = item.orcamentoId;
    actionButton.dataset.mesAno = mesAnoAtual;
    actionsDiv.appendChild(actionButton);
    
    return `<div class="transaction-main-info">
                <div class="transaction-name-category">
                    <span class="transaction-name">${item.nome}</span>
                    <span class="transaction-category">(Orçamento)</span>
                </div>
            </div>
            <div class="transaction-value-date">
                <span class="transaction-value">- ${formatCurrency(item.valorTotalOrcamento)}</span>
                <span class="orcamento-restante ${classeRestante}">Restante: ${formatCurrency(item.valor)}</span>
            </div>`;
}


// --- Função Principal de Renderização (Refatorada) ---
// BLOCO 1 (para renderizarTransacoesDoMes)

function renderizarTransacoesDoMes(filtro = '') {
    if (!listaTransacoesUl) return;
    listaTransacoesUl.innerHTML = '';
    const mesAnoAtual = getMesAnoChave(currentDate);

    // NOVO: Encontra o mês/ano da primeira transação já registrada
    let primeiroMesAnoComDados = null;
    if (transacoes.length > 0) {
        primeiroMesAnoComDados = transacoes.reduce((min, t) => t.mesAnoReferencia < min ? t.mesAnoReferencia : min, transacoes[0].mesAnoReferencia);
    }
    
    // NOVO: Se o mês atual for anterior ao primeiro mês com dados, exibe "Sem dados" e para.
    if (primeiroMesAnoComDados && mesAnoAtual < primeiroMesAnoComDados) {
        atualizarResumoFinanceiro(); // Limpa o resumo financeiro
        const liEmpty = document.createElement('li');
        liEmpty.textContent = "Sem dados para este período.";
        liEmpty.style.textAlign = 'center';
        liEmpty.style.padding = '20px';
        liEmpty.style.color = '#777';
        listaTransacoesUl.appendChild(liEmpty);
        return;
    }

    const transacoesDoMesVisivel = transacoes.filter(t => t.mesAnoReferencia === mesAnoAtual);
    let itensParaRenderizar = [];

    // Passo 1: Coletar todas as receitas
    const receitasDoMes = transacoesDoMesVisivel.filter(t => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA);
    receitasDoMes.forEach(r => itensParaRenderizar.push({ ...r, tipoDisplay: CONSTS.TIPO_RENDERIZACAO.RECEITA, dataOrdenacao: parseDateString(r.dataEntrada) }));
    
    // Passo 2: Coletar todas as despesas ordinárias
    const despesasOrdinariasDoMes = transacoesDoMesVisivel.filter(t => t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA && t.categoria === CONSTS.CATEGORIA_DESPESA.ORDINARIA);
    despesasOrdinariasDoMes.forEach(d => itensParaRenderizar.push({ ...d, tipoDisplay: CONSTS.TIPO_RENDERIZACAO.DESPESA, dataOrdenacao: parseDateString(d.dataVencimento) }));
    
    // Passo 3: Agrupar despesas de cartão em faturas
    const despesasCartaoDoMes = transacoesDoMesVisivel.filter(t => t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA && t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO);
    const faturasAgrupadas = {};
    despesasCartaoDoMes.forEach(dc => {
        if (!dc.cartaoId) return; 
        
        if (!faturasAgrupadas[dc.cartaoId]) { 
            const cartaoInfo = cartoes.find(c => c.id === dc.cartaoId) || {}; 
            faturasAgrupadas[dc.cartaoId] = { cartaoId: dc.cartaoId, cartaoNome: cartaoInfo.nome || "Cartão Desconhecido", diaVencimentoFatura: cartaoInfo.diaVencimentoFatura || 1, vencimentoNoMesSeguinte: cartaoInfo.vencimentoNoMesSeguinte || false, totalValor: 0, todasPagas: true }; 
        }
        faturasAgrupadas[dc.cartaoId].totalValor += dc.valor; 
        if (!dc.paga) faturasAgrupadas[dc.cartaoId].todasPagas = false; 
    });
        Object.values(faturasAgrupadas).forEach(fatura => {
        const [ano, mes] = mesAnoAtual.split('-').map(Number);
        const ajusteDeMes = fatura.vencimentoNoMesSeguinte ? 1 : 0;
        const dataVencimentoFatura = new Date(ano, (mes - 1) + ajusteDeMes, fatura.diaVencimentoFatura);
        const totalAjustes = calcularTotalAjustes(fatura.cartaoId, mesAnoAtual);
        const valorFinalFatura = fatura.totalValor - totalAjustes;
        
        itensParaRenderizar.push({ 
            id: fatura.cartaoId,
            tipoDisplay: CONSTS.TIPO_RENDERIZACAO.FATURA, 
            cartaoId: fatura.cartaoId, 
            nome: `Fatura ${fatura.cartaoNome}`, 
            valor: valorFinalFatura, 
            dataOrdenacao: dataVencimentoFatura, 
            dataVencimentoDisplay: dataVencimentoFatura.toISOString().split('T')[0], 
            paga: fatura.todasPagas, 
            mesAnoReferencia: mesAnoAtual, 
            vencimentoNoMesSeguinte: fatura.vencimentoNoMesSeguinte 
        });
    });
    
    // Passo 4: Coletar os orçamentos
    orcamentos.forEach(orcamento => {
        const [ano, mes] = mesAnoAtual.split('-').map(Number);
        const dataOrcamento = new Date(ano, mes - 1, orcamento.dia);
        const gastosNoOrcamento = transacoesDoMesVisivel.filter(t => t.orcamentoId === orcamento.id).reduce((total, t) => total + t.valor, 0);
        const valorRestante = orcamento.valor - gastosNoOrcamento;
        itensParaRenderizar.push({ id: `orcamento-${orcamento.id}`, orcamentoId: orcamento.id, tipoDisplay: CONSTS.TIPO_RENDERIZACAO.ORCAMENTO, nome: orcamento.nome, valor: valorRestante, valorTotalOrcamento: orcamento.valor, dataOrdenacao: dataOrcamento });
    });

    // NOVO: Aplica o filtro de busca, se houver
    if (filtro) {
        const filtroLowerCase = filtro.toLowerCase();
        itensParaRenderizar = itensParaRenderizar.filter(item => 
            item.nome.toLowerCase().includes(filtroLowerCase)
        );
    }
    
    // Passo 5: Ordenar a lista final
    const tipoPrioridade = { [CONSTS.TIPO_RENDERIZACAO.RECEITA]: 1, [CONSTS.TIPO_RENDERIZACAO.ORCAMENTO]: 2, [CONSTS.TIPO_RENDERIZACAO.DESPESA]: 3, [CONSTS.TIPO_RENDERIZACAO.FATURA]: 3 };
    itensParaRenderizar.sort((a, b) => {
        const prioridadeA = tipoPrioridade[a.tipoDisplay]; 
        const prioridadeB = tipoPrioridade[b.tipoDisplay];
        if (prioridadeA !== prioridadeB) { return prioridadeA - prioridadeB; }

        const dateA = a.dataOrdenacao instanceof Date ? a.dataOrdenacao : new Date(0);
        const dateB = b.dataOrdenacao instanceof Date ? b.dataOrdenacao : new Date(0);
        const dateComparison = dateA - dateB;
        if (dateComparison !== 0) {
            return dateComparison;
        }

        const valorA = a.valorTotalOrcamento || a.valor || 0;
        const valorB = b.valorTotalOrcamento || b.valor || 0;
        return valorB - valorA;
    });

    atualizarResumoFinanceiro();

    if (itensParaRenderizar.length === 0) { 
        const liEmpty = document.createElement('li'); 
        // Mensagem muda se o usuário estiver buscando algo
        liEmpty.textContent = filtro ? `Nenhum resultado para "${filtro}".` : "Nenhuma transação para este mês.";
        liEmpty.style.textAlign = 'center'; 
        liEmpty.style.padding = '20px'; 
        liEmpty.style.color = '#777'; 
        listaTransacoesUl.appendChild(liEmpty); 
        return; 
    }
    
    // Passo 7: Renderizar cada item usando as funções auxiliares
    itensParaRenderizar.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('transaction-item');
        
        const transactionDetailsDiv = document.createElement('div');
        transactionDetailsDiv.classList.add('transaction-details');

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('transaction-actions');
        
        switch (item.tipoDisplay) {
            case CONSTS.TIPO_RENDERIZACAO.RECEITA:
                li.classList.add('receita');
                li.dataset.transactionId = item.id;
                transactionDetailsDiv.innerHTML = criarElementoReceita(item, actionsDiv);
                break;
            case CONSTS.TIPO_RENDERIZACAO.DESPESA:
                li.classList.add('despesa');
                if (item.paga) li.classList.add('paga');
                li.dataset.transactionId = item.id;
                transactionDetailsDiv.innerHTML = criarElementoDespesa(item, actionsDiv);
                break;
            case CONSTS.TIPO_RENDERIZACAO.FATURA:
                li.classList.add('despesa', 'fatura-cartao');
                if (item.paga) li.classList.add('paga');
                li.dataset.cartaoId = item.cartaoId;
                li.dataset.mesAnoFatura = item.mesAnoReferencia;
                transactionDetailsDiv.innerHTML = criarElementoFatura(item, actionsDiv);
                break;
            case CONSTS.TIPO_RENDERIZACAO.ORCAMENTO:
                li.classList.add('orcamento');
                const mesAnoAtual = getMesAnoChave(currentDate);
                if (isOrcamentoFechado(item.orcamentoId, mesAnoAtual)) {
                    li.classList.add('fechado');
                }
                li.dataset.orcamentoId = item.id;
                transactionDetailsDiv.innerHTML = criarElementoOrcamento(item, actionsDiv);
                break;
        }
        
        li.appendChild(transactionDetailsDiv);
        li.appendChild(actionsDiv);
        listaTransacoesUl.appendChild(li);
    });
}
    // --- Lógica de Cartões, Ajustes e Gestão de Dados ---
    if (btnGerenciarCartoes) { btnGerenciarCartoes.addEventListener('click', () => { abrirModalEspecifico(modalGerenciarCartoes, null, 'gerenciarCartoes'); }); }
        if (btnAbrirModalCadastroCartao) {
        btnAbrirModalCadastroCartao.addEventListener('click', () => {
            fecharModalEspecifico(modalGerenciarCartoes);
            // "Avisa" ao modal de cadastro que ele deve voltar para o de gerenciamento
            modalCadastrarCartao.dataset.returnTo = 'modalGerenciarCartoes';
            abrirModalEspecifico(modalCadastrarCartao, null, 'cartaoCadastroEdicao');
        });
    }
                        if (btnSalvarCartaoModalBtn) {
        btnSalvarCartaoModalBtn.addEventListener('click', async () => {
            if (!currentUser) { alert("Erro: Nenhum usuário logado."); return; }

            const nome = nomeCartaoInputModal.value.trim();
            const diaVencimento = parseInt(diaVencimentoFaturaInputModal.value);

            if (!nome) { alert("Por favor, informe o nome do cartão."); nomeCartaoInputModal.focus(); return; }
            if (isNaN(diaVencimento) || diaVencimento < 1 || diaVencimento > 31) { alert("Por favor, informe um dia de vencimento válido (1-31)."); diaVencimentoFaturaInputModal.focus(); return; }

            try {
                if (isCartaoEditMode && cartaoEditIdInput.value) {
                    const cartaoId = cartaoEditIdInput.value;
                    const cartaoOriginal = cartoes.find(c => c.id === cartaoId);
                    const dadosCartao = {
                        nome: nome,
                        diaVencimentoFatura: diaVencimento,
                        vencimentoNoMesSeguinte: cartaoOriginal?.vencimentoNoMesSeguinte || false 
                    };
                    const cartaoRef = db.collection('users').doc(currentUser.uid).collection('cartoes').doc(cartaoId);
                    await cartaoRef.update(dadosCartao);
                    alert("Cartão atualizado com sucesso!");
                } else {
                    const dadosCartao = {
                        nome: nome,
                        diaVencimentoFatura: diaVencimento,
                        vencimentoNoMesSeguinte: false
                    };
                    await db.collection('users').doc(currentUser.uid).collection('cartoes').add(dadosCartao);
                    alert("Cartão cadastrado com sucesso!");
                }
                
                // NOVA LÓGICA DE RETORNO
                const returnToModalId = modalCadastrarCartao.dataset.returnTo;
                fecharModalEspecifico(modalCadastrarCartao);
                
                if (returnToModalId === 'modalGerenciarCartoes') {
                    abrirModalEspecifico(modalGerenciarCartoes, null, 'gerenciarCartoes');
                    // Limpa o dataset para não afetar outras aberturas
                    delete modalCadastrarCartao.dataset.returnTo;
                } else if (passo2Container.querySelector('#cartaoDespesa')) {
                     // Lógica para atualizar o select de cartões na tela de nova transação
                     const transacaoOriginal = isEditMode ? transacoes.find(t => t.id === editingTransactionId) : null;
                     const categoriaAtual = document.getElementById('categoriaDespesa')?.value;
                     if (categoriaAtual === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO) {
                         const formCamposAdicionais = passo2Container.querySelector('#formCamposAdicionaisDespesa');
                         if (formCamposAdicionais) carregarFormularioDespesaCartao(formCamposAdicionais, transacaoOriginal);
                     }
                }
            } catch (error) {
                console.error("Erro ao salvar cartão no Firestore:", error);
                alert("Ocorreu um erro ao salvar o cartão.");
            }
        });
    }
    function renderizarListaCartoesCadastrados() {
    if (!listaCartoesCadastradosUl) return;
    listaCartoesCadastradosUl.innerHTML = '';
    if (cartoes.length === 0) {
        listaCartoesCadastradosUl.innerHTML = '<li>Nenhum cartão cadastrado.</li>';
        return;
    }
    
    // NOVO: Cria uma cópia ordenada dos cartões pelo dia do vencimento
    const cartoesOrdenados = [...cartoes].sort((a, b) => a.diaVencimentoFatura - b.diaVencimentoFatura);

    // Usa a lista ordenada para renderizar
    cartoesOrdenados.forEach(cartao => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="cartao-info" data-id="${cartao.id}">
                <span class="cartao-nome">${cartao.nome}</span>
                <span class="cartao-vencimento">Venc. dia: ${cartao.diaVencimentoFatura}</span>
            </div>
            <div class="transaction-actions">
                <button class="btn-add-despesa-cartao" data-id="${cartao.id}" data-nome="${cartao.nome}" title="Adicionar Despesa neste Cartão">➕</button>
                <button class="btn-edit-cartao" data-id="${cartao.id}" title="Editar Cartão">✎</button>
                <button class="btn-delete-cartao" data-id="${cartao.id}" title="Excluir Cartão">✖</button>
            </div>`;
        listaCartoesCadastradosUl.appendChild(li);
    });
}
    function preencherModalEdicaoCartao(cartaoId) { const cartao = cartoes.find(c => c.id === cartaoId); if (cartao && modalCadastrarCartao) { if (modalCartaoTitulo) modalCartaoTitulo.textContent = "Editar Cartão"; if (nomeCartaoInputModal) nomeCartaoInputModal.value = cartao.nome; if (diaVencimentoFaturaInputModal) diaVencimentoFaturaInputModal.value = cartao.diaVencimentoFatura; if (btnSalvarCartaoModalBtn) btnSalvarCartaoModalBtn.textContent = "Salvar Alterações"; } }
    
    // ESTE BLOCO INTEIRO FOI ALTERADO PARA A VERSÃO ESTÁVEL
    if (listaCartoesCadastradosUl) {
        listaCartoesCadastradosUl.addEventListener('click', (event) => {
            const target = event.target;
            const addButton = target.closest('.btn-add-despesa-cartao');
            const editButton = target.closest('.btn-edit-cartao');
            const deleteButton = target.closest('.btn-delete-cartao');
            const infoDiv = target.closest('.cartao-info');

            if (infoDiv) {
                const cartaoId = infoDiv.dataset.id;
                if (!cartaoId) return;
                const mesAnoAtual = getMesAnoChave(currentDate);
                fecharModalEspecifico(modalGerenciarCartoes);
                abrirModalDetalhesFatura(cartaoId, mesAnoAtual);
                return;
            }
            if (addButton) {
                const cartaoId = addButton.dataset.id;
                const cartaoNome = addButton.dataset.nome;
                fecharModalEspecifico(modalGerenciarCartoes);
                abrirModalDespesaCartaoRapida(cartaoId, cartaoNome);
            } else if (editButton) {
                const cartaoId = editButton.dataset.id;
                fecharModalEspecifico(modalGerenciarCartoes);
                abrirModalEspecifico(modalCadastrarCartao, cartaoId, 'cartaoCadastroEdicao');
            } else if (deleteButton) {
                const cartaoId = deleteButton.dataset.id;
                const cartaoParaExcluir = cartoes.find(c => c.id === cartaoId);
                if (cartaoParaExcluir && window.confirm(`Tem certeza que deseja excluir o cartão "${cartaoParaExcluir.nome}"? Esta ação não pode ser desfeita.`)) {
                    
                    (async () => {
                        try {
                            if (!currentUser) { alert("Erro: Nenhum usuário logado."); return; }
                            await db.collection('users').doc(currentUser.uid).collection('cartoes').doc(cartaoId).delete();
                            
                            alert("Cartão excluído com sucesso.");
                            // O ouvinte cuidará de atualizar a tela
                            renderizarListaCartoesCadastrados();
                        } catch (error) {
                            console.error("Erro ao excluir cartão:", error);
                            alert("Ocorreu um erro ao excluir o cartão.");
                        }
                    })();
                }
            }
        });
    }
    function abrirModalDespesaCartaoRapida(cartaoId, cartaoNome) {
        resetModalNovaTransacao();
        isEditMode = false;
        editingTransactionId = null;
        isQuickAddMode = true;
        modalNovaTransacao.style.display = 'flex';
        modalHeaderNovaTransacao.textContent = `Nova Despesa para: ${cartaoNome}`;
        tipoTransacaoSelect.value = CONSTS.TIPO_TRANSACAO.DESPESA;
        tipoTransacaoSelect.disabled = true;
        tipoTransacaoSelect.parentElement.style.display = 'none';
        nomeTransacaoInput.parentElement.style.display = 'block';
        btnAvancarTransacao.style.display = 'none';
        btnVoltarTransacao.style.display = 'none';
        passo2Container.style.display = 'block';
        btnSalvarTransacao.style.display = 'inline-block';
        carregarFormularioDespesa();
        const categoriaSelect = passo2Container.querySelector('#categoriaDespesa');
        if (categoriaSelect) {
            categoriaSelect.value = CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO;
            categoriaSelect.dispatchEvent(new Event('change'));
            categoriaSelect.parentElement.style.display = 'none';
            const cartaoDespesaSelect = passo2Container.querySelector('#cartaoDespesa');
            if(cartaoDespesaSelect) {
                cartaoDespesaSelect.value = cartaoId;
                cartaoDespesaSelect.disabled = true;
                cartaoDespesaSelect.insertAdjacentHTML('afterend', '<small class="form-note">Cartão pré-selecionado.</small>');
            }
        }
        nomeTransacaoInput.focus();
    }
    function abrirModalAjustesFatura(cartaoId, mesAno) {
        if (!modalAjustesFatura) return;
        const cartao = cartoes.find(c => c.id === cartaoId);
        if (!cartao) return;
        modalAjustesFatura.dataset.cartaoId = cartaoId;
        modalAjustesFatura.dataset.mesAno = mesAno;
        modalAjustesFaturaTitulo.textContent = `Ajustes na Fatura ${cartao.nome}`;
        popularModalAjustes(cartaoId, mesAno);
        fecharModalEspecifico(modalDetalhesFaturaCartao);
        modalAjustesFatura.style.display = 'flex';
    }
    function popularModalAjustes(cartaoId, mesAno) {
        listaAjustesFaturaUl.innerHTML = '';
        const ajustesDoPeriodo = ajustesFatura.filter(a => a.cartaoId === cartaoId && a.mesAnoReferencia === mesAno);
        if (ajustesDoPeriodo.length === 0) {
            listaAjustesFaturaUl.innerHTML = '<li>Nenhum ajuste para esta fatura.</li>';
        } else {
            ajustesDoPeriodo.forEach(ajuste => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="ajuste-descricao">${ajuste.descricao}</span><span class="ajuste-valor">- ${formatCurrency(ajuste.valor)}</span><button class="btn-delete-ajuste" data-id="${ajuste.id}" title="Excluir Ajuste">✖</button>`;
                listaAjustesFaturaUl.appendChild(li);
            });
        }
        const totalAjustes = calcularTotalAjustes(cartaoId, mesAno);
        totalAjustesValorSpan.textContent = formatCurrency(totalAjustes);
    }
        if (btnSalvarAjuste) {
        btnSalvarAjuste.addEventListener('click', async () => { // Tornando a função assíncrona
            if (!currentUser) { alert("Erro: Você precisa estar logado."); return; }
            
            const descricao = descricaoAjusteInput.value.trim();
            const valor = parseFloat(valorAjusteInput.value);
            // CORREÇÃO: O ID do cartão e o mês/ano são strings
            const cartaoId = modalAjustesFatura.dataset.cartaoId;
            const mesAno = modalAjustesFatura.dataset.mesAno;

            if (!descricao) { alert("A descrição do ajuste é obrigatória."); descricaoAjusteInput.focus(); return; }
            if (isNaN(valor) || valor <= 0) { alert("O valor do ajuste deve ser um número positivo."); valorAjusteInput.focus(); return; }
            
            // O ID do ajuste será gerado automaticamente pelo Firestore
            const novoAjuste = {
                cartaoId: cartaoId,
                mesAnoReferencia: mesAno,
                descricao: descricao,
                valor: valor
            };

            try {
                // Adiciona o novo ajuste à coleção no Firestore
                const ajustesCollectionRef = db.collection('users').doc(currentUser.uid).collection('ajustesFatura');
                await ajustesCollectionRef.add(novoAjuste);
                
                console.log("Ajuste de fatura salvo com sucesso no Firestore.");

                // Limpa os campos para o próximo ajuste
                descricaoAjusteInput.value = '';
                valorAjusteInput.value = '';
                descricaoAjusteInput.focus();
                
                // O ouvinte em tempo real (`onSnapshot`) cuidará de atualizar a tela automaticamente.

            } catch (error) {
                console.error("Erro ao salvar ajuste no Firestore:", error);
                alert("Ocorreu um erro ao salvar o ajuste.");
            }
        });
    }
        if (listaAjustesFaturaUl) {
        listaAjustesFaturaUl.addEventListener('click', async (event) => { // Tornando a função assíncrona
            if (event.target.classList.contains('btn-delete-ajuste')) {
                if (!currentUser) { alert("Erro: Você precisa estar logado."); return; }

                // O ID do ajuste agora é uma string do Firestore
                const ajusteId = event.target.dataset.id;
                
                if (ajusteId && window.confirm("Tem certeza que deseja excluir este ajuste?")) {
                    try {
                        // Deleta o documento de ajuste diretamente no Firestore
                        const ajusteRef = db.collection('users').doc(currentUser.uid).collection('ajustesFatura').doc(ajusteId);
                        await ajusteRef.delete();

                        console.log("Ajuste excluído com sucesso do Firestore.");
                        // O ouvinte em tempo real cuidará de atualizar a lista.

                    } catch (error) {
                        console.error("Erro ao excluir ajuste no Firestore:", error);
                        alert("Ocorreu um erro ao excluir o ajuste.");
                    }
                }
            }
        });
    }
    
        // --- Lógica de Orçamentos ---
    if(btnMenuOrcamentos) {
        btnMenuOrcamentos.addEventListener('click', () => {
            abrirModalEspecifico(modalOrcamentos, null, 'orcamentos');
        });
    }
    if(btnRelatorios) {
        btnRelatorios.addEventListener('click', () => {
            abrirModalEspecifico(modalRelatorios, null, 'relatorios');
        });
    }
        if (btnRelatorioAnterior) {
        btnRelatorioAnterior.addEventListener('click', () => {
            reportDate.setMonth(reportDate.getMonth() - 1);
            popularModalRelatorio(reportDate);
        });
    }

    if (btnRelatorioProximo) {
        btnRelatorioProximo.addEventListener('click', () => {
            reportDate.setMonth(reportDate.getMonth() + 1);
            popularModalRelatorio(reportDate);
        });
    }
    function renderizarListaOrcamentos() {
    if (!listaOrcamentosUl) return;
    listaOrcamentosUl.innerHTML = '';
    if (orcamentos.length === 0) {
        listaOrcamentosUl.innerHTML = '<li>Nenhum orçamento cadastrado.</li>';
        return;
    }

    // NOVO: Cria uma cópia ordenada dos orçamentos por valor (maior primeiro)
    const orcamentosOrdenados = [...orcamentos].sort((a, b) => b.valor - a.valor);

    // Usa a lista ordenada para renderizar
    orcamentosOrdenados.forEach(orcamento => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="orcamento-info">
                <span class="orcamento-nome">${orcamento.nome}</span>
                <span class="orcamento-detalhes">${formatCurrency(orcamento.valor)} - Dia ${orcamento.dia}</span>
            </div>
            <div class="transaction-actions">
                <button class="btn-edit-orcamento" data-id="${orcamento.id}" title="Editar Orçamento">✎</button>
                <button class="btn-delete-orcamento" data-id="${orcamento.id}" title="Excluir Orçamento">✖</button>
            </div>`;
        listaOrcamentosUl.appendChild(li);
    });
}

    function abrirModalDetalhesOrcamento(orcamentoId, mesAno) {
        const orcamento = orcamentos.find(o => o.id === orcamentoId);
        if (!orcamento) {
            console.error("Orçamento não encontrado:", orcamentoId);
            return;
        }

        const gastosVinculados = transacoes.filter(t => t.orcamentoId === orcamentoId && t.mesAnoReferencia === mesAno);
        const totalGasto = gastosVinculados.reduce((total, gasto) => total + gasto.valor, 0);
        const valorRestante = orcamento.valor - totalGasto;

        orcamentoDetalhesTitulo.textContent = `Detalhes: ${orcamento.nome}`;
        orcamentoDetalhesTotal.textContent = formatCurrency(orcamento.valor);
        orcamentoDetalhesGasto.textContent = formatCurrency(totalGasto);
        orcamentoDetalhesRestante.textContent = formatCurrency(valorRestante);
        orcamentoDetalhesRestante.style.color = valorRestante >= 0 ? '#27ae60' : '#c0392b';

        listaGastosOrcamento.innerHTML = '';
        if (gastosVinculados.length === 0) {
            listaGastosOrcamento.innerHTML = '<li>Nenhum gasto vinculado neste mês.</li>';
        } else {
            gastosVinculados.forEach(gasto => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="gasto-nome">${gasto.nome}</span><span class="gasto-valor">${formatCurrency(gasto.valor)}</span>`;
                listaGastosOrcamento.appendChild(li);
            });
        }
        
        abrirModalEspecifico(modalDetalhesOrcamento, null, 'detalhesOrcamento');
    }

    function preencherModalEdicaoOrcamento(orcamentoId) {
        const orcamento = orcamentos.find(o => o.id === orcamentoId);
        if (!orcamento) return;
        
        orcamentoEditIdInput.value = orcamento.id;
        nomeOrcamentoInput.value = orcamento.nome;
        valorOrcamentoInput.value = orcamento.valor;
        diaOrcamentoInput.value = orcamento.dia;
        
        modalOrcamentoTitulo.textContent = 'Editar Orçamento';
        btnSalvarOrcamento.textContent = 'Salvar Alterações';
    }

    if(btnSalvarOrcamento) {
        btnSalvarOrcamento.addEventListener('click', async () => { // TORNADO ASSÍNCRONO
            if (!currentUser) { alert("Erro: Você precisa estar logado para salvar um orçamento."); return; }

            // CORREÇÃO: ID agora é uma string, não precisa de parseInt
            const id = orcamentoEditIdInput.value; 
            const nome = nomeOrcamentoInput.value.trim();
            const valor = parseFloat(valorOrcamentoInput.value);
            const dia = parseInt(diaOrcamentoInput.value);

            if (!nome) { alert("O nome do orçamento é obrigatório."); nomeOrcamentoInput.focus(); return; }
            if (isNaN(valor) || valor <= 0) { alert("O valor do orçamento deve ser um número positivo."); valorOrcamentoInput.focus(); return; }
            if (isNaN(dia) || dia < 1 || dia > 31) { alert("O dia deve ser entre 1 e 31."); diaOrcamentoInput.focus(); return; }

            try {
                if (id) { // Editando: O ID existe, então atualizamos o documento existente
                    const orcamentoRef = db.collection('users').doc(currentUser.uid).collection('orcamentos').doc(id);
                    await orcamentoRef.update({
                        nome: nome,
                        valor: valor,
                        dia: dia
                    });
                    alert("Orçamento atualizado com sucesso!");
                } else { // Criando: O ID está vazio, então criamos um novo documento
                    const orcamentosCollectionRef = db.collection('users').doc(currentUser.uid).collection('orcamentos');
                    await orcamentosCollectionRef.add({
                        nome: nome,
                        valor: valor,
                        dia: dia
                    });
                    alert("Orçamento cadastrado com sucesso!");
                }

                fecharModalEspecifico(modalOrcamentos);
                // ESTA LINHA FOI REMOVIDA POIS O OUVINTE JÁ ATUALIZA A TELA
                // await inicializarErenderizarApp(); 

            } catch (error) {
                console.error("Erro ao salvar orçamento no Firestore:", error);
                alert("Ocorreu um erro ao salvar o orçamento. Tente novamente.");
            }
        });
    }

    if(listaOrcamentosUl) {
        listaOrcamentosUl.addEventListener('click', async (e) => { // TORNADO ASSÍNCRONO
            const editButton = e.target.closest('.btn-edit-orcamento');
            const deleteButton = e.target.closest('.btn-delete-orcamento');

            if (editButton) {
                const orcamentoId = editButton.dataset.id;
                preencherModalEdicaoOrcamento(orcamentoId);
            } else if (deleteButton) {
                const orcamentoId = deleteButton.dataset.id;
                const orcamento = orcamentos.find(o => o.id === orcamentoId);
                if (orcamento && window.confirm(`Tem certeza que deseja excluir o orçamento "${orcamento.nome}"?`)) {
                    
                    if (!currentUser) { alert("Erro: Você precisa estar logado para excluir."); return; }

                    try {
                        // EXCLUI O DOCUMENTO DIRETAMENTE NO FIRESTORE
                        const orcamentoRef = db.collection('users').doc(currentUser.uid).collection('orcamentos').doc(orcamentoId);
                        await orcamentoRef.delete();
                        
                        alert("Orçamento excluído com sucesso.");
                        
                        // RECARREGA OS DADOS DA NUVEM PARA ATUALIZAR O APP
                        // await inicializarErenderizarApp(); // REMOVIDO
                        // ATUALIZA A LISTA DENTRO DO MODAL ABERTO
                        renderizarListaOrcamentos(); 

                    } catch (error) {
                        console.error("Erro ao excluir orçamento no Firestore:", error);
                        alert("Ocorreu um erro ao tentar excluir o orçamento.");
                    }
                }
            }
        });
    }

    // --- Função para gerar transações futuras na inicialização ---
    function verificarEGerarTransacoesFuturas() {
        const limitDate = new Date();
        limitDate.setMonth(limitDate.getMonth() + 6);
        const limitMesAno = getMesAnoChave(limitDate);
        let novasTransacoesGeradas = false;
        
        const seriesIds = [...new Set(transacoes.map(t => t.serieId).filter(id => id))];

        seriesIds.forEach(serieId => {
            const transacoesDaSerie = transacoes.filter(t => t.serieId === serieId).sort((a,b) => b.mesAnoReferencia.localeCompare(a.mesAnoReferencia));
            if (transacoesDaSerie.length === 0) return;

            let ultimaTransacao = transacoesDaSerie[0];
            let ultimoMesAno = ultimaTransacao.mesAnoReferencia;
            let proximoMes = parseDateString(ultimoMesAno);
            
            while(getMesAnoChave(proximoMes) < limitMesAno) {
                proximoMes.setMonth(proximoMes.getMonth() + 1);

                if (ultimaTransacao.frequencia === CONSTS.FREQUENCIA.PARCELADA && ultimaTransacao.parcelaAtual >= ultimaTransacao.totalParcelas) {
                    break;
                }

                const proximoMesAno = getMesAnoChave(proximoMes);
                const jaExiste = transacoes.some(t => t.serieId === serieId && t.mesAnoReferencia === proximoMesAno);
                
                if (!jaExiste) {
                    let ultimoId = transacoes.length > 0 ? Math.max(0, ...transacoes.map(t => t.id)) : 0;
                    let novaTransacao = {...ultimaTransacao, id: ++ultimoId, mesAnoReferencia: proximoMesAno, paga: false};
                    
                    if (novaTransacao.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
                        novaTransacao.parcelaAtual++;
                        const nomeBase = novaTransacao.nome.replace(/\s\(\d+\/\d+\)$/, '');
                        novaTransacao.nome = `${nomeBase} (${novaTransacao.parcelaAtual}/${novaTransacao.totalParcelas})`;
                    }
                    
                    let dataOriginal = parseDateString(novaTransacao.dataEntrada || novaTransacao.dataVencimento);
                    if (dataOriginal) {
                        dataOriginal.setMonth(dataOriginal.getMonth() + 1);
                        if(novaTransacao.dataEntrada) novaTransacao.dataEntrada = dataOriginal.toISOString().split('T')[0];
                        if(novaTransacao.dataVencimento) novaTransacao.dataVencimento = dataOriginal.toISOString().split('T')[0];
                    }
                    
                    transacoes.push(novaTransacao);
                    ultimaTransacao = novaTransacao;
                    novasTransacoesGeradas = true;
                }
            }
        });

        if (novasTransacoesGeradas) {
            console.log("Transações futuras geradas/atualizadas.");
            salvarDadosNoLocalStorage();
        }
    }

    // --- Salvamento Final antes de fechar a página ---
    window.addEventListener('beforeunload', () => {
        console.log('Evento beforeunload acionado. Salvando dados...');
        salvarDadosNoLocalStorage();
    });

    // --- Lógica do Menu Mobile (Sidebar) ---
    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            bodyEl.classList.toggle('sidebar-visible');
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            bodyEl.classList.remove('sidebar-visible');
        });
    }

    // Fecha o menu ao clicar em um de seus botões
    document.querySelector('.sidebar').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
             bodyEl.classList.remove('sidebar-visible');
        }
    });
        async function atualizarStatusPago(transacaoId, novoStatus) {
        if (!currentUser) return;
        try {
            const docRef = db.collection('users').doc(currentUser.uid).collection('transacoes').doc(transacaoId);
            await docRef.update({ paga: novoStatus });
            await registrarUltimaAlteracao(); // NOVO: Registra a alteração
            console.log(`Status da transação ${transacaoId} atualizado para ${novoStatus}.`);
            
            // O ouvinte cuidará de redesenhar, mas podemos atualizar o resumo financeiro localmente para uma resposta mais rápida
            const transacaoLocal = transacoes.find(t => t.id === transacaoId);
            if(transacaoLocal) transacaoLocal.paga = novoStatus;
            atualizarResumoFinanceiro();

        } catch (error) {
            console.error("Erro ao atualizar status de pagamento:", error);
        }
    }

    async function atualizarStatusPagoFatura(cartaoId, mesAno, novoStatus) {
        if (!currentUser) return;
        try {
            const q = db.collection('users').doc(currentUser.uid).collection('transacoes')
                .where('cartaoId', '==', cartaoId)
                .where('mesAnoReferencia', '==', mesAno);

            const querySnapshot = await q.get();
            const batch = db.batch();
            querySnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { paga: novoStatus });
            });
            await batch.commit();
            await registrarUltimaAlteracao(); // NOVO: Registra a alteração
            console.log(`Status de ${querySnapshot.size} transações da fatura atualizado para ${novoStatus}.`);

            // O ouvinte cuidará de redesenhar, mas podemos atualizar o resumo financeiro localmente para uma resposta mais rápida
            transacoes.forEach(t => {
                if(t.cartaoId === cartaoId && t.mesAnoReferencia === mesAno) {
                    t.paga = novoStatus;
                }
            });
            atualizarResumoFinanceiro();

        } catch (error) {
            console.error("Erro ao atualizar status de pagamento da fatura:", error);
        }
    }

        async function handleFecharAbrirOrcamento(button) {
        if (!currentUser) { alert("Erro: Você precisa estar logado."); return; }
        
        const orcamentoId = button.dataset.orcamentoId;
        const mesAno = button.dataset.mesAno;
        const deveFechar = button.classList.contains('btn-fechar-orcamento');

        const orcamentosFechadosRef = db.collection('users').doc(currentUser.uid).collection('orcamentosFechados');
        
        try {
            if (deveFechar) {
                const docId = `${orcamentoId}_${mesAno}`;
                await orcamentosFechadosRef.doc(docId).set({ orcamentoId: orcamentoId, mesAno: mesAno });
                console.log(`Orçamento ${orcamentoId} fechado para ${mesAno}`);
            } else {
                const docId = `${orcamentoId}_${mesAno}`;
                await orcamentosFechadosRef.doc(docId).delete();
                console.log(`Orçamento ${orcamentoId} reaberto para ${mesAno}`);
            }
            // O ouvinte cuidará de atualizar a tela
        } catch (error) {
            console.error("Erro ao alterar o estado do orçamento:", error);
            alert("Ocorreu um erro ao tentar salvar a alteração.");
        }
    }

    function popularModalRelatorio(date) {
    if (!relatorioTitulo || !relatorioCorpo) return;

    const mesAno = getMesAnoChave(date);
    const nomeMes = date.toLocaleString('pt-BR', { month: 'long' });
    const ano = date.getFullYear();
    relatorioTitulo.textContent = `Relatório de ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano}`;

    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() + 6);
    btnRelatorioProximo.disabled = getMesAnoChave(date) >= getMesAnoChave(limitDate);

    let primeiroMesAnoComDados = null;
    if (transacoes.length > 0) {
        primeiroMesAnoComDados = transacoes.reduce((min, t) => t.mesAnoReferencia < min ? t.mesAnoReferencia : min, transacoes[0].mesAnoReferencia);
    }

    if (primeiroMesAnoComDados && mesAno < primeiroMesAnoComDados) {
        relatorioCorpo.innerHTML = '<p style="text-align: center; padding: 20px; color: #777;">Sem dados para este período.</p>';
        return;
    }

    // CORREÇÃO: O esqueleto do HTML agora não contém mais a seção dos gráficos.
    relatorioCorpo.innerHTML = `
        <div id="relatorio-secao-resumo"></div>
        <div id="relatorio-secao-analise-despesas"></div>
        <div id="relatorio-secao-analise-orcamentos"></div>
    `;

    const transacoesDoMes = transacoes.filter(t => t.mesAnoReferencia === mesAno);
    const despesasDoMes = transacoesDoMes.filter(t => t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA);

    let totalReceitas = transacoesDoMes.filter(t => t.tipo === CONSTS.TIPO_TRANSACAO.RECEITA).reduce((total, t) => total + t.valor, 0);
    let totalDespesas = 0;
    const despesasNaoOrcadas = despesasDoMes.filter(d => !d.orcamentoId);
    totalDespesas += despesasNaoOrcadas.reduce((total, t) => total + t.valor, 0);
    orcamentos.forEach(orcamento => {
        const gastosNesteOrcamento = despesasDoMes.filter(t => t.orcamentoId === orcamento.id).reduce((total, t) => total + t.valor, 0);
        if (isOrcamentoFechado(orcamento.id, mesAno)) {
            totalDespesas += gastosNesteOrcamento;
        } else {
            totalDespesas += Math.max(orcamento.valor, gastosNesteOrcamento);
        }
    });
    const totalAjustesDoMes = ajustesFatura.filter(a => a.mesAnoReferencia === mesAno).reduce((total, a) => total + a.valor, 0);
    totalDespesas -= totalAjustesDoMes;
    const saldoFinal = totalReceitas - totalDespesas;
    
    const resumoHTML = `<section class="relatorio-secao"><h3>Resumo Geral</h3><div class="relatorio-grid"><div class="relatorio-item"><span>Receitas Totais</span><strong class="valor-receita">${formatCurrency(totalReceitas)}</strong></div><div class="relatorio-item"><span>Despesas Totais</span><strong class="valor-despesa">${formatCurrency(totalDespesas)}</strong></div><div class="relatorio-item"><span>Saldo Final</span><strong style="color: ${saldoFinal >= 0 ? '#27ae60' : '#e74c3c'};">${formatCurrency(saldoFinal)}</strong></div></div></section>`;
    document.getElementById('relatorio-secao-resumo').innerHTML = resumoHTML;

    const calcularSubtotais = (categoria) => {
        const despesasFiltradas = despesasDoMes.filter(d => d.categoria === categoria);
        return {
            unica: despesasFiltradas.filter(d => d.frequencia === 'unica').reduce((sum, d) => sum + d.valor, 0),
            recorrente: despesasFiltradas.filter(d => d.frequencia === 'recorrente').reduce((sum, d) => sum + d.valor, 0),
            parcelada: despesasFiltradas.filter(d => d.frequencia === 'parcelada').reduce((sum, d) => sum + d.valor, 0)
        };
    };
    const subtotaisOrd = calcularSubtotais('ordinaria');
    const subtotaisCartao = calcularSubtotais('cartao_credito');
    const analiseDespesasHTML = `<section class="relatorio-secao"><h3>Análise de Despesas</h3><div class="relatorio-grid-analise"><div class="relatorio-sub-secao"><h4>Gastos Ordinários</h4><div class="relatorio-item-analise"><span>Únicas</span> <strong>${formatCurrency(subtotaisOrd.unica)}</strong></div><div class="relatorio-item-analise"><span>Recorrentes</span> <strong>${formatCurrency(subtotaisOrd.recorrente)}</strong></div><div class="relatorio-item-analise"><span>Parceladas</span> <strong>${formatCurrency(subtotaisOrd.parcelada)}</strong></div></div><div class="relatorio-sub-secao"><h4>Gastos com Cartão de Crédito</h4><div class="relatorio-item-analise"><span>Únicas</span> <strong>${formatCurrency(subtotaisCartao.unica)}</strong></div><div class="relatorio-item-analise"><span>Recorrentes</span> <strong>${formatCurrency(subtotaisCartao.recorrente)}</strong></div><div class="relatorio-item-analise"><span>Parceladas</span> <strong>${formatCurrency(subtotaisCartao.parcelada)}</strong></div></div></div></section>`;
    document.getElementById('relatorio-secao-analise-despesas').innerHTML = analiseDespesasHTML;
    
    let totalPrevistoOrcamentos = 0;
    let totalGastoOrcamentos = 0;
    let orcamentosHTML = '';

    orcamentos.forEach(orc => {
        const gastoNoOrcamento = despesasDoMes.filter(t => t.orcamentoId === orc.id).reduce((sum, t) => sum + t.valor, 0);
        const saldoOrcamento = orc.valor - gastoNoOrcamento;
        totalPrevistoOrcamentos += orc.valor;
        totalGastoOrcamentos += gastoNoOrcamento;
        orcamentosHTML += `<div class="relatorio-orcamento-item"><span>${orc.nome}</span><div class="orcamento-valores"><small>Previsto: ${formatCurrency(orc.valor)}</small><small>Gasto: ${formatCurrency(gastoNoOrcamento)}</small><strong style="color: ${saldoOrcamento >= 0 ? '#27ae60' : '#e74c3c'};">Saldo: ${formatCurrency(saldoOrcamento)}</strong></div></div>`;
    });

    const analiseOrcamentosHTML = `<section class="relatorio-secao"><h3>Análise de Orçamentos</h3><div class="relatorio-orcamento-lista">${orcamentosHTML}</div><div class="relatorio-orcamento-total"><span>TOTAIS</span><div class="orcamento-valores"><small>Previsto: ${formatCurrency(totalPrevistoOrcamentos)}</small><small>Gasto: ${formatCurrency(totalGastoOrcamentos)}</small><strong style="color: ${(totalPrevistoOrcamentos - totalGastoOrcamentos) >= 0 ? '#27ae60' : '#e74c3c'};">Saldo: ${formatCurrency(totalPrevistoOrcamentos - totalGastoOrcamentos)}</strong></div></div></section>`;
    document.getElementById('relatorio-secao-analise-orcamentos').innerHTML = analiseOrcamentosHTML;
}
});