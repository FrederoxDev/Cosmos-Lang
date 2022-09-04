const DIGITS = /[0-9]/
const LETTERS = /[a-zA-Z]/
const LETTERS_DIGITS = /[a-zA-Z0-9_]/

const TT_INT = "TT_INT"
const TT_FLOAT = "FLOAT"
const TT_IDENTIFIER = "IDENTIFIER"
const TT_KEYWORD = "KEYWORD"
const TT_EQ = "EQ"
const TT_PLUS = "PLUS"
const TT_MINUS = "MINUS"
const TT_MUL = "MUL"
const TT_DIV = "DIV"
const TT_POW = "POW"
const TT_LPAREN = "LPAREN"
const TT_RPAREN = "RPAREN"
const TT_EOF = "EOF"

const KEYWORDS = [
    "var"
]

class Token {
    type: string
    value: any
    posStart: any
    posEnd: any

    constructor(
        type: string,
        value: any = undefined,
        posStart: any = undefined,
        posEnd: any = undefined
    ) {
        this.type = type
        this.value = value

        if (posStart) {
            this.posStart = posStart.copy()
            this.posEnd = posStart.copy()
            this.posEnd.advance()
        }
        //@ts-ignore
        if (posEnd) this.posEnd = posEnd.copy()
    }

    matches(type: string, value: any): boolean {
        return this.type === type && this.value === value
    }

    toString() {
        if (this.value == undefined) return `${this.type}`
        return `${this.type}:${this.value}`
    }
}

function StrWithArrows(text: string, posStart: Position, posEnd: Position) {
    var result = ""
    var idxStart = Math.max(text.slice(0, posStart.idx).lastIndexOf("\n"), 0)
    var idxEnd = text.indexOf("\n", idxStart + 1)
    if (idxEnd < 0) idxEnd = text.length

    var lineCount = posEnd.ln - posStart.ln + 1

    for (var i = 0; i < lineCount; i++) {
        result += text
        result += "\x1b[31m" + "^".repeat(text.length) + "\x1b[0m" + "\n"
    }

    return result
}

class LexError {
    errorName: string
    details: string
    posStart: Position
    posEnd: Position

    constructor(posStart: Position, posEnd: Position, errorName: string, details: string) {
        this.posStart = posStart
        this.posEnd = posEnd
        this.errorName = errorName
        this.details = details
    }

    toString() {
        var res = `${this.errorName}: ${this.details}`
        res += `\nFile ${this.posStart.fn}, line: ${this.posStart.ln + 1}`
        res += `\n\n${StrWithArrows(this.posStart.ftxt, this.posStart, this.posEnd)}`

        return res
    }
}

class IllegalCharError extends LexError {
    constructor(posStart: Position, posEnd: Position, details: string) {
        super(posStart, posEnd, "IllegalCharError", details)
    }
}

class InvalidSyntaxError extends LexError {
    constructor(posStart: Position, posEnd: Position, details: string) {
        super(posStart, posEnd, "InvalidSyntaxError", details)
    }
}

class RunTimeError extends LexError {
    context: Context

    constructor(posStart: Position, posEnd: Position, details: string, context: Context) {
        super(posStart, posEnd, "RunTime Error", details)
        this.context = context
    }

    toString(): string {
        var res = this.generateTraceback()
        res += `${this.errorName}: ${this.details}`
        res += `\n\n${StrWithArrows(this.posStart.ftxt, this.posStart, this.posEnd)}`

        return res
    }

    generateTraceback(): string {
        var res = ""
        var pos = this.posStart
        var ctx = this.context

        while (ctx) {
            res = `   File: ${pos.fn}, line: ${pos.ln + 1}, in ${ctx.displayName}\n${res}`
            pos = ctx.parentEntryPos
            ctx = ctx.parent
        }

        return `Traceback (most recent call last):\n${res}`
    }
}

class Position {
    idx: number
    ln: number
    col: number
    fn: string
    ftxt: string

    constructor(idx: number, ln: number, col: number, fn: string, ftxt: string) {
        this.idx = idx
        this.ln = ln
        this.col = col
        this.fn = fn
        this.ftxt = ftxt
    }

