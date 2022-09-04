import { run } from "./Basic"

const input = process.stdin
input.setDefaultEncoding("utf-8")

input.on("data", function (data) {
    var text = data.toString("utf-8").replace("\r", "")
    const [result, error] = run("<stdin>", text)

    if (error) console.log(error.toString())
    else console.log(result?.toString())
    console.log("\n")
})