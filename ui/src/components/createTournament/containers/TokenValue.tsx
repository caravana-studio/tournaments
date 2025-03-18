import { getTokenLogoUrl } from "@/lib/tokensMeta";
import { formatNumber } from "@/lib/utils";

interface TokenValueProps {
  amount: number;
  tokenAddress: string;
  usdValue: number;
  isLoading?: boolean;
  className?: string;
}

export const TokenValue = ({
  amount,
  tokenAddress,
  usdValue,
  isLoading = false,
  className = "",
}: TokenValueProps) => {
  if (isLoading) {
    return <p>Loading...</p>;
  }

  const entryFeeAmountExists = amount > 0;

  return (
    <>
      {entryFeeAmountExists && (
        <div className={`flex flex-row items-center gap-2 ${className}`}>
          <p>~{formatNumber(amount)}</p>
          <img
            src={getTokenLogoUrl(tokenAddress)}
            className="w-6"
            alt="Token logo"
          />
          <span className="text-sm text-neutral">~${usdValue.toFixed(2)}</span>
        </div>
      )}
    </>
  );
};
