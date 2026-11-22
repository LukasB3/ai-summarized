// Runs a task for every input with at most `limit` running at once and
// returns the results in input order. Tasks are expected to catch their own
// errors; one that throws rejects the whole pool.

export async function pool<In, Out>(inputs: readonly In[], limit: number, task: (input: In, index: number) => Promise<Out>): Promise<Out[]> {
  const results = new Array<Out>(inputs.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < inputs.length) {
      const index = next++
      results[index] = await task(inputs[index] as In, index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, inputs.length) }, worker))
  return results
}
