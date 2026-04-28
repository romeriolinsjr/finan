import { elements } from "./elements.js";
import { state } from "./state.js";
import { db } from "./firebase-config.js";

export function mostrarFeedbackAuth(mensagem, isError = false) {
  elements.authFeedback.textContent = mensagem;
  elements.authFeedback.style.color = isError ? "#e74c3c" : "#27ae60";
  elements.authFeedback.style.display = "block";
}

export function traduzirErroAuth(errorCode) {
  console.log("DEBUG - Código de erro recebido do Firebase:", errorCode);
  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-mail ou senha inválidos. Tente novamente.";
    case "auth/internal-error":
      return "Não foi possível processar o login. Verifique seus dados ou tente novamente em instantes.";
    case "auth/invalid-email":
      return "O formato do e-mail é inválido.";
    case "auth/user-disabled":
      return "Esta conta foi desativada. Entre em contato com o suporte.";
    case "auth/too-many-requests":
      return "Muitas tentativas sem sucesso. Tente novamente mais tarde.";
    case "auth/network-request-failed":
      return "Falha na rede. Verifique sua conexão com a internet.";
    default:
      return "Erro ao acessar conta. Verifique sua conexão.";
  }
}

export function showVerificationScreen(user) {
  if (!user) return;
  const appContainer = document.querySelector(".app-container");
  if (appContainer) appContainer.style.display = "none";

  elements.modalAuth.style.display = "flex";
  elements.modalAuthTitulo.textContent = "Verifique seu E-mail";

  elements.emailInput.parentElement.style.display = "none";
  elements.passwordInput.parentElement.style.display = "none";
  elements.btnAuthAction.style.display = "none";
  elements.btnToggleAuthMode.style.display = "none";

  mostrarFeedbackAuth(
    `Olá, ${user.email}! Sua conta foi criada, mas você precisa confirmar seu e-mail para acessar o sistema.`,
    false,
  );

  if (elements.btnResendVerification) {
    elements.btnResendVerification.style.display = "block";
  }

  if (elements.btnSairAuth) {
    elements.btnSairAuth.style.display = "block";
  }
}

export function resetAuthModalUI() {
  if (elements.emailInput) elements.emailInput.value = "";
  if (elements.passwordInput) elements.passwordInput.value = "";
  elements.modalAuth.style.display = "flex";
  elements.modalAuthTitulo.textContent = state.isRegisterMode
    ? "Cadastre-se"
    : "Login";
  elements.btnAuthAction.textContent = state.isRegisterMode
    ? "Cadastrar"
    : "Entrar";

  elements.emailInput.parentElement.style.display = "block";
  elements.passwordInput.parentElement.style.display = "block";
  elements.btnAuthAction.style.display = "block";
  elements.btnToggleAuthMode.style.display = "block";

  if (elements.btnResendVerification)
    elements.btnResendVerification.style.display = "none";
  if (elements.btnSairAuth) elements.btnSairAuth.style.display = "none";

  elements.authFeedback.style.display = "none";
}

export function exibirDataUltimaAtualizacao(timestamp) {
  if (!elements.lastUpdatedDisplay) return;
  if (timestamp && typeof timestamp.toDate === "function") {
    const data = timestamp.toDate();
    const dataFormatada = data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const horaFormatada = data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    elements.lastUpdatedDisplay.textContent = `Atualizado em ${dataFormatada}, às ${horaFormatada.replace(":", "h")}.`;
  } else {
    elements.lastUpdatedDisplay.textContent = "Nenhuma despesa registrada.";
  }
}
