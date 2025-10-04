'use client'

import { useState } from 'react'
import { MessageSquare, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'

interface TelegramSetupProps {
  chatId?: string
  onChatIdChange: (chatId: string) => void
}

export default function TelegramSetup({ chatId, onChatIdChange }: TelegramSetupProps) {
  const [showInstructions, setShowInstructions] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Telegram Integration</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
        >
          <HelpCircle className="h-4 w-4" />
          <span>{showInstructions ? 'Hide' : 'Show'} Instructions</span>
        </button>
      </div>

      {showInstructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-blue-900">How to get Telegram Chat ID:</h4>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>
              Ask the employee to open Telegram and search for{' '}
              <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">@userinfobot</code>
            </li>
            <li>Start a chat with the bot and send any message</li>
            <li>The bot will reply with their user information including their Chat ID</li>
            <li>Copy the Chat ID number and paste it in the field below</li>
          </ol>
          <div className="bg-white border border-blue-300 rounded p-3 mt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Alternative Method:</p>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>
                Search for{' '}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded">@get_id_bot</code>{' '}
                on Telegram
              </li>
              <li>Send <code className="bg-gray-100 px-1.5 py-0.5 rounded">/start</code></li>
              <li>Copy the ID shown</li>
            </ol>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Telegram Chat ID
        </label>
        <input
          type="text"
          value={chatId || ''}
          onChange={(e) => onChatIdChange(e.target.value)}
          placeholder="e.g., 123456789"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional: Enter employee's Telegram Chat ID for notifications
        </p>
      </div>

      {chatId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">Chat ID Set</p>
            <p className="text-xs text-green-700">
              Employee will receive notifications via Telegram
            </p>
          </div>
        </div>
      )}

      {!chatId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">No Chat ID</p>
            <p className="text-xs text-yellow-700">
              Employee won't receive Telegram notifications until Chat ID is added
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
