/**
 * Copyright 2016, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const fs = require('fs');
const Table = require('cli-table2');

const Controller = require('../controller');

function pathExists (p) {
  try {
    fs.statSync(p);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * http://yargs.js.org/docs/#methods-commandmodule-providing-a-command-module
 */
exports.command = 'list';
exports.describe = 'Lists deployed functions.';
exports.builder = {
  region: {
    default: 'us-central1',
    description: 'The compute region (e.g. us-central1) to use.',
    requiresArg: true,
    type: 'string'
  }
};

/**
 * Handler for the "list" command.
 *
 * @param {object} opts Configuration options.
 */
exports.handler = (opts) => {
  const controller = new Controller(opts);

  return controller.doIfRunning()
    .then(() => controller.list())
    .then((cloudfunctions) => {
      const table = new Table({
        head: ['Name'.cyan, 'Trigger'.cyan, 'URL/Topic/Bucket'.cyan],
        colWidths: [16, 16, 88] // 120 total
      });

      cloudfunctions.forEach((cloudfunction) => {
        let trigger;
        if (cloudfunction.httpsTrigger) {
          trigger = 'HTTP';
        } else if (cloudfunction.pubsubTrigger) {
          trigger = 'Topic';
        } else if (cloudfunction.gcsTrigger) {
          trigger = 'Bucket';
        } else {
          trigger = 'Unknown';
        }
        let triggerPath;
        if (cloudfunction.httpsTrigger) {
          triggerPath = cloudfunction.httpsTrigger.url || 'Unknown';
        } else if (cloudfunction.pubsubTrigger) {
          triggerPath = cloudfunction.pubsubTrigger || 'Unknown';
        } else if (cloudfunction.gcsTrigger) {
          triggerPath = cloudfunction.gcsTrigger || 'Unknown';
        } else {
          triggerPath = 'Unknown';
        }

        if (pathExists(cloudfunction.gcsUrl)) {
          table.push([
            cloudfunction.shortName.white,
            trigger.white,
            triggerPath.white
          ]);
        } else {
          table.push([
            cloudfunction.shortName.white,
            trigger.white,
            triggerPath.red
          ]);
        }
      });

      if (cloudfunctions.length === 0) {
        table.push([{
          colSpan: 3,
          content: 'No functions deployed ¯\\_(ツ)_/¯.  Run "functions deploy" to deploy a function.'.white
        }]);
      }

      controller.log(table.toString());
    })
    .catch((err) => controller.handleError(err));
};