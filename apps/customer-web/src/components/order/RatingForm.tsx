'use client'

import { useState } from 'react'
import { 
  Star,
  Send,
  X,
  Heart,
  Smile,
  Frown,
  MessageSquare,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

// Types
interface RatingData {
  overall_rating: number
  food_quality: number
  service_quality: number
  cleanliness: number
  value_for_money: number
  feedback: string
  would_recommend: boolean
}

interface RatingFormProps {
  orderId: string
  onComplete: (rating: RatingData) => void
  onCancel: () => void
  className?: string
}

// Rating aspects configuration
const RATING_ASPECTS = [
  {
    key: 'overall_rating' as keyof RatingData,
    label: 'Rating Keseluruhan',
    description: 'Bagaimana pengalaman secara keseluruhan?',
    icon: Star,
    color: 'text-yellow-600'
  },
  {
    key: 'food_quality' as keyof RatingData,
    label: 'Kualitas Makanan',
    description: 'Rasa, porsi, dan penyajian makanan',
    icon: Heart,
    color: 'text-red-600'
  },
  {
    key: 'service_quality' as keyof RatingData,
    label: 'Kualitas Pelayanan',
    description: 'Kecepatan dan keramahan pelayanan',
    icon: Smile,
    color: 'text-blue-600'
  },
  {
    key: 'cleanliness' as keyof RatingData,
    label: 'Kebersihan',
    description: 'Kebersihan tempat dan peralatan',
    icon: CheckCircle2,
    color: 'text-green-600'
  },
  {
    key: 'value_for_money' as keyof RatingData,
    label: 'Value for Money',
    description: 'Kesesuaian harga dengan kualitas',
    icon: Star,
    color: 'text-purple-600'
  }
]

// Quick feedback templates
const QUICK_FEEDBACK = [
  'Makanan sangat enak!',
  'Pelayanan cepat dan ramah',
  'Tempat bersih dan nyaman',
  'Harga sesuai dengan kualitas',
  'Akan datang lagi',
  'Porsi pas dan mengenyangkan',
  'Suasana yang cozy',
  'Recommended!'
]

export function RatingForm({ 
  orderId, 
  onComplete, 
  onCancel,
  className = '' 
}: RatingFormProps) {
  const [ratings, setRatings] = useState<RatingData>({
    overall_rating: 0,
    food_quality: 0,
    service_quality: 0,
    cleanliness: 0,
    value_for_money: 0,
    feedback: '',
    would_recommend: false
  })
  
  const [hoveredRating, setHoveredRating] = useState<{aspect: string, value: number} | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // 0: ratings, 1: feedback, 2: recommendation
  
  const handleRatingChange = (aspect: keyof RatingData, value: number | string | boolean) => {
    setRatings(prev => ({ ...prev, [aspect]: value }))
  }
  
  const handleQuickFeedback = (feedback: string) => {
    setRatings(prev => ({ 
      ...prev, 
      feedback: prev.feedback ? `${prev.feedback} ${feedback}` : feedback 
    }))
  }
  
  const handleSubmit = async () => {
    // Validation
    if (ratings.overall_rating === 0) {
      toast.error('Mohon berikan rating keseluruhan')
      return
    }
    
    if (ratings.food_quality === 0 || ratings.service_quality === 0) {
      toast.error('Mohon beri rating untuk kualitas makanan dan pelayanan')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/orders/rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          ...ratings
        })
      })
      
      if (!response.ok) {
        throw new Error('Gagal mengirim rating')
      }
      
      toast.success('Terima kasih atas feedback Anda!')
      onComplete(ratings)
    } catch (error) {
      console.error('Rating submission error:', error)
      toast.error('Gagal mengirim rating. Silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return ratings.overall_rating > 0 && ratings.food_quality > 0 && ratings.service_quality > 0
      case 1:
        return true // Feedback is optional
      case 2:
        return true
      default:
        return false
    }
  }
  
  const renderStarRating = (
    aspect: keyof RatingData, 
    value: number, 
    color: string,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const sizeClasses = {
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-8 h-8'
    }
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isHovered = hoveredRating?.aspect === aspect && hoveredRating?.value >= star
          const isSelected = value >= star
          const isActive = isHovered || isSelected
          
          return (
            <button
              key={star}
              type="button"
              className={`transition-all duration-200 ${
                isActive ? color : 'text-gray-300'
              } hover:scale-110`}
              onMouseEnter={() => setHoveredRating({ aspect, value: star })}
              onMouseLeave={() => setHoveredRating(null)}
              onClick={() => handleRatingChange(aspect, star)}
            >
              <Star 
                className={`${sizeClasses[size]} ${isActive ? 'fill-current' : ''}`} 
              />
            </button>
          )
        })}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {value > 0 ? `${value}/5` : 'Belum dinilai'}
        </span>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Star className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Rating & Feedback
            </h3>
            <p className="text-sm text-gray-600">
              Langkah {currentStep + 1} dari 3
            </p>
          </div>
        </div>
        
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>Rating</span>
          <span>Feedback</span>
          <span>Rekomendasi</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Bagaimana pengalaman Anda?
            </h4>
            <p className="text-gray-600">
              Berikan penilaian untuk setiap aspek di bawah ini
            </p>
          </div>
          
          <div className="space-y-6">
            {RATING_ASPECTS.map((aspect) => {
              const AspectIcon = aspect.icon
              
              return (
                <div key={aspect.key} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gray-50 ${aspect.color}`}>
                      <AspectIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900">
                        {aspect.label}
                      </h5>
                      <p className="text-sm text-gray-600 mb-3">
                        {aspect.description}
                      </p>
                      {renderStarRating(
                        aspect.key, 
                        ratings[aspect.key] as number, 
                        aspect.color
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Ceritakan pengalaman Anda
            </h4>
            <p className="text-gray-600">
              Feedback Anda sangat berharga untuk kami (opsional)
            </p>
          </div>
          
          {/* Quick Feedback Buttons */}
          <div>
            <h5 className="font-medium text-gray-900 mb-3">Feedback Cepat:</h5>
            <div className="flex flex-wrap gap-2">
              {QUICK_FEEDBACK.map((feedback, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuickFeedback(feedback)}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-yellow-100 hover:text-yellow-700 transition-colors"
                >
                  {feedback}
                </button>
              ))}
            </div>
          </div>
          
          {/* Text Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tulis feedback Anda:
            </label>
            <textarea
              value={ratings.feedback}
              onChange={(e) => handleRatingChange('feedback', e.target.value)}
              placeholder="Bagikan pengalaman Anda di sini..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {ratings.feedback.length}/500 karakter
            </p>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Apakah Anda akan merekomendasikan kami?
            </h4>
            <p className="text-gray-600">
              Rekomendasi Anda membantu orang lain menemukan tempat yang bagus
            </p>
          </div>
          
          {/* Recommendation Options */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleRatingChange('would_recommend', true)}
              className={`p-6 rounded-xl border-2 transition-all ${
                ratings.would_recommend 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <Smile className={`w-8 h-8 mx-auto mb-3 ${
                ratings.would_recommend ? 'text-green-600' : 'text-gray-500'
              }`} />
              <p className="font-semibold text-center">Ya, Pasti!</p>
              <p className="text-sm text-center mt-1 opacity-75">
                Saya akan merekomendasikan
              </p>
            </button>
            
            <button
              type="button"
              onClick={() => handleRatingChange('would_recommend', false)}
              className={`p-6 rounded-xl border-2 transition-all ${
                !ratings.would_recommend && ratings.would_recommend !== undefined
                  ? 'border-orange-500 bg-orange-50 text-orange-700' 
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <Frown className={`w-8 h-8 mx-auto mb-3 ${
                !ratings.would_recommend && ratings.would_recommend !== undefined
                  ? 'text-orange-600' 
                  : 'text-gray-500'
              }`} />
              <p className="font-semibold text-center">Mungkin</p>
              <p className="text-sm text-center mt-1 opacity-75">
                Masih perlu perbaikan
              </p>
            </button>
          </div>
          
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Ringkasan Rating:</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Rating Keseluruhan:</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{ratings.overall_rating}/5</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Kualitas Makanan:</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{ratings.food_quality}/5</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Pelayanan:</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{ratings.service_quality}/5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Kembali
            </button>
          )}
        </div>
        
        <div className="flex gap-3">
          {currentStep < 2 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              Lanjut
              <Star className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Kirim Rating
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}