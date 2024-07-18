import { SHA256 } from "../helpers";

export interface Transaction {
  from: string;
  to: string;
  value: bigint;
  data: string;
  nonce: number;
}

export function newTransaction(
  from: string,
  to: string,
  value: bigint,
  nonce: number
): Transaction {
  return {
    from,
    to,
    value,
    data: "",
    nonce,
  };
}

export function calcTxHash(tx: Transaction) {
  return SHA256(tx.from + tx.to + tx.data + tx.value + tx.nonce);
}
