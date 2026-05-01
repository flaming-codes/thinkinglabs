import type { Readable, Writable } from "node:stream";

/** A typed action a reviewer can pick for one proposal; the handler computes the result. */
export interface ReviewActionDef<P, R> {
  readonly key: string;
  readonly label: string;
  readonly handle: (payload: P) => Promise<R> | R;
}

/** Generic per-proposal record fed to the runtime; payload is opaque to the runtime. */
export interface ReviewProposal<P> {
  readonly id: string;
  readonly title: string;
  readonly preview: string;
  readonly payload: P;
}

/** Renders the prompt line from action definitions. */
function renderPrompt(actions: ReadonlyArray<ReviewActionDef<unknown, unknown>>): string {
  const parts = actions.map((a) => `[${a.key}]${a.label}`);
  return parts.join(" ") + " ? ";
}

/** Reads one keystroke from a readable stream; resolves when a byte arrives. */
function readKey(input: Readable): Promise<string> {
  return new Promise((resolve) => {
    function onData(chunk: Buffer | string): void {
      input.off("data", onData);
      resolve(typeof chunk === "string" ? (chunk[0] ?? "") : String.fromCharCode(chunk[0] ?? 0));
    }
    input.once("data", onData);
  });
}

/** Drives the keystroke loop in order; returns one result per proposal. */
export async function runReview<P, R>(
  proposals: ReadonlyArray<ReviewProposal<P>>,
  actions: ReadonlyArray<ReviewActionDef<P, R>>,
  io?: { input?: Readable; output?: Writable },
): Promise<ReadonlyArray<R>> {
  const input = io?.input ?? process.stdin;
  const output = io?.output ?? process.stdout;
  const results: R[] = [];
  if (proposals.length === 0) return results;

  const prompt = renderPrompt(actions as ReadonlyArray<ReviewActionDef<unknown, unknown>>);
  const isRaw =
    "setRawMode" in input && typeof (input as NodeJS.ReadStream).setRawMode === "function";
  if (isRaw) (input as NodeJS.ReadStream).setRawMode(true);
  input.resume();

  try {
    for (const proposal of proposals) {
      output.write(`\n${proposal.title}\n${proposal.preview}\n`);
      let resolved = false;
      while (!resolved) {
        output.write(prompt);
        const key = await readKey(input);
        output.write(`${key}\n`);
        const action = actions.find((a) => a.key === key);
        if (!action) {
          output.write(`Unrecognized key '${key}'. ${prompt}`);
          continue;
        }
        results.push(await action.handle(proposal.payload));
        resolved = true;
      }
    }
  } finally {
    if (isRaw) (input as NodeJS.ReadStream).setRawMode(false);
    input.pause();
  }

  return results;
}
