import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { walletStyles } from '../../styles';

// Skeleton primitives
function Skeleton({ className }: { className?: string }) {
  return <div className={cn(walletStyles.skeleton, className)} />;
}

function SkeletonSubtle({ className }: { className?: string }) {
  return <div className={cn(walletStyles.skeletonSubtle, className)} />;
}

// Dashboard Skeleton
export function WalletDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Balance Card Hero */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-8 rounded-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <SkeletonSubtle className="h-4 w-24 mb-2" />
              <Skeleton className="h-12 w-48" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-sm bg-[hsl(270,100%,60%,0.05)]"
                >
                  <SkeletonSubtle className="h-3 w-16 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-sm" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <SkeletonSubtle className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-sm bg-[hsl(270,100%,60%,0.05)] flex flex-col items-center justify-center gap-2"
                >
                  <Skeleton className="h-5 w-5 rounded" />
                  <SkeletonSubtle className="h-3 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <SkeletonSubtle className="h-4 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-sm bg-[hsl(270,100%,60%,0.03)]"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <SkeletonSubtle className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Transaction List Skeleton
export function TransactionListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-sm bg-[hsl(270,100%,60%,0.03)]"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <SkeletonSubtle className="h-3 w-24" />
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-20 mb-1" />
            <SkeletonSubtle className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Withdrawal List Skeleton
export function WithdrawalListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <SkeletonSubtle className="h-3 w-24" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-5 w-24 mb-1" />
              <SkeletonSubtle className="h-4 w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Escrow Timeline Skeleton
export function EscrowTimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-8 w-8 rounded-full" />
            {i < 4 && <div className="w-0.5 h-12 bg-[hsl(270,100%,60%,0.1)]" />}
          </div>
          <div className="flex-1 pb-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <SkeletonSubtle className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
