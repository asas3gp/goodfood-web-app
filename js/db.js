import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUserProfile = async (uid, data) =>
  setDoc(doc(db, "users", uid), data, { merge: true });

export const getFoods = async () => {
  const snap = await getDocs(collection(db, "foods"));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const getRestaurants = async () => {
  const snap = await getDocs(collection(db, "restaurants"));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const getRestaurantMenus = async () => {
  const snap = await getDocs(collection(db, "restaurant_menus"));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const addFoodLog = async (uid, log) =>
  addDoc(collection(db, "food_logs"), {
    uid,
    ...log,
    createdAt: serverTimestamp(),
  });

export const updateFoodLog = async (id, data) =>
  updateDoc(doc(db, "food_logs", id), data);

export const deleteFoodLog = async (id) =>
  deleteDoc(doc(db, "food_logs", id));

export const getFoodLogsByDate = async (uid, dateKey) => {
  const q = query(
    collection(db, "food_logs"),
    where("uid", "==", uid),
    where("dateKey", "==", dateKey)
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const getFoodLogsByUser = async (uid) => {
  const q = query(collection(db, "food_logs"), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const addBudgetRecord = async (uid, record) =>
  addDoc(collection(db, "budget_records"), {
    uid,
    ...record,
    createdAt: serverTimestamp(),
  });

export const getBudgetRecordsByDate = async (uid, dateKey) => {
  const q = query(
    collection(db, "budget_records"),
    where("uid", "==", uid),
    where("dateKey", "==", dateKey)
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const getBudgetRecordsByUser = async (uid) => {
  const q = query(collection(db, "budget_records"), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};
