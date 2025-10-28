import { app } from '@azure/functions';
import "@azure/functions-extensions-servicebus";

app.setup({
    enableHttpStream: true,
});
