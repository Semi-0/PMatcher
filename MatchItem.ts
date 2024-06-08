export interface MatchItem{
    name: string;
}


export class MatchConstant implements MatchItem{
    public readonly name: string;
    constructor(_name: string) {
        this.name = _name;
    }
}


export class MatchElement implements MatchItem{
    public readonly name: string;
    constructor(_name: string) {
        this.name = _name;
    }
}


export class MatchSegment implements MatchItem{
    public readonly name: string;
    constructor(_name: string) {
        this.name = _name;
    }
}

