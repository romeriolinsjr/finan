export const state = {
  currentDate: new Date(),
  reportDate: new Date(),
  userAguardandoVerificacao: null,
  isDuringRegistration: false,
  transacoes: [],
  cartoes: [],
  ajustesFatura: [],
  orcamentos: [],
  orcamentosFechados: [],
  dividasTerceiros: [],
  pessoas: [],
  currentFaturaDate: null,
  dividasTerceirosDate: new Date(),
  currentModalStep: 1,
  isEditMode: false,
  editingTransactionId: null,
  editingSerieId: null,
  isCartaoEditMode: false,
  isQuickAddMode: false,
  isModoTerceiros: false,
  isRegisterMode: false,
  currentUser: null,
  openModals: [],
  areValuesHidden: false,
  // NOVAS VARIÁVEIS:
  isPessoaEditMode: false,
  editingPessoaId: null,
  mesesCarregados: [], // Armazena chaves como "2024-05" para controle de cache
  activeUnsubscribers: [], // Armazena as funções de limpeza das escutas do Firebase
  // WEEKLY TRACKER:
  ciclosTracker: [], // Armazena os ciclos ativos (Ciclo 1 e Ciclo 2)
  votosTracker: [], // Armazena as atribuições manuais de transações a ciclos específicos
  trackerActiveTabIndex: null, // Controla qual aba de ciclo está visível (0 ou 1)
  faturasConferidas: [], // Armazena registros de faturas que foram conferidas pelo usuário
};
