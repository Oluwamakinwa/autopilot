import { runtime } from'../../runtime';
import assert from 'assert';

describe('Pipes: other/fold-length', () => {
    it('returns length of elements', async () => {
        await runtime.goto('/select.html');
        const results = await runtime.runPipes([
            {
                type: 'DOM.queryAll',
                selector: 'select option',
                optional: true,
            },
            {
                type: 'List.length',
            },
        ]);
        assert.equal(results.length, 1);
        assert.equal(results[0].description, '#document');
        assert.equal(results[0].value, 4);
    });
});