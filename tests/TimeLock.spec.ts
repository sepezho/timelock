import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { TimeLock } from '../wrappers/TimeLock';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('TimeLock', () => {
    let code: Cell;
    let userCode: Cell;

    beforeAll(async () => {
        code = await compile('TimeLock');
        userCode = await compile('user');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let timeLock: SandboxContract<TimeLock>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 100;

        timeLock = blockchain.openContract(TimeLock.createFromConfig({userCode}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await timeLock.sendDeploy(deployer.getSender(), toNano(1));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: timeLock.address,
            deploy: true,
            success: true,
        });
    });

    it('should create user sc (order)', async () => {
        const body = beginCell().storeUint(0x1, 32).storeUint(0, 64).storeUint(110, 32).storeUint(990000000, 64).endCell();
        const deployResult = await timeLock.sendTx(deployer.getSender(), toNano(1), body);

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: timeLock.address,
            success: true,
        });
        
        expect(deployResult.transactions).toHaveTransaction({ //this is deployment tx to user sc 
            from: timeLock.address,
            deploy: true,
            success: true,
        });
        
        expect(deployResult.transactions.length).toBe(3);
    });
    
    it('should create user sc (order) and withdraw it', async () => {
        const body = beginCell().storeUint(0x1, 32).storeUint(0, 64).storeUint(110, 32).storeUint(990000000, 64).endCell();
        const deployResult = await timeLock.sendTx(deployer.getSender(), toNano(1), body);

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: timeLock.address,
            success: true,
        });
        
        expect(deployResult.transactions).toHaveTransaction({ //this is deployment tx to user sc 
            from: timeLock.address,
            deploy: true,
            success: true,
        });
        
        expect(deployResult.transactions.length).toBe(3);
        
        blockchain.now = 200;
        
        const bodyWithdraw = beginCell().storeUint(0x2, 32).storeUint(0x444, 64).storeUint(110, 32).storeUint(990000000, 64).endCell();
        const withdrawResult = await timeLock.sendTx(deployer.getSender(), toNano(0.1), bodyWithdraw);

        expect(withdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: timeLock.address,
            success: true,
        });
        
        expect(withdrawResult.transactions).toHaveTransaction({
            from: timeLock.address,
            body: beginCell()
              .storeUint(0x4, 32)
              .storeUint(0x444, 64)
              .endCell(), 
            success: true,
        });
        
        expect(withdrawResult.transactions).toHaveTransaction({
            to: timeLock.address,
            body: beginCell()
              .storeUint(0x3, 32)
              .storeUint(0x444, 64)
              .storeAddress(deployer.address)
              .storeUint(110, 32)
              .storeUint(990000000, 64)
              .endCell(), 
            success: true,
        });
        
        expect(withdrawResult.transactions).toHaveTransaction({ //this is deployment tx to user sc 
            from: timeLock.address,
            to: deployer.address,
            success: true,
            value: toNano(0.99),
        });
        
        expect(withdrawResult.transactions.length).toBe(5);
    });
    
    it('should create user sc (order) and FAIL to withdraw it (cuse no enougth time passed)', async () => {
        const body = beginCell().storeUint(0x1, 32).storeUint(0, 64).storeUint(110, 32).storeUint(990000000, 64).endCell();
        const deployResult = await timeLock.sendTx(deployer.getSender(), toNano(1), body);

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: timeLock.address,
            success: true,
        });
        
        expect(deployResult.transactions).toHaveTransaction({ //this is deployment tx to user sc 
            from: timeLock.address,
            deploy: true,
            success: true,
        });
        
        expect(deployResult.transactions.length).toBe(3);
        
        const bodyWithdraw = beginCell().storeUint(0x2, 32).storeUint(0x444, 64).storeUint(110, 32).storeUint(990000000, 64).endCell();
        const withdrawResult = await timeLock.sendTx(deployer.getSender(), toNano(0.1), bodyWithdraw);

        expect(withdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: timeLock.address,
            success: true,
        });
        
        expect(withdrawResult.transactions).toHaveTransaction({
            from: timeLock.address,
            body: beginCell()
              .storeUint(0x4, 32)
              .storeUint(0x444, 64)
              .endCell(), 
            success: false,
            exitCode: 0x888,
        });
        
        expect(withdrawResult.transactions.length).toBe(3);
    });
});
