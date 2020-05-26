export default interface SearchResult {
    hasPreviousResult: boolean;
    hasNextResult: boolean;
    timeInMs: number;
    numberOfResults: number;
    resources: any;
    message: string;
}
