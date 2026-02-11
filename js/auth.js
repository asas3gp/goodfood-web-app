import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  clampNumber,
  showToast,
  showPageLoader,
  hidePageLoader,
} from "./utils.js";

export const requireAuth = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      resolve(user);
    });
  });

export const hydrateUserBadge = async (user) => {
  const nameEls = document.querySelectorAll("[data-user-name]");
  if (!nameEls.length) return;
  let displayName = user.displayName;
  if (!displayName) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) displayName = snap.data().name;
  }
  if (!displayName && user.email) {
    const local = user.email.split("@")[0] || "";
    displayName = local
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .trim();
  }
  nameEls.forEach((el) => {
    el.textContent = displayName || "Pengguna";
  });
};

const redirectIfAuthed = () => {
  const hasAuthForm =
    document.getElementById("loginForm") ||
    document.getElementById("registerForm");
  if (!hasAuthForm) return;
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "dashboard.html";
  });
};

const bindLoginForm = () => {
  const form = document.getElementById("loginForm");
  if (!form) return;
  const errorEl = document.getElementById("loginError");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (errorEl) errorEl.textContent = "";
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    try {
      showPageLoader("Memproses login...");
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Login berhasil. Mengalihkan...");
      window.location.href = "dashboard.html";
    } catch (error) {
      hidePageLoader();
      if (errorEl) errorEl.textContent = error.message;
    }
  });
};

const bindRegisterForm = () => {
  const form = document.getElementById("registerForm");
  if (!form) return;
  const errorEl = document.getElementById("registerError");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (errorEl) errorEl.textContent = "";
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const dailyBudgetValue = document.getElementById("regBudget").value;
    const dailyBudget = clampNumber(dailyBudgetValue, 0);
    if (!name) {
      if (errorEl) errorEl.textContent = "Nama wajib diisi.";
      return;
    }
    if (dailyBudget === null || dailyBudget <= 0) {
      if (errorEl) errorEl.textContent = "Budget harian harus lebih dari 0.";
      return;
    }
    try {
      showPageLoader("Membuat akun...");
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(credential.user, { displayName: name });
      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        name,
        email,
        dailyBudget,
        createdAt: serverTimestamp(),
      });
      showToast("Akun berhasil dibuat. Selamat datang!");
      window.location.href = "dashboard.html";
    } catch (error) {
      hidePageLoader();
      if (errorEl) errorEl.textContent = error.message;
    }
  });
};

const bindLogoutButtons = () => {
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        showPageLoader("Keluar...");
        await signOut(auth);
        window.location.href = "login.html";
      } catch (error) {
        hidePageLoader();
        showToast("Gagal logout. Coba lagi.");
      }
    });
  });
};

redirectIfAuthed();
bindLoginForm();
bindRegisterForm();
bindLogoutButtons();
