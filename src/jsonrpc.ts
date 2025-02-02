import express from "express";
import cors from "cors";
import { PORT } from "./constants";
import { newTransaction } from "./entities/Transaction";
import * as mempool from "./mempool";
import * as p2p from "./p2p";

import * as blockchain from "./blockchain";

let server;

export function startServer() {
  server = express();

  server.use(cors()); // Cross-origin resource sharing
  server.use(express.json());

  const routes = express.Router();

  // Healthcheck endpoint
  routes.post("", function (req: express.Request, res: express.Response) {
    handleJSONRPCRequest(req, res);
  });

  server.use(routes);

  server.listen(PORT, () =>
    console.log(`Server is listening on port: ${PORT}`)
  );
}

function handleJSONRPCRequest(req: express.Request, res: express.Response) {
  const body = req.body;
  console.log("New JSON_RPC request: ", body);
  switch (body.method) {
    case "eth_sendTransaction":
      // TODO: introduce v,r,s signature for when transaction is sent so the node can check it out
      const txData = body.params[0];
      const tx = newTransaction(
        txData.from,
        txData.to,
        BigInt(txData.value),
        txData.nonce
      );

      mempool.addNewTransaction(tx);
      p2p.broadcastNewTransaction(tx);

      res.status(200).json("Success");
      break;

    case "eth_getBlockByNumber":
      // TODO: introduce v,r,s signature for when transaction is sent so the node can check it out
      const blockNumber = body.params[0];
      const block = blockchain.getBlockByNumber(blockNumber);

      res.status(200).json({ block });
      break;

    default:
      res.status(400).json("Invalid method!");
      break;
  }
}
