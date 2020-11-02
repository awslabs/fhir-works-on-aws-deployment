const sleep = async (milliseconds: number) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};

beforeAll(() => {
    // expect(true).toEqual(false);
    console.log('RUn before');
});

describe('all tests', () => {
    test('foo 1', async () => {
        await sleep(1000);
        console.log('foo 1');
        expect(true).toEqual(true);
    }, 600000);
    // test('foo 2', async () => {
    //     // await sleep(1000);
    //     console.log('foo 2');
    //     expect(true).toEqual(true);
    // }, 600000);
});
