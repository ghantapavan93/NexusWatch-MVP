export function generateAiBrief({
  state,
  percent,
  invoiceNumber,
  taxableAmount,
  status,
  mayPushOver,
}: {
  state: string;
  percent: number;
  invoiceNumber?: string;
  taxableAmount?: number;
  status: string;
  mayPushOver?: boolean;
}) {
  if (mayPushOver && invoiceNumber && taxableAmount) {
    return `${state} is at ${percent.toFixed(1)}% of the configured threshold. Invoice ${invoiceNumber} includes $${taxableAmount.toLocaleString()} in taxable line items and may move the state closer to the configured threshold or into a higher review band. Recommend accounting review before sending.`;
  }

  if (status === "warning") {
    return `${state} is above 90% of the configured threshold. Review upcoming invoices and confirm state rules with accounting before sending large invoices.`;
  }

  if (status === "watch") {
    return `${state} is above 75% of the configured threshold. Continue monitoring invoice activity and review large upcoming invoices.`;
  }

  if (status === "crossed") {
    return `${state} is over the configured demo threshold. This is decision support only and does not determine filing, registration, or payment obligations. Recommend accounting review before additional invoices are sent.`;
  }

  return `${state} is currently below the configured warning levels. No immediate review is needed based on the current demo rules.`;
}