    advance(currentChar: any = null) {
        this.idx += 1
        this.col += 1

        if (currentChar == "\n" || currentChar == "\r") {
            this.ln += 1
            this.col = -1
        }

        return this
    }

    copy() {
        return new Position(this.idx, this.ln, this.col, this.fn, this.ftxt)
    }
}

class Lexer {
    text: string
    pos: Position
    currentChar: null | string
    fileName: string

    constructor(fileName: string, text: string) {
        this.text = text
        this.fileName = fileName

        this.pos = new Position(-1, 0, -1, this.fileName, this.text)
        this.currentChar = null
        this.advance()
    }

    advance() {
        this.pos.advance(this.text[this.pos.idx])

        if (this.pos.idx < this.text.length) this.currentChar = this.text[this.pos.idx]
        else this.currentChar = null
    }

    makeTokens() {
        var tokens: Token[] = []
        var ignore = [" ", "\t", "\n", "\r"]

        while (this.currentChar != null) {
            if (ignore.includes(this.currentChar)) {
                this.advance()
                continue
            }

            else if (DIGITS.test(this.currentChar)) {
                tokens.push(this.makeNumber())
                continue;
            }

            else if (LETTERS.test(this.currentChar)) {
                tokens.push(this.makeIdentifier())
            }

            else if (this.currentChar === "+") tokens.push(new Token(TT_PLUS, undefined, this.pos))
            else if (this.currentChar === "-") tokens.push(new Token(TT_MINUS, undefined, this.pos))
            else if (this.currentChar === "*") tokens.push(new Token(TT_MUL, undefined, this.pos))
            else if (this.currentChar === "^") tokens.push(new Token(TT_POW, undefined, this.pos))
            else if (this.currentChar === "/") tokens.push(new Token(TT_DIV, undefined, this.pos))
            else if (this.currentChar === "(") tokens.push(new Token(TT_LPAREN, undefined, this.pos))
            else if (this.currentChar === ")") tokens.push(new Token(TT_RPAREN, undefined, this.pos))
            else if (this.currentChar === "=") tokens.push(new Token(TT_EQ, undefined, this.pos))

            else {
                const posStart = this.pos.copy()
                const char = this.currentChar
                this.advance()

                return [[], new IllegalCharError(posStart, this.pos, `"${this.currentChar}"`)]
            }

            this.advance()
        }

        tokens.push(new Token(TT_EOF, undefined, this.pos))
        return [tokens, null]
    }

    makeNumber(): Token {
        var numStr = ""
        var dotCount = 0
        var posStart = this.pos.copy()

        while (this.currentChar != null && (DIGITS.test(this.currentChar) || this.currentChar == ".")) {
            if (this.currentChar == ".") {
                if (dotCount == 1) break

                dotCount += 1;
                numStr += "."
            }

            else numStr += this.currentChar
            this.advance()
        }

        if (dotCount == 0) return new Token(TT_INT, parseInt(numStr), posStart, this.pos)
        else return new Token(TT_FLOAT, parseFloat(numStr), posStart, this.pos)
    }

    makeIdentifier() {
        var id = ""
        var posStart = this.pos.copy()

        while (this.currentChar != null && LETTERS_DIGITS.test(this.currentChar)) {
            id += this.currentChar
            this.advance()
        }

        var tokenType

        if (KEYWORDS.includes(id)) tokenType = TT_KEYWORD
        else tokenType = TT_IDENTIFIER

        return new Token(tokenType, id, posStart, this.pos)
    }
}

class VarAccessNode {
    varNameToken: any
    posStart: any
    posEnd: any

    constructor(varNameToken: any) {
        this.varNameToken = varNameToken
        this.posStart = this.varNameToken.posStart
        this.posEnd = this.varNameToken.posEnd
    }
}

class VarAssignNode {
    varNameToken: any
    valueNode: any
    posStart: any
    posEnd: any

    constructor(varNameToken: any, valueNode: any) {
        this.varNameToken = varNameToken
        this.valueNode = valueNode

        this.posStart = this.varNameToken.posStart
        this.posEnd = this.valueNode.posEnd
    }
}

