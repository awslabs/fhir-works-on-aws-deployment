import SearchServiceResponse from './searchServiceResponse';

export default interface SearchServiceInterface {
    search(resourceType: string, searchParams: any): Promise<SearchServiceResponse>;
}
