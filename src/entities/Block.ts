import { SHA256 } from "../helpers";
import { Transaction } from "./Transaction";

export interface Block {
  height: number;
  transactions: Transaction[];
  previousHash: string;
  attestations: string[];
}

export function newBlock(previousBlock: Block | null): Block {
  return {
    transactions: [],
    height: previousBlock ? previousBlock.height + 1 : 0,
    previousHash: previousBlock ? calcHash(previousBlock) : "",
    attestations: [],
  };
}

export function calcHash(block: Block) {
  return SHA256(
    block.height + block.previousHash + JSON.stringify(block.transactions)
  );
}
