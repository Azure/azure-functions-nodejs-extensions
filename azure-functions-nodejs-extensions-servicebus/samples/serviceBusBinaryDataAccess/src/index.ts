// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import '@azure/functions-extensions-servicebus';
import { app } from '@azure/functions';

app.setup({
    enableHttpStream: true,
});
