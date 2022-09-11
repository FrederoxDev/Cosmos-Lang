import { LexError, Position, Token, TokenType, Types } from "./Lexer";

export class ParseResult {
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

    toString() {
        return `${this.node.toString()}`
    }
}

class InvalidSyntaxError extends LexError {
    constructor(fileText: string, posStart: Position, posEnd: Position, details: string) {
        super(fileText, posStart, posEnd, "InvalidSyntaxError", details)
    }
}

export class NumberNode {
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

export class BooleanNode {
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

export class StringNode {
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

export class BinOpNode {
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
        return `BinOpNode(${this.leftNode.toString()}, ${this.opToken.toString()}, ${this.rightNode.toString()})`
    }
}

export class UnaryOpNode {
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
        return `UnaryOpNode(${this.opToken}, ${this.node})`
    }
}

export class VarAssignNode {
    nameToken: Token
    typeToken: Token
    valueToken: Token
    posStart: Position
    posEnd: Position

    constructor(nameToken: Token, typeToken: Token, valueToken: Token) {
        this.nameToken = nameToken
        this.typeToken = typeToken
        this.valueToken = valueToken
        this.posStart = typeToken.posStart
        this.posEnd = valueToken.posEnd
    }

    toString() {
        return `VarAssignNode(${this.typeToken.toString()} ${this.nameToken.toString()} = ${this.valueToken.toString()})`
    }
}

export class VarAccessNode {
    varNameToken: Token
    posStart: Position
    posEnd: Position

    constructor(varNameToken: Token) {
        this.varNameToken = varNameToken
        this.posStart = this.varNameToken.posStart
        this.posEnd = this.varNameToken.posEnd
    }
}

export class IfNode {
    condition: any
    expr: any
    elseExpr: any
    posStart: any
    posEnd: any

    constructor(condition: any, expr: any, elseExpr: any) {
        this.condition = condition
        this.expr = expr
        this.elseExpr = elseExpr

        this.posStart = this.condition.posStart

        if (elseExpr != undefined) {
            this.posEnd = elseExpr.posEnd
        } 
        else {
            this.posEnd = this.expr.posEnd
        }
    }
}

export class Parser {
    tokens: Token[]
    currentToken: Token
    tokenIdx: number
    fileText: string

