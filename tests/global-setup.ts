import path from "node:path";

export default function setup() {
  const bin = path.resolve(process.cwd(), "node_modules/.bin");
  if (!process.env.PATH?.split(path.delimiter).includes(bin)) {
    process.env.PATH = `${bin}${path.delimiter}${process.env.PATH ?? ""}`;
  }
}
