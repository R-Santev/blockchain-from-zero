import { VALIDATOR_NUMBER } from "./constants";
import { Block, calcHash } from "./entities/Block";
import * as blockchain from "./blockchain";
import * as p2p from "./libp2p";
import * as crypto from "crypto";
import * as signer from "./signer";

const validatorsCount = 4;
let pendingBlock: Block | null;

export async function startServer() {
  blockchain.bootstrapBlockchain();
  handleBlockMessages();

  while (true) {
    if (pendingBlock) {
      if (hasQuorum()) {
        blockchain.addBlock(pendingBlock);
        console.log("Block successfuly added: ", pendingBlock);

        pendingBlock = null;
      } else {
        console.log(
          "No quorum yet. Provided attestations: ",
          pendingBlock.approvals.length
        );
      }

      await delay(1);

      continue;
    }

    const nextBlock = blockchain.getLastBlock().height + 1;
    const isProposer = nextBlock % validatorsCount == VALIDATOR_NUMBER;
    if (isProposer) {
      console.log("We are the proposer!");
      pendingBlock = await blockchain.generateNextBlock();
      await delay(5); // minimum block time is 10 seconds
      p2p.broadcastNewBlock(pendingBlock!);
    }

    await delay(1);
  }
}

function hasQuorum() {
  // TODO: validiateApprovals
  return pendingBlock!.approvals.length >= (validatorsCount * 2) / 3 + 1; // quorum is 2/3 + 1
}

function handleBlockMessages() {
  p2p.setOnNewBlock(async function (block: Block) {
    if (!pendingBlock) {
      if (isValidBlock(block)) {
        const myApproval = await signer.signMessage(calcHash(block));
        if (!block.approvals.includes(myApproval)) {
          block.approvals.push(myApproval);
        }

        pendingBlock = block;
        console.log("New pending block: ", block);
        p2p.broadcastNewBlock(pendingBlock);
      } else {
        console.log("ERROR: Received candidate for pending block is invalid");
      }

      return;
    }

    // TODO: sync blocks if newBlock higher and consensus must move up

    if (!isSameAsPending(block)) {
      // NB: In production blockchain you can have a different suggestion for block
      // It is fine to have different pending versions. Usually ou add the first that has enough approvals
      console.log("ERROR: received block different than pending!");
    }

    let isSomethingChanged = false;
    const newApprovals = [];
    for (const approval of block.approvals) {
      if (!pendingBlock.approvals.includes(approval)) {
        newApprovals.push(approval);
        isSomethingChanged = true;
      }
    }

    const myApproval = await signer.signMessage(calcHash(pendingBlock));
    if (!pendingBlock.approvals.includes(myApproval)) {
      newApprovals.push(myApproval);
      isSomethingChanged = true;
    }

    if (newApprovals) {
      block.approvals.push(...newApprovals);
    }

    if (isSomethingChanged) {
      pendingBlock.approvals.push(...newApprovals);
      p2p.broadcastNewBlock(pendingBlock);
    }
  });
}

const delay = (s: any) => new Promise((res) => setTimeout(res, s * 1000));

function isValidBlock(block: Block) {
  // validate all block data (transactions)
  return blockchain.getLastBlock().height + 1 == block.height;
}

function isSameAsPending(block: Block) {
  return calcHash(pendingBlock!) == calcHash(block);
}

const SHA256 = (message: string) =>
  crypto.createHash("sha256").update(message).digest("hex");
