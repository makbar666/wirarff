import { createHandler } from '../../server/api.mjs';

const handler = createHandler();
export default { fetch: handler };
