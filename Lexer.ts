export const DigitsReg = /[0-9]/
export const IdentifierReg = /[a-zA-Z0-9_]/

export enum TokenType {
    Type,
    Number,
    String,
    Boolean,
    Identifier,
    Keyword,
    Equals,
    EndOfFile,
    SemiColon,
    LBrace,
    RBrace,
    LParen,
    RParen,
    LSqr,
    RSqr,
    Comma,

    Plus,
    Minus,
    Multiply,
    Divide,

    // Comparison Operators
    EE,
    NE,
    LT,
    LTE,
    GT,
    GTE,

    // Logical Operators
    Not, 
    Or,
    And
}

export const Keywords = ["if", "else", "function"]

export const Types = [
    "number",
    "string",
    "boolean",
    "array"
]

export class Token {
    type: TokenType
    value: any
    posStart: any
    posEnd: any

    constructor(type: TokenType, value: any = undefined, posStart: Position | undefined = undefined, posEnd: Position | undefined = undefined) {
        this.type = type
        this.value = value
        
        if (posStart) {
            this.posStart = posStart.copy()
            this.posEnd = posStart.copy()
            this.posEnd.advance()
        }

        if (posEnd) this.posEnd = posEnd.copy()
    }

    toString() {
        if (this.value == undefined) return `${TokenType[this.type]}`
        return `${TokenType[this.type]}:${this.value}`
    }

    matches(type: TokenType, value: any): boolean {
        return this.type === type && this.value === value
    }
}

export class Position {
    idx: number
    ln: number
    col: number

    constructor(idx: number, ln: number, col: number) {
        this.idx = idx
        this.ln = ln
        this.col = col
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

    /**
     * Returns a copy of the position object
     */
    copy() {
        return new Position(this.idx, this.ln, this.col)
    }
}

export class LexError {
    errorName: string
    details: string
    posStart: Position
    posEnd: Position
    fileText: string

    constructor(fileText: string, posStart: Position, posEnd: Position, errorName: string, details: string) {
        this.posStart = posStart
        this.posEnd = posEnd
        this.errorName = errorName
        this.details = details
        this.fileText = fileText
    }

    toString() {
        var res = `${this.errorName}: ${this.details}`
        res += `\n    at ${this.posStart.col} to ${this.posEnd.col}`
        res += `\n\n${this.Underline(this.fileText, this.posStart, this.posEnd)}`

        return res
    }

    Underline(text: string, posStart: Position, posEnd: Position) {
        var result = ""
        text = text.split("\n")[Math.max(posStart.ln - 1, 0)]

        if (text != undefined) {
            result += text + "\n"
            result += "\x1b[31m" + "^".repeat(text.length) + "\x1b[0m" 
        }
    
        return result
    }
}

class IllegalCharError extends LexError {
    constructor(fileText: string, posStart: Position, posEnd: Position, details: string) {
        super(fileText, posStart, posEnd, "IllegalCharError", details)
    }
}

class ExpectedCharError extends LexError {
    constructor(fileText: string, posStart: Position, posEnd: Position, details: string) {
        super(fileText, posStart, posEnd, "ExpectedCharError", details)
    }
}

export class Lexer {
    pos: Position
    lastPos: Position
    currentChar: null | string
    fileName: string
    fileText: string

    constructor(fileName: string, fileText: string) {
        this.fileName = fileName
        this.fileText = fileText

        this.pos = new Position(-1, 0, -1)
        this.lastPos = new Position(-1, 0, -1)
        this.currentChar = null
        this.advance()
    }

    advance(): void {
        this.lastPos = this.pos.copy()
        this.pos.advance(this.fileText[this.pos.idx])

        if (this.pos.idx < this.fileText.length)
            this.currentChar = this.fileText[this.pos.idx]

        else this.currentChar = null
    }

    reverse(): void {
        this.pos = this.lastPos.copy()
    }

