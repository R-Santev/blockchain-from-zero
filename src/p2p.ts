import { createLibp2p, Libp2p } from "libp2p";
import {
  BOOTNODE_ONE_ADDRESS,
  BOOTNODE_TWO_ADDRESS,
  P2P_ADDRESS,
} from "./constants/constants";
import { tcp } from "@libp2p/tcp";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";
import { mdns } from "@libp2p/mdns";
import { bootstrap } from "@libp2p/bootstrap";
import { identify } from "@libp2p/identify";
import { gossipsub, GossipsubEvents } from "@chainsafe/libp2p-gossipsub";
import { PubSub, Message } from "@libp2p/interface";

import * as mempool from "./mempool";
import { Transaction } from "./entities/Transaction";
import { Block } from "./entities/Block";

export enum PUBSUB_TOPICS {
  newTransaction = "NEW_TRANSACTION",
  newBlock = "NEW_BLOCK",
}

let p2p: Libp2p<{
  pubsub: PubSub<GossipsubEvents>;
}>;

export async function startServer() {
  p2p = await createLibp2p({
    addresses: {
      listen: [P2P_ADDRESS],
    },
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    peerDiscovery: [
      mdns({
        interval: 1000,
      }),
      bootstrap({
        list: [BOOTNODE_ONE_ADDRESS, BOOTNODE_TWO_ADDRESS],
        timeout: 6000, // in ms,
        tagName: "bootstrap",
        tagValue: 50,
        tagTTL: 120000, // in ms
      }),
    ],
    services: {
      identify: identify(),
      pubsub: gossipsub({
        allowPublishToZeroTopicPeers: true,
      }),
    },
  });

  await p2p.start();
  console.log("P2P server started!");

  console.log("listening on addresses:");
  p2p.getMultiaddrs().forEach((addr) => {
    console.log(addr.toString());
  });

  p2p.addEventListener("peer:discovery", function (peerId) {
    console.log("found peer: ", peerId.detail.multiaddrs);
  });

  subscribeToTopics();
  p2p.services.pubsub.addEventListener("message", (message) => {
    handleMessage(message);
  });
}

function subscribeToTopics() {
  p2p.services.pubsub.subscribe(PUBSUB_TOPICS.newTransaction);
  p2p.services.pubsub.subscribe(PUBSUB_TOPICS.newBlock);
}

function handleMessage(message: CustomEvent<Message>) {
  const data = new TextDecoder().decode(message.detail.data);
  const parsedData = JSON.parse(data);
  console.log("P2P message received: ", message.detail.topic);
  switch (message.detail.topic) {
    case PUBSUB_TOPICS.newTransaction:
      mempool.addNewTransaction(parsedData);
      break;

    case PUBSUB_TOPICS.newBlock:
      onNewBlock(JSON.parse(data));

    default:
      break;
  }
}

export function broadcastNewTransaction(transaction: Transaction) {
  p2p.services.pubsub.publish(
    PUBSUB_TOPICS.newTransaction,
    new TextEncoder().encode(JSON.stringify(transaction))
  );

  console.log("TX broadcasted: ", transaction);
}

export function broadcastNewBlock(block: Block) {
  p2p.services.pubsub.publish(
    PUBSUB_TOPICS.newBlock,
    new TextEncoder().encode(JSON.stringify(block))
  );

  console.log("New Block broadcasted: ", block);
}

let onNewBlock: (block: Block) => void;
export function setOnNewBlock(callbackFunc: (block: Block) => void) {
  onNewBlock = callbackFunc;
}
