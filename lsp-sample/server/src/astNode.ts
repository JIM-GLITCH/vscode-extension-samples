
import { SSL_OP_NO_TLSv1_2 } from 'constants';
import { Range } from 'vscode-languageserver';
import { token, tokenType } from './lexer';
export {
	VarNode, 
	NegativeNode, 
	CompoundNode, 
	AtomNode, 
	ListNode, 
	ParenNode, 
	StringNode, 
	CurlyNode, 
	BackQuotedNode, 
	InfixopNode, 
	PostfixopNode,
	InfixOpArgNode,
	CommaNode,
	SemicolonNode,
	PostfixOpArgNode,
	PrefixOpArgNode,
	ClauseNode
};
function combineRange(r1: Range, r2: Range): Range {
	return { start: r1.start, end: r2.end };
}
class Node {
	range: Range;
	fullRange: Range;
	constructor(start:{range:Range,fullRange:Range},end?:{range:Range,fullRange:Range}) {
		if (end===undefined){
			this.range =start.range;
			this.fullRange=start.fullRange;
		}
		else{
			this.range = combineRange(start.range, end.range);
			this.fullRange = combineRange(start.fullRange, end.fullRange);
		}
	}
}
class VarNode extends Node {
	token: token;
	constructor(vartoken: token) {
		super(vartoken);
		this.token = vartoken;
	}
}

class NegativeNode extends Node {
	sign: token;
	number: token;
	constructor({ sign, integer }: { sign: token; integer: token; }) {
		super(sign,integer);
		this.sign = sign;
		this.number = integer;
	}
}
class CompoundNode extends Node {
	functor: token;
	// open: token;
	// close: token;
	arity:number;
	constructor(functor: token,Arg1: any,RestArgs:ListNode) {
		super(functor,RestArgs);
		this.functor = functor;
		this.arity=RestArgs.length+1;
	}
}
class AtomNode extends Node {
	functor: token;
	constructor(atom:any) {
		super(atom);
		this.functor = atom;
	}
}
class StringNode extends Node {
	string: token;
	constructor(ts: any) {
		super(ts);
		this.string = ts[0];
	}
}
class BackQuotedNode extends Node {
	string: token;
	constructor(ts: any) {
		super(ts);
		this.string = ts[0];
	}
}

class ListNode extends Node {
	// openList: token;
	// closeList: token;
	left: any;
	right:any;
	length:number;
	//       [OpenList,Arg1,RestArgs]
	constructor(left:token,right:ListNode) {
		super(left,right);
		this.left= left;
		this.right = right;
		if (right instanceof AtomNode){
			this.length = 1;
		}else{
			this.length = 1+right.length;
		}
	}
}

class ParenNode extends Node {
	open: token;
	close: token;
	term: any;
	constructor(ts:any) {
		super(ts);
		this.open = ts[0];
		this.close = ts[2];
		this.term = ts[1];
	}
}
class CurlyNode extends Node {
	// openCurly: token;
	// closeCurly: token;
	term: any;
	constructor(open:token,term:any,close:token) {
		super(open,close);
		// this.openCurly = ts[0];
		// this.closeCurly = ts[2];
		this.term = term;
	}
}

class opNode implements token {
	// token interface
	layout: string;
	token: string;
	range: Range;
	fullRange: Range;
	type: tokenType;
	next?: any;
	constructor(atom: token) {
		// token interface
		this.layout = atom.layout;
		this.token = atom.token;
		this.range = atom.range;
		this.fullRange = atom.fullRange;
		this.type = atom.type;
		this.next = atom.next;
	}
}

class InfixopNode extends opNode {
	// InfixNode
	precs: [number,number,number];

	constructor(atom: token, precs: [number, number, number]) {
		// token interface
		super(atom);
		// InfixNode
		this.precs = precs;

	}
}
class PostfixopNode extends opNode {
	// PostfixopNode
	precs: [number,number];

	constructor(atom: token, precs: [number, number]) {
		// token interface
		super(atom);
		// PostfixopNode
		this.precs = precs;

	}
}
class InfixOpArgNode extends Node {
	functor: token;
	left: CompoundNode|AtomNode;
	right: Node;
	constructor(Term: CompoundNode | AtomNode , Op:any,Other:token) {
		super(Term,Other);
		this.functor = Op;
		this.left = Term;
		this.right = Other;
	}
}
class CommaNode extends Node {
	// comma: token;
	left: any;
	right: any;
	constructor(Term:any,Next:any) {
		super(Term,Next);
		// this.comma = tks[0];
		this.left = Term;
		this.right = Next;
	}
}

class SemicolonNode extends Node {
	// semicolon: token;
	left: any;
	right: any;
	constructor(Term:any,Next:any) {
		super(Term,Next);
		// this.semicolon = tks[0];
		this.left = Term;
		this.right = Next;
	}
}
class PostfixOpArgNode extends Node {
	op: token;
	arg: any;
	constructor(Op:any, Term:any) {
		super(Term,Op);
		this.op = Op;
		this.arg = Term;
	}
}
class PrefixOpArgNode extends Node{
	op: token;
	arg: any;
	constructor(Op:any, Arg:any) {
		super(Op,Arg);
		this.op = Op;
		this.arg = Arg;
	}
}
/**
 * 
 */
class ClauseNode extends Node{
	term:any;
	end?:token;
	constructor(Term:any,endToken?:token){
		super(Term,endToken);
		this.term = Term;
		this.end = endToken;
	}
}
