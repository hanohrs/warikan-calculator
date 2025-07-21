import type { Expense } from "../types";
import useWarikanStore from "../store/useWarikanStore";

type MemberCalculation = Map<string, bigint>;

// メンバーごとの支払った総額を算出
function calculateTotalPaidByMember(expenses: Expense[]): MemberCalculation {
  const totalPaidByMember: MemberCalculation = new Map<string, bigint>();

  expenses.forEach((expense) => {
    const currentTotal = totalPaidByMember.get(expense.paidBy) || 0n;
    totalPaidByMember.set(expense.paidBy, currentTotal + expense.amount);
  });

  return totalPaidByMember;
}

// 全員の総額を算出
const calculateTotal = (totalPaidByMember: MemberCalculation) => {
  return totalPaidByMember.values().reduce((sum, amount) => sum + amount, 0n);
};

// １人あたりが本来支払うべき金額（割り勘）を算出
const calculateTotalPerMember = (total: bigint, members: Set<string>): MemberCalculation => {
  const memberCount = BigInt(members.size);
  const baseAmount = total / memberCount;
  const remainder = total % memberCount;

  // 各メンバーが支払うべき金額を格納するMap
  const totalPerMemberMap = new Map<string, bigint>();

  // メンバーを配列に変換（余りの分配用）
  const membersArray = Array.from(members);

  // 各メンバーの支払額を計算
  membersArray.forEach((member, index) => {
    // 余りを公平に分配するため、余りの数だけ1円追加
    const extraAmount = index < Number(remainder) ? 1n : 0n;
    totalPerMemberMap.set(member, baseAmount + extraAmount);
  });

  return totalPerMemberMap;
};

// それぞれのメンバーの過払い額 or 不足額を算出
const calculateDifferences = (
  members: Set<string>, // メンバー名の Set
  totalPaidByMember: MemberCalculation, // 各メンバーが支払った個人総額
  totalPerMember: MemberCalculation // １人あたりが本来支払うべき金額（割り勘額）
) => {
  const differences: MemberCalculation = new Map(); // メンバーごとの過不足を格納するオブジェクト
  members.forEach((member) => {
    differences.set(
      member,
      (totalPaidByMember.get(member) || 0n) - (totalPerMember.get(member) || 0n)
    ); // 支払った金額 - 支払うべき金額
  });
  return differences;
};

// 各メンバーの過不足を相殺し、最適な精算方法を算出します。
const calculateWarikanPlan = (differences: MemberCalculation) => {
  // 精算方法を格納する配列
  const warikanPlan: { from: string; to: string; amount: bigint }[] = [];

  // 多く支払っているメンバーのみを格納する配列
  const overpaidMembers = Array.from(differences.entries())
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => Number(b[1] - a[1])) // 金額の降順でソート
    .map(([member]) => member);

  // 支払いが不足しているメンバーのみを格納する配列
  const underpaidMembers = Array.from(differences.entries())
    .filter(([, amount]) => amount < 0)
    .sort((a, b) => Number(a[1] - b[1])) // 金額の昇順でソート
    .map(([member]) => member);

  // 多く支払っているメンバーと、不足しているメンバーがいる場合、記述された処理を繰り返します
  while (overpaidMembers.length > 0 && underpaidMembers.length > 0) {
    // 多く支払っているメンバーと、支払いが不足しているメンバーを選出
    const receiver = overpaidMembers[0];
    const payer = underpaidMembers[0];

    // 絶対値が小さい方の額を精算したいので、比較して小さい方を選出
    const receiverDifference = differences.get(receiver)!;
    const payerDifference = -differences.get(payer)!; // 支払いが不足しているので、正の値に変換
    const amount =
      receiverDifference < payerDifference
        ? receiverDifference
        : payerDifference;

    // 精算する額が 0 より大きい場合、精算を行う
    // 精算する額を warikanPlan に追加
    warikanPlan.push({
      from: payer,
      to: receiver,
      amount: amount,
    });
    // 精算した額を、多く支払っているメンバーの過不足から引き算
    differences.set(receiver, differences.get(receiver)! - amount);
    // 精算した額を、支払いが不足しているメンバーの過不足に足し算
    differences.set(payer, differences.get(payer)! + amount);

    // メンバーの過不足が 0 になった場合、配列から取り除く
    if (differences.get(receiver)! === 0n) overpaidMembers.shift();
    if (differences.get(payer)! === 0n) underpaidMembers.shift();
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

  const totalPaidByMember = calculateTotalPaidByMember(expenses);
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
