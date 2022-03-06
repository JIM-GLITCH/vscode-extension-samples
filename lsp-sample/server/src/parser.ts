/**
 * 这个文件 参考 read.pl (dec-10 prolog)
 */

import fs = require("fs");
import { integer, Range } from 'vscode-languageserver';
import { AtomNode, ClauseNode, CommaNode, CompoundNode, CurlyNode, InfixOpArgNode, InfixopNode, ListNode, NegativeNode, PostfixOpArgNode, PostfixopNode, PrefixOpArgNode, SemicolonNode, VarNode } from './astNode';
import { read_tokens, token, InputStream, stream, tokenType } from "./lexer";
import { op_table } from './op_table';
export { parseText };
type opType = "fy" | "fx" | "xfy" | "xfx" | "yfx" | "yf" | "xf"

function debug() {
	const fileString = fs.readFileSync("./server/src/test/3.pl").toString();
	const stream = InputStream(fileString);
	for (; ;) {
		if (stream.pos >= stream.text.length - 1)
			break;
		const tokens = read_tokens(stream);
		if (tokens === undefined)
			break;
		const Answer = readAnswer(tokens);
		if (Answer === undefined)
			break;
		console.log(Answer);
	}
}

function parseText(text: string) {
	const asts = [];
	const stream = InputStream(text);
	for (; ;) {
		if (stream.pos >= stream.text.length - 1)
			break;
		const tokens = read_tokens(stream);
		if (tokens === undefined)
			break;
		const Answer = readAnswer(tokens);
		if (Answer === undefined)
			break;
		asts.push(Answer);
	}
	return asts;
}
function ArrayToLinkedList(tokens: token[]) {
	const head = { next: undefined };
	let p: { next: any } = head;
	for (let index = 0; index < tokens.length; index++) {
		const element = tokens[index];
		p.next = element;
		p = p.next;
	}
	p.next = undefined;
	return head.next as unknown as token;
}

function readAnswer(tokens: token[]) {
	// const tokens = read_tokens(InputStream(text));
	if (tokens === undefined)
		return undefined;
	const tokenList = ArrayToLinkedList(tokens);
	const [flag, Term, LeftOver] = read(tokenList, 1200);
	if (flag == false)
		return undefined;
	const [flag2, endToken] = all_read(LeftOver);
	if (flag2 == false)
		return undefined;
	if (endToken == undefined)
		// pusherror
		undefined;
	return new ClauseNode(Term, endToken);
}
// %   all_read(+Tokens)
// %   checks that there are no unparsed tokens left over.
function all_read(token: token | undefined): [false] | [true, token?] {
	if (token === undefined)
		return [true];
	if (token.type == "end")
		return [true, token];
	return [false];
}

// %   expect(Token, TokensIn, TokensOut)
// %   reads the next token, checking that it is the one expected, and
// %   giving an error message if it is not.  It is used to look for
// %   right brackets of various sorts, as they're all we can be sure of.

function expect(tokenlist: token, Wantedtoken: WantedToken) {
	const tkNode = tokenlist;
	if (tkNode === undefined) return [false];
	if (Wantedtoken.layout) {
		if (Wantedtoken.layout != tkNode.layout)
			return [false];
	}
	if (Wantedtoken.token) {
		if (Wantedtoken.token != tkNode.token)
			return [false];
	}
	if (Wantedtoken.type) {
		if (Wantedtoken.layout != tkNode.type)
			return [false];
	}
	return [true, tkNode, tkNode.next];

}


function prefixop(op: string): [false] | [true, number, number] {
	let Prec: integer;
	Prec = current_op(op, "fy");
	if (Prec > 0) {
		return [true, Prec, Prec];
	}
	Prec = current_op(op, "fx");
	if (Prec > 0) {
		return [true, Prec, Prec - 1];
	}
	return [false];
}

function postfixop(op: string): [false] | [true, number, number] {
	let Prec: integer;
	Prec = current_op(op, "yf");
	if (Prec > 0) {
		return [true, Prec, Prec];
	}
	Prec = current_op(op, "xf");
	if (Prec > 0) {
		return [true, Prec - 1, Prec];
	}
	return [false];
}

