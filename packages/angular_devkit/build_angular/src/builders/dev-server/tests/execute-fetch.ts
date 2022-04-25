/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { RequestInit, Response } from 'node-fetch'; // eslint-disable-line import/no-extraneous-dependencies
import { mergeMap, take, timeout } from 'rxjs/operators';
import { URL } from 'url';
import {
  BuilderHarness,
  BuilderHarnessExecutionOptions,
  BuilderHarnessExecutionResult,
} from '../../../testing/builder-harness';

export async function executeOnceAndFetch<T>(
  harness: BuilderHarness<T>,
  url: string,
  options?: Partial<BuilderHarnessExecutionOptions> & { request?: RequestInit },
): Promise<BuilderHarnessExecutionResult & { response?: Response }> {
  // Temporary workaround to support ESM-only `node-fetch` package.
  // Once TypeScript supports maintaining the dynamic import statements, the `new Function` can be removed.
  // Once the `@angular-devkit/build-angular` package is transitioned to ESM, this can become a static import statement.
  const { default: fetch } = new Function(
    `await import('node-fetch')`,
  )() as typeof import('node-fetch');

  return harness
    .execute()
    .pipe(
      timeout(30000),
      mergeMap(async (executionResult) => {
        let response = undefined;
        if (executionResult.result?.success) {
          let baseUrl = `${executionResult.result.baseUrl}`;
          baseUrl = baseUrl[baseUrl.length - 1] === '/' ? baseUrl : `${baseUrl}/`;
          const resolvedUrl = new URL(url, baseUrl);
          response = await fetch(resolvedUrl, options?.request);
        }

        return { ...executionResult, response };
      }),
      take(1),
    )
    .toPromise();
}
