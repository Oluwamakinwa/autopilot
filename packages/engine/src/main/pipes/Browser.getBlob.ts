import { params } from '../model';
import * as util from '../util';
import { Pipe } from '../pipe';
import { RuntimeCtx } from '../runtime';
import { Element } from '../element';
import { BlobService } from '../services';

export class BrowserGetBlob extends Pipe {
    static $type = 'Browser.getBlob';
    static $help = `
Returns blob content in a specified encoding.

Input value must be a Blob object, returned by Send Network Request action with "blob" response type.

Caution: decoding large blobs may result in decreased application and engine performance.

### Use For

- sending base64 encoded blobs as part of Send Network Request action
`;

    @params.Enum({
        enum: ['binary', 'utf8', 'base64', 'hex', 'ascii', 'utf16le', 'ucs2'],
    })
    encoding: string = 'binary';

    get $blobs() {
        return this.$engine.get(BlobService);
    }

    async apply(inputSet: Element[], _ctx: RuntimeCtx): Promise<Element[]> {
        const encoding = this.encoding;
        return this.map(inputSet, async el => {
            util.checkType(el.value, 'object');
            util.checkType(el.value.blobId, 'string', 'blobId');
            const buffer = await this.$blobs.readBlob(el.value.blobId);
            return el.clone(buffer.toString(encoding));
        });
    }
}