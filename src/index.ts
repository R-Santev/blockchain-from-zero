import { configDotenv } from "dotenv";

configDotenv();

const main = async () => {};

main().then().catch(console.error);

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};
