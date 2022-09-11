import { LexError, Position, TokenType } from "./Lexer"
import { BinOpNode, BooleanNode, IfNode, NumberNode, StringNode, UnaryOpNode, VarAccessNode, VarAssignNode } from "./Parser"

export class Context {
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

export class SymbolTable {
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

export class RunTimeResult {
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

export class RunTimeError extends LexError {
    context: Context

    constructor(fileText: string, posStart: Position, posEnd: Position, details: string, context: Context) {
        super(fileText, posStart, posEnd, "RunTime Error", details)
        this.context = context
    }

    toString(): string {
        var res = this.generateTraceback()
        res += `${this.errorName}: ${this.details}`
        res += `\n\n${this.Underline(this.fileText, this.posStart, this.posEnd)}`

        return res
    }

    generateTraceback(): string {
        var res = ""
        var pos = this.posStart
        var ctx = this.context

        while (ctx) {
            res = `   line: ${pos.ln + 1}, in ${ctx.displayName}\n${res}`
            pos = ctx.parentEntryPos
            ctx = ctx.parent
        }

        return `Traceback (most recent call last):\n${res}`
    }
}

export class Number {
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
            if (other.value == 0) return [null, new RunTimeError(fileText, other.posStart, other.posEnd,
                "Cannot divide by 0", this.context
            )]
            return [new Number(this.value / other.value).setContext(this.context), null]
        }
    }

    //#region Comparison Operators
    getComparisonEE(other: any) {
        if (other instanceof Number) {
            return [new Boolean(this.value === other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '==' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    getComparisonNE(other: any) {
        return [new Boolean(this.value !== other.value).setContext(this.context), null]
    }

    getComparisonGT(other: any) {
        if (other instanceof Number) {
            return [new Boolean(this.value > other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '>' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    getComparisonGTE(other: any) {
        if (other instanceof Number) {
            return [new Boolean(this.value >= other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '>=' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    getComparisonLT(other: any) {
        if (other instanceof Number) {
            return [new Boolean(this.value < other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '<' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    getComparisonLTE(other: any) {
        if (other instanceof Number) {
            return [new Boolean(this.value <= other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '<=' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }
    //#endregion

    //#region Logical Operators
    operatorAND(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '&&' operator cannot be applied to operand of type 'Number'", this.context
        )]
    }

    operatorOR(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '||' operator cannot be applied to operand of type 'Number'", this.context
        )]
    }

    operatorNOT() {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '!' operator cannot be applied to operand of type 'Number'", this.context
        )]
    }
    //#endregion
}

export class Boolean {
    value: boolean
    posStart: any
    posEnd: any
    context: any

    constructor(value: boolean) {
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
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '+' operator cannot be applied to operand of type 'Boolean'", this.context
        )]
    }

    subtract(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '-' operator cannot be applied to operand of type 'Boolean'", this.context
        )]
    }

    multiply(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '*' operator cannot be applied to operand of type 'Boolean'", this.context
        )]
    }

    divide(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '/' operator cannot be applied to operand of type 'Boolean'", this.context
        )]
    }

    //#region Comparison Operators
    getComparisonEE(other: any) {
        if (other instanceof Boolean) {
            return [new Boolean(this.value === other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '==' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    getComparisonNE(other: any) {
        return [new Boolean(this.value !== other.value).setContext(this.context), null]
    }

    getComparisonGT(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '>' operator cannot be applied to operand of type 'Boolean'", this.context
        )]
    }

    getComparisonGTE(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '>=' operator cannot be applied to operand of type 'Boolean'", this.context
        )]
    }

    getComparisonLT(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '<' operator cannot be applied to operand of type 'Boolean'", this.context
        )]
    }

    getComparisonLTE(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '<=' operator cannot be applied to operand of type 'Boolean'", this.context
        )]
    }
    //#endregion

    //#region Logical Operators
    operatorAND(other: any) {
        if (other instanceof Boolean) {
            return [new Boolean(this.value && other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '&&' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    operatorOR(other: any) {
        if (other instanceof Boolean) {
            return [new Boolean(this.value || other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '||' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    operatorNOT() {
        return [new Boolean(!this.value).setContext(this.context), null]
    }
    //#endregion
}

export class String {
    value: string
    posStart: any
    posEnd: any
    context: any

    constructor(value: string) {
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
        if (other instanceof String) {
            return [new String(this.value + other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '+' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    subtract(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '-' operator cannot be applied to operand of type 'String'", this.context
        )]
    }

    multiply(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '*' operator cannot be applied to operand of type 'String'", this.context
        )]
    }

    divide(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '/' operator cannot be applied to operand of type 'String'", this.context
        )]
    }

    //#region Comparison Operators
    getComparisonEE(other: any) {
        if (other instanceof String) {
            return [new Boolean(this.value === other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '==' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    getComparisonNE(other: any) {
        return [new Boolean(this.value !== other.value).setContext(this.context), null]
    }

    getComparisonGT(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '>' operator cannot be applied to operand of type 'String'", this.context
        )]
    }

    getComparisonGTE(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '>=' operator cannot be applied to operand of type 'String'", this.context
        )]
    }

    getComparisonLT(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '<' operator cannot be applied to operand of type 'String'", this.context
        )]
    }

    getComparisonLTE(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '<=' operator cannot be applied to operand of type 'String'", this.context
        )]
    }
    //#endregion

    //#region Logical Operators
    operatorAND(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '&&' operator cannot be applied to operand of type 'String'", this.context
        )]
    }

    operatorOR(other: any) {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '||' operator cannot be applied to operand of type 'String'", this.context
        )]
    }

