declare module 'pmatcher' {
    export class MatcherBuilder {
        setConstant(value: string): MatcherBuilder;
        setElement(key: string): MatcherBuilder;
        setSegment(segmentPattern: string): MatcherBuilder;
        match(data: string[], callback: (matchDict: {[key: string]: string}, nEaten: number) => void): void;
    }
}