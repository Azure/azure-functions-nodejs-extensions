// Copyright (c) Microsoft Corporation.  All rights reserved.

import '@azure/functions-extensions-connectors';
import { app } from '@azure/functions';

app.setup({
    enableHttpStream: true,
});