class NumberNode {
    token: Token
    posStart: any
    posEnd: any

    constructor(token: Token) {
        this.token = token
        this.posStart = token.posStart
        this.posEnd = token.posEnd
    }

    toString() {
        return `${this.token.toString()}`
    }
}

class BinOpNode {
    leftNode: NumberNode
    opToken: Token
    rightNode: NumberNode

    posStart: any
    posEnd: any

    constructor(leftNode: NumberNode, opToken: Token, rightNode: NumberNode) {
        this.leftNode = leftNode
        this.opToken = opToken
        this.rightNode = rightNode

        this.posStart = this.leftNode.posStart
        this.posEnd = this.rightNode.posEnd
    }

    toString() {
        return `(${this.leftNode.toString()}, ${this.opToken.toString()}, ${this.rightNode.toString()})`
    }
}

class UnaryOpNode {
    opToken: Token
    node: { posEnd: any }
    posStart: any
    posEnd: any

    constructor(opToken: Token, node: any) {
        this.opToken = opToken
        this.node = node

        this.posStart = this.opToken.posStart
        this.posEnd = this.node.posEnd
    }

    toString() {
        return `(${this.opToken}, ${this.node})`
    }
}

class ParseResult {
    error: any
    node: any
    advanceCount: number

    constructor() {
        this.error = undefined
        this.node = undefined
        this.advanceCount = 0
    }

    register(res: any) {
        this.advanceCount += res.advanceCount
        if (res.error) this.error = res.error
        return res.node
    }

    registerAdvancement() {
        this.advanceCount += 1
    }

    success(node: any) {
        this.node = node
        return this
    }

    failure(error: any) {
        if (!this.error || this.advanceCount == 0) this.error = error
        return this
    }
}

class Parser {
    tokens: Token[]
    tokenIdx: number
    currentToken: Token

    constructor(tokens: Token[]) {
        this.tokens = tokens
        this.tokenIdx = -1
        //@ts-ignore
        this.currentToken = undefined
        this.advance()
    }

    advance() {
        this.tokenIdx += 1

        if (this.tokenIdx < this.tokens.length) {
            this.currentToken = this.tokens[this.tokenIdx]
        }

        return this.currentToken
    }

    parse() {
        const res = this.expr()
        if (!res.error && this.currentToken.type != TT_EOF) {
            //@ts-ignore
            return res.failure(new InvalidSyntaxError(this.currentToken.posStart, this.currentToken.posEnd,
                "Expected Operator ('+', '-', '*' or '/')"
            ))
        }

        return res
    }

    atom() {
        var res = new ParseResult()
        var token = this.currentToken

        if ([TT_INT, TT_FLOAT].includes(token.type)) {
            res.registerAdvancement()
            this.advance()
            return res.success(new NumberNode(token))
        }

        else if (token.type == TT_IDENTIFIER) {
            res.registerAdvancement()
            this.advance()
            return res.success(new VarAccessNode(token))
        }

        else if (token.type == TT_LPAREN) {
            res.registerAdvancement()
            this.advance()
            var expr = res.register(this.expr())
            if (res.error) return res

            if (this.currentToken.type == TT_RPAREN) {
                res.registerAdvancement()
                this.advance()
                return res.success(expr)
            }

            else {
                return res.failure(new InvalidSyntaxError(this.currentToken.posStart, this.currentToken.posEnd,
                    "Expected ')'"
                ))
            }
        }

        return res.failure(new InvalidSyntaxError(this.currentToken.posStart, this.currentToken.posEnd,
            "Expected int, float, identifier, '+', '-' or '('"
        ))
    }

    power() {
        var res = new ParseResult()
        var left = res.register(this.atom())
        if (res.error) return res

        while ([TT_POW].includes(this.currentToken.type)) {
            var opTok = this.currentToken
            res.registerAdvancement()
            this.advance()
            var right = res.register(this.factor())
            if (res.error) return res

            //@ts-ignore
            left = new BinOpNode(left, opTok, right)
        }

        return res.success(left)
    }