    makeTokens(): [Token[], any | null] {
        var tokens: Token[] = []
        var ignore = ["\r", "\n", " ", "\t"]

        while (this.currentChar != null) {
            if (ignore.includes(this.currentChar)) {
                this.advance()
                continue;
            }

            // 0-9
            if (DigitsReg.test(this.currentChar)) {
                tokens.push(this.makeNumber())
            }

            // a-Z, 0-9, _
            else if (IdentifierReg.test(this.currentChar)) {
                tokens.push(this.makeIdentifier())
            }

            else if (this.currentChar === '"') {
                tokens.push(this.makeString())
            }

            else if (["=", ">", "<", "|", "&", "!"].includes(this.currentChar)) {
                var [token, error] = this.makeOperator()
                if (error) return [[], error]
                tokens.push(token)
            }

            else if (this.currentChar === "(") tokens.push(new Token(TokenType.LParen, undefined, this.pos))
            else if (this.currentChar === ")") tokens.push(new Token(TokenType.RParen, undefined, this.pos))
            else if (this.currentChar === "{") tokens.push(new Token(TokenType.LBrace, undefined, this.pos))
            else if (this.currentChar === "}") tokens.push(new Token(TokenType.RBrace, undefined, this.pos))
            else if (this.currentChar === "[") tokens.push(new Token(TokenType.LSqr, undefined, this.pos))
            else if (this.currentChar === "]") tokens.push(new Token(TokenType.RSqr, undefined, this.pos))
            else if (this.currentChar === "+") tokens.push(new Token(TokenType.Plus, undefined, this.pos))
            else if (this.currentChar === "-") tokens.push(new Token(TokenType.Minus, undefined, this.pos))
            else if (this.currentChar === "*") tokens.push(new Token(TokenType.Multiply, undefined, this.pos))
            else if (this.currentChar === "/") tokens.push(new Token(TokenType.Divide, undefined, this.pos))
            else if (this.currentChar === ";") tokens.push(new Token(TokenType.SemiColon, undefined, this.pos))
            else if (this.currentChar === ",") tokens.push(new Token(TokenType.Comma, undefined, this.pos))

            else {
                return [[], new IllegalCharError(this.fileText, this.pos, this.pos, 
                    `Unexpected Char '${this.currentChar}'`
                )]
            }
            
            this.advance()
        }

        tokens.push(new Token(TokenType.EndOfFile, undefined, this.pos))
        return [tokens, null]
    }

    makeNumber(): Token {
        var numStr = ""
        var dotCount = 0
        var posStart = this.pos.copy()

        while (this.currentChar != null && (DigitsReg.test(this.currentChar) || this.currentChar == ".")) {
            if (this.currentChar == ".") {
                if (dotCount == 1) break

                dotCount += 1;
                numStr += "."
            }

            else numStr += this.currentChar
            this.advance()
        }

        this.reverse()
        return new Token(TokenType.Number, parseFloat(numStr), posStart, this.pos)
    }

    makeIdentifier(): Token {
        var id = ""
        var posStart = this.pos.copy()

        // Get the name of the identifier
        while (this.currentChar != null && IdentifierReg.test(this.currentChar)) {
            id += this.currentChar
            this.advance()
        }

        // Types: e.g. const *number* example = 10
        if (Types.includes(id)) {
            return new Token(TokenType.Type, id, posStart, this.pos)
        }

        if (id == "true") return new Token(TokenType.Boolean, true, posStart, this.pos)
        if (id == "false") return new Token(TokenType.Boolean, false, posStart, this.pos)
        
        // Keywords: e.g. const, var
        if (Keywords.includes(id)) {
            return new Token(TokenType.Keyword, id, posStart, this.pos)
        }

        this.reverse()
        return new Token(TokenType.Identifier, id, posStart, this.pos)
    }

    makeString(): Token {
        var string = ""
        var posStart = this.pos.copy()
        var escape = false

        this.advance()

        const replacements: any = {
            "n": "\n",
            "t": "\t"
        }
        
        while (this.currentChar != null && (this.currentChar != '"' || escape)) {
            if (escape) {
                string += replacements[this.currentChar] || this.currentChar
                escape = false
            } 
            
            else {
                if (this.currentChar == "\\") {
                    escape = true
                }
    
                else {
                    string += this.currentChar
                }
            }

            this.advance()
        }

        return new Token(TokenType.String, string, posStart, this.pos)
    }

    makeOperator(): any {
        var posStart = this.pos.copy()
        var char = this.currentChar
        this.advance()

        if (char == "=") {
            if (this.currentChar == "=") return [new Token(TokenType.EE, undefined, posStart, this.pos), null]
            else {
                this.reverse()
                return [new Token(TokenType.Equals, undefined, posStart, this.pos), null]
            }
        }

        else if (char == ">") {
            if (this.currentChar == "=") return [new Token(TokenType.GTE, undefined, posStart, this.pos), null]
            else {
                this.reverse()
                return [new Token(TokenType.GT, undefined, posStart, this.pos), null]
            }
        }

        else if (char == "<") {
            if (this.currentChar == "=") return [new Token(TokenType.LTE, undefined, posStart, this.pos), null]
            else {
                this.reverse()
                return [new Token(TokenType.LT, undefined, posStart, this.pos), null]
            }
        }

        else if (char == "!") {
            if (this.currentChar == "=") return [new Token(TokenType.NE, undefined, posStart, this.pos), null]
            else {
                this.reverse()
                return [new Token(TokenType.Not, undefined, posStart, this.pos), null]
            }
        }

        else if (char == "|") {
            if (this.currentChar == "|") return [new Token(TokenType.Or, undefined, posStart, this.pos), null]
            else return [null, new ExpectedCharError(this.fileText, posStart, this.pos, `"'|'"`)]
        }

        else if (char == "&") {
            if (this.currentChar == "&") return [new Token(TokenType.And, undefined, posStart, this.pos), null]
            else return [null, new ExpectedCharError(this.fileText, posStart, this.pos, `"'&'"`)]
        }
    }
}