function infixop(op: string): [false] | [true, number, number, number] {
	let Prec: integer;
	Prec = current_op(op, "xfx");
	if (Prec > 0) {
		return [true, Prec - 1, Prec, Prec - 1];
	}
	Prec = current_op(op, "xfy");
	if (Prec > 0) {
		return [true, Prec - 1, Prec, Prec];
	}
	Prec = current_op(op, "yfx");
	if (Prec > 0) {
		return [true, Prec, Prec, Prec - 1];
	}
	return [false];
}

function ambigop(op: string): [boolean, number?, number?, number?, number?, number?] {
	const [flag1, L2, O2] = postfixop(op);
	if (flag1 == false)
		return [false];
	const [flag2, L1, O1, R1] = infixop(op);
	if (flag2 == false)
		return [false];
	return [true, L1, O1, R1, L2, O2];
}
interface WantedToken {
	layout?: string
	token?: string
	type?: tokenType

}
function getToken(tokenlist: token, Wantedtoken: WantedToken): [false] | [true, any, token] {
	const tkNode = tokenlist;
	if (tkNode === undefined)
		return [false];
	if (Wantedtoken.layout !== undefined) {
		if (Wantedtoken.layout != tkNode.layout)
			return [false];
	}
	if (Wantedtoken.token !== undefined) {
		if (Wantedtoken.token != tkNode.token)
			return [false];
	}
	if (Wantedtoken.type !== undefined) {
		if (Wantedtoken.layout != tkNode.type)
			return [false];
	}
	return [true, tkNode, tkNode.next];

}

function read(tokenList: token, Precedence: number): [false] | [true, any, token] {
	if (tokenList == undefined) return [false];
	const head = tokenList;
	const tail = tokenList.next;
	switch (head.type) {
		case "variable":
			return read_var(head, tail, Precedence);
		case "name":
			return read_name(head, tail, Precedence);
		case "integer":
			return read_integer(head, tail, Precedence);
		case "open_list":
			return read_open_list(head, tail, Precedence);
		case "open":
			return read_open(head, tail, Precedence);
		case "open_curly":
			return read_open_curly(head, tail, Precedence);
		case "string":
			return read_string(head, tail, Precedence);
		default:
			// pusherror [Token,cannot,start,an,expression]
			return [false];
	}
}

function read_var(head: token, tail: token, Precedence: number) {
	return exprtl0(tail, new VarNode(head), Precedence);
}
function read_name(head: token, tail: token, Precedence: number): [true, any, token] | [false] {
	if (head.token == "-" && tail.type == "integer") {
		return exprtl0(tail.next, new NegativeNode({ sign: head, integer: tail }), Precedence);
	}
	if (tail.token == "(" && tail.layout == "") {
		const [flag1, Arg1, S2] = read(tail.next, 999);
		if (flag1 == false)
			return [false];
		const [flag2, RestArgs, S3] = read_args(S2);
		if (flag2 == false)
			return [false];
		return exprtl0(S3, new CompoundNode(head, Arg1, RestArgs), Precedence);
	}
	const [flag1, Prec, Right] = prefixop(head.token);
	if (flag1 == true) {
		return after_prefix_op(head, Prec, Right, tail, Precedence);
	}
	return exprtl0(tail, head, Precedence);
}

function read_integer(head: token, tail: token, Precedence: number) {
	return exprtl0(tail, head, Precedence);
}
function read_open_list(head: token, tail: token, Precedence: number): [true, any, token] | [false] {
	if (tail.token == "]")
		return exprtl0(tail.next, new AtomNode([head, tail]), Precedence);
	const [flag1, Arg1, S2] = read(tail, 999);
	if (flag1 == false)
		return [false];
	const [flag2, RestArgs, S3] = read_list(S2);
	if (flag2 == false)
		return [false];
	return exprtl0(S3, new ListNode(Arg1, RestArgs), Precedence);
}

function read_open(head: token, tail: token, Precedence: number): [true, any, token] | [false] {
	const [flag1, Term, S2] = read(tail, 1200);
	if (flag1 == false)
		return [false];
	const [flag2, S3] = expect(S2 as token, { token: ")" });
	if (flag2 == false)
		return [false];
	return exprtl0(S3, Term, Precedence);
}