    factor() {
        var res = new ParseResult()
        var token = this.currentToken

        if ([TT_PLUS, TT_MINUS].includes(token.type)) {
            res.registerAdvancement()
            this.advance()
            var factor = res.register(this.factor())
            if (res.error) return res
            return res.success(new UnaryOpNode(token, factor))
        }

        return this.power()
    }

    term() {
        var res = new ParseResult()
        var left = res.register(this.factor())
        if (res.error) return res

        while ([TT_MUL, TT_DIV].includes(this.currentToken.type)) {
            var opTok = this.currentToken
            res.registerAdvancement()
            this.advance()
            var right = res.register(this.factor())
            if (res.error) return res

            //@ts-ignore
            left = new BinOpNode(left, opTok, right)
        }

        return res.success(left)
    }

    expr() {
        var res = new ParseResult()

        if (this.currentToken.matches(TT_KEYWORD, "var")) {
            res.registerAdvancement()
            this.advance()

            if (this.currentToken.type != TT_IDENTIFIER) {
                return res.failure(new InvalidSyntaxError(this.currentToken.posStart, this.currentToken.posEnd,
                    "Expected Identifier"
                ))
            }

            var name = this.currentToken
            res.registerAdvancement()
            this.advance()

            //@ts-ignore
            if (this.currentToken.type != TT_EQ) {
                return res.failure(new InvalidSyntaxError(this.currentToken.posStart, this.currentToken.posEnd,
                    "Expected '='"
                ))
            }

            res.registerAdvancement()
            this.advance()
            var expr = res.register(this.expr())
            if (res.error) return res

            return res.success(new VarAssignNode(name, expr))
        }

        else {
            var node = res.register(this.literal())

            if (res.error) {
                return res.failure(new InvalidSyntaxError(this.currentToken.posStart, this.currentToken.posEnd,
                    "Expected 'var', int, float, identifier, '+', '-' or '('"
                ))
            }
            return res.success(node)
        }
    }

    literal() {
        var res = new ParseResult()
        var left = res.register(this.term())
        if (res.error) return res

        while ([TT_PLUS, TT_MINUS].includes(this.currentToken.type)) {
            var opTok = this.currentToken
            res.registerAdvancement()
            this.advance()
            var right = res.register(this.term())
            if (res.error) return res

            //@ts-ignore
            left = new BinOpNode(left, opTok, right)
        }

        return res.success(left)
    }
}

class RunTimeResult {
    value: any
    error: any

    constructor() {
        this.value = undefined
        this.error = null
    }

    register(res: any) {
        if (res.error) this.error = res.error
        return res.value
    }

    success(value: any) {
        this.value = value
        return this
    }

    failure(error: any) {
        this.error = error
        return this
    }
}

class Number {
    value: number
    posStart: any
    posEnd: any
    context: any

    constructor(value: number) {
        this.value = value
        this.setPos()
        this.setContext()
    }

    setPos(posStart: any = undefined, posEnd: any = undefined) {
        this.posStart = posStart
        this.posEnd = posEnd
        return this
    }

    setContext(context: any = undefined) {
        this.context = context
        return this
    }

    add(other: any) {
        if (other instanceof Number) {
            return [new Number(this.value + other.value).setContext(this.context), null]
        }
    }

    subtract(other: any) {
        if (other instanceof Number) {
            return [new Number(this.value - other.value).setContext(this.context), null]
        }
    }

    multiply(other: any) {
        if (other instanceof Number) {
            return [new Number(this.value * other.value).setContext(this.context), null]
        }
    }

    divide(other: any) {
        if (other instanceof Number) {
            if (other.value == 0) return [null, new RunTimeError(other.posStart, other.posEnd, "Cannot divide by 0", this.context)]
            return [new Number(this.value / other.value).setContext(this.context), null]
        }
    }

    power(other: any) {
        if (other instanceof Number) {
            return [new Number(Math.pow(this.value, other.value)).setContext(this.context), null]
        }
    }

    copy() {
        var copy = new Number(this.value)
        copy.setPos(this.posStart, this.posEnd)
        copy.setContext(this.context)
        return copy 
    }

    toString() {
        return this.value.toString()
    }
}

class Context {
    displayName: string
    parent: any
    parentEntryPos: any
    symbolTable: any

