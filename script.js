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
    const btnMenuGestaoDados = document.getElementById('btnGestaoDados');
    const modalGestaoDados = document.getElementById('modalGestaoDados');
    const btnExportarDados = document.getElementById('btnExportarDados');
    const inputArquivoImportacao = document.getElementById('arquivoImportacao');
    const nomeArquivoImportarDisplay = document.getElementById('nomeArquivoImportar');
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

    // --- Estado da Aplicação ---
    let currentDate = new Date();
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
        } else if (tipoModal === 'gestaoDados') {
            if (nomeArquivoImportarDisplay) nomeArquivoImportarDisplay.textContent = "";
            if (inputArquivoImportacao) inputArquivoImportacao.value = null;
        }
        modalElement.style.display = 'flex';
    }
    
    function fecharModalEspecifico(modalElement) {
        if (!modalElement) return;
        modalElement.style.display = 'none';
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
        } else if (modalElement.id === 'modalGestaoDados') {
            if (nomeArquivoImportarDisplay) nomeArquivoImportarDisplay.textContent = "";
            if (inputArquivoImportacao) inputArquivoImportacao.value = null;
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
    if (isEditMode && (transacao?.frequencia === CONSTS.FREQUENCIA.RECORRENTE || transacao?.frequencia === CONSTS.FREQUENCIA.PARCELADA)) {
        freqSelect.disabled = true;
        freqSelect.insertAdjacentHTML('afterend', '<small class="form-note">Frequência não pode ser alterada para transações existentes.</small>');
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

    // Preenche os valores
    clone.querySelector('#valorDespesaOrd').value = (transacao && typeof transacao.valor !== 'undefined') ? transacao.valor : '';
    const dataVencimentoInput = clone.querySelector('#dataVencimentoDespesaOrd');
    dataVencimentoInput.value = (transacao && transacao.dataVencimento) ? transacao.dataVencimento : hoje;

    const frequenciaSelect = clone.querySelector('#frequenciaDespesaOrd');
    const camposParceladaDiv = clone.querySelector('#camposParceladaOrd');
    const tipoCadastroParcelaSelect = clone.querySelector('#tipoCadastroParcelaOrd');
    const qtdParcelasInput = clone.querySelector('#qtdParcelasOrd');
    const parcelaAtualInput = clone.querySelector('#parcelaAtualOrd');

    if (transacao) {
        if (transacao.frequencia) frequenciaSelect.value = transacao.frequencia;
        if (transacao.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
            if (transacao.tipoCadastroParcela) tipoCadastroParcelaSelect.value = transacao.tipoCadastroParcela;
            if (transacao.totalParcelas) qtdParcelasInput.value = transacao.totalParcelas;
            if (transacao.parcelaAtual) parcelaAtualInput.value = transacao.parcelaAtual;
        }
    }

    if (isEditMode && (transacao?.frequencia === CONSTS.FREQUENCIA.PARCELADA || transacao?.frequencia === CONSTS.FREQUENCIA.RECORRENTE)) {
        frequenciaSelect.disabled = true;
        frequenciaSelect.insertAdjacentHTML('afterend', '<small class="form-note">Frequência não pode ser alterada.</small>');
        if (transacao?.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
            tipoCadastroParcelaSelect.disabled = true;
            qtdParcelasInput.disabled = true;
            parcelaAtualInput.disabled = true;
            camposParceladaDiv.insertAdjacentHTML('beforeend', '<small class="form-note">Detalhes do parcelamento não podem ser alterados.</small>');
        }
    }

    function toggleParceladaFieldsOrd() {
        const parcelada = frequenciaSelect.value === CONSTS.FREQUENCIA.PARCELADA;
        camposParceladaDiv.style.display = parcelada ? 'block' : 'none';
        qtdParcelasInput.required = parcelada && !frequenciaSelect.disabled;
        parcelaAtualInput.required = parcelada && !frequenciaSelect.disabled;
        if (!parcelada && (!isEditMode || (isEditMode && transacao?.frequencia !== CONSTS.FREQUENCIA.PARCELADA))) {
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
            dados.valor = parseFloat(passo2Container.querySelector('#valorDespesaOrd').value) || 0;
            dados.dataVencimento = passo2Container.querySelector('#dataVencimentoDespesaOrd').value;
            dados.frequencia = passo2Container.querySelector('#frequenciaDespesaOrd').value;
            if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
                dados.tipoCadastroParcela = passo2Container.querySelector('#tipoCadastroParcelaOrd').value;
                dados.totalParcelas = parseInt(passo2Container.querySelector('#qtdParcelasOrd').value);
                dados.parcelaAtual = parseInt(passo2Container.querySelector('#parcelaAtualOrd').value) || 1;
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
            dados.cartaoId = parseInt(cartaoEl.value);
            dados.cartaoNome = cartaoEl.options[cartaoEl.selectedIndex].text;
            const orcamentoEl = passo2Container.querySelector('#orcamentoVinculado');
            dados.orcamentoId = orcamentoEl && orcamentoEl.value ? parseInt(orcamentoEl.value) : null;
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
    if (dados.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO && (!dados.cartaoId || isNaN(dados.cartaoId))) {
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

function atualizarTransacaoExistente(dados) {
    const transacaoOriginal = transacoes.find(t => t.id === editingTransactionId);
    if (!transacaoOriginal) {
        alert("Erro: Transação para edição não encontrada.");
        return false;
    }

    // Edição de toda a série
    if (editingSerieId) {
        transacoes.forEach(t => {
            if (t.serieId === editingSerieId) {
                t.valor = dados.valor;
                // --- CORREÇÃO APLICADA AQUI ---
                t.nome = (t.frequencia === CONSTS.FREQUENCIA.PARCELADA)
                    ? `${dados.nomeBase} (${t.parcelaAtual}/${t.totalParcelas})`
                    : dados.nomeBase;
            }
        });
    } else { // Edição de uma única transação
        const transacaoIndex = transacoes.findIndex(t => t.id === editingTransactionId);
        // --- CORREÇÃO APLICADA AQUI ---
        // Combinamos a transação existente com os novos dados, incluindo o 'nome'.
        let transacaoEditada = {
            ...transacoes[transacaoIndex],
            ...dados,
            nome: dados.nomeBase // Garantimos que o nome seja atualizado.
        };
        delete transacaoEditada.nomeBase; // Limpamos a propriedade temporária
        
        transacoes[transacaoIndex] = transacaoEditada;
    }
    return true;
}

// BLOCO CORRIGIDO PARA SUBSTITUIR A FUNÇÃO 'adicionarNovasTransacoes'

function adicionarNovasTransacoes(dados) {
    let transacoesParaAdicionar = [];
    let ultimoId = transacoes.length > 0 ? Math.max(0, ...transacoes.map(t => t.id)) : 0;
    const mesAnoReferenciaBase = getMesAnoChave(currentDate);

    // --- CORREÇÃO APLICADA AQUI ---
    // Agora, garantimos que a propriedade 'nome' seja criada corretamente desde o início.
    const novaTransacaoBase = {
        ...dados,
        nome: dados.nomeBase, // Atribui o nome corretamente
        id: 0,
        mesAnoReferencia: mesAnoReferenciaBase,
        paga: false,
        serieId: null
    };
    delete novaTransacaoBase.nomeBase; // Remove a propriedade temporária e desnecessária

    if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA || dados.frequencia === CONSTS.FREQUENCIA.RECORRENTE) {
        const serieId = Date.now() + Math.random();
        novaTransacaoBase.serieId = serieId;

        if (dados.frequencia === CONSTS.FREQUENCIA.PARCELADA) {
            const totalParcelas = dados.totalParcelas;
            let valorDaParcela = (dados.tipoCadastroParcela === CONSTS.CADASTRO_PARCELA.VALOR_TOTAL)
                ? parseFloat((dados.valor / totalParcelas).toFixed(2))
                : dados.valor;
            
            let parcelaInicial = dados.parcelaAtual || 1;
            for (let i = 0; i < (totalParcelas - parcelaInicial + 1); i++) {
                ultimoId++;
                let dataTransacaoParcela = new Date(parseDateString(dados.dataEntrada || dados.dataVencimento));
                dataTransacaoParcela.setMonth(dataTransacaoParcela.getMonth() + i);
                
                let mesReferenciaParcela = new Date(currentDate);
                mesReferenciaParcela.setMonth(mesReferenciaParcela.getMonth() + i);

                transacoesParaAdicionar.push({
                    ...novaTransacaoBase,
                    id: ultimoId,
                    valor: valorDaParcela,
                    parcelaAtual: parcelaInicial + i,
                    dataVencimento: dados.tipo === CONSTS.TIPO_TRANSACAO.DESPESA ? dataTransacaoParcela.toISOString().split('T')[0] : null,
                    dataEntrada: dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA ? dataTransacaoParcela.toISOString().split('T')[0] : null,
                    mesAnoReferencia: getMesAnoChave(mesReferenciaParcela),
                    nome: `${dados.nomeBase} (${parcelaInicial + i}/${totalParcelas})`
                });
            }
        } else { // Recorrente
            for (let i = 0; i < CONSTS.RECORRENCIA_MESES; i++) {
                ultimoId++;
                let dataTransacaoRecorrente = new Date(parseDateString(dados.dataEntrada || dados.dataVencimento));
                dataTransacaoRecorrente.setMonth(dataTransacaoRecorrente.getMonth() + i);

                let mesReferenciaRecorrente = new Date(currentDate);
                mesReferenciaRecorrente.setMonth(mesReferenciaRecorrente.getMonth() + i);

                transacoesParaAdicionar.push({
                    ...novaTransacaoBase,
                    id: ultimoId,
                    mesAnoReferencia: getMesAnoChave(mesReferenciaRecorrente),
                    dataEntrada: dados.tipo === CONSTS.TIPO_TRANSACAO.RECEITA ? dataTransacaoRecorrente.toISOString().split('T')[0] : novaTransacaoBase.dataEntrada,
                    dataVencimento: dados.tipo === CONSTS.TIPO_TRANSACAO.DESPESA ? dataTransacaoRecorrente.toISOString().split('T')[0] : novaTransacaoBase.dataVencimento,
                });
            }
        }
    } else { // Transação Única
        novaTransacaoBase.id = ++ultimoId;
        transacoesParaAdicionar.push(novaTransacaoBase);
    }

    if (transacoesParaAdicionar.length > 0) {
        transacoes.push(...transacoesParaAdicionar);
        return true;
    }
    return false;
}


// --- Listener do Botão Salvar (Refatorado) ---
if (btnSalvarTransacao) {
    btnSalvarTransacao.addEventListener('click', () => {
        const dadosFormulario = obterDadosDoFormulario();
        
        if (!validarDadosDaTransacao(dadosFormulario)) {
            return; // Interrompe se a validação falhar
        }

        let sucesso = false;
        if (isEditMode) {
            sucesso = atualizarTransacaoExistente(dadosFormulario);
        } else {
            sucesso = adicionarNovasTransacoes(dadosFormulario);
        }

        if (sucesso) {
            atualizarTudo();
            if (isQuickAddMode && !isEditMode) {
                resetFormParaNovaDespesaCartao();
            } else {
                fecharModalEspecifico(modalNovaTransacao);
            }
        }
    });
}
    // --- Navegação e Ações na Lista ---
    if (prevMonthBtn) { prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); updateMonthDisplay(); }); }
    if (nextMonthBtn) { nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); updateMonthDisplay(); }); }
    if (btnAddDespesaFromFatura) { btnAddDespesaFromFatura.addEventListener('click', () => { const cartaoId = parseInt(btnAddDespesaFromFatura.dataset.cartaoId); const cartaoNome = btnAddDespesaFromFatura.dataset.cartaoNome; if (cartaoId && cartaoNome) { fecharModalEspecifico(modalDetalhesFaturaCartao); abrirModalDespesaCartaoRapida(cartaoId, cartaoNome); } }); }
    if (btnAjustesFatura) { btnAjustesFatura.addEventListener('click', () => { const cartaoId = parseInt(btnAjustesFatura.dataset.cartaoId); const mesAno = btnAjustesFatura.dataset.mesAnoReferencia; if (cartaoId && mesAno) { abrirModalAjustesFatura(cartaoId, mesAno); } }); }
    
    if (btnFaturaAnterior) {
        btnFaturaAnterior.addEventListener('click', () => {
            if (!currentFaturaDate) return;
            currentFaturaDate.setMonth(currentFaturaDate.getMonth() - 1);
            const cartaoId = parseInt(faturaCartaoNomeTitulo.dataset.cartaoId);
            const novoMesAno = getMesAnoChave(currentFaturaDate);
            popularModalDetalhesFatura(cartaoId, novoMesAno);
        });
    }

    if (btnFaturaProxima) {
        btnFaturaProxima.addEventListener('click', () => {
            if (!currentFaturaDate) return;
            currentFaturaDate.setMonth(currentFaturaDate.getMonth() + 1);
            const cartaoId = parseInt(faturaCartaoNomeTitulo.dataset.cartaoId);
            const novoMesAno = getMesAnoChave(currentFaturaDate);
            popularModalDetalhesFatura(cartaoId, novoMesAno);
        });
    }
    
    function handleTransactionListClick(event, ulElement, isInModal = false) {
        const target = event.target;
        const buttonContainer = target.closest('button');
        const listItem = target.closest('li.transaction-item');
        if (!listItem) return;

        const btnVencimento = target.closest('.btn-vencimento-adjust');
        if (btnVencimento) {
            event.stopPropagation();
            const cartaoId = parseInt(btnVencimento.dataset.cartaoId);
            const cartao = cartoes.find(c => c.id === cartaoId);
            if (!cartao) return;
    
            const novoEstado = !cartao.vencimentoNoMesSeguinte;
            const msg = novoEstado 
                ? `Deseja configurar este cartão para que suas faturas sempre vençam no mês seguinte?\n\nEsta regra será aplicada a todos os meses.`
                : `Deseja reverter a regra e fazer com que as faturas deste cartão voltem a vencer no mês corrente?`;
    
            if (window.confirm(msg)) {
                cartao.vencimentoNoMesSeguinte = novoEstado;
                atualizarTudo();
            }
            return;
        }

        const btnFecharOrcamento = target.closest('.btn-fechar-orcamento');
        if (btnFecharOrcamento) {
            event.stopPropagation();
            const orcamentoId = parseInt(btnFecharOrcamento.dataset.id);
            const orcamento = orcamentos.find(o => o.id === orcamentoId);
            if (orcamento && window.confirm(`Tem certeza que deseja fechar o orçamento "${orcamento.nome}" para este mês? Esta ação pode ser revertida.`)) {
                orcamentosFechados.push({ orcamentoId: orcamentoId, mesAno: getMesAnoChave(currentDate) });
                atualizarTudo();
            }
            return;
        }

        const btnAbrirOrcamento = target.closest('.btn-abrir-orcamento');
        if (btnAbrirOrcamento) {
            event.stopPropagation();
            const orcamentoId = parseInt(btnAbrirOrcamento.dataset.id);
            const mesAnoAtual = getMesAnoChave(currentDate);
            const orcamento = orcamentos.find(o => o.id === orcamentoId);
            if (orcamento && window.confirm(`Deseja reabrir o orçamento "${orcamento.nome}" para este mês?`)) {
                orcamentosFechados = orcamentosFechados.filter(o => !(o.orcamentoId === orcamentoId && o.mesAno === mesAnoAtual));
                atualizarTudo();
            }
            return;
        }

        if (!buttonContainer) {
            if (listItem.classList.contains('orcamento')) {
                const orcamentoId = parseInt(listItem.dataset.orcamentoId.replace('orcamento-', ''));
                abrirModalDetalhesOrcamento(orcamentoId, getMesAnoChave(currentDate));
                return;
            }
            const checkbox = listItem.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                const clickEvent = new MouseEvent('click', { bubbles: true });
                checkbox.dispatchEvent(clickEvent);
            }
        }

        const viewFaturaButton = target.closest('.btn-view-fatura');
        if (viewFaturaButton) {
            event.stopPropagation();
            const cartaoId = parseInt(viewFaturaButton.dataset.cartaoId);
            const mesAno = viewFaturaButton.dataset.mesAnoFatura;
            abrirModalDetalhesFatura(cartaoId, mesAno);
            return;
        }
   
        // BLOCO CORRIGIDO PARA COLAR NO LUGAR

