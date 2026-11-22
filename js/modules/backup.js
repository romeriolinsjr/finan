// js/modules/backup.js
// Backup local em .json: somente leitura dos dados do usuário no Firestore.
// A única gravação é o campo "ultimoBackup" no documento do usuário,
// usado pelo lembrete da sidebar. Não chama registrarUltimaAlteracao,
// porque o backup não altera nenhum dado financeiro.
import { state } from "./state.js";
import { elements } from "./elements.js";
import { db } from "./firebase-config.js";

// Todas as subcoleções gravadas em users/{uid} pelo app
const COLECOES_BACKUP = [
  "transacoes",
  "orcamentos",
  "orcamentosFechados",
  "cartoes",
  "ajustesFatura",
  "faturasConferidas",
  "dividasTerceiros",
  "pessoas",
  "patrimonioCategorias",
  "patrimonioSubcategorias",
  "ciclos_tracker",
  "votos_tracker",
];

const DIAS_LIMITE_LEMBRETE_BACKUP = 30;

// Converte os tipos internos do Firestore em valores aceitos pelo JSON
function converterValorParaJson(valor) {
  if (valor === null || valor === undefined) return valor;
  if (valor instanceof firebase.firestore.Timestamp) {
    return valor.toDate().toISOString();
  }
  if (valor instanceof firebase.firestore.DocumentReference) {
    return valor.path;
  }
  if (valor instanceof firebase.firestore.GeoPoint) {
    return { latitude: valor.latitude, longitude: valor.longitude };
  }
  if (Array.isArray(valor)) return valor.map(converterValorParaJson);
  if (typeof valor === "object") {
    const convertido = {};
    Object.keys(valor).forEach((chave) => {
      convertido[chave] = converterValorParaJson(valor[chave]);
    });
    return convertido;
  }
  return valor;
}

// Data local do dispositivo no formato YYYY-MM-DD (sem toISOString)
function obterDataLocalArquivo(data) {
  const ano = data.getFullYear();
  const mes = (data.getMonth() + 1).toString().padStart(2, "0");
  const dia = data.getDate().toString().padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export async function baixarBackupJson() {
  if (!state.currentUser) return;
  const btn = elements.btnBaixarBackup;
  if (btn && btn.disabled) return;

  const textoOriginal = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Gerando backup…";
  }

  try {
    const userRef = db.collection("users").doc(state.currentUser.uid);

    // Leitura direta do Firestore (o state só contém os meses já carregados)
    const [userDoc, ...snapshots] = await Promise.all([
      userRef.get(),
      ...COLECOES_BACKUP.map((nome) => userRef.collection(nome).get()),
    ]);

    const colecoes = {};
    const totais = {};
    COLECOES_BACKUP.forEach((nome, i) => {
      colecoes[nome] = snapshots[i].docs.map((d) => ({
        id: d.id,
        ...converterValorParaJson(d.data()),
      }));
      totais[nome] = colecoes[nome].length;
    });

    const agora = new Date();
    const conteudo = {
      app: "Finan",
      versaoBackup: 1,
      geradoEm: agora.toISOString(),
      usuario: {
        uid: state.currentUser.uid,
        email: state.currentUser.email,
      },
      perfil: userDoc.exists ? converterValorParaJson(userDoc.data()) : null,
      totais: totais,
      colecoes: colecoes,
    };

    const blob = new Blob([JSON.stringify(conteudo, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finan-backup-${obterDataLocalArquivo(agora)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Registra a data do backup (relógio do dispositivo, para evitar o valor
    // nulo que o serverTimestamp exibe no snapshot local antes da confirmação)
    try {
      await userRef.set(
        { ultimoBackup: firebase.firestore.Timestamp.now() },
        { merge: true },
      );
    } catch (error) {
      console.error("Erro ao registrar a data do último backup:", error);
    }
  } catch (error) {
    console.error("Erro ao gerar o backup:", error);
    alert(
      "Não foi possível gerar o backup. Verifique a conexão e tente novamente.",
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }
}

export function exibirLembreteBackup(timestamp) {
  const el = elements.lembreteBackupDisplay;
  if (!el) return;
  el.classList.remove("backup-atrasado");

  if (!timestamp || typeof timestamp.toDate !== "function") {
    el.textContent = "⚠️ Nenhum backup realizado.";
    el.classList.add("backup-atrasado");
    return;
  }

  const data = timestamp.toDate();
  const hoje = new Date();
  const inicioHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  );
  const inicioData = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
  );
  const dias = Math.round((inicioHoje - inicioData) / 86400000);

  if (dias > DIAS_LIMITE_LEMBRETE_BACKUP) {
    el.textContent = `⚠️ Último backup há ${dias} dias.`;
    el.classList.add("backup-atrasado");
  } else {
    const dataFormatada = data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    el.textContent = `Último backup em ${dataFormatada}.`;
  }
}
