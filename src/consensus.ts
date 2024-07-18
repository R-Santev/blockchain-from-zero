import { VALIDATOR_NUMBER } from "./constants/constants";
import { Block, calcHash } from "./entities/Block";
import * as blockchain from "./blockchain";
import * as p2p from "./p2p";
import * as crypto from "crypto";
import * as signer from "./signer";
import { delay } from "./helpers";

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
          pendingBlock.attestations.length
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

function handleBlockMessages() {
  p2p.setOnNewBlock(async function (block: Block) {
    if (!pendingBlock) {
      if (isValidBlock(block)) {
        const myApproval = await signer.signMessage(calcHash(block));
        if (!block.attestations.includes(myApproval)) {
          block.attestations.push(myApproval);
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

    const newAttestations = [];
    for (const attestation of block.attestations) {
      if (!pendingBlock.attestations.includes(attestation)) {
        newAttestations.push(attestation);
      }
    }

    const myAttestation = await signer.signMessage(calcHash(pendingBlock));
    if (!pendingBlock.attestations.includes(myAttestation)) {
      newAttestations.push(myAttestation);
    }

    if (newAttestations.length > 0) {
      pendingBlock.attestations.push(...newAttestations);
      p2p.broadcastNewBlock(pendingBlock);
    }
  });
}

function isSameAsPending(block: Block) {
  return calcHash(pendingBlock!) == calcHash(block);
}

function hasQuorum() {
  // TODO: validiateApprovals

  return (
    pendingBlock!.attestations.length >=
    Math.floor((validatorsCount * 2) / 3 + 1)
  ); // quorum is FLOOR(2/3 + 1)
}

function isValidBlock(block: Block) {
  // validate all block data (transactions)
  return blockchain.getLastBlock().height + 1 == block.height;
}
