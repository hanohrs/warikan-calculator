import type { Expense } from "../types";
import useWarikanStore from "../store/useWarikanStore";

type MemberCalculation = {
  [key: string]: number;
};

// 各メンバーが支払った個人総額を算出
const calculateTotalPaidByMember = (
  members: Set<string>,
  expenses: Expense[]
) => {
  const totalPaidByMember: MemberCalculation = {};

  members.forEach((member) => (totalPaidByMember[member] = 0));
  expenses.forEach((expense) => {
    totalPaidByMember[expense.paidBy] += expense.amount;
  });

  return totalPaidByMember;
};

// 全員の総額を算出
const calculateTotal = (totalPaidByMember: MemberCalculation) => {
  return Object.values(totalPaidByMember).reduce((a, b) => a + b, 0);
};

// １人あたりが本来支払うべき金額（割り勘）を算出
const calculateTotalPerMember = (total: number, members: Set<string>) => {
  return total / members.size;
};

// それぞれのメンバーの過払い額 or 不足額を算出
const calculateDifferences = (
  members: Set<string>, // メンバー名の Set
  totalPaidByMember: MemberCalculation, // 各メンバーが支払った個人総額
  totalPerMember: number // １人あたりが本来支払うべき金額（割り勘額）
) => {
  const differences: MemberCalculation = {}; // メンバーごとの過不足を格納するオブジェクト
  members.forEach((member) => {
    differences[member] = totalPaidByMember[member] - totalPerMember; // 支払った金額 - 支払うべき金額
  });
  return differences;
};

// 各メンバーの過不足を相殺し、最適な精算方法を算出します。
const calculateWarikanPlan = (differences: MemberCalculation) => {
  // 精算方法を格納する配列
  const warikanPlan: { from: string; to: string; amount: number }[] = [];

  // 多く支払っているメンバーのみを格納する配列
  const overpaidMembers = Object.keys(differences).filter(
    (member) => differences[member] > 0
  );

  // 支払いが不足しているメンバーのみを格納する配列
  const underpaidMembers = Object.keys(differences).filter(
    (member) => differences[member] < 0
  );

  // 多く支払っているメンバーと、不足しているメンバーがいる場合、記述された処理を繰り返します
  while (overpaidMembers.length > 0 && underpaidMembers.length > 0) {
    // 多く支払っているメンバーと、支払いが不足しているメンバーを選出
    const receiver = overpaidMembers[0];
    const payer = underpaidMembers[0];

    // 絶対値が小さい方の額を精算したいので、比較して小さい方を選出
    const amount = Math.min(differences[receiver], -differences[payer]);

    // 精算する額が 0 より大きい場合、精算を行う
    if (amount > 0) {
      // 精算する額を warikanPlan に追加
      warikanPlan.push({
        from: payer,
        to: receiver,
        amount: Math.round(amount),
      });
      // 精算した額を、多く支払っているメンバーの過不足から引き算
      differences[receiver] -= amount;
      // 精算した額を、支払いが不足しているメンバーの過不足に足し算
      differences[payer] += amount;
    }

    // メンバーの過不足が 0 になった場合、配列から取り除く
    if (differences[receiver] === 0) overpaidMembers.shift();
    if (differences[payer] === 0) underpaidMembers.shift();
  }

  return warikanPlan;
};

/**
 * 割り勘を行うための最適な精算方法を求めます。
 *
 * @remarks
 * このフックでは、以下の処理が行われます：
 * 1. 各メンバーが支払った個人総額を算出
 * 2. 全員の総額を算出
 * 3. １人あたりが本来支払うべき金額（割り勘）を算出
 * 4. それぞれのメンバーの過払い額または不足額を算出
 * 5. 各メンバーの過不足を比較して相殺
 */
const useResultLogic = () => {
  const members = useWarikanStore((state) => state.members);
  const expenses = useWarikanStore((state) => state.expenses);

  if (members.size === 0 || expenses.length === 0) {
    return [];
  }

  const totalPaidByMember = calculateTotalPaidByMember(members, expenses);
  const total = calculateTotal(totalPaidByMember);
  const totalPerMember = calculateTotalPerMember(total, members);
  const differences = calculateDifferences(
    members,
    totalPaidByMember,
    totalPerMember
  );

  return calculateWarikanPlan(differences);
};

export default useResultLogic;
