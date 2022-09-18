import { readFile } from "fs"
import { Context, Interpreter, SymbolTable, String, Number, Boolean } from "./Interpreter"
import { Lexer } from "./Lexer"
import { Parser } from "./Parser"

const [,, ...args] = process.argv

readFile(args[0], "utf-8", (err, data) => {
    if (err != null) return console.warn(err)
    if (data == "") return console.warn("Empty file")
    var [result, error] = run(args[0], data)

    if (error) return console.log(error.toString())
    console.log(result.toString())
})

var globalSymbolTable = new SymbolTable()

function run(fileName: string, fileText: string) {
    const showTokens = false;
    const showAST = false;
    const showSymbolTable = false;

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

    if (showAST) console.log(ast)

    const interpreter = new Interpreter(fileText)
    var context = new Context("<program>")
    context.symbolTable = globalSymbolTable
    const result = interpreter.visit(ast.node, context)

    if (showSymbolTable) console.log(context.symbolTable.toString())

    return [result.value, result.error]
}