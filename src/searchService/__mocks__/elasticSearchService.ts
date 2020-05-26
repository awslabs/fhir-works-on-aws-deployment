import SearchServiceInterface from '../searchServiceInterface';
import SearchServiceResponse from '../searchServiceResponse';

const ElasticSearchService: SearchServiceInterface = class {
    /*
    searchParams => {field: value}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async search(resourceType: string, searchParams: any) {
        return Promise.resolve(
            new SearchServiceResponse(true, {
                hasPreviousResult: false,
                hasNextResult: false,
                timeInMs: 0,
                numberOfResults: 0,
                resources: {},
                message: '',
            }),
        );
    }
};
export default ElasticSearchService;
