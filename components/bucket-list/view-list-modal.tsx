import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { BucketList } from '@/app/(frontend)/bucket-list/BucketListClient'

interface ViewListModalProps {
  open: boolean
  onClose: () => void
  bucketList: BucketList
}

export default function ViewListModal({ open, onClose, bucketList }: ViewListModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{bucketList.name}</DialogTitle>
          <DialogDescription>{bucketList.description || 'No description provided.'}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Items</h4>
          {bucketList.items && bucketList.items.length > 0 ? (
            <ul className="space-y-2">
              {bucketList.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <Badge>{item.status}</Badge>
                  <span>{item.location?.name || 'Untitled Item'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">No items in this list.</div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 