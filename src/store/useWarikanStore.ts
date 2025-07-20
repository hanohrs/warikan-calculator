// src/store/useWarikanStore.ts

import { create } from "zustand";
import type { Expense } from "../types";

// 状態
type State = {
  inputMember: string;
  inputExpense: Expense;
  members: Set<string>;
  expenses: Expense[];
};

// 更新用の処理
type Action = {
  updateInputMember: (inputMember: string) => void;
  updateInputExpense: (inputExpense: Expense) => void;
  addMember: () => void;
  addExpense: () => void;
  removeExpense: (description: string) => void;
};

const useWarikanStore = create<State & Action>((set) => ({
  // initial state
  inputMember: "",
  inputExpense: { paidBy: "", description: "", amount: 0 },
  members: new Set<string>(),
  expenses: [],
  // actions
  updateInputMember: (inputMember: string) =>
    set(() => ({ inputMember: inputMember })),
  updateInputExpense: (inputExpense: Expense) =>
    set(() => ({ inputExpense: inputExpense })),
  addMember: () =>
    set((state) => {
      const trimmedMember = state.inputMember.trim();
      // 重複の確認
      const isDuplicateMember = state.members.has(trimmedMember);
      // バリデーション
      if (trimmedMember && !isDuplicateMember) {
        return {
          members: new Set(state.members).add(trimmedMember),
          inputMember: "",
        };
      }
      return state;
    }),
  addExpense: () =>
    set((state) => {
      // 支払い内容のトリミング
      const { paidBy, description, amount } = state.inputExpense;
      const trimmedDescription = description.trim();
      // 重複の確認
      const isDuplicateDescription = state.expenses.some(
        (expense) => expense.description === trimmedDescription
      );
      // バリデーション
      if (paidBy && trimmedDescription && amount && !isDuplicateDescription) {
        return {
          expenses: [
            ...state.expenses,
            { ...state.inputExpense, description: trimmedDescription },
          ],
          inputExpense: { paidBy: "", description: "", amount: 0 },
        };
      }
      return state;
    }),
  removeExpense: (description: string) =>
    set((state) => {
      return {
        expenses: state.expenses.filter(
          (expense) => expense.description !== description
        ),
      };
    }),
}));

export default useWarikanStore;