if (target.type === 'checkbox' && target.closest('.transaction-item')) {
    event.stopPropagation(); 
    const checkbox = target;
    const listItem = checkbox.closest('.transaction-item');
    const marcarComoPaga = checkbox.checked;

    // Ação 1: Atualizar o dado no array de transações
    const isFaturaCheckbox = checkbox.classList.contains('fatura-checkbox');
    if (isFaturaCheckbox) {
        const cartaoIdFatura = parseInt(checkbox.dataset.cartaoId);
        const mesAnoFatura = checkbox.dataset.mesAnoFatura;
        transacoes.forEach(t => {
            if (t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA && t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO && t.cartaoId === cartaoIdFatura && t.mesAnoReferencia === mesAnoFatura) {
                t.paga = marcarComoPaga;
            }
        });
    } else { 
        const transacaoId = parseInt(checkbox.dataset.transactionId);
        const transacao = transacoes.find(t => t.id === transacaoId);
        if (transacao && transacao.tipo === CONSTS.TIPO_TRANSACAO.DESPESA) {
            transacao.paga = marcarComoPaga;
        }
    }

    // Ação 2: Atualizar a interface gráfica IMEDIATAMENTE
    const valueDateContainer = listItem.querySelector('.transaction-value-date');
    if (marcarComoPaga) {
        listItem.classList.add('paga');
        if (valueDateContainer) {
            // Remove qualquer 'Paga' antigo para não duplicar
            const spanExistente = valueDateContainer.querySelector('.status-paga');
            if(spanExistente) spanExistente.remove();

            // Adiciona o novo span 'Paga'
            const statusSpan = document.createElement('span');
            statusSpan.classList.add('status-paga');
            statusSpan.textContent = 'Paga';
            valueDateContainer.appendChild(statusSpan);
        }
    } else {
        listItem.classList.remove('paga');
        if (valueDateContainer) {
            // Encontra e remove o span 'Paga'
            const statusSpan = valueDateContainer.querySelector('.status-paga');
            if (statusSpan) {
                statusSpan.remove();
            }
        }
    }

    // Ação 3: Salvar e atualizar o resumo
    salvarDadosNoLocalStorage();
    atualizarResumoFinanceiro();
    return; 
}
       
        const transacaoId = buttonContainer?.dataset.id ? parseInt(buttonContainer.dataset.id) : null; 
        if (!transacaoId) return; 
        const transacao = transacoes.find(t => t.id === transacaoId); 
        if (!transacao) return; 
        const isSerie = transacao.frequencia === CONSTS.FREQUENCIA.PARCELADA || transacao.frequencia === CONSTS.FREQUENCIA.RECORRENTE; 
        if (buttonContainer.classList.contains('btn-delete')) { 
            if (isSerie) { 
                abrirModalConfirmarAcaoSerie(transacaoId, CONSTS.ACAO_SERIE.EXCLUIR); 
            } else { 
                if (window.confirm(`Tem certeza que deseja excluir "${transacao.nome}"?`)) { 
                    excluirTransacaoUnica(transacaoId, isInModal); 
                } 
            } 
        } else if (buttonContainer.classList.contains('btn-edit')) { 
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
    if (btnAcaoSerieApenasEsta) { btnAcaoSerieApenasEsta.addEventListener('click', () => { const transacaoId = parseInt(modalConfirmarAcaoSerie.dataset.transacaoId); const acao = modalConfirmarAcaoSerie.dataset.acao; fecharModalEspecifico(modalConfirmarAcaoSerie); if (acao === CONSTS.ACAO_SERIE.EXCLUIR) { excluirTransacaoUnica(transacaoId); } else if (acao === CONSTS.ACAO_SERIE.EDITAR) { abrirModalEspecifico(modalNovaTransacao, transacaoId, 'transacao'); } }); }
    if (btnAcaoSerieToda) { btnAcaoSerieToda.addEventListener('click', () => { const transacaoId = parseInt(modalConfirmarAcaoSerie.dataset.transacaoId); const serieId = parseFloat(modalConfirmarAcaoSerie.dataset.serieId); const acao = modalConfirmarAcaoSerie.dataset.acao; fecharModalEspecifico(modalConfirmarAcaoSerie); if (!serieId) { alert("Erro: ID da série não encontrado."); return; } if (acao === CONSTS.ACAO_SERIE.EXCLUIR) { transacoes = transacoes.filter(t => t.serieId !== serieId); alert("Toda a série de transações foi excluída."); atualizarTudo(); } else if (acao === CONSTS.ACAO_SERIE.EDITAR) { editingSerieId = serieId; abrirModalEspecifico(modalNovaTransacao, transacaoId, 'transacao'); } }); }
    function excluirTransacaoUnica(transacaoId, isInModal = false) { transacoes = transacoes.filter(t => t.id !== transacaoId); if (isInModal && modalDetalhesFaturaCartao && modalDetalhesFaturaCartao.style.display === 'flex') { const cartaoIdDetalhes = faturaCartaoNomeTitulo ? parseInt(faturaCartaoNomeTitulo.dataset.cartaoId) : null; const mesAnoDetalhes = faturaCartaoNomeTitulo ? faturaCartaoNomeTitulo.dataset.mesAno : null; if (cartaoIdDetalhes && mesAnoDetalhes) popularModalDetalhesFatura(cartaoIdDetalhes, mesAnoDetalhes); } atualizarTudo(); }
    function atualizarTudo() { renderizarTransacoesDoMes(); salvarDadosNoLocalStorage(); }
    
    // --- Fatura do Cartão, Renderização e Gestão de Dados ---
    function abrirModalDetalhesFatura(cartaoId, mesAnoFatura) {
        currentFaturaDate = parseDateString(mesAnoFatura);
        popularModalDetalhesFatura(cartaoId, mesAnoFatura);
        abrirModalEspecifico(modalDetalhesFaturaCartao, null, 'detalhesFatura');
    }
    function popularModalDetalhesFatura(cartaoId, mesAnoFatura) { if (!faturaCartaoNomeTitulo || !faturaCartaoTotalValor || !faturaCartaoDataVencimento || !listaComprasFaturaCartaoUl || !btnAddDespesaFromFatura || !btnAjustesFatura) return; const cartao = cartoes.find(c => c.id === cartaoId); if (!cartao) { console.error("Cartão não encontrado para detalhes:", cartaoId); return; } btnAddDespesaFromFatura.dataset.cartaoId = cartao.id; btnAddDespesaFromFatura.dataset.cartaoNome = cartao.nome; btnAjustesFatura.dataset.cartaoId = cartao.id; btnAjustesFatura.dataset.mesAnoReferencia = mesAnoFatura; faturaCartaoNomeTitulo.dataset.cartaoId = cartaoId; faturaCartaoNomeTitulo.dataset.mesAno = mesAnoFatura; faturaCartaoNomeTitulo.textContent = `Fatura ${cartao.nome} - ${mesAnoFatura.substring(5, 7)}/${mesAnoFatura.substring(0, 4)}`; const [ano, mes] = mesAnoFatura.split('-').map(Number); const dataVenc = new Date(ano, mes - 1, cartao.diaVencimentoFatura); faturaCartaoDataVencimento.textContent = dataVenc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); const comprasDaFatura = transacoes.filter(t => t.tipo === CONSTS.TIPO_TRANSACAO.DESPESA && t.categoria === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO && t.cartaoId === cartaoId && t.mesAnoReferencia === mesAnoFatura); const ajustesDaFatura = ajustesFatura.filter(a => a.cartaoId === cartaoId && a.mesAnoReferencia === mesAnoFatura); const totalFaturaBruto = comprasDaFatura.reduce((total, compra) => total + compra.valor, 0); const totalAjustes = ajustesDaFatura.reduce((total, ajuste) => total + ajuste.valor, 0); faturaCartaoTotalValor.textContent = formatCurrency(totalFaturaBruto - totalAjustes); let itensParaRenderizar = [ ...comprasDaFatura.map(c => ({ ...c, renderType: 'compra' })), ...ajustesDaFatura.map(a => ({ ...a, renderType: 'ajuste' })) ]; itensParaRenderizar.sort((a, b) => { if (a.renderType === 'ajuste' && b.renderType === 'compra') return 1; if (a.renderType === 'compra' && b.renderType === 'ajuste') return -1; if (a.renderType === 'ajuste' && b.renderType === 'ajuste') return 0; const prioridade = { [CONSTS.FREQUENCIA.RECORRENTE]: 1, [CONSTS.FREQUENCIA.PARCELADA]: 2, [CONSTS.FREQUENCIA.UNICA]: 3 }; const prioridadeA = prioridade[a.frequencia] || 4; const prioridadeB = prioridade[b.frequencia] || 4; if (prioridadeA !== prioridadeB) { return prioridadeA - prioridadeB; } if (a.frequencia === CONSTS.FREQUENCIA.PARCELADA && b.frequencia === CONSTS.FREQUENCIA.PARCELADA) { const restantesA = (a.totalParcelas || 0) - (a.parcelaAtual || 0); const restantesB = (b.totalParcelas || 0) - (b.parcelaAtual || 0); if (restantesA !== restantesB) { return restantesA - restantesB; } } return a.nome.localeCompare(b.nome); }); listaComprasFaturaCartaoUl.innerHTML = ''; if (itensParaRenderizar.length === 0) { listaComprasFaturaCartaoUl.innerHTML = '<li>Nenhuma compra ou ajuste nesta fatura.</li>'; return; } itensParaRenderizar.forEach(item => { const li = document.createElement('li'); li.classList.add('transaction-item'); if (item.renderType === 'compra') { li.dataset.transactionId = item.id; li.dataset.id = item.id; const detailsDiv = document.createElement('div'); detailsDiv.classList.add('transaction-details'); detailsDiv.innerHTML = `<span class="compra-nome">${item.nome}</span><span class="compra-valor">${formatCurrency(item.valor)}</span>`; const actionsDiv = document.createElement('div'); actionsDiv.classList.add('transaction-actions'); const editButton = document.createElement('button'); editButton.classList.add('btn-edit'); editButton.innerHTML = '✎'; editButton.title = "Editar Compra"; editButton.dataset.id = item.id; actionsDiv.appendChild(editButton); const deleteButton = document.createElement('button'); deleteButton.classList.add('btn-delete'); deleteButton.innerHTML = '✖'; deleteButton.title = "Excluir Compra"; deleteButton.dataset.id = item.id; actionsDiv.appendChild(deleteButton); li.appendChild(detailsDiv); li.appendChild(actionsDiv); } else if (item.renderType === 'ajuste') { li.classList.add('ajuste-fatura-item'); li.innerHTML = `<div class="transaction-details"><span class="compra-nome">${item.descricao}</span><span class="compra-valor">- ${formatCurrency(item.valor)}</span></div>`; } listaComprasFaturaCartaoUl.appendChild(li); }); }

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
    actionButton.dataset.id = item.orcamentoId;
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

