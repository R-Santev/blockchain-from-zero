import { ethers } from "ethers";
import { PRIVATE_KEY } from "./constants/constants";

const signer = new ethers.Wallet(PRIVATE_KEY);

export function signMessage(message: string) {
  return signer.signMessage(message);
}

export function isValidSignature(
  signer: string,
  message: string,
  signature: string
) {
  return signer == extractMessageSigner(message, signature);
}

function extractMessageSigner(message: string, signature: string) {
  return ethers.verifyMessage(message, signature);
}
