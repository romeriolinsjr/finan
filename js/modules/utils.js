import { elements } from "./elements.js";
import { state } from "./state.js";
import { db } from "./firebase-config.js"; // Adicionado para a função funcionar

export function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function getMesAnoChave(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

export function parseDateString(dateString) {
  if (!dateString) return null;
  const parts = dateString.split("-");
  if (parts.length === 2)
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
  else if (parts.length === 3)
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );
  return null;
}

export function calcularTotalAjustes(cartaoId, mesAno) {
  return state.ajustesFatura
    .filter((a) => a.cartaoId === cartaoId && a.mesAnoReferencia === mesAno)
    .reduce((total, a) => total + a.valor, 0);
}

export function isOrcamentoFechado(orcamentoId, mesAno) {
  return state.orcamentosFechados.some(
    (o) => o.orcamentoId === orcamentoId && o.mesAno === mesAno,
  );
}

export function hideSpinner() {
  if (elements.loadingSpinnerOverlay) {
    elements.loadingSpinnerOverlay.classList.add("hidden");
  }
}

// FUNÇÃO MOVIDA PARA CÁ PARA CORRIGIR O ERRO DE IMPORTAÇÃO
export async function registrarUltimaAlteracao() {
  if (!state.currentUser) return;
  try {
    const userDocRef = db.collection("users").doc(state.currentUser.uid);
    await userDocRef.set(
      {
        lastModified: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log("Timestamp de última alteração registrado no Firestore.");
  } catch (error) {
    console.error("Erro ao registrar timestamp de última alteração:", error);
  }
}
