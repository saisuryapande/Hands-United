import { useState, useEffect, useRef } from 'react'
import { useMessages } from '../hooks/useMessages'
import { format } from 'date-fns'
import { FaTimes, FaPaperclip, FaFile, FaImage, FaVideo, FaDownload } from 'react-icons/fa'
import { toast } from 'react-hot-toast'

function Chat({ otherUser, onClose, fullPage = false }) {
  const { messages, loading, sendMessage } = useMessages(otherUser.id)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() && !selectedFile) return

    try {
      setSending(true)
      const { error } = await sendMessage(newMessage.trim(), selectedFile)
      
      if (error) throw error
      
      setNewMessage('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const renderFilePreview = (message) => {
    if (!message.file_url) return null

    const fileUrl = message._file_url
    if (!fileUrl) return null

    const isImage = message.file_type?.startsWith('image/')
    const isVideo = message.file_type?.startsWith('video/')

    return (
      <div className="mt-2">
        {isImage ? (
          <img
            src={fileUrl}
            alt={message.file_name}
            className="max-w-xs rounded-lg cursor-pointer"
            onClick={() => window.open(fileUrl, '_blank')}
          />
        ) : isVideo ? (
          <video
            src={fileUrl}
            controls
            className="max-w-xs rounded-lg"
          />
        ) : (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center space-x-2 text-sm hover:underline ${
              message.sender_id === otherUser.id ? 'text-primary' : 'text-white'
            }`}
            download={message.file_name}
          >
            <FaFile />
            <span className="truncate">{message.file_name}</span>
            <FaDownload className="flex-shrink-0" />
          </a>
        )}
      </div>
    )
  }

  const chatContainerClass = fullPage
    ? 'h-full flex flex-col min-h-0'
    : 'fixed bottom-0 right-4 w-80 bg-white rounded-t-lg shadow-lg'

  const messagesContainerClass = fullPage
    ? 'flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0'
    : 'h-96 max-h-96 overflow-y-auto p-4'

  return (
    <div className={chatContainerClass}>
      {!fullPage && (
        <div className="flex items-center justify-between p-3 bg-primary text-white rounded-t-lg">
          <h3 className="font-semibold truncate">
            {otherUser.full_name || otherUser.username}
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>
      )}

      <div className={messagesContainerClass}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === otherUser.id ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-lg p-3 ${
                    message.sender_id === otherUser.id
                      ? 'bg-white shadow-sm'
                      : 'bg-primary text-white'
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                  {renderFilePreview(message)}
                  <p className={`text-xs mt-1 ${
                    message.sender_id === otherUser.id
                      ? 'text-gray-500'
                      : 'text-white/80'
                  }`}>
                    {format(new Date(message.created_at), 'p')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t">
        <form onSubmit={handleSend} className="p-3">
          {selectedFile && (
            <div className="mb-2 p-2 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedFile.type.startsWith('image/') ? (
                  <FaImage className="text-gray-500" />
                ) : selectedFile.type.startsWith('video/') ? (
                  <FaVideo className="text-gray-500" />
                ) : (
                  <FaFile className="text-gray-500" />
                )}
                <span className="text-sm truncate">{selectedFile.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
          )}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Attach file"
            >
              <FaPaperclip />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || (!newMessage.trim() && !selectedFile)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Chat