function renderizarTransacoesDoMes() {
    if (!listaTransacoesUl) return;
    listaTransacoesUl.innerHTML = '';
    const mesAnoAtual = getMesAnoChave(currentDate);
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
        // --- CORREÇÃO APLICADA AQUI ---
        // Removemos a verificação '|| dc.orcamentoId' para incluir todas as despesas do cartão na fatura.
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
        itensParaRenderizar.push({ id: `fatura-${fatura.cartaoId}-${mesAnoAtual}`, tipoDisplay: CONSTS.TIPO_RENDERIZACAO.FATURA, cartaoId: fatura.cartaoId, nome: `Fatura ${fatura.cartaoNome}`, valor: valorFinalFatura, dataOrdenacao: dataVencimentoFatura, dataVencimentoDisplay: dataVencimentoFatura.toISOString().split('T')[0], paga: fatura.todasPagas, mesAnoReferencia: mesAnoAtual, vencimentoNoMesSeguinte: fatura.vencimentoNoMesSeguinte });
    });
    
    // Passo 4: Coletar os orçamentos
    orcamentos.forEach(orcamento => {
        const [ano, mes] = mesAnoAtual.split('-').map(Number);
        const dataOrcamento = new Date(ano, mes - 1, orcamento.dia);
        const gastosNoOrcamento = transacoesDoMesVisivel.filter(t => t.orcamentoId === orcamento.id).reduce((total, t) => total + t.valor, 0);
        const valorRestante = orcamento.valor - gastosNoOrcamento;
        itensParaRenderizar.push({ id: `orcamento-${orcamento.id}`, orcamentoId: orcamento.id, tipoDisplay: CONSTS.TIPO_RENDERIZACAO.ORCAMENTO, nome: orcamento.nome, valor: valorRestante, valorTotalOrcamento: orcamento.valor, dataOrdenacao: dataOrcamento });
    });
    
    // Passo 5: Ordenar a lista final
    const tipoPrioridade = { [CONSTS.TIPO_RENDERIZACAO.RECEITA]: 1, [CONSTS.TIPO_RENDERIZACAO.ORCAMENTO]: 2, [CONSTS.TIPO_RENDERIZACAO.DESPESA]: 3, [CONSTS.TIPO_RENDERIZACAO.FATURA]: 3 };
    itensParaRenderizar.sort((a, b) => {
        const prioridadeA = tipoPrioridade[a.tipoDisplay]; const prioridadeB = tipoPrioridade[b.tipoDisplay];
        if (prioridadeA !== prioridadeB) { return prioridadeA - prioridadeB; }
        if (a.tipoDisplay === CONSTS.TIPO_RENDERIZACAO.ORCAMENTO) { return b.valorTotalOrcamento - a.valorTotalOrcamento; }
        const dateA = a.dataOrdenacao instanceof Date ? a.dataOrdenacao : new Date(0);
        const dateB = b.dataOrdenacao instanceof Date ? b.dataOrdenacao : new Date(0);
        return dateA - dateB;
    });

    if (itensParaRenderizar.length === 0) { const liEmpty = document.createElement('li'); liEmpty.textContent = "Nenhuma transação para este mês."; liEmpty.style.textAlign = 'center'; liEmpty.style.padding = '20px'; liEmpty.style.color = '#777'; listaTransacoesUl.appendChild(liEmpty); return; }
    
    // Passo 6: Renderizar cada item usando as funções auxiliares
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

    atualizarResumoFinanceiro();
}
    // --- Lógica de Cartões, Ajustes e Gestão de Dados ---
    if (btnGerenciarCartoes) { btnGerenciarCartoes.addEventListener('click', () => { abrirModalEspecifico(modalGerenciarCartoes, null, 'gerenciarCartoes'); }); }
    if (btnAbrirModalCadastroCartao) { btnAbrirModalCadastroCartao.addEventListener('click', () => { fecharModalEspecifico(modalGerenciarCartoes); abrirModalEspecifico(modalCadastrarCartao, null, 'cartaoCadastroEdicao'); }); }
    if (btnSalvarCartaoModalBtn) { btnSalvarCartaoModalBtn.addEventListener('click', () => { if (!nomeCartaoInputModal || !diaVencimentoFaturaInputModal) return; const nome = nomeCartaoInputModal.value.trim(); const diaVencimento = parseInt(diaVencimentoFaturaInputModal.value); if (!nome) { alert("Por favor, informe o nome do cartão."); nomeCartaoInputModal.focus(); return; } if (isNaN(diaVencimento) || diaVencimento < 1 || diaVencimento > 31) { alert("Por favor, informe um dia de vencimento válido (1-31)."); diaVencimentoFaturaInputModal.focus(); return; } if (isCartaoEditMode && cartaoEditIdInput.value) { const idCartao = parseInt(cartaoEditIdInput.value); const cartaoIndex = cartoes.findIndex(c => c.id === idCartao); if (cartaoIndex > -1) { cartoes[cartaoIndex].nome = nome; cartoes[cartaoIndex].diaVencimentoFatura = diaVencimento; alert("Cartão atualizado com sucesso!"); salvarDadosNoLocalStorage(); } else { alert("Erro ao atualizar cartão."); } } else { const novoCartao = { id: cartoes.length > 0 ? Math.max(...cartoes.map(c => c.id)) + 1 : 1, nome: nome, diaVencimentoFatura: diaVencimento, vencimentoNoMesSeguinte: false }; cartoes.push(novoCartao); alert("Cartão cadastrado com sucesso!"); salvarDadosNoLocalStorage(); } fecharModalEspecifico(modalCadastrarCartao); if (passo2Container.querySelector('#cartaoDespesa')) { const transacaoOriginal = isEditMode ? transacoes.find(t => t.id === editingTransactionId) : null; const categoriaAtual = document.getElementById('categoriaDespesa')?.value; if (categoriaAtual === CONSTS.CATEGORIA_DESPESA.CARTAO_CREDITO) { const formCamposAdicionais = passo2Container.querySelector('#formCamposAdicionaisDespesa'); if (formCamposAdicionais) carregarFormularioDespesaCartao(formCamposAdicionais, transacaoOriginal); } } }); }
    
    function renderizarListaCartoesCadastrados() { if (!listaCartoesCadastradosUl) return; listaCartoesCadastradosUl.innerHTML = ''; if (cartoes.length === 0) { listaCartoesCadastradosUl.innerHTML = '<li>Nenhum cartão cadastrado.</li>'; return; } cartoes.forEach(cartao => { const li = document.createElement('li'); li.innerHTML = ` <div class="cartao-info" data-id="${cartao.id}"> <span class="cartao-nome">${cartao.nome}</span> <span class="cartao-vencimento">Venc. dia: ${cartao.diaVencimentoFatura}</span> </div> <div class="transaction-actions"> <button class="btn-add-despesa-cartao" data-id="${cartao.id}" data-nome="${cartao.nome}" title="Adicionar Despesa neste Cartão">➕</button> <button class="btn-edit-cartao" data-id="${cartao.id}" title="Editar Cartão">✎</button> <button class="btn-delete-cartao" data-id="${cartao.id}" title="Excluir Cartão">✖</button> </div>`; listaCartoesCadastradosUl.appendChild(li); }); }
    function preencherModalEdicaoCartao(cartaoId) { const cartao = cartoes.find(c => c.id === cartaoId); if (cartao && modalCadastrarCartao) { if (modalCartaoTitulo) modalCartaoTitulo.textContent = "Editar Cartão"; if (nomeCartaoInputModal) nomeCartaoInputModal.value = cartao.nome; if (diaVencimentoFaturaInputModal) diaVencimentoFaturaInputModal.value = cartao.diaVencimentoFatura; if (btnSalvarCartaoModalBtn) btnSalvarCartaoModalBtn.textContent = "Salvar Alterações"; } }
    
    if (listaCartoesCadastradosUl) {
        listaCartoesCadastradosUl.addEventListener('click', (event) => {
            const target = event.target;
            const addButton = target.closest('.btn-add-despesa-cartao');
            const editButton = target.closest('.btn-edit-cartao');
            const deleteButton = target.closest('.btn-delete-cartao');
            const infoDiv = target.closest('.cartao-info');

            if (infoDiv) {
                const cartaoId = parseInt(infoDiv.dataset.id);
                if (!cartaoId) return;
                const mesAnoAtual = getMesAnoChave(currentDate);
                fecharModalEspecifico(modalGerenciarCartoes);
                abrirModalDetalhesFatura(cartaoId, mesAnoAtual);
                return;
            }
            if (addButton) {
                const cartaoId = parseInt(addButton.dataset.id);
                const cartaoNome = addButton.dataset.nome;
                fecharModalEspecifico(modalGerenciarCartoes);
                abrirModalDespesaCartaoRapida(cartaoId, cartaoNome);
            } else if (editButton) {
                const cartaoId = parseInt(editButton.dataset.id);
                fecharModalEspecifico(modalGerenciarCartoes);
                abrirModalEspecifico(modalCadastrarCartao, cartaoId, 'cartaoCadastroEdicao');
            } else if (deleteButton) {
                const cartaoId = parseInt(deleteButton.dataset.id);
                const cartaoParaExcluir = cartoes.find(c => c.id === cartaoId);
                if (cartaoParaExcluir && window.confirm(`Tem certeza que deseja excluir o cartão "${cartaoParaExcluir.nome}"? Transações e ajustes associados não serão removidos, mas perderão o vínculo nomeado.`)) {
                    cartoes = cartoes.filter(c => c.id !== cartaoId);
                    transacoes.forEach(t => { if (t.cartaoId === cartaoId) { t.cartaoNome = "(Cartão Removido)"; } });
                    ajustesFatura.forEach(a => { if (a.cartaoId === cartaoId) { a.cartaoNome = "(Cartão Removido)"; } });
                    renderizarListaCartoesCadastrados();
                    atualizarTudo();
                    alert("Cartão excluído.");
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
        btnSalvarAjuste.addEventListener('click', () => {
            const descricao = descricaoAjusteInput.value.trim();
            const valor = parseFloat(valorAjusteInput.value);
            const cartaoId = parseInt(modalAjustesFatura.dataset.cartaoId);
            const mesAno = modalAjustesFatura.dataset.mesAno;
            if (!descricao) { alert("A descrição do ajuste é obrigatória."); descricaoAjusteInput.focus(); return; }
            if (isNaN(valor) || valor <= 0) { alert("O valor do ajuste deve ser um número positivo."); valorAjusteInput.focus(); return; }
            const novoAjuste = { id: Date.now(), cartaoId: cartaoId, mesAnoReferencia: mesAno, descricao: descricao, valor: valor };
            ajustesFatura.push(novoAjuste);
            atualizarTudo();
            popularModalAjustes(cartaoId, mesAno);
            descricaoAjusteInput.value = '';
            valorAjusteInput.value = '';
            descricaoAjusteInput.focus();
        });
    }
    if (listaAjustesFaturaUl) {
        listaAjustesFaturaUl.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-delete-ajuste')) {
                const ajusteId = parseInt(event.target.dataset.id);
                const cartaoId = parseInt(modalAjustesFatura.dataset.cartaoId);
                const mesAno = modalAjustesFatura.dataset.mesAno;
                ajustesFatura = ajustesFatura.filter(a => a.id !== ajusteId);
                atualizarTudo();
                popularModalAjustes(cartaoId, mesAno);
            }
        });
    }
    if (btnMenuGestaoDados) { btnMenuGestaoDados.addEventListener('click', () => { abrirModalEspecifico(modalGestaoDados, null, 'gestaoDados'); }); }
    if (btnExportarDados) { btnExportarDados.addEventListener('click', () => { const dadosParaExportar = { transacoes: transacoes, cartoes: cartoes, ajustesFatura: ajustesFatura, orcamentos: orcamentos, orcamentosFechados: orcamentosFechados }; try { const dadosJson = JSON.stringify(dadosParaExportar, null, 2); const blob = new Blob([dadosJson], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url; const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19); a.download = `meu_controle_financeiro_backup_${timestamp}.json`; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a); alert("Dados exportados com sucesso! Verifique seus downloads."); } catch (error) { console.error("Erro ao exportar dados:", error); alert("Ocorreu um erro ao tentar exportar os dados."); } fecharModalEspecifico(modalGestaoDados); }); }
    if (inputArquivoImportacao) { inputArquivoImportacao.addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) { if (nomeArquivoImportarDisplay) nomeArquivoImportarDisplay.textContent = ""; return; } if (nomeArquivoImportarDisplay) nomeArquivoImportarDisplay.textContent = `Arquivo: ${file.name}`; const reader = new FileReader(); reader.onload = (e) => { try { const dadosImportados = JSON.parse(e.target.result); if (dadosImportados && Array.isArray(dadosImportados.transacoes) && Array.isArray(dadosImportados.cartoes)) { if (window.confirm("Tem certeza que deseja importar estes dados? Todos os dados atuais serão substituídos.")) { transacoes = dadosImportados.transacoes; cartoes = dadosImportados.cartoes; ajustesFatura = dadosImportados.ajustesFatura || []; orcamentos = dadosImportados.orcamentos || []; orcamentosFechados = dadosImportados.orcamentosFechados || []; salvarDadosNoLocalStorage(); currentDate = new Date(); updateMonthDisplay(); alert("Dados importados com sucesso!"); fecharModalEspecifico(modalGestaoDados); } else { if (nomeArquivoImportarDisplay) nomeArquivoImportarDisplay.textContent = ""; inputArquivoImportacao.value = null; } } else { alert("Erro: O arquivo de backup parece ser inválido ou está em um formato incorreto."); if (nomeArquivoImportarDisplay) nomeArquivoImportarDisplay.textContent = ""; } } catch (error) { console.error("Erro ao importar e processar o arquivo JSON:", error); alert("Ocorreu um erro ao ler o arquivo. Verifique se ele é um arquivo JSON válido."); if (nomeArquivoImportarDisplay) nomeArquivoImportarDisplay.textContent = ""; } finally { inputArquivoImportacao.value = null; } }; reader.onerror = () => { alert("Não foi possível ler o arquivo selecionado."); if (nomeArquivoImportarDisplay) nomeArquivoImportarDisplay.textContent = ""; inputArquivoImportacao.value = null; }; reader.readAsText(file); }); }
    
        // --- Lógica de Orçamentos ---
    if(btnMenuOrcamentos) {
        btnMenuOrcamentos.addEventListener('click', () => {
            abrirModalEspecifico(modalOrcamentos, null, 'orcamentos');
        });
    }

    function renderizarListaOrcamentos() {
        if (!listaOrcamentosUl) return;
        listaOrcamentosUl.innerHTML = '';
        if (orcamentos.length === 0) {
            listaOrcamentosUl.innerHTML = '<li>Nenhum orçamento cadastrado.</li>';
            return;
        }
        orcamentos.forEach(orcamento => {
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
        btnSalvarOrcamento.addEventListener('click', () => {
            const id = parseInt(orcamentoEditIdInput.value);
            const nome = nomeOrcamentoInput.value.trim();
            const valor = parseFloat(valorOrcamentoInput.value);
            const dia = parseInt(diaOrcamentoInput.value);

            if (!nome) { alert("O nome do orçamento é obrigatório."); nomeOrcamentoInput.focus(); return; }
            if (isNaN(valor) || valor <= 0) { alert("O valor do orçamento deve ser um número positivo."); valorOrcamentoInput.focus(); return; }
            if (isNaN(dia) || dia < 1 || dia > 31) { alert("O dia deve ser entre 1 e 31."); diaOrcamentoInput.focus(); return; }

            if (id) { // Editando
                const orcamentoIndex = orcamentos.findIndex(o => o.id === id);
                if (orcamentoIndex > -1) {
                    orcamentos[orcamentoIndex] = { ...orcamentos[orcamentoIndex], nome, valor, dia };
                }
            } else { // Criando
                const novoOrcamento = { id: Date.now(), nome, valor, dia };
                orcamentos.push(novoOrcamento);
            }
            
            atualizarTudo();
            fecharModalEspecifico(modalOrcamentos);
        });
    }

    if(listaOrcamentosUl) {
        listaOrcamentosUl.addEventListener('click', (e) => {
            const editButton = e.target.closest('.btn-edit-orcamento');
            const deleteButton = e.target.closest('.btn-delete-orcamento');

            if (editButton) {
                const orcamentoId = parseInt(editButton.dataset.id);
                preencherModalEdicaoOrcamento(orcamentoId);
            } else if (deleteButton) {
                const orcamentoId = parseInt(deleteButton.dataset.id);
                const orcamento = orcamentos.find(o => o.id === orcamentoId);
                if (orcamento && window.confirm(`Tem certeza que deseja excluir o orçamento "${orcamento.nome}"?`)) {
                    orcamentos = orcamentos.filter(o => o.id !== orcamentoId);
                    atualizarTudo();
                    renderizarListaOrcamentos();
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

    // --- Inicialização ---
    verificarEGerarTransacoesFuturas();
    updateMonthDisplay();
});