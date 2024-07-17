import { Block } from "./entities/Block";
import { calcTxHash, Transaction } from "./entities/Transaction";

let transactions: Transaction[] = [];

export function addNewTransaction(transaction: Transaction) {
  transactions.push(transaction);
  console.log("TX added to mempool: ", transaction);
}

export function fullfillBlock(block: Block) {
  block.transactions = [...transactions];
  transactions = [];
}

export function cleanAddedToBlockTransactions(block: Block) {
  for (const tx of block.transactions) {
    const txHash = calcTxHash(tx);
    for (const [index, mempoolTx] of transactions.entries()) {
      const mempoolTxHash = calcTxHash(mempoolTx);
      if (mempoolTxHash == txHash) {
        transactions.splice(index, 1);
      }
    }
  }
}

function removeItem(arr: Transaction[], value: Transaction) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}