    constructor(displayName: string, parent: any = undefined, parentEntryPos: any = undefined) {
        this.displayName = displayName
        this.parent = parent
        this.parentEntryPos = parentEntryPos
        this.symbolTable = undefined
    }
}

class SymbolTable {
    symbols: any
    parent: any

    constructor() {
        this.symbols = {}
        this.parent = undefined
    }

    get(name: string) {
        var value = this.symbols[name]

        if (value === undefined && this.parent) {
            return this.parent.get(name)
        }

        return value
    }

    set(name: string, value: any) {
        this.symbols[name] = value
    }

    remove(name: string) {
        delete this.symbols[name]
    }
}

class Interpreter {
    constructor() { }

    visit(node: any, context: Context): any {
        if (node.constructor.name == "NumberNode") return this.visitNumberNode(node, context)
        else if (node.constructor.name == "BinOpNode") return this.visitBinOpNode(node, context)
        else if (node.constructor.name == "UnaryOpNode") return this.visitUnaryOpNode(node, context)
        else if (node.constructor.name == "VarAccessNode") return this.visitVarAccessNode(node, context)
        else if (node.constructor.name == "VarAssignNode") return this.visitVarAssignNode(node, context)
        else if (node.constructor.name == "UnaryOpNode") return this.visitUnaryOpNode(node, context)
    }

    visitVarAccessNode(node: any, context: Context) {
        var res = new RunTimeResult()
        var varName = node.varNameToken.value
        var value = context.symbolTable.get(varName)

        if (!value) {
            return res.failure(new RunTimeError(node.posStart, node.posEnd,
                `${varName} is not defined`,
                context
            ))
        }

        value = value.copy().setPos(node.posStart, node.posEnd)
        return res.success(value)
    }

    visitVarAssignNode(node: any, context: Context) {
        var res = new RunTimeResult()
        var varName = node.varNameToken.value
        var value = res.register(this.visit(node.valueNode, context))
        if (res.error) return res

        context.symbolTable.set(varName, value)
        return res.success(value)
    }

    visitNumberNode(node: any, context: Context) {
        return new RunTimeResult().success(
            new Number(node.token.value)
                .setContext(context)
                .setPos(node.posStart, node.posEnd)
        )
    }

    visitBinOpNode(node: any, context: Context) {
        var res = new RunTimeResult()
        var left = res.register(this.visit(node.leftNode, context))
        if (res.error) return res

        var right = res.register(this.visit(node.rightNode, context))
        if (res.error) return res

        var result: any
        var error: any

        if (node.opToken.type == TT_PLUS) [result, error] = left.add(right)
        else if (node.opToken.type == TT_MINUS) [result, error] = left.subtract(right)
        else if (node.opToken.type == TT_MUL) [result, error] = left.multiply(right)
        else if (node.opToken.type == TT_DIV) [result, error] = left.divide(right)
        else if (node.opToken.type == TT_POW) [result, error] = left.power(right)

        if (error) return res.failure(error)
        else return res.success(result.setPos(node.posStart, node.posEnd))
    }

    visitUnaryOpNode(node: any, context: Context) {
        var res = new RunTimeResult()
        var number = res.register(this.visit(node.node, context))
        if (res.error) return res

        var error = undefined

        if (node.opToken.type == TT_MINUS) {
            [number, error] = number.multiply(new Number(-1))
        }

        if (res.error) return res
        else return res.success(number.setPos(node.posStart, node.posEnd))
    }
}

var globalSymbolTable = new SymbolTable()
globalSymbolTable.set("null", new Number(0))

export function run(fileName: string, text: string) {
    // Generate tokens
    const lexer = new Lexer(fileName, text)
    const [tokens, error] = lexer.makeTokens()

    if (error) return [[], error]

    // Generate AST
    const parser = new Parser(<Token[]>tokens)
    const ast = parser.parse()
    if (ast.error) return [null, ast.error]

    // Run program
    const interpreter = new Interpreter()
    var context = new Context("<program>")
    context.symbolTable = globalSymbolTable
    const result = interpreter.visit(ast.node, context)

    return [result.value, result.error]
}