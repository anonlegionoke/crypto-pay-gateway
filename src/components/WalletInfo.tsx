import { useWalletInfo } from '@/hooks/useWalletInfo';
import { formatDistance } from 'date-fns';

export function WalletInfo() {
  const { balance, transactions, loading, error } = useWalletInfo();

  if (loading) {
    return <div className="animate-pulse">Loading wallet info...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (balance === null) {
    return <div>Please connect your wallet to view balance and transactions.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-2">Wallet Balance</h2>
        <p className="text-3xl font-mono">{balance.toFixed(4)} SOL</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500">No recent transactions found.</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.signature}
                className="border-b border-gray-200 last:border-0 pb-4 last:pb-0"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-sm ${
                        tx.type === 'send'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {tx.type === 'send' ? 'Sent' : 'Received'}
                    </span>
                    <p className="mt-1 font-mono">{tx.amount.toFixed(4)} SOL</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {formatDistance(tx.timestamp * 1000, new Date(), {
                        addSuffix: true,
                      })}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      {tx.otherParty.slice(0, 4)}...{tx.otherParty.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