function read_open_curly(head: token, tail: token, Precedence: number): [true, any, token] | [false] {
	if (tail.token == "}")
		return exprtl0(tail.next, new AtomNode([head, tail]), Precedence);
	const [flag1, Term, S2] = read(tail, 1200);
	if (flag1 == false)
		return [false];
	const [flag2, S3] = expect(S2 as token, { token: "}" });
	if (flag2 == false)
		return [false];
	return exprtl0(S3, new CurlyNode(head, Term, S2), Precedence);
}

function read_string(head: token, tail: token, Precedence: number) {
	return exprtl0(tail, head, Precedence);
}


// %   read_args(+Tokens) -TermList, -LeftOver
// %   parses {',' expr(999)} ')' and returns a list of terms.
function read_args(head: token): [false] | [true, any, token] {
	if (head.token == ",") {
		const [flag1, Term, S2] = read(head.next, 999);
		if (flag1 == false)
			return [false];
		const [flag2, Rest, S] = read_args(S2 as token);
		if (flag2 == false)
			return [false];
		return [true, new ListNode(Term, Rest), S];
	}
	if (head.token == ")") {
		return [true, new AtomNode(head), head.next];
	}
	// pusherror
	return [false];
}
// %   read_list(+Tokens)-TermList, -LeftOver
// %   parses {',' expr(999)} ['|' expr(999)] ']' and returns a list of terms.

function read_list(head: token): [false] | [true, any, token] {
	if (head.token == ",") {
		const [flag, Term, S2] = read(head.next, 999);
		if (flag == false)
			return [false];
		const [flag2, Rest, S] = read_list(S2 as token);
		if (flag2 == false)
			return [false];
		return [true, new ListNode(Term, Rest), S];
	}
	if (head.token == "|") {
		const [flag, Rest, S2] = read(head.next, 999);
		if (flag == false)
			return [false];
		const [flag1, S] = expect(S2 as token, { token: "]" });
		if (flag1 == false)
			return [false];
		return [true, Rest, S];
	}
	if (head.token == "]") {
		return [true, new AtomNode([head]), head.next];
	}
	// pusherror
	return [false];
}

// after_prefix_op(+Op, +Prec, +ArgPrec, +Rest, +Precedence) : -Ans
function after_prefix_op(Op: token, Oprec: number, Aprec: number, S0: token, Precedence: number):
	[false] | [true, any, token] {
	if (Precedence < Oprec) {
		// TODO pusherror syntax_error([prefix,operator,Op,in,context,
		// 	with,precedence,Precedence], S0).
		return [false];

	}
	{
		const S1 = peepop(S0);

		const flag2 = prefix_is_atom(S1, Oprec);
		if (flag2) {
			const [flag3, Answer, S] = exprtl(S1, Oprec, Op, Precedence);
			if (flag3)
				return [true, Answer, S];
		}

	}
	{
		const [flag1, Arg, S2] = read(S0, Aprec);
		if (!flag1) return [false];
		return exprtl(S2, Oprec, new PrefixOpArgNode(Op, Arg), Precedence);
	}
}


// %   The next clause fixes a bug concerning "mop dop(1,2)" where
// %   mop is monadic and dop dyadic with higher Prolog priority.

function peepop(head: token) {
	if (head.type == "name" && head.next.token == "(", head.next.layout == "")
		return head;
	{
		const [flag1, L, P, R] = infixop(head.token);
		if (flag1) {
			const newhead = new InfixopNode(head, [L, P, R] as [number, number, number]);
			return newhead;
		}
	}
	{
		const [flag1, L, P] = postfixop(head.token);
		if (flag1) {
			const newhead = new PostfixopNode(head, [L, P] as [number, number]);
			return newhead;
		}
	}
	return head;
}


// %   prefix_is_atom(+TokenList, +Precedence)
// %   is true when the right context TokenList of a prefix operator
// %   of result precedence Precedence forces it to be treated as an
// %   atom, e.g. (- = X), p(-), [+], and so on.
function prefix_is_atom(head: token, P: number) {
	if (head === undefined)
		return true;
	if (head instanceof InfixopNode)
		return head.precs[0] >= P;
	if (head instanceof PostfixopNode)
		return head.precs[0] >= P;
	switch (head.token) {
		case ")":
			return true;
		case "]":
			return true;
		case "}":
			return true;
		case "|":
			return 1100 >= P;
		case ",":
			return 1000 >= P;
		default:
			break;
	}
	return false;
}

