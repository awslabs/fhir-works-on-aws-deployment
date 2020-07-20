export default interface PromiseAndId {
    promise: Promise<any>;
    id: string;
    type: PromiseType;
}

export type PromiseType = 'delete' | 'upsert';