    operatorNOT() {
        return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            "The '!' operator cannot be applied to operand of type 'String'", this.context
        )]
    }
    //#endregion
}

var fileText = ""

export class Interpreter {
    constructor(_fileText: string) {
        fileText = _fileText
    }

    visit(node: any, context: Context): any {
        //@ts-ignore
        var func = this["visit_" + node.constructor.name] || this.visit_missing
        return func.bind(this)(node, context)
    }

    visit_missing(node: any, context: Context) {
        console.error("Exiting process: visit_" + node.constructor.name + " does not exist.")
        process.exit(1)
    }

    visit_NumberNode(node: NumberNode, context: Context) {
        return new RunTimeResult().success(
            new Number(node.token.value)
                .setContext(context)
                .setPos(node.posStart, node.posEnd)
        )
    }

    visit_BooleanNode(node: BooleanNode, context: Context) {
        return new RunTimeResult().success(
            new Boolean(node.token.value)
                .setContext(context)
                .setPos(node.posStart, node.posEnd)
        )
    }

    visit_StringNode(node: StringNode, context: Context) {
        return new RunTimeResult().success(
            new String(node.token.value)
                .setContext(context)
                .setPos(node.posStart, node.posEnd)
        )
    }

    visit_BinOpNode(node: BinOpNode, context: Context) {
        var res = new RunTimeResult()
        var left = res.register(this.visit(node.leftNode, context))
        if (res.error) return res

        var right = res.register(this.visit(node.rightNode, context))
        if (res.error) return res

        var result: any
        var error: any

        if (node.opToken.type == TokenType.Plus) [result, error] = left.add(right)
        else if (node.opToken.type == TokenType.Minus) [result, error] = left.subtract(right)
        else if (node.opToken.type == TokenType.Multiply) [result, error] = left.multiply(right)
        else if (node.opToken.type == TokenType.Divide) [result, error] = left.divide(right)

        // Comparison Operators
        else if (node.opToken.type == TokenType.EE) [result, error] = left.getComparisonEE(right)
        else if (node.opToken.type == TokenType.NE) [result, error] = left.getComparisonNE(right)
        else if (node.opToken.type == TokenType.LT) [result, error] = left.getComparisonLT(right)
        else if (node.opToken.type == TokenType.LTE) [result, error] = left.getComparisonLTE(right)
        else if (node.opToken.type == TokenType.GT) [result, error] = left.getComparisonGT(right)
        else if (node.opToken.type == TokenType.GTE) [result, error] = left.getComparisonGTE(right)

        // Logical Operators
        else if (node.opToken.type == TokenType.And) [result, error] = left.operatorAND(right)
        else if (node.opToken.type == TokenType.Or) [result, error] = left.operatorOR(right)

        if (error) return res.failure(error)
        else return res.success(result.setPos(node.posStart, node.posEnd))
    }

    visit_UnaryOpNode(node: UnaryOpNode, context: Context) {
        var res = new RunTimeResult()
        var operand = res.register(this.visit(node.node, context))
        if (res.error) return res

        var error: any = undefined

        if (node.opToken.type == TokenType.Minus) {
            if (operand instanceof Number) {
                operand = operand.multiply(new Number(-1))
            }

            else {
                return res.failure(new RunTimeError(fileText, operand.posStart, operand.posEnd, 
                    `The '-' operator cannot be applied to operand of type '${operand.constructor.name}'`, context    
                ))
            }
        }

        else if (node.opToken.type == TokenType.Not) {
            if (operand instanceof Boolean) {
                operand = operand.operatorNOT()
            }

            else {
                return res.failure(new RunTimeError(fileText, operand.posStart, operand.posEnd, 
                    `The '!' operator cannot be applied to operand of type '${operand.constructor.name}'`, context    
                ))
            }
        }

        if (res.error) return res
        else return res.success(operand.setPos(node.posStart, node.posEnd))
    }

    visit_VarAssignNode(node: VarAssignNode, context: Context) {
        // TODO: SET TYPE
        var res = new RunTimeResult()

        var varName = node.nameToken.value
        var type = node.typeToken.value
        var value = res.register(this.visit(node.valueToken, context))
        if (res.error) return res

        if (type != value.constructor.name.toLowerCase()) {
            return res.failure(new RunTimeError(fileText, node.posStart, node.posEnd, 
                `Cannot implicitly convert type '${value.constructor.name.toLowerCase()}' to '${type}'`, context    
            ))
        }

        context.symbolTable.set(varName, value)
        return res.success(value)
    }

    visitVarAccessNode(node: VarAccessNode, context: Context) {
        var res = new RunTimeResult()
        var varName = node.varNameToken.value
        var value = context.symbolTable.get(varName)

        if (!value) {
            return res.failure(new RunTimeError(fileText, node.posStart, node.posEnd,
                `${varName} is not defined`,
                context
            ))
        }

        value = value.copy().setPos(node.posStart, node.posEnd)
        return res.success(value)
    }

    visit_IfNode(node: IfNode, context: Context) {
        var res = new RunTimeResult()

        var conditionVal = res.register(this.visit(node.condition, context))
        if (res.error) return res

        if (!(conditionVal instanceof Boolean)) {
            return res.failure(new RunTimeError(fileText, node.posStart, node.posEnd, 
                `Condition cannot be of type ${conditionVal.constructor.name}`, context    
            ))
        }

        if (conditionVal.value) {
            var exprValue = res.register(this.visit(node.expr, context))
            if (res.error) return res
            return res.success(exprValue)
        }

        if (node.elseExpr != undefined) {
            var elseValue = res.register(this.visit(node.elseExpr, context))
            if (res.error) return res
            return res.success(elseValue)
        }

        return res.success(undefined)
    }
}