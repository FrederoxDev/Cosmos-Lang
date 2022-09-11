import { readFile } from "fs"
import { Context, Interpreter, SymbolTable } from "./Interpreter"
import { Lexer } from "./Lexer"
import { Parser } from "./Parser"

const [,, ...args] = process.argv

readFile(args[0], "utf-8", (err, data) => {
    if (err != null) return console.warn(err)
    var [result, error] = run(args[0], data)

    if (error) return console.log(error.toString())
    console.log(result)
})

var globalSymbolTable = new SymbolTable()

function run(fileName: string, fileText: string) {
    const showTokens = false;

    const lexer = new Lexer(fileName, fileText)
    const [tokens, error] = lexer.makeTokens()
    if (error) return [[], error]

    if (showTokens) {
        tokens.forEach(token => {
            console.log(token.toString())
        })
    
        console.log("\n")
    }

    const parser = new Parser(fileText, tokens)
    const ast = parser.parse()
    if (ast.error) return [null, ast.error]

    const interpreter = new Interpreter(fileText)
    var context = new Context("<program>")
    context.symbolTable = globalSymbolTable
    const result = interpreter.visit(ast.node, context)

    return [result.value, result.error]
}