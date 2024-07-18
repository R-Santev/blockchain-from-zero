import { configDotenv } from "dotenv";
import * as p2p from "./p2p";
import * as jsonrpc from "./jsonrpc";
import * as consensus from "./consensus";
configDotenv();

const main = async () => {
  await p2p.startServer();
  jsonrpc.startServer();
  consensus.startServer();
};

main().then().catch(console.error);

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};
