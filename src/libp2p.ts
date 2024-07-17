import { tcp } from "@libp2p/tcp";
import { mdns } from "@libp2p/mdns";
import { mplex } from "@libp2p/mplex";
import { identify } from "@libp2p/identify";
import { createLibp2p, Libp2p } from "libp2p";
import { bootstrap } from "@libp2p/bootstrap";
import { noise } from "@chainsafe/libp2p-noise";
import { PubSub, Message } from "@libp2p/interface";
import { gossipsub, GossipsubEvents } from "@chainsafe/libp2p-gossipsub";

import * as mempool from "./mempool";
import { Block } from "./entities/Block";
import { Transaction } from "./entities/Transaction";
import {
  BOOTNODE_ONE_ADDRESS,
  BOOTNODE_TWO_ADDRESS,
  MY_ADDRESS,
} from "./constants";

export enum MESSAGE_TYPE {
  sendTransaction = "SEND_TRANSACTION",
  newBlock = "NEW_BLOCK",
}

let node: Libp2p<{
  pubsub: PubSub<GossipsubEvents>;
}>;

export async function startServer() {
  node = await createLibp2p({
    addresses: {
      listen: [MY_ADDRESS],
    },
    transports: [tcp()],
    connectionEncryption: [noise({})],
    streamMuxers: [mplex()],
    peerDiscovery: [
      mdns({
        interval: 10000,
      }),
      bootstrap({
        list: [
          // a list of bootstrap peer multiaddrs to connect to on node startup
          BOOTNODE_ONE_ADDRESS!,
          BOOTNODE_TWO_ADDRESS!,
        ],
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

  // start libp2p
  await node.start();

  // print out listening addresses
  console.log("listening on addresses:");
  node.getMultiaddrs().forEach((addr) => {
    console.log(addr.toString());
  });

  node.addEventListener("peer:discovery", function (peerId) {
    console.log("found peer: ", peerId.detail.multiaddrs);
  });

  subscribeToTopics();
  node.services.pubsub.addEventListener("message", (message) => {
    handleMessage(message);
  });

  // stop libp2p
  // await node.stop();
  // console.log("libp2p has stopped");

  return node;
}

function subscribeToTopics() {
  node.services.pubsub.subscribe(MESSAGE_TYPE.sendTransaction);
  node.services.pubsub.subscribe(MESSAGE_TYPE.newBlock);
}

export function broadcastNewTransaction(transaction: Transaction) {
  node.services.pubsub.publish(
    MESSAGE_TYPE.sendTransaction,
    new TextEncoder().encode(JSON.stringify(transaction))
  );

  console.log("TX broadcasted: ", transaction);
}

export function broadcastNewBlock(block: Block) {
  node.services.pubsub.publish(
    MESSAGE_TYPE.newBlock,
    new TextEncoder().encode(JSON.stringify(block))
  );

  console.log("New Block broadcasted: ", block);
}

export function handleMessage(message: CustomEvent<Message>) {
  const data = new TextDecoder().decode(message.detail.data);
  console.log("p2p message received: ", message.detail.topic);
  switch (message.detail.topic) {
    case MESSAGE_TYPE.sendTransaction:
      mempool.addNewTransaction(JSON.parse(data));
      break;

    case MESSAGE_TYPE.newBlock:
      onNewBlock(JSON.parse(data));

    default:
      break;
  }
}

let onNewBlock: (block: Block) => void;
export function setOnNewBlock(callbackFunc: (block: Block) => void) {
  onNewBlock = callbackFunc;
}