    constructor(fileText: string, tokens: Token[]) {
        this.fileText = fileText
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

    parse(): ParseResult {
        const res = this.expr()

        if (!res.error && this.currentToken.type != TokenType.EndOfFile) {
            return res.failure(new InvalidSyntaxError(this.fileText, this.currentToken.posStart, this.currentToken.posEnd,
                "Unexpected EOF"
            ))
        }

        return res
    }

    expr(): ParseResult {
        const res = new ParseResult()

        if (this.currentToken.type == TokenType.LBrace) {
            res.registerAdvancement()
            this.advance()

            var expr = res.register(this.expr())
            if (res.error) return res

            //@ts-ignore
            if (this.currentToken.type != TokenType.RBrace) {
                return res.failure(new InvalidSyntaxError(this.fileText, this.currentToken.posStart, this.currentToken.posEnd,
                    "Expected '}'"
                ))
            }

            res.registerAdvancement()
            this.advance()

            return res.success(expr)
        }

        // Define variables
        if (this.currentToken.type == TokenType.Type) {
            const typeToken = this.currentToken
            res.registerAdvancement()
            this.advance()

            //@ts-ignore
            if (this.currentToken.type != TokenType.Identifier) {
                return res.failure(new InvalidSyntaxError(this.fileText, this.currentToken.posStart, this.currentToken.posEnd,
                    "Expected Identifier"
                ))
            }

            var varNameToken = this.currentToken
            res.registerAdvancement()
            this.advance()

            if (this.currentToken.type != TokenType.Equals) {
                return res.failure(new InvalidSyntaxError(this.fileText, this.currentToken.posStart, this.currentToken.posEnd,
                    "Expected '='"
                ))
            }

            res.registerAdvancement()
            this.advance()

            var expr = res.register(this.expr())
            if (res.error) return res
            return res.success(new VarAssignNode(varNameToken, typeToken, expr))
        }

        var node = res.register(this.binOp(this.compExpr, [TokenType.And, TokenType.Or]))
        if (res.error) return res

        return res.success(node)
    }

    compExpr(): ParseResult {
        const res = new ParseResult()

        if (this.currentToken.type == TokenType.Not) {
            var opToken = this.currentToken
            res.registerAdvancement()
            this.advance()

            var node = res.register(this.compExpr())
            if (res.error) return res

            return res.success(new UnaryOpNode(opToken, node))
        }

        else if (this.currentToken.type == TokenType.LParen) {
            res.registerAdvancement()
            this.advance()

            var expr = res.register(this.expr())
            if (res.error) return res

            return res.success(expr)
        }

        var node = res.register(this.binOp(this.arithExpr, [TokenType.EE, TokenType.NE, TokenType.GT, TokenType.GTE, TokenType.LT, TokenType.LTE]))
        
        if (res.error) {
            return res.failure(new InvalidSyntaxError(this.fileText, this.currentToken.posStart, this.currentToken.posEnd, 
                "compExpr()"    
            ))
        }

        return res.success(node)
    }

    arithExpr(): ParseResult {
        return this.binOp(this.term, [TokenType.Plus, TokenType.Minus])
    }

    term(): ParseResult {
        return this.binOp(this.factor, [TokenType.Multiply, TokenType.Divide])
    }

    factor(): ParseResult {
        var res = new ParseResult()
        var token = this.currentToken

        if ([TokenType.Plus, TokenType.Minus].includes(token.type)) {
            res.registerAdvancement()
            this.advance()

            var factor = res.register(this.factor())
            if (res.error) return res
            return res.success(new UnaryOpNode(token, factor))
        }

        return this.atom()
    }

    atom(): ParseResult {
        var res = new ParseResult()
        var token = this.currentToken

        if ([TokenType.Number].includes(token.type)) {
            res.registerAdvancement()
            this.advance()
            return res.success(new NumberNode(token))
        }

        else if ([TokenType.String].includes(token.type)) {
            res.registerAdvancement()
            this.advance()
            return res.success(new StringNode(token))
        }

        else if ([TokenType.Boolean].includes(token.type)) {
            res.registerAdvancement()
            this.advance()
            return res.success(new BooleanNode(token))
        }

        else if ([TokenType.Identifier].includes(token.type)) {
            res.registerAdvancement()
            this.advance()
            return res.success(new VarAccessNode(token))
        }

        else if (token.matches(TokenType.Keyword, "if")) {
            var ifExpr = res.register(this.ifExpr())
            if (res.error) return res
            return res.success(ifExpr)
        }

        return res.failure(new InvalidSyntaxError(this.fileText, this.currentToken.posStart, this.currentToken.posEnd,
            "Expected number, string, or boolean"
        ))
    }

    ifExpr() {
        var res = new ParseResult()
        res.registerAdvancement()
        this.advance()

        if (this.currentToken.type != TokenType.LParen) {
            return res.failure(new InvalidSyntaxError(this.fileText, this.currentToken.posStart, this.currentToken.posEnd,
                "Expected '('"
            ))
        }

        res.registerAdvancement()
        this.advance()

        var condition = res.register(this.expr())
        if (res.error) return res

        //@ts-ignore
        if (this.currentToken.type != TokenType.RParen) {
            return res.failure(new InvalidSyntaxError(this.fileText, this.currentToken.posStart, this.currentToken.posEnd,
                "Expected ')'"
            ))
        }

        res.registerAdvancement()
        this.advance()

        var expr = res.register(this.expr())
        if (res.error) return res

        var elseExpr = undefined

        if (this.currentToken.matches(TokenType.Keyword, "else")) {
            res.registerAdvancement()
            this.advance()

            elseExpr = res.register(this.expr())
            if (res.error) return res
        }

        return res.success(new IfNode(condition, expr, elseExpr))
    }

    binOp(funcA: Function, ops: any, funcB: Function | undefined = undefined) {
        if (funcB === undefined) funcB = funcA

        var res = new ParseResult()
        var left = res.register(funcA.bind(this)())
        if (res.error) return res

        // while (ops.includes(this.currentToken.type) || ops.includes([this.currentToken.type, this.currentToken.value])) {
        while (ops.includes(this.currentToken.type) || this.CheckArray(ops, [this.currentToken.type, this.currentToken.value])) {
            var opTok = this.currentToken

            res.registerAdvancement()
            this.advance()

            var right = res.register(funcB.bind(this)())
            if (res.error) return res
            left = new BinOpNode(left, opTok, right)
        }

        return res.success(left)
    }

    CheckArray(arr: any, value: any) {
        for (var t = 0; t < arr.length; t++) {
            if (arr[t][0] == value[0] && arr[t][1] == value[1]) return true
        }
    }
}