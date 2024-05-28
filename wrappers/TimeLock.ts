import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TimeLockConfig = {
  userCode: Cell;
};

export function timeLockConfigToCell(config: TimeLockConfig): Cell {
    return beginCell()
      .storeRef(config.userCode) 
    .endCell();
}

export class TimeLock implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new TimeLock(address);
    }

    static createFromConfig(config: TimeLockConfig, code: Cell, workchain = 0) {
        const data = timeLockConfigToCell(config);
        const init = { code, data };
        return new TimeLock(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x999, 32).storeUint(0, 64).endCell(),
        });
    }
    
    async sendTx(provider: ContractProvider, via: Sender, value: bigint, body: any) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body
        });
    }
}
