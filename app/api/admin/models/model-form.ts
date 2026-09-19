import type { z } from 'zod';
import { modelFormSchema } from '@/lib/validators';
import { recommendSellPrices } from '@/lib/server/pricing';
import { Protocol } from '@/lib/db/enums';
import type { ModelWriteInput } from '@/lib/repositories/models';

export type ModelFormValues = z.infer<typeof modelFormSchema>;

const on = (fd: FormData, key: string) => fd.get(key) === 'on';

/** HTML checkboxes submit 'on'; translate before zod validation. */
export function modelFormTransform(fd: FormData) {
  return {
    ...Object.fromEntries(fd),
    protocolOpenai: on(fd, 'protocolOpenai'),
    protocolAnthropic: on(fd, 'protocolAnthropic'),
    supportsVision: on(fd, 'supportsVision'),
    supportsTools: on(fd, 'supportsTools'),
    supportsReasoning: on(fd, 'supportsReasoning'),
    enabled: on(fd, 'enabled'),
    autoPrices: on(fd, 'autoPrices'),
  };
}

function toPrice(value: number): string {
  return value.toFixed(6);
}

export function buildWriteInput(data: ModelFormValues, infraSurcharge: number): ModelWriteInput {
  // Auto mode: derive sell prices from (cost + infra surcharge) × (1 + markup).
  const sell = data.autoPrices
    ? recommendSellPrices({
        inputCostPer1m: data.inputCostPer1m,
        outputCostPer1m: data.outputCostPer1m,
        cacheReadCostPer1m: data.cacheReadCostPer1m,
        cacheWriteCostPer1m: data.cacheWriteCostPer1m,
        markupPercent: data.markupPercent,
        infraSurchargePer1m: infraSurcharge,
      })
    : {
        input: data.sellInputPer1m,
        output: data.sellOutputPer1m,
        cacheRead: data.sellCacheReadPer1m,
        cacheWrite: data.sellCacheWritePer1m,
      };

  const protocols =
    (data.protocolOpenai ? Protocol.OpenAI : 0) | (data.protocolAnthropic ? Protocol.Anthropic : 0);

  return {
    provider: data.provider,
    protocols,
    modelId: data.modelId,
    upstreamModel: data.upstreamModel,
    upstreamApiKey: data.upstreamApiKey || null,
    baseUrl: data.baseUrl || null,
    displayName: data.displayName,
    contextWindow: data.contextWindow,
    maxOutputTokens: data.maxOutputTokens,
    supportsVision: data.supportsVision,
    supportsTools: data.supportsTools,
    supportsReasoning: data.supportsReasoning,
    costCurrency: data.costCurrency,
    inputCostPer1m: toPrice(data.inputCostPer1m),
    outputCostPer1m: toPrice(data.outputCostPer1m),
    cacheReadCostPer1m: toPrice(data.cacheReadCostPer1m),
    cacheWriteCostPer1m: toPrice(data.cacheWriteCostPer1m),
    retailInputPer1m: toPrice(data.retailInputPer1m),
    retailOutputPer1m: toPrice(data.retailOutputPer1m),
    markupPercent: data.markupPercent.toFixed(2),
    sellInputPer1m: toPrice(sell.input),
    sellOutputPer1m: toPrice(sell.output),
    sellCacheReadPer1m: toPrice(sell.cacheRead),
    sellCacheWritePer1m: toPrice(sell.cacheWrite),
    enabled: data.enabled,
    sortOrder: data.sortOrder,
  };
}
