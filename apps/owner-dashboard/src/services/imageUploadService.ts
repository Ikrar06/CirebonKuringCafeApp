'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface UploadResult {
  url: string
  path: string
  error?: string
}

class ImageUploadService {
  private readonly BUCKET_NAME = 'menu-images'

  async uploadMenuImage(file: File, menuItemName: string): Promise<UploadResult> {
    try {
      // Validate file type
      if (!this.isValidImageType(file)) {
        return {
          url: '',
          path: '',
          error: 'Invalid file type. Please upload JPG, PNG, or WebP images.'
        }
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return {
          url: '',
          path: '',
          error: 'File size too large. Maximum size is 5MB.'
        }
      }

      // Generate unique file path
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const timestamp = Date.now()
      const sanitizedName = this.sanitizeFileName(menuItemName)
      const fileName = `${sanitizedName}-${timestamp}.${fileExtension}`
      const filePath = `menu-items/${fileName}`

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Supabase upload error:', error)
        return {
          url: '',
          path: '',
          error: `Upload failed: ${error.message}`
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath)

      return {
        url: urlData.publicUrl,
        path: filePath,
        error: undefined
      }

    } catch (error) {
      console.error('Upload service error:', error)
      return {
        url: '',
        path: '',
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  async deleteMenuImage(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath])

      if (error) {
        console.error('Delete error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete service error:', error)
      return false
    }
  }

  // Resize image on client side before upload
  async resizeImage(file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        const newWidth = img.width * ratio
        const newHeight = img.height * ratio

        canvas.width = newWidth
        canvas.height = newHeight

        // Draw resized image
        ctx?.drawImage(img, 0, 0, newWidth, newHeight)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(resizedFile)
            } else {
              resolve(file) // Fallback to original file
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = () => {
        resolve(file) // Fallback to original file
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Generate thumbnail from image
  async generateThumbnail(file: File, size: number = 200): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        canvas.width = size
        canvas.height = size

        // Calculate crop area (center crop)
        const minDimension = Math.min(img.width, img.height)
        const cropX = (img.width - minDimension) / 2
        const cropY = (img.height - minDimension) / 2

        // Draw cropped and resized image
        ctx?.drawImage(
          img,
          cropX, cropY, minDimension, minDimension,
          0, 0, size, size
        )

        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }

      img.onerror = () => {
        resolve('') // Return empty string on error
      }

      img.src = URL.createObjectURL(file)
    })
  }

  private isValidImageType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return validTypes.includes(file.type)
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length
  }

  // Create image preview URL
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file)
  }

  // Cleanup preview URL
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url)
  }

  // Validate image dimensions
  async validateImageDimensions(file: File, minWidth: number = 300, minHeight: number = 300): Promise<{
    valid: boolean
    error?: string
    dimensions: { width: number; height: number }
  }> {
    return new Promise((resolve) => {
      const img = new Image()

      img.onload = () => {
        const valid = img.width >= minWidth && img.height >= minHeight
        resolve({
          valid,
          error: valid ? undefined : `Image must be at least ${minWidth}x${minHeight} pixels`,
          dimensions: { width: img.width, height: img.height }
        })
      }

      img.onerror = () => {
        resolve({
          valid: false,
          error: 'Unable to read image dimensions',
          dimensions: { width: 0, height: 0 }
        })
      }

      img.src = URL.createObjectURL(file)
    })
  }
}

export const imageUploadService = new ImageUploadService()