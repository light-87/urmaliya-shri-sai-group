'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  REGISTRY_TYPE_LABELS,
  REGISTRY_STATUS_LABELS,
  REGISTRY_STATUS_COLORS,
  type RegistryTransaction,
} from '@/types'
import { format } from 'date-fns'
import { Edit, X } from 'lucide-react'

interface RegistryDetailViewProps {
  open: boolean
  onClose: () => void
  transaction: RegistryTransaction | null
  onEdit?: (transaction: RegistryTransaction) => void
}

export function RegistryDetailView({
  open,
  onClose,
  transaction,
  onEdit,
}: RegistryDetailViewProps) {
  if (!transaction) return null

  const DetailRow = ({ label, value, highlight = false, className = '' }: {
    label: string
    value: string | number
    highlight?: boolean
    className?: string
  }) => (
    <div className={`flex justify-between py-2 border-b ${className}`}>
      <span className="text-gray-600 font-medium">{label}:</span>
      <span className={`${highlight ? 'font-semibold' : ''} text-right`}>{value}</span>
    </div>
  )

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Registry Transaction: {transaction.transactionId}
            </DialogTitle>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onEdit(transaction)
                    onClose()
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 pb-2 border-b-2 border-blue-200">
              Basic Information
            </h3>
            <div className="space-y-2">
              <DetailRow label="Transaction ID" value={transaction.transactionId} highlight />
              {transaction.registrationNumber && (
                <DetailRow label="Registration Number" value={transaction.registrationNumber} />
              )}
              <DetailRow
                label="Date"
                value={format(new Date(transaction.date), 'dd MMMM yyyy')}
              />
              <DetailRow label="Property Location" value={transaction.propertyLocation} highlight />
              <DetailRow label="Seller Name" value={transaction.sellerName} />
              <DetailRow label="Buyer Name" value={transaction.buyerName} />
              <DetailRow
                label="Transaction Type"
                value={REGISTRY_TYPE_LABELS[transaction.transactionType]}
              />
              <DetailRow
                label="Property Value"
                value={formatCurrency(transaction.propertyValue)}
                highlight
              />
            </div>
          </div>

          {/* Government Fees */}
          <div>
            <h3 className="text-lg font-semibold mb-3 pb-2 border-b-2 border-blue-200">
              Government Fees & Charges
            </h3>
            <div className="space-y-2">
              <DetailRow label="Stamp Duty" value={formatCurrency(transaction.stampDuty)} />
              <DetailRow
                label="Registration Fees"
                value={formatCurrency(transaction.registrationFees)}
              />
              <DetailRow label="Mutation Fees" value={formatCurrency(transaction.mutationFees)} />
              <DetailRow
                label="Documentation Charge"
                value={formatCurrency(transaction.documentationCharge)}
              />
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                <DetailRow
                  label="Registrar Office Fees (Auto)"
                  value={`${formatCurrency(transaction.registrarOfficeFees)} (0.25% of property value)`}
                  highlight
                  className="border-0"
                />
              </div>
            </div>
          </div>

          {/* Service Charges */}
          <div>
            <h3 className="text-lg font-semibold mb-3 pb-2 border-b-2 border-blue-200">
              Service Charges & Costs
            </h3>
            <div className="space-y-2">
              <DetailRow label="Operator Cost" value={formatCurrency(transaction.operatorCost)} />
              <DetailRow
                label="Broker Commission"
                value={formatCurrency(transaction.brokerCommission)}
              />
              <DetailRow
                label="Recommendation Fees"
                value={formatCurrency(transaction.recommendationFees)}
              />
            </div>
          </div>

          {/* Payment Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 pb-2 border-b-2 border-blue-200">
              Payment & Status
            </h3>
            <div className="space-y-2">
              <DetailRow
                label="Credit Received"
                value={formatCurrency(transaction.creditReceived)}
                highlight
              />
              {transaction.paymentMethod && (
                <DetailRow label="Payment Method" value={transaction.paymentMethod} />
              )}
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 mt-2">
                <DetailRow
                  label="Stamp Commission (Auto)"
                  value={`${formatCurrency(transaction.stampCommission)} (1.5% of stamp duty - INCOME)`}
                  highlight
                  className="border-0"
                />
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-center">
                  <Label>Payment Status:</Label>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      REGISTRY_STATUS_COLORS[transaction.paymentStatus]
                    }`}
                  >
                    {REGISTRY_STATUS_LABELS[transaction.paymentStatus]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
            <h3 className="text-lg font-bold text-center mb-4 text-blue-900">
              FINANCIAL SUMMARY
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-blue-200">
                <span className="font-semibold">Total Expenses:</span>
                <span className="font-mono font-semibold text-red-700">
                  {formatCurrency(transaction.totalExpenses)}
                </span>
              </div>

              <div
                className={`flex justify-between py-2 px-3 rounded-lg ${
                  transaction.balanceDue > 0
                    ? 'bg-red-100'
                    : transaction.balanceDue < 0
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                }`}
              >
                <span className="font-semibold">Balance Due:</span>
                <div className="text-right">
                  <div className="font-mono font-semibold">
                    {formatCurrency(Math.abs(transaction.balanceDue))}
                  </div>
                  <div className="text-xs">
                    {transaction.balanceDue > 0
                      ? '(Client owes)'
                      : transaction.balanceDue < 0
                        ? '(Overpaid)'
                        : '(Settled)'}
                  </div>
                </div>
              </div>

              <div
                className={`flex justify-between py-3 px-4 rounded-lg border-2 ${
                  transaction.amountProfit >= 0
                    ? 'bg-green-100 border-green-300'
                    : 'bg-red-100 border-red-300'
                }`}
              >
                <span className="font-bold text-lg">AMOUNT PROFIT:</span>
                <div className="text-right">
                  <div
                    className={`font-mono font-bold text-2xl ${
                      transaction.amountProfit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {transaction.amountProfit >= 0 ? '+' : ''}
                    {formatCurrency(transaction.amountProfit)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">(Income - Expenses)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {transaction.notes && (
            <div>
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b-2 border-blue-200">
                Notes
              </h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{transaction.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 pt-4 border-t">
            <div className="flex justify-between">
              <span>Created: {format(new Date(transaction.createdAt), 'dd MMM yyyy, HH:mm')}</span>
              <span>Updated: {format(new Date(transaction.updatedAt), 'dd MMM yyyy, HH:mm')}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
