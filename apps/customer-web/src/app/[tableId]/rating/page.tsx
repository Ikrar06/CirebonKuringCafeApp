'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Star,
  ArrowLeft,
  Send,
  Heart,
  ThumbsUp,
  MessageSquare
} from 'lucide-react'

// Hooks
import useTable from '@/hooks/useTable'
import apiClient from '@/lib/api/client'

interface RatingData {
  orderId: string
  rating: number
  comment: string
  aspects: {
    food_quality: number
    service: number
    cleanliness: number
    speed: number
  }
}

export default function RatingPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableId = params.tableId as string
  const orderId = searchParams.get('order_id')

  // Hooks
  const { table } = useTable()

  // State
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [aspects, setAspects] = useState({
    food_quality: 0,
    service: 0,
    cleanliness: 0,
    speed: 0
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [hoveredAspect, setHoveredAspect] = useState<{aspect: string, rating: number} | null>(null)

  useEffect(() => {
    if (!orderId) {
      toast.error('ID pesanan tidak valid')
      router.push(`/${tableId}`)
      return
    }
  }, [orderId, tableId, router])

  const handleRatingClick = (value: number) => {
    setRating(value)
  }

  const handleAspectRating = (aspect: string, value: number) => {
    setAspects(prev => ({
      ...prev,
      [aspect]: value
    }))
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Silakan berikan rating terlebih dahulu')
      return
    }

    try {
      setIsSubmitting(true)

      const ratingData: RatingData = {
        orderId: orderId!,
        rating,
        comment,
        aspects
      }

      // Submit rating via API
      const response = await apiClient.submitRating(ratingData)

      if (response.error) {
        throw new Error(response.error.message || 'Failed to submit rating')
      }

      toast.success('Terima kasih atas rating Anda!')

      // Redirect back to menu after success
      setTimeout(() => {
        router.push(`/${tableId}`)
      }, 1500)

    } catch (error: any) {
      console.error('Error submitting rating:', error)
      toast.error(error.message || 'Gagal mengirim rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const renderStars = (currentRating: number, onRate: (rating: number) => void, hovered: number = 0) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1
      const isFilled = starValue <= (hovered || currentRating)

      return (
        <button
          key={index}
          onClick={() => onRate(starValue)}
          onMouseEnter={() => hovered !== undefined && setHoveredRating(starValue)}
          onMouseLeave={() => hovered !== undefined && setHoveredRating(0)}
          className="p-1 transition-colors"
        >
          <Star
            className={`h-8 w-8 ${
              isFilled
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          />
        </button>
      )
    })
  }

  const renderAspectStars = (aspect: string, currentRating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1
      const isFilled = starValue <= (
        hoveredAspect?.aspect === aspect && hoveredAspect?.rating
          ? hoveredAspect.rating
          : currentRating
      )

      return (
        <button
          key={index}
          onClick={() => handleAspectRating(aspect, starValue)}
          onMouseEnter={() => setHoveredAspect({aspect, rating: starValue})}
          onMouseLeave={() => setHoveredAspect(null)}
          className="p-0.5 transition-colors"
        >
          <Star
            className={`h-5 w-5 ${
              isFilled
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          />
        </button>
      )
    })
  }

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Sangat Buruk'
      case 2: return 'Buruk'
      case 3: return 'Cukup'
      case 4: return 'Baik'
      case 5: return 'Sangat Baik'
      default: return 'Pilih Rating'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
              <span>Kembali</span>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Berikan Rating
            </h1>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Bagaimana pengalaman Anda?
          </h2>
          <p className="text-gray-600">
            Bantuan dan feedback Anda sangat berarti untuk kami
          </p>
        </div>

        {/* Overall Rating */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Rating Keseluruhan
          </h3>

          <div className="flex justify-center mb-4">
            {renderStars(rating, handleRatingClick, hoveredRating)}
          </div>

          <p className="text-center text-lg font-medium text-gray-700">
            {getRatingText(hoveredRating || rating)}
          </p>
        </div>

        {/* Detailed Aspects */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Rating Detail
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Kualitas Makanan</span>
              <div className="flex">
                {renderAspectStars('food_quality', aspects.food_quality)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Pelayanan</span>
              <div className="flex">
                {renderAspectStars('service', aspects.service)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Kebersihan</span>
              <div className="flex">
                {renderAspectStars('cleanliness', aspects.cleanliness)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Kecepatan</span>
              <div className="flex">
                {renderAspectStars('speed', aspects.speed)}
              </div>
            </div>
          </div>
        </div>

        {/* Comment Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Komentar (Opsional)</span>
          </h3>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ceritakan pengalaman Anda..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            maxLength={500}
          />

          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              Maksimal 500 karakter
            </span>
            <span className="text-xs text-gray-500">
              {comment.length}/500
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="w-full py-4 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Kirim Rating</span>
              </>
            )}
          </button>

          <button
            onClick={handleBack}
            className="w-full py-4 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Nanti Saja</span>
          </button>
        </div>

        {/* Thank You Message */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 text-center">
          <ThumbsUp className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">
            Terima Kasih!
          </h3>
          <p className="text-sm text-gray-600">
            Rating dan saran Anda membantu kami memberikan pelayanan yang lebih baik
          </p>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-8"></div>
    </div>
  )
}