export const CONSTS = {
  TIPO_TRANSACAO: { RECEITA: "receita", DESPESA: "despesa" },
  CATEGORIA_DESPESA: {
    ORDINARIA: "ordinaria",
    CARTAO_CREDITO: "cartao_credito",
  },
  FREQUENCIA: {
    UNICA: "unica",
    RECORRENTE: "recorrente",
    PARCELADA: "parcelada",
  },
  CADASTRO_PARCELA: {
    VALOR_TOTAL: "valor_total",
    VALOR_PARCELA: "valor_parcela",
  },
  ACAO_SERIE: { EXCLUIR: "excluir", EDITAR: "editar" },
  TIPO_RENDERIZACAO: {
    RECEITA: "receita_individual",
    DESPESA: "despesa_ordinaria",
    FATURA: "fatura_cartao",
    ORCAMENTO: "orcamento",
  },
  RECORRENCIA_MESES: 60,
};
