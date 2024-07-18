import { Block, calcHash, newBlock } from "./entities/Block";
import * as mempool from "./mempool";
import * as signer from "./signer";

interface Blockchain {
  chain: Block[];
}

let blockchain: Blockchain = {
  chain: [],
};

export function bootstrapBlockchain() {
  blockchain.chain = [generateGenesisBlock()];
}

export function getLastBlock() {
  return blockchain.chain[blockchain.chain.length - 1];
}

export function getBlockByNumber(blockNum: number) {
  return blockchain.chain[blockNum];
}

export function getChain() {
  return blockchain.chain;
}

export function addBlock(block: Block) {
  mempool.cleanAddedToBlockTransactions(block);

  // Object.freeze ensures immutability in our code
  blockchain.chain.push(Object.freeze(block));
}

function generateGenesisBlock(): Block {
  return newBlock(null);
}

export async function generateNextBlock() {
  let block = newBlock(blockchain.chain[blockchain.chain.length - 1]);
  mempool.fullfillBlock(block);
  block.attestations.push(await signer.signMessage(calcHash(block)));

  return block;
}