// %   exprtl0(+Tokens, +Term, +Prec) -Answer, -LeftOver
// %   is called by read/4 after it has read a primary (the Term).
// %   It checks for following postfix or infix operators.	
function exprtl0(head: token, Term: any, Precedence: number): [false] | [true, any, token] {
	if (head === undefined)
		return [true, Term, head];
	if (head.type == "name") {
		{
			const [flag1, L1, O1, R1, L2, O2] = ambigop(head.token);
			if (flag1) {
				{
					const [flag2, Answer, S] = exprtl(new InfixopNode(head, [L1, O1, R1] as any), 0, Term, Precedence);
					if (flag2)
						return [true, Answer, S];
				}
				{
					const [flag2, Answer, S] = exprtl(new PostfixopNode(head, [L2, O2] as any), 0, Term, Precedence);
					if (flag2)
						return [true, Answer, S];
				}
				return [false];
			}

		}
		{
			const [flag1, L1, O1, R1] = infixop(head.token);
			if (flag1)
				return exprtl(new InfixopNode(head, [L1, O1, R1]), 0, Term, Precedence);
		}
		{
			const [flag1, L2, O2] = postfixop(head.token);
			if (flag1)
				return exprtl(new PostfixopNode(head, [L2, O2]), 0, Term, Precedence);
		}
	}
	if (head.token == ",") {
		if (Precedence >= 1000) {
			const [flag1, Next, S2] = read(head.next, 1000);
			if (flag1)
				return exprtl(S2, 1000, new CommaNode(Term, Next), Precedence);
			return [false];
		}
	}
	if (head.token == "|") {
		if (Precedence >= 1100) {
			const [flag1, Next, S2] = read(head.next, 1000);
			if (flag1)
				return exprtl(S2, 1000, new SemicolonNode(Term, Next), Precedence);
			return [false];
		}
	}
	{
		const [flag1, Culprit] = cant_follow_expr(head);
		if (flag1) {
			// pusherror
			return [false];
		}
	}
	return [true, Term, head];
}
function cant_follow_expr(head: token): [boolean, string?] {
	switch (head.type) {
		case "name":
			return [true, "atom"];
		case "variable":
			return [true, "variable"];
		case "integer":
			return [true, "integer"];
		case "string":
			return [true, "string"];
		case "open":
			return [true, "bracket"];
		case "open_list":
			return [true, "bracket"];
		case "open_curly":
			return [true, "bracket"];
		default:
			return [false];
	}
}

function exprtl(head: token, C: number, Term: any, Precedence: number):
	[false] | [true, any, token] {
	if (head === undefined)
		return [true, Term, head];
	if (head instanceof InfixopNode) {
		const [L, O, R] = head.precs;
		if (Precedence >= O && C <= L) {
			const [flag1, Other, S2] = read(head.next, R);
			if (flag1)
				return exprtl(S2, O, new InfixOpArgNode(Term, head, Other), Precedence);
			return [false];
		}
	}
	if (head instanceof PostfixopNode) {
		const [L, O] = head.precs;
		if (Precedence >= O && C <= L) {
			const S2 = peepop(head);
			return exprtl(S2, O, new PostfixOpArgNode(head, Term), Precedence);
		}
	}
	if (head.token == ",") {
		if (Precedence >= 1000 && C < 1000) {
			const [flag1, Next, S2] = read(head.next, 1000);
			if (!flag1)
				return [false];
			return exprtl(S2, 1000, new CommaNode(Term, Next), Precedence);
		}
	}
	if (head.token == "|") {
		if (Precedence >= 1100 && C < 1100) {
			const [flag1, Next, S2] = read(head.next, 1100);
			if (!flag1)
				return [false];
			return exprtl(S2, 1100, new SemicolonNode(Term, Next), Precedence);
		}
	}
	return [true, Term, head];
}





function current_op(str: string, type: string) {
	let m1: Map<string, number> | undefined;
	let m2;
	// eslint-disable-next-line no-cond-assign
	if (m1 = op_table.get(str))
		// eslint-disable-next-line no-cond-assign
		if (m2 = m1.get(type))
			return m2;
	return -1;
}
// debug();