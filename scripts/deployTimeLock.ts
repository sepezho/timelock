import { toNano } from '@ton/core';
import { TimeLock } from '../wrappers/TimeLock';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const timeLock = provider.open(TimeLock.createFromConfig({}, await compile('TimeLock')));

    await timeLock.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(timeLock.address);

    // run methods on `timeLock`
}
