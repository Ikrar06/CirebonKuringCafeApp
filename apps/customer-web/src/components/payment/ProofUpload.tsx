'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { 
  Upload,
  Camera,
  X,
  Check,
  AlertCircle,
  FileImage,
  Loader2,
  ZoomIn,
  Edit3
} from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api/client'

// Types
interface ProofUploadProps {
  paymentId: string
  orderNumber: string
  onUploadSuccess: (imageUrl: string) => void
  onUploadError?: (error: string) => void
  className?: string
  maxFileSize?: number // in MB
  acceptedFormats?: string[]
}

interface UploadedFile {
  file: File
  preview: string
  name: string
  size: number
  type: string
  isVertical: boolean
}

export default function ProofUpload({
  paymentId,
  orderNumber,
  onUploadSuccess,
  onUploadError,
  className = '',
  maxFileSize = 5, // 5MB default
  acceptedFormats = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
}: ProofUploadProps) {
  // State management
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [compressionQuality, setCompressionQuality] = useState(0.8)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  // File validation
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `Format file tidak didukung. Gunakan: ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`
    }

    // Check file size
    const maxSizeBytes = maxFileSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `Ukuran file terlalu besar. Maksimal ${maxFileSize}MB`
    }

    // Check if it's actually an image
    if (!file.type.startsWith('image/')) {
      return 'File harus berupa gambar'
    }

    return null
  }

  // Check if image is vertical/portrait
  const checkImageOrientation = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = document.createElement('img')
      img.onload = () => {
        const isVertical = img.height > img.width
        URL.revokeObjectURL(img.src) // Clean up object URL
        resolve(isVertical)
      }
      img.onerror = () => {
        URL.revokeObjectURL(img.src) // Clean up object URL
        resolve(false)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      onUploadError?.(validationError)
      return
    }

    // Check orientation
    const isVertical = await checkImageOrientation(file)

    // Create preview URL
    const preview = URL.createObjectURL(file)
    
    const uploadedFile: UploadedFile = {
      file,
      preview,
      name: file.name,
      size: file.size,
      type: file.type,
      isVertical
    }

    setSelectedFile(uploadedFile)
    
    if (isVertical) {
      toast.success('Screenshot portrait terdeteksi - format yang bagus!')
    } else {
      toast.info('File berhasil dipilih. Format portrait lebih direkomendasikan untuk screenshot.')
    }
  }, [maxFileSize, acceptedFormats, onUploadError])

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Compress image (optimized for vertical screenshots)
  const compressImage = (file: File, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Cannot get canvas context'))
        return
      }

      const img = document.createElement('img')

      img.onload = () => {
        // For vertical images (screenshots), maintain aspect ratio but limit width
        const maxWidth = 1080  // Good for screenshots
        const maxHeight = 1920 // Standard mobile resolution
        let { width, height } = img

        // If it's a vertical image (screenshot), optimize differently
        if (height > width) {
          // Portrait/vertical image
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        } else {
          // Landscape image
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          if (height > maxHeight * 0.75) { // Slightly smaller for landscape
            width = (width * maxHeight * 0.75) / height
            height = maxHeight * 0.75
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        }, file.type, quality)
        
        // Clean up
        URL.revokeObjectURL(img.src)
      }

      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Upload file to Supabase Storage
  const uploadToStorage = async (file: File): Promise<string> => {
    try {
      // Compress image first
      const compressedBlob = await compressImage(file, compressionQuality)
      const compressedFile = new File([compressedBlob], file.name, {
        type: file.type,
        lastModified: Date.now()
      })

      // Upload via API
      const response = await apiClient.uploadPaymentProof(paymentId, compressedFile)

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data?.image_url || ''
    } catch (error: any) {
      console.error('Error uploading to storage:', error)
      throw new Error(error.message || 'Gagal mengupload file')
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Pilih file terlebih dahulu')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const imageUrl = await uploadToStorage(selectedFile.file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      toast.success('Bukti pembayaran berhasil diupload!')
      onUploadSuccess(imageUrl)

      // Reset state after success
      setTimeout(() => {
        setSelectedFile(null)
        setUploadProgress(0)
      }, 1000)

    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Gagal mengupload bukti pembayaran')
      onUploadError?.(error.message)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle remove file
  const handleRemoveFile = () => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.preview)
      setSelectedFile(null)
    }
  }

  // Handle camera capture
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment')
      fileInputRef.current.click()
    }
  }

  // Handle file browser
  const handleFileBrowser = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture')
      fileInputRef.current.click()
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {!selectedFile && (
        <div
          ref={dragRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-all
            ${dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload Bukti Pembayaran
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Screenshot dari aplikasi mobile banking/e-wallet Anda
              </p>
              <p className="text-xs text-blue-600 font-medium">
                📱 Format portrait/vertical lebih direkomendasikan
              </p>
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleCameraCapture}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="h-4 w-4" />
                <span>Ambil Screenshot</span>
              </button>
              
              <button
                onClick={handleFileBrowser}
                className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileImage className="h-4 w-4" />
                <span>Pilih dari Galeri</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats.join(',')}
              onChange={handleInputChange}
              className="hidden"
            />

            <div className="text-xs text-gray-500 space-y-1">
              <p>Format yang didukung: JPG, PNG, WebP</p>
              <p>Maksimal {maxFileSize}MB</p>
            </div>
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            {/* Image Preview - Optimized for vertical images */}
            <div className="relative flex-shrink-0">
              <div className={`bg-gray-100 rounded-lg overflow-hidden ${
                selectedFile.isVertical ? 'w-16 h-24' : 'w-24 h-16'
              }`}>
                <Image
                  src={selectedFile.preview}
                  alt="Preview"
                  width={selectedFile.isVertical ? 64 : 96}
                  height={selectedFile.isVertical ? 96 : 64}
                  className="object-cover w-full h-full"
                />
              </div>
              
              {/* Orientation indicator */}
              {selectedFile.isVertical && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded">
                  📱
                </div>
              )}
              
              {/* Preview Actions */}
              <div className="absolute top-1 right-1 flex space-x-1">
                <button
                  onClick={() => setShowPreview(true)}
                  className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70"
                  title="Lihat preview"
                >
                  <ZoomIn className="h-3 w-3" />
                </button>
                <button
                  onClick={handleRemoveFile}
                  className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                  title="Hapus file"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </h4>
              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span>{selectedFile.type}</span>
                <span>•</span>
                <span className={selectedFile.isVertical ? 'text-green-600' : 'text-orange-600'}>
                  {selectedFile.isVertical ? 'Portrait ✓' : 'Landscape'}
                </span>
              </div>
              
              {/* Compression Quality */}
              <div className="mt-2">
                <label className="text-xs text-gray-600">
                  Kualitas: {Math.round(compressionQuality * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.1"
                  value={compressionQuality}
                  onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-1"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Kecil</span>
                  <span>Besar</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-gray-700">
                  Mengupload... {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          {!isUploading && (
            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Bukti Pembayaran</span>
              </button>
              
              <button
                onClick={handleRemoveFile}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                title="Ganti file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Full Preview Modal */}
      {showPreview && selectedFile && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative max-w-sm max-h-full">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 z-10"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className={`${selectedFile.isVertical ? 'max-w-sm' : 'max-w-lg'}`}>
              <Image
                src={selectedFile.preview}
                alt="Full preview"
                width={selectedFile.isVertical ? 300 : 600}
                height={selectedFile.isVertical ? 600 : 400}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Guidelines - Optimized for Screenshots */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <div className="font-medium mb-2">Tips Screenshot Bukti Pembayaran:</div>
            <ul className="space-y-1 text-xs">
              <li>• 📱 Gunakan screenshot portrait dari HP (lebih jelas dibaca)</li>
              <li>• ✅ Pastikan semua informasi transfer terlihat (nominal, tanggal, status)</li>
              <li>• 🔍 Screenshot harus jelas dan tidak blur</li>
              <li>• 📄 Pastikan nomor referensi/kode transfer terlihat</li>
              <li>• 💡 Screenshot langsung dari aplikasi lebih baik dari foto layar</li>
              <li>• 🚫 Hindari crop berlebihan yang memotong informasi penting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sample Image Examples - Updated for screenshots */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-900 mb-3">
          Contoh Screenshot yang Baik:
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-2">
            <div className="w-full h-24 bg-green-100 border-2 border-green-300 border-dashed rounded-lg flex items-center justify-center">
              <div className="text-center text-green-700">
                <div className="text-lg mb-1">📱</div>
                <div>Screenshot Portrait</div>
                <div className="text-xs">Mobile Banking</div>
              </div>
            </div>
            <ul className="text-green-700 space-y-1">
              <li>✓ Format vertical/portrait</li>
              <li>✓ Semua info terlihat jelas</li>
              <li>✓ Kualitas HD dari screenshot</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <div className="w-full h-24 bg-red-100 border-2 border-red-300 border-dashed rounded-lg flex items-center justify-center">
              <div className="text-center text-red-700">
                <div className="text-lg mb-1">📷</div>
                <div>Foto Layar</div>
                <div className="text-xs">Tidak Jelas</div>
              </div>
            </div>
            <ul className="text-red-700 space-y-1">
              <li>✗ Foto layar HP dengan kamera</li>
              <li>✗ Blur dan refleksi layar</li>
              <li>✗ Informasi terpotong</li>
            </ul>
          </div>
        </div>

        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
          <strong>Rekomendasi:</strong> Gunakan fitur screenshot bawaan HP (Power + Volume Down) untuk hasil terbaik
        </div>
      </div>

      {/* Error/Success Messages */}
      {uploadProgress === 100 && !isUploading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-600" />
            <div className="text-sm text-green-700">
              <div className="font-medium">Bukti pembayaran berhasil diupload!</div>
              <div className="text-xs mt-1">
                Kasir akan memverifikasi pembayaran Anda dalam beberapa menit.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Requirements */}
      <div className="bg-gray-50 rounded-lg p-3">
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
            Persyaratan Teknis File
          </summary>
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-medium text-gray-700">Format yang didukung:</div>
                <ul className="mt-1 space-y-1">
                  {acceptedFormats.map(format => (
                    <li key={format}>• {format.split('/')[1].toUpperCase()}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-medium text-gray-700">Spesifikasi:</div>
                <ul className="mt-1 space-y-1">
                  <li>• Maksimal {maxFileSize}MB</li>
                  <li>• Minimal 300x300 px</li>
                  <li>• Portrait lebih diutamakan</li>
                  <li>• Kompresi otomatis</li>
                </ul>
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Privacy Notice */}
      <div className="text-xs text-gray-500 text-center">
        <p>
          Screenshot yang diupload akan disimpan dengan aman dan hanya digunakan untuk verifikasi pembayaran. 
          Data akan dihapus otomatis setelah 30 hari.
        </p>
      </div>
    </div>
  )
}

// Additional utility component for upload status
interface UploadStatusProps {
  status: 'idle' | 'uploading' | 'success' | 'error'
  progress?: number
  message?: string
}

export function UploadStatus({ status, progress = 0, message }: UploadStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case 'success':
        return <Check className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Upload className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor()}`}>
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {message || `Status: ${status}`}
        </span>
        {status === 'uploading' && (
          <span className="text-xs">({progress}%)</span>
        )}
      </div>
      
      {status === 'uploading' && (
        <div className="mt-2">
          <div className="w-full bg-white bg-opacity-50 rounded-full h-1">
            <div 
              className="bg-current h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export type { ProofUploadProps, UploadedFile }