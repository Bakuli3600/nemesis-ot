import { SimulationResult, TransactionRequest } from '@cognitia/core';

export interface ISimulationEngine {
  simulateTransaction(req: TransactionRequest): Promise<SimulationResult>;
}
