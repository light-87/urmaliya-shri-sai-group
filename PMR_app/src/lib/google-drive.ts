import { google } from 'googleapis'

// Custom error class for OAuth/Google Drive errors
export class GoogleDriveAuthError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message)
    this.name = 'GoogleDriveAuthError'
  }
}

// Validate that all required environment variables are set
function validateGoogleConfig(): void {
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_DRIVE_FOLDER_ID',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new GoogleDriveAuthError(
      `Missing required Google Drive configuration: ${missing.join(', ')}. ` +
      `Please check your environment variables.`
    )
  }
}

// Initialize OAuth2 client for Google Drive API
function getOAuth2Client() {
  validateGoogleConfig()

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  return oauth2Client
}

// Helper to check if error is an invalid_grant error
function isInvalidGrantError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; code?: string | number }
    const message = err.message?.toLowerCase() || ''
    return (
      message.includes('invalid_grant') ||
      message.includes('token has been expired or revoked') ||
      message.includes('token has been revoked') ||
      err.code === 'invalid_grant'
    )
  }
  return false
}

// Wrap Google Drive API calls with better error handling
async function withDriveErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isInvalidGrantError(error)) {
      throw new GoogleDriveAuthError(
        `Google Drive authentication failed (invalid_grant): The refresh token is invalid, expired, or revoked. ` +
        `This commonly happens when:\n` +
        `1. Your Google Cloud project is in "testing" mode (tokens expire after 7 days)\n` +
        `2. The token was revoked in Google Account settings\n` +
        `3. The token hasn't been used in 6+ months\n` +
        `4. The OAuth client secret was changed\n\n` +
        `To fix: Generate a new refresh token and update GOOGLE_REFRESH_TOKEN in your environment variables.`,
        error instanceof Error ? error : new Error(String(error))
      )
    }

    // Re-throw with more context for other errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new GoogleDriveAuthError(
      `Google Drive ${operationName} failed: ${errorMessage}`,
      error instanceof Error ? error : undefined
    )
  }
}

// Get Google Drive instance
function getDriveClient() {
  const auth = getOAuth2Client()
  return google.drive({ version: 'v3', auth })
}

/**
 * Upload a backup file to Google Drive
 */
export async function uploadBackupToDrive(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  return withDriveErrorHandling(async () => {
    const drive = getDriveClient()
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured')
    }

    // Create file metadata
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    }

    // Create media
    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: bufferToStream(buffer),
    }

    // Upload file
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    })

    if (!response.data.id) {
      throw new Error('Failed to upload file to Google Drive')
    }

    return response.data.id
  }, 'upload')
}

/**
 * List recent backups from Google Drive
 */
export async function listBackupsFromDrive(limit: number = 10) {
  return withDriveErrorHandling(async () => {
    const drive = getDriveClient()
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured')
    }

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, createdTime, size, webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: limit,
    })

    return response.data.files || []
  }, 'list backups')
}

/**
 * Delete a backup file from Google Drive
 */
export async function deleteBackupFromDrive(fileId: string): Promise<void> {
  return withDriveErrorHandling(async () => {
    const drive = getDriveClient()
    await drive.files.delete({ fileId })
  }, 'delete backup')
}

/**
 * Get backup file download URL
 */
export async function getBackupDownloadUrl(fileId: string): Promise<string> {
  return withDriveErrorHandling(async () => {
    const drive = getDriveClient()

    const response = await drive.files.get({
      fileId,
      fields: 'webContentLink',
    })

    return response.data.webContentLink || ''
  }, 'get download URL')
}

/**
 * Download a backup file from Google Drive as a Buffer
 */
export async function downloadBackupFromDrive(fileId: string): Promise<Buffer> {
  return withDriveErrorHandling(async () => {
    const drive = getDriveClient()

    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'arraybuffer',
      }
    )

    return Buffer.from(response.data as ArrayBuffer)
  }, 'download backup')
}

// Helper function to convert Buffer to ReadableStream
function bufferToStream(buffer: Buffer) {
  const { Readable } = require('stream')
  const readable = new Readable()
  readable.push(buffer)
  readable.push(null)
  return readable
}
