const proc = Bun.spawn(["bun", "-e", 'console.log("metro log line")'], {
  stdin: "ignore",
  stdout: "pipe",
  stderr: "pipe",
  detached: true,
});
proc.unref();
const out = await new Response(proc.stdout).text();
const err = await new Response(proc.stderr).text();
await Bun.write("spawn-test.log", out + err);
const log = await Bun.file("spawn-test.log").text();
console.log("log contains output:", log.includes("metro log line"));
