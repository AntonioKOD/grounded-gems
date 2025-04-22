"use client"

import { useState } from "react"
import { Star, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

// Sample reviews data
const REVIEWS = [
  {
    id: 1,
    name: "Sarah Johnson",
    avatar: "/placeholder.svg?height=40&width=40&query=woman profile avatar",
    date: "July 28, 2023",
    rating: 5,
    comment:
      "This was one of the best music festivals I've ever attended! The lineup was incredible, and the organization was top-notch. Can't wait for next year!",
    helpful: 24,
    isHelpful: false,
  },
  {
    id: 2,
    name: "Michael Rodriguez",
    avatar: "/placeholder.svg?height=40&width=40&query=man profile avatar",
    date: "July 25, 2023",
    rating: 4,
    comment:
      "Great event overall. The music was fantastic and the atmosphere was electric. Only giving 4 stars because the food options were a bit limited. Would definitely attend again though!",
    helpful: 18,
    isHelpful: false,
  },
  {
    id: 3,
    name: "Emily Chen",
    avatar: "/placeholder.svg?height=40&width=40&query=woman profile avatar asian",
    date: "July 22, 2023",
    rating: 5,
    comment:
      "Absolutely loved this festival! The performances were amazing and the venue was perfect. The staff was also very friendly and helpful. Highly recommend!",
    helpful: 15,
    isHelpful: false,
  },
  {
    id: 4,
    name: "David Wilson",
    avatar: "/placeholder.svg?height=40&width=40&query=man profile avatar beard",
    date: "July 20, 2023",
    rating: 3,
    comment:
      "The music was great, but the lines for everything were too long. Waited almost an hour for food and 30 minutes for the bathroom. They need to improve logistics for next year.",
    helpful: 32,
    isHelpful: false,
  },
]

// Rating distribution
const RATING_DISTRIBUTION = {
  5: 67,
  4: 22,
  3: 8,
  2: 2,
  1: 1,
}

export default function EventReviews({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  eventId,
  rating,
  reviewCount,
}: {
  eventId: string
  rating: number
  reviewCount: number
}) {
  const [reviews, setReviews] = useState(REVIEWS)
  const [reviewText, setReviewText] = useState("")
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  const handleHelpful = (reviewId: number) => {
    setReviews(
      reviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              helpful: review.isHelpful ? review.helpful - 1 : review.helpful + 1,
              isHelpful: !review.isHelpful,
            }
          : review,
      ),
    )
  }

  const handleSubmitReview = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // In a real app, this would send the review to the server
    alert("Thank you for your review! It will be published after moderation.")
    setReviewText("")
    setUserRating(0)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Overall Rating */}
        <div className="md:w-1/3 space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Overall Rating</h3>
            <div className="text-5xl font-bold text-gray-900">{rating.toFixed(1)}</div>
            <div className="flex justify-center mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(rating) ? "text-[#FFE66D] fill-[#FFE66D]" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-gray-500 mt-1">Based on {reviewCount} reviews</p>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <div className="flex items-center w-12">
                  <span>{star}</span>
                  <Star className="h-4 w-4 ml-1 text-[#FFE66D] fill-[#FFE66D]" />
                </div>
                <Progress value={RATING_DISTRIBUTION[star as keyof typeof RATING_DISTRIBUTION]} className="h-2 flex-1" />
                <span className="text-sm text-gray-500 w-8">{RATING_DISTRIBUTION[star as keyof typeof RATING_DISTRIBUTION]}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Write a Review */}
        <div className="md:w-2/3">
          <h3 className="text-xl font-bold mb-4">Write a Review</h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <p className="font-medium">Your Rating</p>
                <span className="text-red-500">*</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-8 w-8 cursor-pointer ${
                      star <= (hoverRating || userRating) ? "text-[#FFE66D] fill-[#FFE66D]" : "text-gray-300"
                    }`}
                    onClick={() => setUserRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-2">
                <p className="font-medium">Your Review</p>
                <span className="text-red-500">*</span>
              </div>
              <Textarea
                placeholder="Share your experience with this event..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <Button
              type="submit"
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
              disabled={userRating === 0 || reviewText.trim() === ""}
            >
              Submit Review
            </Button>
          </form>
        </div>
      </div>

      {/* Reviews List */}
      <div>
        <h3 className="text-xl font-bold mb-6">Reviews</h3>
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={review.avatar || "/placeholder.svg"} alt={review.name} />
                    <AvatarFallback>{review.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{review.name}</h4>
                    <p className="text-sm text-gray-500">{review.date}</p>
                  </div>
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= review.rating ? "text-[#FFE66D] fill-[#FFE66D]" : "text-gray-300"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-gray-700">{review.comment}</p>
              <div className="mt-3 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-gray-500 hover:text-gray-700 ${review.isHelpful ? "bg-gray-100" : ""}`}
                  onClick={() => handleHelpful(review.id)}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Helpful ({review.helpful})
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
