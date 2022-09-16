import { LexError, Position, TokenType } from "./Lexer"
import { AccessIndexNode, ArrayNode, BinOpNode, BooleanNode, IfNode, NumberNode, ParseResult, StringNode, UnaryOpNode, VarAccessNode, VarAssignNode } from "./Parser"

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

    toString() {
        var keys = Object.keys(this.symbols)
        var output = ""

        if (keys.length == 0) return `SymbolTable: Empty`
        console.log(keys)

        for (var key in keys) {
            output += `${key}: ${this.symbols[key]}`
        }

        return output
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

    toString() {
        return `Number(${this.value})`
    }

    copy() {
        var copy = new Number(this.value)
        copy.setPos(this.posStart, this.posEnd)
        copy.setContext(this.context)
        return copy
    }

    add(other: any) {
        if (other instanceof Number) {
            return [new Number(this.value + other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '+' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    subtract(other: any) {
        if (other instanceof Number) {
            return [new Number(this.value - other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '-' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    multiply(other: any) {
        if (other instanceof Number) {
            return [new Number(this.value * other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '*' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
    }

    divide(other: any) {
        if (other instanceof Number) {
            if (other.value == 0) return [null, new RunTimeError(fileText, other.posStart, other.posEnd,
                "Cannot divide by 0", this.context
            )]
            return [new Number(this.value / other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '/' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
        )]
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

    toString() {
        return `Boolean(${this.value})`
    }

    copy() {
        var copy = new Boolean(this.value)
        copy.setPos(this.posStart, this.posEnd)
        copy.setContext(this.context)
        return copy
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

    toString() {
        return `String("${this.value}")`
    }

    copy() {
        var copy = new String(this.value)
        copy.setPos(this.posStart, this.posEnd)
        copy.setContext(this.context)
        return copy
    }

    getIndex(index: Number) {
        if (index.value > this.value.length - 1) {
            return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
                `Index out of range`, this.context
            )]
        }

        return [new String(this.value[index.value]).setContext(this.context), null]
    }

    add(other: any) {
        if (other instanceof String) {
            return [new String(this.value + other.value).setContext(this.context), null]
        }

        else return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
            `The '+' operator cannot be applied to operands of type '${this.constructor.name}' and '${other.constructor.name}'`, this.context
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
}

export class Array {
    nodes: any[]
    posStart: any
    posEnd: any
    context: any

    constructor(nodes: any[]) {
        this.nodes = nodes
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

    getIndex(index: Number) {
        if (index.value > this.nodes.length - 1) {
            return [null, new RunTimeError(fileText, this.posStart, this.posEnd,
                `Index out of range`, this.context
            )]
        }

        return [this.nodes[index.value], null]
    }

    toString() {
        var nodesTxt = ""
        this.nodes.forEach((node, i) => {
            nodesTxt += node.toString()
            if (i != this.nodes.length - 1) nodesTxt += ", "
        })
        return `Array[${nodesTxt}]`
    }

    copy() {
        var copy = new Array(this.nodes)
        copy.setPos(this.posStart, this.posEnd)
        copy.setContext(this.context)
        return copy
    }
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

    visit_String(node: String, context: Context) {
        return new RunTimeResult().success(node)
    }

    visit_ArrayNode(node: ArrayNode, context: Context) {
        return new RunTimeResult().success(
            new Array(node.elementNodes)
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

        var func: Function | undefined = undefined;

        if (node.opToken.type == TokenType.Plus) func = left.add
        else if (node.opToken.type == TokenType.Minus) func = left.subtract
        else if (node.opToken.type == TokenType.Multiply) func = left.multiply
        else if (node.opToken.type == TokenType.Divide) func = left.divide

        // Comparison Operators
        else if (node.opToken.type == TokenType.EE) func = left.getComparisonEE
        else if (node.opToken.type == TokenType.NE) func = left.getComparisonNE
        else if (node.opToken.type == TokenType.LT) func = left.getComparisonLT
        else if (node.opToken.type == TokenType.LTE) func = left.getComparisonLTE
        else if (node.opToken.type == TokenType.GT) func = left.getComparisonGT
        else if (node.opToken.type == TokenType.GTE) func = left.getComparisonGTE

        // Logical Operators
        else if (node.opToken.type == TokenType.And) func = left.operatorAND
        else if (node.opToken.type == TokenType.Or) func = left.operatorOR

        if (func == undefined) return res.failure(new RunTimeError(fileText, node.posStart, node.posEnd, 
            `Operator '${TokenType[node.opToken.type]}' cannot be applied to type ${left.constructor.name}`, context    
        ))

        var [result, error] = func.bind(left)(right)

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

    visit_VarAccessNode(node: VarAccessNode, context: Context) {
        var res = new RunTimeResult()
        var varName = node.varNameToken.value
        var value = context.symbolTable.get(varName)

        if (!value) {
            return res.failure(new RunTimeError(fileText, node.posStart, node.posEnd,
                `${varName} is not defined`,
                context
            ))
        }
        
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

    visit_AccessIndexNode(node: AccessIndexNode, context: Context) {
        var res = new RunTimeResult()
        var item = res.register(this.visit(node.node, context))
        if (res.error) return res

        var index = res.register(this.visit(node.index, context))
        if (res.error) return res

        if (!(index instanceof Number)) {
            return res.failure(new RunTimeError(fileText, node.posStart, node.posEnd, 
                `Index cannot be of type ${index.constructor.name}`, context    
            ))
        }

        if (item["getIndex"]) {
            var [result, error] = item.getIndex(index)
            if (error) return res.failure(error)
            
            var value = res.register(this.visit(result, context))
            if (res.error) return res.failure(error)

            return res.success(value)
        } 
        
        else {
            return res.failure(new RunTimeError(fileText, node.posStart, node.posEnd, 
                `Cannot get index of type ${item.constructor.name}`, context    
            ))
        }
    }
}