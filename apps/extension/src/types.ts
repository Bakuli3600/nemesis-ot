import {
  DecodedCalldata,
  DecodedSignature,
  RequestLifecycleState,
  RiskReport,
  SimulationResult,
  WalletRequest,
} from '@cognitia/core';

/** Shared state model for a request moving through the analysis pipeline. */
export interface ActiveRequestState {
  id: string;
  tabId?: number;
  request: WalletRequest;
  lifecycle: RequestLifecycleState;
  decodedCalldata?: DecodedCalldata;
  decodedSignature?: DecodedSignature;
  simulationResult?: SimulationResult;
  riskReport?: RiskReport;
  timestamp: number;
}
