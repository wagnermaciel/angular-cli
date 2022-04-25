/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { TestingArchitectHost } from '@angular-devkit/architect/testing';
import { schema, workspaces } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as path from 'path';
import { DevServerBuildOutput } from './index';

describe('Dev Server Builder', () => {
  let testArchitectHost: TestingArchitectHost;
  let architect: Architect;
  let vfHost: NodeJsSyncHost;

  const webpackTargetSpec = { project: 'app', target: 'serve' };

  async function createArchitect(workspaceRoot: string) {
    vfHost = new NodeJsSyncHost();

    const registry = new schema.CoreSchemaRegistry();
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);

    const { workspace } = await workspaces.readWorkspace(
      workspaceRoot,
      workspaces.createWorkspaceHost(vfHost),
    );

    testArchitectHost = new TestingArchitectHost(
      workspaceRoot,
      workspaceRoot,
      new WorkspaceNodeModulesArchitectHost(workspace, workspaceRoot),
    );
    architect = new Architect(testArchitectHost, registry);
  }

  let fetch: typeof import('node-fetch').default;

  beforeAll(async () => {
    // Temporary workaround to support ESM-only `node-fetch` package.
    // Once TypeScript supports maintaining the dynamic import statements, the `new Function` can be removed.
    // Once the `@angular-devkit/build-webpack` package is transitioned to ESM, this can become a static import statement.
    const fetchModule = new Function(`await import('node-fetch')`)() as typeof import('node-fetch');
    fetch = fetchModule.default;
  });

  beforeEach(async () => {
    const ngJsonPath = path.join(__dirname, '../../test/basic-app/angular.json');
    const workspaceRoot = path.dirname(require.resolve(ngJsonPath));
    await createArchitect(workspaceRoot);
  });

  it('works with CJS config', async () => {
    const run = await architect.scheduleTarget(webpackTargetSpec, {
      webpackConfig: 'webpack.config.cjs',
    });
    const output = (await run.result) as DevServerBuildOutput;
    expect(output.success).toBe(true);

    const response = await fetch(`http://${output.address}:${output.port}/bundle.js`);
    expect(await response.text()).toContain(`console.log('hello world')`);

    await run.stop();
  }, 30000);

  it('works with ESM config', async () => {
    const run = await architect.scheduleTarget(webpackTargetSpec, {
      webpackConfig: 'webpack.config.mjs',
    });
    const output = (await run.result) as DevServerBuildOutput;
    expect(output.success).toBe(true);

    const response = await fetch(`http://${output.address}:${output.port}/bundle.js`);
    expect(await response.text()).toContain(`console.log('hello world')`);

    await run.stop();
  }, 30000);

  it('works and returns emitted files', async () => {
    const run = await architect.scheduleTarget(webpackTargetSpec);
    const output = (await run.result) as DevServerBuildOutput;

    expect(output.success).toBe(true);
    expect(output.emittedFiles).toContain({
      id: 'main',
      name: 'main',
      initial: true,
      file: 'bundle.js',
      extension: '.js',
    });
    await run.stop();
  }, 30000);
});
