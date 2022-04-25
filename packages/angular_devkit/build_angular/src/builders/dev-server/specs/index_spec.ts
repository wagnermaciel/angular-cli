/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DevServerBuilderOutput } from '@angular-devkit/build-angular';
import { workspaces } from '@angular-devkit/core';
import { createArchitect, host } from '../../../testing/test-utils';

describe('Dev Server Builder index', () => {
  const targetSpec = { project: 'app', target: 'serve' };
  let fetch: typeof import('node-fetch').default;

  beforeAll(async () => {
    // Temporary workaround to support ESM-only `node-fetch` package.
    // Once TypeScript supports maintaining the dynamic import statements, the `new Function` can be removed.
    // Once the `@angular-devkit/build-angular` package is transitioned to ESM, this can become a static import statement.
    const fetchModule = new Function(`await import('node-fetch')`)() as typeof import('node-fetch');
    fetch = fetchModule.default;
  });

  beforeEach(async () => host.initialize().toPromise());
  afterEach(async () => host.restore().toPromise());

  it('sets HTML lang attribute with the active locale', async () => {
    const locale = 'fr';
    const { workspace } = await workspaces.readWorkspace(
      host.root(),
      workspaces.createWorkspaceHost(host),
    );
    const app = workspace.projects.get('app');
    if (!app) {
      fail('Test application "app" not found.');

      return;
    }

    app.extensions['i18n'] = {
      locales: {
        [locale]: [],
      },
    };

    const target = app.targets.get('build');
    if (!target) {
      fail('Test application "app" target "build" not found.');

      return;
    }
    if (!target.options) {
      target.options = {};
    }
    target.options.localize = [locale];

    await workspaces.writeWorkspace(workspace, workspaces.createWorkspaceHost(host));

    const architect = (await createArchitect(host.root())).architect;
    const run = await architect.scheduleTarget(targetSpec, { port: 0 });
    const output = (await run.result) as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    const response = await fetch(output.baseUrl);
    expect(await response.text()).toContain(`lang="${locale}"`);
    await run.stop();
  });
});
