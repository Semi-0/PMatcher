declare module 'pmatcher' {
    export class MatchBuilder {
        setConstant(value: string): MatchBuilder;
        setElement(key: string): MatchBuilder;
        setSegment(segmentPattern: string): MatcherBuilder;
        match(data: string[], callback: (matchDict: {[key: string]: string}, nEaten: number) => void): void;
    }
}