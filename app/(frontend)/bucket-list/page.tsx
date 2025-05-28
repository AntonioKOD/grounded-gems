import { getSavedGemJourneys } from '@/app/(frontend)/events/actions'
import BucketListClient from './BucketListClient'

export default async function BucketListPage() {
  const plans = await getSavedGemJourneys()
  return <BucketListClient plans={plans} />
} 