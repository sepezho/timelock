import { toNano, beginCell,  Address } from '@ton/core';
import { TimeLock } from '../wrappers/TimeLock';
import {sleep, compile, NetworkProvider } from '@ton/blueprint';

export async function retry<T>(
    fn: () => Promise<T>,
    attempts: number,
    timeout: number,
    title: string
): Promise<T> {
    let lastError = null;

    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.log(`[${title}] Attempt ${i + 1} failed. Retrying in ${timeout}ms...`);
            await sleep(timeout);
        }
    }

    throw lastError;
}

enum Operations {
    'Deploy timelock' = 1,
    'Lock' = 2,
    'Unlock' = 3,
}

const deploy = async (provider:any ) => {
    const userCode = await compile('user');
    const timeLock = provider.open(TimeLock.createFromConfig({userCode}, await compile('TimeLock')));
    await timeLock.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(timeLock.address);
}

const lock = async (provider:any ) => {
    const ui = provider.ui();

    const addr = await ui.input('Enter timelock sc address:');
    const amount = await ui.input('Enter amount:');
    const time = await ui.input('Enter unlock unix date (in seconds):');
    const sc = provider.open(TimeLock.createFromAddress(Address.parse(addr)));
    
    const body = beginCell().storeUint(0x1, 32).storeUint(0x6969, 64).storeUint(time, 32).storeUint(toNano(amount), 64).endCell();
    await retry(() => sc.sendTx(provider.sender(), toNano(amount) + toNano('0.1'), body), 3, 1000, 'Lock');
}

const unlock = async (provider:any ) => {
    const ui = provider.ui();

    const addr = await ui.input('Enter timelock sc address:');
    const sc = provider.open(TimeLock.createFromAddress(Address.parse(addr)));
    
    const body = beginCell().storeUint(0x2, 32).storeUint(0x6969, 64).endCell();
    await retry(() => sc.sendTx(provider.sender(), toNano('0.1'), body), 3, 1000, 'Unlock');
}


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const operation = await ui.choose('Operation:', ['1', '2', '3'], (v: string) => Operations[parseInt(v)]);
    switch (parseInt(operation)) {
        case 1:
            await deploy(provider);
            break;
        case 2:
            await lock(provider);
            break;
        case 3:
            await unlock(provider);
            break;
  }
}
