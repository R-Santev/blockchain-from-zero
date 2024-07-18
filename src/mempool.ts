import { Block } from "./entities/Block";
import { calcTxHash, Transaction } from "./entities/Transaction";

let transactions: Transaction[] = [];

export function addNewTransaction(transaction: Transaction) {
  // Check is transaction valid:
  // not already added
  // sender has enoug balance
  // nonce is not too high
  // etc.

  transactions.push(transaction);
  console.log("TX added to mempool: ", transaction);
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

export function fullfillBlock(block: Block) {
  block.transactions = [...transactions];
  transactions = [];
}
